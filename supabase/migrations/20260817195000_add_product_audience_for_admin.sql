alter table public.products add column if not exists audience text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_audience_check') then
    alter table public.products add constraint products_audience_check check (audience is null or audience in ('men','women','kids','unisex'));
  end if;
end $$;

update public.products p
set audience = 'men'
from public.categories c
where p.category_id = c.id and c.slug = 'men' and p.audience is null;

update public.products p
set audience = 'women'
from public.categories c
where p.category_id = c.id and c.slug = 'women' and p.audience is null;

update public.products p
set audience = 'kids'
where p.audience is null
  and p.category_id in (
    select c.id from public.categories c
    where c.slug = 'babes'
       or c.parent_id = (select id from public.categories where slug = 'babes' limit 1)
  );

create index if not exists idx_products_audience_active
on public.products(audience)
where is_active = true;
