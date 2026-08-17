alter table public.products add column if not exists audience text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_audience_check') then
    alter table public.products add constraint products_audience_check check (audience is null or audience in ('men','women','kids','unisex'));
  end if;
end $$;

alter table public.categories add column if not exists category_kind text not null default 'category';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'categories_category_kind_check') then
    alter table public.categories add constraint categories_category_kind_check check (category_kind in ('category','audience'));
  end if;
end $$;

update public.categories set category_kind='audience' where slug in ('men','women','babes','kids','unisex');

insert into public.categories(name,name_ar,slug,parent_id,is_active,sort_order,countries,category_kind)
select 'Unisex','للجنسين','unisex',null,true,28,array['GLOBAL']::text[],'audience'
where not exists (select 1 from public.categories where slug='unisex');

update public.categories set name='Kids', name_ar='أطفال', slug='kids', category_kind='audience' where slug='babes';

update public.products p set audience='men' from public.categories c where p.category_id=c.id and c.slug='men' and p.audience is null;
update public.products p set audience='women' from public.categories c where p.category_id=c.id and c.slug='women' and p.audience is null;
update public.products p set audience='kids' from public.categories c where p.category_id=c.id and c.slug in ('kids','babes') and p.audience is null;

create index if not exists idx_products_audience_active_category on public.products(audience,category_id) where is_active=true;
