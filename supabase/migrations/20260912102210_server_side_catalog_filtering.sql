-- Move expensive color/size/price catalog filtering into Postgres so clients do not download the full catalog metadata.
create or replace function public.catalog_filter_product_ids(
  p_category_ids uuid[] default null,
  p_search text default null,
  p_brand text default null,
  p_audience text default null,
  p_sale_only boolean default false,
  p_in_stock_only boolean default false,
  p_color text default null,
  p_size text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_sort text default 'new',
  p_offset integer default 0,
  p_limit integer default 12
)
returns table(product_id uuid, total_count bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with scoped as (
    select p.id, p.price, p.discount, p.created_at, p.is_best_seller, p.is_featured, p.sizes, p.color_variants,
      (p.price * (1 - coalesce(p.discount, 0)::numeric / 100)) as final_price
    from public.products p
    where p.is_active = true
      and (p_category_ids is null or cardinality(p_category_ids) = 0 or p.category_id = any(p_category_ids))
      and (nullif(btrim(p_search), '') is null or p.name_ar ilike '%' || btrim(p_search) || '%' or p.name ilike '%' || btrim(p_search) || '%' or p.description_ar ilike '%' || btrim(p_search) || '%')
      and (nullif(p_brand, '') is null or p_brand = 'all' or p.brand = p_brand)
      and (nullif(p_audience, '') is null or p_audience = 'all'
        or (p_audience = 'women' and (p.audience in ('women','unisex') or p.audience is null))
        or (p_audience = 'men' and p.audience in ('men','unisex'))
        or (p_audience = 'kids' and p.audience = 'kids')
        or (p_audience = 'unisex' and p.audience = 'unisex'))
      and (not p_sale_only or coalesce(p.discount, 0) > 0)
      and (not p_in_stock_only or p.in_stock = true)
  ), filtered as (
    select s.* from scoped s
    where (p_min_price is null or s.final_price >= p_min_price)
      and (p_max_price is null or s.final_price <= p_max_price)
      and (nullif(p_color, '') is null or p_color = 'all' or exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(s.color_variants) = 'array' then s.color_variants else '[]'::jsonb end) v
        where lower(coalesce(v->>'colorName', v->>'name', '')) = lower(p_color)))
      and (nullif(p_size, '') is null or p_size = 'all'
        or coalesce(s.sizes, array[]::text[]) @> array[p_size]
        or exists (
          select 1
          from jsonb_array_elements(case when jsonb_typeof(s.color_variants) = 'array' then s.color_variants else '[]'::jsonb end) v
          cross join lateral jsonb_array_elements(case when jsonb_typeof(v->'sizes') = 'array' then v->'sizes' else '[]'::jsonb end) vs
          where vs->>'size' = p_size))
  )
  select f.id, count(*) over()
  from filtered f
  order by
    case when p_sort = 'price-asc' then f.final_price end asc nulls last,
    case when p_sort = 'price-desc' then f.final_price end desc nulls last,
    case when p_sort = 'best' then f.is_best_seller::int end desc nulls last,
    case when p_sort = 'featured' then f.is_featured::int end desc nulls last,
    f.created_at desc nulls last, f.id
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 12), 1), 100);
$$;

revoke all on function public.catalog_filter_product_ids(uuid[], text, text, text, boolean, boolean, text, text, numeric, numeric, text, integer, integer) from public;
grant execute on function public.catalog_filter_product_ids(uuid[], text, text, text, boolean, boolean, text, text, numeric, numeric, text, integer, integer) to anon, authenticated;

-- Facets are aggregated server-side; the storefront can request colors/sizes/price bounds without downloading every product row.
create or replace function public.catalog_filter_facets(
  p_category_ids uuid[] default null, p_search text default null, p_brand text default null, p_audience text default null,
  p_sale_only boolean default false, p_in_stock_only boolean default false, p_color text default null, p_size text default null,
  p_min_price numeric default null, p_max_price numeric default null
)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  with base as (
    select p.id,p.price,p.discount,p.audience,p.sizes,p.color_variants,(p.price*(1-coalesce(p.discount,0)::numeric/100)) final_price
    from public.products p where p.is_active=true
      and (p_category_ids is null or cardinality(p_category_ids)=0 or p.category_id=any(p_category_ids))
      and (nullif(btrim(p_search),'') is null or p.name_ar ilike '%'||btrim(p_search)||'%' or p.name ilike '%'||btrim(p_search)||'%' or p.description_ar ilike '%'||btrim(p_search)||'%')
      and (nullif(p_brand,'') is null or p_brand='all' or p.brand=p_brand)
      and (not p_sale_only or coalesce(p.discount,0)>0) and (not p_in_stock_only or p.in_stock=true)
  ), a as (
    select * from base where nullif(p_audience,'') is null or p_audience='all'
      or (p_audience='women' and (audience in ('women','unisex') or audience is null))
      or (p_audience='men' and audience in ('men','unisex')) or (p_audience='kids' and audience='kids') or (p_audience='unisex' and audience='unisex')
  ), colors as (
    select distinct on(lower(n)) n, nullif(v->>'hex','') hex, nullif(v->>'hex2','') hex2 from a
    cross join lateral jsonb_array_elements(case when jsonb_typeof(color_variants)='array' then color_variants else '[]'::jsonb end) v
    cross join lateral (select coalesce(nullif(v->>'colorName',''),nullif(v->>'name','')) n) x where n is not null order by lower(n),n
  ), sizeset as (
    select distinct size from (
      select unnest(coalesce(sizes,array[]::text[])) size from a union all
      select vs->>'size' from a cross join lateral jsonb_array_elements(case when jsonb_typeof(color_variants)='array' then color_variants else '[]'::jsonb end) v
      cross join lateral jsonb_array_elements(case when jsonb_typeof(v->'sizes')='array' then v->'sizes' else '[]'::jsonb end) vs
    ) q where nullif(btrim(size),'') is not null
  ), selected as (
    select count(*)::bigint total from a where (p_min_price is null or final_price>=p_min_price) and (p_max_price is null or final_price<=p_max_price)
      and (nullif(p_color,'') is null or p_color='all' or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(color_variants)='array' then color_variants else '[]'::jsonb end) v where lower(coalesce(v->>'colorName',v->>'name',''))=lower(p_color)))
      and (nullif(p_size,'') is null or p_size='all' or coalesce(sizes,array[]::text[])@>array[p_size] or exists(select 1 from jsonb_array_elements(case when jsonb_typeof(color_variants)='array' then color_variants else '[]'::jsonb end) v cross join lateral jsonb_array_elements(case when jsonb_typeof(v->'sizes')='array' then v->'sizes' else '[]'::jsonb end) vs where vs->>'size'=p_size))
  )
  select jsonb_build_object('colors',coalesce((select jsonb_agg(jsonb_build_object('name',n,'hex',hex,'hex2',hex2) order by n) from colors),'[]'::jsonb),'sizes',coalesce((select jsonb_agg(size order by size) from sizeset),'[]'::jsonb),'min_price',coalesce((select floor(min(final_price)) from a),0),'max_price',coalesce((select ceil(max(final_price)) from a),1000),'result_count',(select total from selected));
$$;

revoke all on function public.catalog_filter_facets(uuid[], text, text, text, boolean, boolean, text, text, numeric, numeric) from public;
grant execute on function public.catalog_filter_facets(uuid[], text, text, text, boolean, boolean, text, text, numeric, numeric) to anon, authenticated;