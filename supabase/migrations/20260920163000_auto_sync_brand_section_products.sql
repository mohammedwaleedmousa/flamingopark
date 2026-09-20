create or replace function public.sync_product_brand_section_memberships()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (old.brand_id is distinct from new.brand_id
          or old.category_id is distinct from new.category_id) then
    with recursive old_scope as (
      select c.id, c.parent_id, c.name, c.name_ar, c.slug
      from public.categories c
      where c.id = old.category_id

      union all

      select parent.id, parent.parent_id, parent.name, parent.name_ar, parent.slug
      from public.categories parent
      join old_scope child on child.parent_id = parent.id
    )
    delete from public.brand_section_products bsp
    using public.brand_sections bs
    where bsp.product_id = new.id
      and bsp.section_id = bs.id
      and (
        bs.brand_id is distinct from new.brand_id
        or exists (
          select 1
          from old_scope scope
          where lower(btrim(bs.name)) in (
                  lower(btrim(scope.name)),
                  lower(btrim(scope.name_ar)),
                  lower(btrim(scope.slug))
                )
             or lower(btrim(coalesce(bs.category_name, ''))) in (
                  lower(btrim(scope.name)),
                  lower(btrim(scope.name_ar)),
                  lower(btrim(scope.slug))
                )
        )
      );
  end if;

  if new.brand_id is null or new.category_id is null then
    return new;
  end if;

  with recursive new_scope as (
    select c.id, c.parent_id, c.name, c.name_ar, c.slug
    from public.categories c
    where c.id = new.category_id

    union all

    select parent.id, parent.parent_id, parent.name, parent.name_ar, parent.slug
    from public.categories parent
    join new_scope child on child.parent_id = parent.id
  )
  insert into public.brand_section_products (section_id, product_id)
  select distinct bs.id, new.id
  from public.brand_sections bs
  where bs.brand_id = new.brand_id
    and bs.is_active = true
    and exists (
      select 1
      from new_scope scope
      where lower(btrim(bs.name)) in (
              lower(btrim(scope.name)),
              lower(btrim(scope.name_ar)),
              lower(btrim(scope.slug))
            )
         or lower(btrim(coalesce(bs.category_name, ''))) in (
              lower(btrim(scope.name)),
              lower(btrim(scope.name_ar)),
              lower(btrim(scope.slug))
            )
    )
  on conflict (section_id, product_id) do nothing;

  return new;
end;
$$;

drop trigger if exists sync_product_brand_section_memberships_trigger on public.products;

create trigger sync_product_brand_section_memberships_trigger
after insert or update of brand_id, category_id
on public.products
for each row
execute function public.sync_product_brand_section_memberships();

with recursive category_scope as (
  select
    c.id as category_id,
    c.id as node_id,
    c.parent_id,
    c.name,
    c.name_ar,
    c.slug
  from public.categories c

  union all

  select
    scope.category_id,
    parent.id as node_id,
    parent.parent_id,
    parent.name,
    parent.name_ar,
    parent.slug
  from category_scope scope
  join public.categories parent on parent.id = scope.parent_id
)
insert into public.brand_section_products (section_id, product_id)
select distinct bs.id, p.id
from public.products p
join public.brand_sections bs
  on bs.brand_id = p.brand_id
 and bs.is_active = true
join category_scope scope
  on scope.category_id = p.category_id
where p.brand_id is not null
  and p.category_id is not null
  and (
    lower(btrim(bs.name)) in (
      lower(btrim(scope.name)),
      lower(btrim(scope.name_ar)),
      lower(btrim(scope.slug))
    )
    or lower(btrim(coalesce(bs.category_name, ''))) in (
      lower(btrim(scope.name)),
      lower(btrim(scope.name_ar)),
      lower(btrim(scope.slug))
    )
  )
on conflict (section_id, product_id) do nothing;
