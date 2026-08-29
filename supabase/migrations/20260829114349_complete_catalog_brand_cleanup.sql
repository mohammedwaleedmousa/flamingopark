-- Complete remaining catalog brand cleanup safely.
-- General/unbranded products are valid and must not be reported as missing-brand issues.

insert into public.brands (name, slug, is_active, sort_order)
select v.name, v.slug, false, v.sort_order
from (values
  ('MOSKA','moska',119),
  ('Tommy Hilfiger','tommy-hilfiger',120),
  ('Hublot','hublot',121),
  ('Alo Yoga','alo-yoga',122)
) as v(name,slug,sort_order)
where not exists (
  select 1 from public.brands b
  where lower(coalesce(b.slug,''))=lower(v.slug) or lower(b.name)=lower(v.name)
);

update public.products p
set brand_id = b.id, brand = b.name, updated_at = now()
from public.brands b
where p.brand_id is null and (
  (b.slug = 'roberto-coin' and lower(coalesce(p.name_ar,'')) like '%روبيرتو كوين%')
  or (b.slug = 'moska' and lower(coalesce(p.name_ar,'')) like '%موسكا%')
  or (b.slug = 'tommy-hilfiger' and lower(coalesce(p.name_ar,'')) like '%تومي%')
  or (b.slug = 'hublot' and (lower(coalesce(p.name_ar,'')) like '%hublot%' or lower(coalesce(p.name,'')) like '%hublot%'))
  or (b.slug = 'alo-yoga' and (lower(trim(coalesce(p.name,'')))='alo' or lower(coalesce(p.name_ar,'')) like '%كاب الو%'))
);

create or replace function public.admin_catalog_health(p_limit integer default 250)
returns table (
  id uuid,
  name text,
  name_ar text,
  slug text,
  issues text[],
  issue_count integer,
  is_active boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  return query
  with health as (
    select
      p.id,
      p.name,
      p.name_ar,
      p.slug,
      array_remove(array[
        case when
          coalesce(array_length(p.images, 1), 0) = 0
          and not exists (
            select 1
            from jsonb_array_elements(coalesce(p.color_variants, '[]'::jsonb)) variant
            where jsonb_typeof(variant) = 'object'
              and jsonb_typeof(variant->'images') = 'array'
              and jsonb_array_length(variant->'images') > 0
          )
        then 'missing_images' end,
        case when p.brand_id is null and btrim(coalesce(p.brand, '')) <> '' then 'missing_brand' end,
        case when p.category_id is null and btrim(coalesce(p.category, '')) = '' then 'missing_category' end,
        case when p.price is null or p.price <= 0 then 'invalid_price' end,
        case when btrim(coalesce(p.name, '')) = '' then 'missing_name' end,
        case when btrim(coalesce(p.name_ar, '')) = '' then 'missing_name_ar' end,
        case when btrim(coalesce(p.slug, '')) = '' then 'missing_slug' end,
        case when p.stock_quantity <= 0 and p.in_stock is true then 'stock_flag_mismatch' end,
        case when p.stock_quantity > 0 and p.in_stock is false then 'stock_flag_mismatch' end,
        case when p.brand_id is not null and br.id is null then 'invalid_brand_reference' end,
        case when p.category_id is not null and c.id is null then 'invalid_category_reference' end
      ], null)::text[] as issues,
      p.is_active,
      p.updated_at
    from public.products p
    left join public.brands br on br.id = p.brand_id
    left join public.categories c on c.id = p.category_id
  )
  select h.id,h.name,h.name_ar,h.slug,h.issues,cardinality(h.issues)::integer,h.is_active,h.updated_at
  from health h
  where cardinality(h.issues) > 0
  order by cardinality(h.issues) desc, h.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 250), 2000));
end;
$$;

revoke all on function public.admin_catalog_health(integer) from public, anon;
grant execute on function public.admin_catalog_health(integer) to authenticated;

create or replace function public.admin_catalog_health_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_result jsonb;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_products', count(*),
    'products_with_issues', count(*) filter (where
      (
        coalesce(array_length(images, 1), 0) = 0
        and not exists (
          select 1 from jsonb_array_elements(coalesce(color_variants, '[]'::jsonb)) variant
          where jsonb_typeof(variant)='object'
            and jsonb_typeof(variant->'images')='array'
            and jsonb_array_length(variant->'images') > 0
        )
      )
      or (brand_id is null and btrim(coalesce(brand, '')) <> '')
      or (category_id is null and btrim(coalesce(category, '')) = '')
      or price is null or price <= 0
      or btrim(coalesce(name, '')) = ''
      or btrim(coalesce(name_ar, '')) = ''
      or btrim(coalesce(slug, '')) = ''
      or (stock_quantity <= 0 and in_stock is true)
      or (stock_quantity > 0 and in_stock is false)
    ),
    'missing_images', count(*) filter (where
      coalesce(array_length(images, 1), 0) = 0
      and not exists (
        select 1 from jsonb_array_elements(coalesce(color_variants, '[]'::jsonb)) variant
        where jsonb_typeof(variant)='object'
          and jsonb_typeof(variant->'images')='array'
          and jsonb_array_length(variant->'images') > 0
      )
    ),
    'missing_brand', count(*) filter (where brand_id is null and btrim(coalesce(brand, '')) <> ''),
    'missing_category', count(*) filter (where category_id is null and btrim(coalesce(category, '')) = ''),
    'invalid_price', count(*) filter (where price is null or price <= 0),
    'stock_mismatch', count(*) filter (where (stock_quantity <= 0 and in_stock is true) or (stock_quantity > 0 and in_stock is false))
  ) into v_result
  from public.products;

  return v_result;
end;
$$;

revoke all on function public.admin_catalog_health_summary() from public, anon;
grant execute on function public.admin_catalog_health_summary() to authenticated;
