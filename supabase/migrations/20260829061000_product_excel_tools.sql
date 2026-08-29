-- Additive admin product Excel helpers.
-- No existing tables/columns are removed or renamed.

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
  v_default_sku_id uuid;
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

    if exists (
      select 1 from public.inventory_skus
      where product_id = p_product_id and is_default = false
    ) then
      raise exception 'SKU-managed product stock must be updated per SKU' using errcode = '22023';
    end if;

    select id into v_default_sku_id
    from public.inventory_skus
    where product_id = p_product_id and is_default = true
    order by created_at asc
    limit 1;

    if v_default_sku_id is not null then
      update public.inventory_skus
      set stock_quantity = v_stock,
          updated_at = now()
      where id = v_default_sku_id;
    else
      update public.products
      set stock_quantity = v_stock,
          in_stock = (v_stock > 0),
          updated_at = now()
      where id = p_product_id;
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
    in_stock = case when p_patch ? 'in_stock' then (p_patch->>'in_stock')::boolean else in_stock end,
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

create or replace function public.admin_create_product_draft_from_excel(p_row jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_name text := btrim(coalesce(p_row->>'name', ''));
  v_name_ar text := btrim(coalesce(p_row->>'name_ar', ''));
  v_slug text := btrim(coalesce(p_row->>'slug', ''));
  v_price numeric;
  v_brand_id uuid;
  v_category_id uuid;
  v_brand text;
  v_category text;
  v_after jsonb;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if v_name = '' and v_name_ar = '' then
    raise exception 'name or name_ar is required' using errcode = '22023';
  end if;

  v_price := nullif(p_row->>'price', '')::numeric;
  if v_price is null or v_price <= 0 then
    raise exception 'price must be greater than zero' using errcode = '22023';
  end if;

  if v_slug = '' then
    v_slug := lower(regexp_replace(coalesce(nullif(v_name, ''), v_name_ar), '[^[:alnum:]\u0600-\u06FF]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
  end if;
  if v_slug = '' then v_slug := 'product'; end if;
  v_slug := left(v_slug, 170) || '-draft-' || substring(v_id::text from 1 for 8);

  if nullif(p_row->>'brand_id', '') is not null then
    v_brand_id := (p_row->>'brand_id')::uuid;
    select name into v_brand from public.brands where id = v_brand_id;
    if v_brand is null then raise exception 'brand not found' using errcode = '23503'; end if;
  end if;

  if nullif(p_row->>'category_id', '') is not null then
    v_category_id := (p_row->>'category_id')::uuid;
    select slug into v_category from public.categories where id = v_category_id;
    if v_category is null then raise exception 'category not found' using errcode = '23503'; end if;
  end if;

  insert into public.products (
    id, name, name_ar, slug, price, original_price, discount,
    description, description_ar, images, category, category_id,
    brand, brand_id, in_stock, stock_quantity, countries,
    is_featured, is_best_seller, is_active, audience, created_at, updated_at
  ) values (
    v_id,
    coalesce(nullif(v_name, ''), v_name_ar),
    coalesce(nullif(v_name_ar, ''), v_name),
    v_slug,
    v_price,
    nullif(p_row->>'original_price', '')::numeric,
    coalesce(nullif(p_row->>'discount', '')::integer, 0),
    nullif(p_row->>'description', ''),
    nullif(p_row->>'description_ar', ''),
    '{}',
    v_category,
    v_category_id,
    v_brand,
    v_brand_id,
    false,
    0,
    array['GLOBAL']::text[],
    false,
    false,
    false,
    case when p_row->>'audience' in ('men','women','kids','unisex') then p_row->>'audience' else null end,
    now(),
    now()
  );

  select jsonb_build_object('id', id, 'name', name, 'name_ar', name_ar, 'slug', slug, 'price', price, 'is_active', is_active)
  into v_after from public.products where id = v_id;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'product', v_id::text, 'excel_create_draft', null, v_after,
    jsonb_build_object('source', 'xlsx'), v_actor
  );

  return v_id;
end;
$$;

revoke all on function public.admin_create_product_draft_from_excel(jsonb) from public, anon;
grant execute on function public.admin_create_product_draft_from_excel(jsonb) to authenticated;

create or replace function public.admin_update_inventory_sku_from_excel(p_sku_id uuid, p_stock_quantity integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_product_id uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_stock_quantity < 0 then
    raise exception 'stock quantity cannot be negative' using errcode = '22023';
  end if;

  select product_id, jsonb_build_object(
    'sku_id', id, 'product_id', product_id, 'variant_key', variant_key,
    'label', label, 'size', size, 'color_name', color_name, 'stock_quantity', stock_quantity
  ) into v_product_id, v_before
  from public.inventory_skus
  where id = p_sku_id
  for update;

  if v_before is null then raise exception 'inventory sku not found' using errcode = 'P0002'; end if;

  update public.inventory_skus
  set stock_quantity = p_stock_quantity,
      updated_at = now()
  where id = p_sku_id;

  select jsonb_build_object(
    'sku_id', id, 'product_id', product_id, 'variant_key', variant_key,
    'label', label, 'size', size, 'color_name', color_name, 'stock_quantity', stock_quantity
  ) into v_after
  from public.inventory_skus
  where id = p_sku_id;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'inventory_sku', p_sku_id::text, 'excel_stock_update', v_before, v_after,
    jsonb_build_object('product_id', v_product_id, 'source', 'xlsx'), v_actor
  );

  return v_after;
end;
$$;

revoke all on function public.admin_update_inventory_sku_from_excel(uuid, integer) from public, anon;
grant execute on function public.admin_update_inventory_sku_from_excel(uuid, integer) to authenticated;
