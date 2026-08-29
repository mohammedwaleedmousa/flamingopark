-- Product admin tooling
-- Additive only. Existing product behavior is preserved.

create or replace function public.admin_zero_variant_stock(p_variants jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    case
      when jsonb_typeof(item) = 'object' then
        jsonb_set(
          jsonb_set(item, '{stock}', '0'::jsonb, true),
          '{sizes}',
          case
            when jsonb_typeof(item->'sizes') = 'array' then (
              select coalesce(jsonb_agg(
                case
                  when jsonb_typeof(size_item) = 'object'
                    then jsonb_set(size_item, '{stock}', '0'::jsonb, true)
                  else size_item
                end
              ), '[]'::jsonb)
              from jsonb_array_elements(item->'sizes') size_item
            )
            else coalesce(item->'sizes', '[]'::jsonb)
          end,
          true
        )
      else item
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) item;
$$;

revoke all on function public.admin_zero_variant_stock(jsonb) from public, anon, authenticated;

create or replace function public.admin_zero_quality_variant_stock(p_variants jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select coalesce(jsonb_agg(
    case
      when jsonb_typeof(item) = 'object'
        then jsonb_set(item, '{in_stock}', 'false'::jsonb, true)
      else item
    end
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) item;
$$;

revoke all on function public.admin_zero_quality_variant_stock(jsonb) from public, anon, authenticated;

create or replace function public.admin_duplicate_product(p_product_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.products%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_new_slug text;
  v_actor uuid := auth.uid();
  v_after jsonb;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select * into v_source
  from public.products
  where id = p_product_id;

  if not found then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  v_new_slug := left(coalesce(nullif(v_source.slug, ''), 'product'), 170)
    || '-copy-' || substring(v_new_id::text from 1 for 8);

  insert into public.products (
    id, name, name_ar, slug, price, original_price, discount,
    description, description_ar, images, category, brand,
    in_stock, countries, is_featured, is_best_seller, is_active,
    section_ids, has_sizes, sizes, accessories, features, sort_order,
    color_variants, stock_quantity, return_policy, specs,
    has_quality_variants, quality_variants, category_id, brand_id,
    cost_price, home_collections, audience, size_price_rule_id,
    created_at, updated_at
  ) values (
    v_new_id,
    coalesce(v_source.name, '') || ' Copy',
    coalesce(v_source.name_ar, '') || ' - نسخة',
    v_new_slug,
    v_source.price,
    v_source.original_price,
    v_source.discount,
    v_source.description,
    v_source.description_ar,
    v_source.images,
    v_source.category,
    v_source.brand,
    false,
    v_source.countries,
    false,
    false,
    false,
    v_source.section_ids,
    v_source.has_sizes,
    v_source.sizes,
    v_source.accessories,
    v_source.features,
    v_source.sort_order,
    public.admin_zero_variant_stock(v_source.color_variants),
    0,
    v_source.return_policy,
    v_source.specs,
    v_source.has_quality_variants,
    public.admin_zero_quality_variant_stock(v_source.quality_variants),
    v_source.category_id,
    v_source.brand_id,
    v_source.cost_price,
    v_source.home_collections,
    v_source.audience,
    v_source.size_price_rule_id,
    now(),
    now()
  );

  insert into public.product_costs (product_id, cost_price, updated_at)
  select v_new_id, cost_price, now()
  from public.product_costs
  where product_id = p_product_id
  on conflict (product_id) do update
  set cost_price = excluded.cost_price,
      updated_at = excluded.updated_at;

  insert into public.inventory_skus (
    product_id, variant_key, label, color_name, color_hex, color_hex2,
    size, stock_quantity, is_default, created_at, updated_at
  )
  select
    v_new_id, variant_key, label, color_name, color_hex, color_hex2,
    size, 0, is_default, now(), now()
  from public.inventory_skus
  where product_id = p_product_id;

  select jsonb_build_object(
    'id', id,
    'name', name,
    'name_ar', name_ar,
    'slug', slug,
    'price', price,
    'stock_quantity', stock_quantity,
    'in_stock', in_stock,
    'is_active', is_active,
    'category_id', category_id,
    'brand_id', brand_id
  ) into v_after
  from public.products
  where id = v_new_id;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'product',
    v_new_id::text,
    'duplicate',
    null,
    v_after,
    jsonb_build_object('source_product_id', p_product_id),
    v_actor
  );

  return v_new_id;
end;
$$;

revoke all on function public.admin_duplicate_product(uuid) from public, anon;
grant execute on function public.admin_duplicate_product(uuid) to authenticated;

create or replace function public.admin_quick_update_product(p_product_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_allowed constant text[] := array['price','stock_quantity','in_stock','is_active','brand_id','category_id'];
  v_key text;
  v_brand_id uuid;
  v_category_id uuid;
  v_brand_name text;
  v_category_slug text;
  v_stock integer;
  v_price numeric;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' then
    raise exception 'patch must be an object' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not (v_key = any(v_allowed)) then
      raise exception 'field % is not allowed for quick update', v_key using errcode = '22023';
    end if;
  end loop;

  select jsonb_build_object(
    'id', id,
    'price', price,
    'stock_quantity', stock_quantity,
    'in_stock', in_stock,
    'is_active', is_active,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'updated_at', updated_at
  ) into v_before
  from public.products
  where id = p_product_id
  for update;

  if v_before is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if p_patch ? 'price' then
    v_price := nullif(p_patch->>'price', '')::numeric;
    if v_price is null or v_price <= 0 then
      raise exception 'price must be greater than zero' using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'stock_quantity' then
    v_stock := nullif(p_patch->>'stock_quantity', '')::integer;
    if v_stock is null or v_stock < 0 then
      raise exception 'stock quantity cannot be negative' using errcode = '22023';
    end if;
  end if;

  if p_patch ? 'brand_id' then
    if jsonb_typeof(p_patch->'brand_id') = 'null' then
      v_brand_id := null;
      v_brand_name := null;
    else
      v_brand_id := (p_patch->>'brand_id')::uuid;
      select name into v_brand_name from public.brands where id = v_brand_id;
      if v_brand_name is null then
        raise exception 'brand not found' using errcode = '23503';
      end if;
    end if;
  end if;

  if p_patch ? 'category_id' then
    if jsonb_typeof(p_patch->'category_id') = 'null' then
      v_category_id := null;
      v_category_slug := null;
    else
      v_category_id := (p_patch->>'category_id')::uuid;
      select slug into v_category_slug from public.categories where id = v_category_id;
      if v_category_slug is null then
        raise exception 'category not found' using errcode = '23503';
      end if;
    end if;
  end if;

  update public.products
  set
    price = case when p_patch ? 'price' then v_price else price end,
    stock_quantity = case when p_patch ? 'stock_quantity' then v_stock else stock_quantity end,
    in_stock = case
      when p_patch ? 'in_stock' then (p_patch->>'in_stock')::boolean
      when p_patch ? 'stock_quantity' then v_stock > 0
      else in_stock
    end,
    is_active = case when p_patch ? 'is_active' then (p_patch->>'is_active')::boolean else is_active end,
    brand_id = case when p_patch ? 'brand_id' then v_brand_id else brand_id end,
    brand = case when p_patch ? 'brand_id' then v_brand_name else brand end,
    category_id = case when p_patch ? 'category_id' then v_category_id else category_id end,
    category = case when p_patch ? 'category_id' then v_category_slug else category end,
    updated_at = now()
  where id = p_product_id;

  select jsonb_build_object(
    'id', id,
    'price', price,
    'stock_quantity', stock_quantity,
    'in_stock', in_stock,
    'is_active', is_active,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'updated_at', updated_at
  ) into v_after
  from public.products
  where id = p_product_id;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'product', p_product_id::text, 'quick_update', v_before, v_after,
    jsonb_build_object('fields', coalesce((select jsonb_agg(k) from jsonb_object_keys(p_patch) k), '[]'::jsonb)),
    v_actor
  );

  return v_after;
end;
$$;

revoke all on function public.admin_quick_update_product(uuid, jsonb) from public, anon;
grant execute on function public.admin_quick_update_product(uuid, jsonb) to authenticated;

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
        case when coalesce(array_length(p.images, 1), 0) = 0 then 'missing_images' end,
        case when p.brand_id is null and btrim(coalesce(p.brand, '')) = '' then 'missing_brand' end,
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
  select
    h.id,
    h.name,
    h.name_ar,
    h.slug,
    h.issues,
    cardinality(h.issues)::integer as issue_count,
    h.is_active,
    h.updated_at
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
      coalesce(array_length(images, 1), 0) = 0
      or (brand_id is null and btrim(coalesce(brand, '')) = '')
      or (category_id is null and btrim(coalesce(category, '')) = '')
      or price is null or price <= 0
      or btrim(coalesce(name, '')) = ''
      or btrim(coalesce(name_ar, '')) = ''
      or btrim(coalesce(slug, '')) = ''
      or (stock_quantity <= 0 and in_stock is true)
      or (stock_quantity > 0 and in_stock is false)
    ),
    'missing_images', count(*) filter (where coalesce(array_length(images, 1), 0) = 0),
    'missing_brand', count(*) filter (where brand_id is null and btrim(coalesce(brand, '')) = ''),
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
