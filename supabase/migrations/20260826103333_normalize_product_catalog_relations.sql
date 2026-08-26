alter table public.products
  add column if not exists category_id uuid,
  add column if not exists brand_id uuid;

update public.products p
set category_id = c.id
from public.categories c
where p.category_id is null
  and p.category is not null
  and (
    lower(btrim(p.category)) = lower(btrim(c.slug))
    or lower(btrim(p.category)) = lower(btrim(c.name))
  );

update public.products p
set brand_id = b.id
from public.brands b
where p.brand_id is null
  and p.brand is not null
  and lower(btrim(p.brand)) = lower(btrim(b.name));

update public.products p
set category = c.slug
from public.categories c
where p.category_id = c.id
  and p.category is distinct from c.slug;

update public.products p
set brand = b.name
from public.brands b
where p.brand_id = b.id
  and p.brand is distinct from b.name;

insert into public.brand_categories (brand_id, category_id)
select distinct p.brand_id, p.category_id
from public.products p
where p.brand_id is not null
  and p.category_id is not null
on conflict (brand_id, category_id) do nothing;

with recursive category_tree as (
  select c.id, c.parent_id, c.slug as root_slug
  from public.categories c
  where c.parent_id is null

  union all

  select child.id, child.parent_id, tree.root_slug
  from public.categories child
  join category_tree tree on tree.id = child.parent_id
)
update public.products p
set audience = case
  when tree.root_slug = 'men' then 'men'
  when tree.root_slug = 'women' then 'women'
  when tree.root_slug in ('kids', 'babes') then 'kids'
  else p.audience
end
from category_tree tree
where p.category_id = tree.id
  and p.audience is null
  and tree.root_slug in ('men', 'women', 'kids', 'babes');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_category_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'products_brand_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete set null;
  end if;
end $$;

create index if not exists idx_products_active_category_id
  on public.products (category_id, created_at desc)
  where is_active = true;

create index if not exists idx_products_active_brand_id
  on public.products (brand_id, created_at desc)
  where is_active = true;

create or replace function public.sync_product_catalog_relations()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  inferred_audience text;
  has_category_mapping boolean;
  brand_is_allowed boolean;
begin
  if new.category_id is null and nullif(btrim(new.category), '') is not null then
    select c.id into new.category_id
    from public.categories c
    where lower(btrim(c.slug)) = lower(btrim(new.category))
       or lower(btrim(c.name)) = lower(btrim(new.category))
    order by case when lower(btrim(c.slug)) = lower(btrim(new.category)) then 0 else 1 end
    limit 1;
  end if;

  if new.brand_id is null and nullif(btrim(new.brand), '') is not null then
    select b.id into new.brand_id
    from public.brands b
    where lower(btrim(b.name)) = lower(btrim(new.brand))
    limit 1;
  end if;

  if new.category_id is not null then
    select c.slug into new.category
    from public.categories c
    where c.id = new.category_id;

    with recursive ancestors as (
      select c.id, c.parent_id, c.slug
      from public.categories c
      where c.id = new.category_id

      union all

      select parent.id, parent.parent_id, parent.slug
      from public.categories parent
      join ancestors child on child.parent_id = parent.id
    )
    select case
      when bool_or(slug = 'men') then 'men'
      when bool_or(slug = 'women') then 'women'
      when bool_or(slug in ('kids', 'babes')) then 'kids'
      else null
    end
    into inferred_audience
    from ancestors;

    if inferred_audience is not null
       and (new.audience is null or new.audience not in (inferred_audience, 'unisex')) then
      new.audience := inferred_audience;
    end if;
  end if;

  if new.brand_id is not null then
    select b.name into new.brand
    from public.brands b
    where b.id = new.brand_id;
  else
    new.brand := null;
  end if;

  if new.category_id is not null and new.brand_id is not null then
    with recursive category_scope as (
      select c.id, c.parent_id
      from public.categories c
      where c.id = new.category_id

      union all

      select parent.id, parent.parent_id
      from public.categories parent
      join category_scope child on child.parent_id = parent.id
    )
    select
      exists (
        select 1 from public.brand_categories bc
        join category_scope scope on scope.id = bc.category_id
      ),
      exists (
        select 1 from public.brand_categories bc
        join category_scope scope on scope.id = bc.category_id
        where bc.brand_id = new.brand_id
      )
    into has_category_mapping, brand_is_allowed;

    if has_category_mapping and not brand_is_allowed then
      raise exception 'Brand % is not linked to category %', new.brand_id, new.category_id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_product_catalog_relations_trigger on public.products;
create trigger sync_product_catalog_relations_trigger
before insert or update of category, category_id, brand, brand_id, audience
on public.products
for each row execute function public.sync_product_catalog_relations();

create or replace function public.sync_product_labels_after_catalog_rename()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_table_name = 'brands' then
    update public.products set brand = new.name where brand_id = new.id;
  elsif tg_table_name = 'categories' then
    update public.products set category = new.slug where category_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_product_brand_name_trigger on public.brands;
create trigger sync_product_brand_name_trigger
after update of name on public.brands
for each row
when (old.name is distinct from new.name)
execute function public.sync_product_labels_after_catalog_rename();

drop trigger if exists sync_product_category_slug_trigger on public.categories;
create trigger sync_product_category_slug_trigger
after update of slug on public.categories
for each row
when (old.slug is distinct from new.slug)
execute function public.sync_product_labels_after_catalog_rename();

create table if not exists public.brand_section_products (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.brand_sections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (section_id, product_id)
);

create index if not exists idx_brand_section_products_section_id
  on public.brand_section_products (section_id);

create index if not exists idx_brand_section_products_product_id
  on public.brand_section_products (product_id);

grant select on public.brand_section_products to anon;
grant select, insert, update, delete on public.brand_section_products to authenticated;
grant all on public.brand_section_products to service_role;

alter table public.brand_section_products enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brand_section_products'
      and policyname = 'brand section products readable by all'
  ) then
    create policy "brand section products readable by all"
      on public.brand_section_products for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brand_section_products'
      and policyname = 'brand section products admin write'
  ) then
    create policy "brand section products admin write"
      on public.brand_section_products for all
      to authenticated
      using ((select public.has_role((select auth.uid()), 'admin')))
      with check ((select public.has_role((select auth.uid()), 'admin')));
  end if;
end $$;

create or replace function public.validate_brand_section_product()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  section_brand_id uuid;
  product_brand_id uuid;
begin
  select brand_id into section_brand_id
  from public.brand_sections
  where id = new.section_id;

  select brand_id into product_brand_id
  from public.products
  where id = new.product_id;

  if section_brand_id is null or product_brand_id is distinct from section_brand_id then
    raise exception 'Product brand does not match brand section'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_brand_section_product_trigger on public.brand_section_products;
create trigger validate_brand_section_product_trigger
before insert or update of section_id, product_id
on public.brand_section_products
for each row execute function public.validate_brand_section_product();
