create or replace function public.catalog_filter_audiences(
  p_category_ids uuid[] default null,
  p_search text default null,
  p_brand text default null,
  p_sale_only boolean default false,
  p_in_stock_only boolean default false
)
returns text[]
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with base as (
    select p.audience
    from public.products p
    where p.is_active = true
      and (p_category_ids is null or cardinality(p_category_ids) = 0 or p.category_id = any(p_category_ids))
      and (nullif(btrim(p_search), '') is null or p.name_ar ilike '%' || btrim(p_search) || '%' or p.name ilike '%' || btrim(p_search) || '%' or p.description_ar ilike '%' || btrim(p_search) || '%')
      and (nullif(p_brand, '') is null or p_brand = 'all' or p.brand = p_brand)
      and (not p_sale_only or coalesce(p.discount, 0) > 0)
      and (not p_in_stock_only or p.in_stock = true)
  )
  select array_remove(array[
    case when exists(select 1 from base where audience in ('women','unisex') or audience is null) then 'women' end,
    case when exists(select 1 from base where audience in ('men','unisex')) then 'men' end,
    case when exists(select 1 from base where audience = 'kids') then 'kids' end,
    case when exists(select 1 from base where audience = 'unisex') then 'unisex' end
  ]::text[], null);
$$;

revoke all on function public.catalog_filter_audiences(uuid[], text, text, boolean, boolean) from public;
grant execute on function public.catalog_filter_audiences(uuid[], text, text, boolean, boolean) to anon, authenticated;