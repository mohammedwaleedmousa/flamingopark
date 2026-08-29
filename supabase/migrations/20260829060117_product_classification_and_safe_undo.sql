-- Additive product classification + safe undo helpers.
-- Uses existing admin RLS and never rewrites inventory quantities.

create or replace function public.admin_apply_product_classification(p_product_id uuid, p_patch jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_before jsonb;
  v_after jsonb;
  v_allowed constant text[] := array['brand_id','category_id','audience'];
  v_key text;
  v_brand_id uuid;
  v_category_id uuid;
  v_brand_name text;
  v_category_slug text;
  v_audience text;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' or p_patch = '{}'::jsonb then
    raise exception 'classification patch must be a non-empty object' using errcode = '22023';
  end if;

  for v_key in select jsonb_object_keys(p_patch)
  loop
    if not (v_key = any(v_allowed)) then
      raise exception 'field % is not allowed for classification update', v_key using errcode = '22023';
    end if;
  end loop;

  select jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'audience', audience,
    'updated_at', updated_at
  ) into v_before
  from public.products
  where id = p_product_id
  for update;

  if v_before is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  if p_patch ? 'brand_id' then
    if jsonb_typeof(p_patch->'brand_id') = 'null' then
      v_brand_id := null;
      v_brand_name := null;
    else
      v_brand_id := (p_patch->>'brand_id')::uuid;
      select name into v_brand_name from public.brands where id = v_brand_id;
      if v_brand_name is null then raise exception 'brand not found' using errcode = '23503'; end if;
    end if;
  end if;

  if p_patch ? 'category_id' then
    if jsonb_typeof(p_patch->'category_id') = 'null' then
      v_category_id := null;
      v_category_slug := null;
    else
      v_category_id := (p_patch->>'category_id')::uuid;
      select slug into v_category_slug from public.categories where id = v_category_id;
      if v_category_slug is null then raise exception 'category not found' using errcode = '23503'; end if;
    end if;
  end if;

  if p_patch ? 'audience' then
    v_audience := nullif(btrim(p_patch->>'audience'), '');
    if v_audience is not null and v_audience not in ('men','women','kids','unisex') then
      raise exception 'invalid audience' using errcode = '22023';
    end if;
  end if;

  update public.products
  set
    brand_id = case when p_patch ? 'brand_id' then v_brand_id else brand_id end,
    brand = case when p_patch ? 'brand_id' then v_brand_name else brand end,
    category_id = case when p_patch ? 'category_id' then v_category_id else category_id end,
    category = case when p_patch ? 'category_id' then v_category_slug else category end,
    audience = case when p_patch ? 'audience' then v_audience else audience end,
    updated_at = now()
  where id = p_product_id;

  select jsonb_build_object(
    'id', id,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'audience', audience,
    'updated_at', updated_at
  ) into v_after
  from public.products
  where id = p_product_id;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'product', p_product_id::text, 'classification_update', v_before, v_after,
    jsonb_build_object(
      'fields', coalesce((select jsonb_agg(k) from jsonb_object_keys(p_patch) k), '[]'::jsonb),
      'source', 'classification_suggestion'
    ),
    v_actor
  );

  return v_after;
end;
$$;

revoke all on function public.admin_apply_product_classification(uuid, jsonb) from public, anon;
grant execute on function public.admin_apply_product_classification(uuid, jsonb) to authenticated;

create or replace function public.admin_undo_product_revision(p_revision_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.admin_change_revisions%rowtype;
  v_current jsonb;
  v_restored jsonb;
  v_fields text[] := array[]::text[];
  v_field text;
  v_brand_id uuid;
  v_category_id uuid;
  v_brand_name text;
  v_category_slug text;
begin
  if v_actor is null or not public.has_role(v_actor, 'admin'::public.app_role) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  select * into v_revision
  from public.admin_change_revisions
  where id = p_revision_id
  for update;

  if v_revision.id is null then
    raise exception 'revision not found' using errcode = 'P0002';
  end if;

  if v_revision.entity_type <> 'product' or v_revision.action not in ('quick_update','classification_update') then
    raise exception 'this revision is not eligible for automatic undo' using errcode = '22023';
  end if;

  select coalesce(array_agg(value), array[]::text[])
  into v_fields
  from jsonb_array_elements_text(coalesce(v_revision.metadata->'fields', '[]'::jsonb)) as item(value)
  where value = any(array['price','is_active','brand_id','category_id','audience']);

  if coalesce(array_length(v_fields, 1), 0) = 0 then
    raise exception 'revision has no safely reversible fields' using errcode = '22023';
  end if;

  select jsonb_build_object(
    'id', id,
    'price', price,
    'is_active', is_active,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'audience', audience,
    'updated_at', updated_at
  ) into v_current
  from public.products
  where id = v_revision.entity_id::uuid
  for update;

  if v_current is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  foreach v_field in array v_fields
  loop
    if (v_current->v_field) is distinct from (v_revision.after_data->v_field) then
      raise exception 'revision is stale; product changed after this revision' using errcode = '40001';
    end if;
  end loop;

  if 'brand_id' = any(v_fields) and jsonb_typeof(v_revision.before_data->'brand_id') <> 'null' then
    v_brand_id := (v_revision.before_data->>'brand_id')::uuid;
    select name into v_brand_name from public.brands where id = v_brand_id;
    if v_brand_name is null then raise exception 'previous brand no longer exists' using errcode = '23503'; end if;
  end if;

  if 'category_id' = any(v_fields) and jsonb_typeof(v_revision.before_data->'category_id') <> 'null' then
    v_category_id := (v_revision.before_data->>'category_id')::uuid;
    select slug into v_category_slug from public.categories where id = v_category_id;
    if v_category_slug is null then raise exception 'previous category no longer exists' using errcode = '23503'; end if;
  end if;

  update public.products
  set
    price = case when 'price' = any(v_fields) then (v_revision.before_data->>'price')::numeric else price end,
    is_active = case when 'is_active' = any(v_fields) then (v_revision.before_data->>'is_active')::boolean else is_active end,
    brand_id = case when 'brand_id' = any(v_fields) then v_brand_id else brand_id end,
    brand = case when 'brand_id' = any(v_fields) then v_brand_name else brand end,
    category_id = case when 'category_id' = any(v_fields) then v_category_id else category_id end,
    category = case when 'category_id' = any(v_fields) then v_category_slug else category end,
    audience = case when 'audience' = any(v_fields) then nullif(v_revision.before_data->>'audience', '') else audience end,
    updated_at = now()
  where id = v_revision.entity_id::uuid;

  select jsonb_build_object(
    'id', id,
    'price', price,
    'is_active', is_active,
    'brand_id', brand_id,
    'brand', brand,
    'category_id', category_id,
    'category', category,
    'audience', audience,
    'updated_at', updated_at
  ) into v_restored
  from public.products
  where id = v_revision.entity_id::uuid;

  insert into public.admin_change_revisions (
    entity_type, entity_id, action, before_data, after_data, metadata, created_by
  ) values (
    'product', v_revision.entity_id, 'undo', v_current, v_restored,
    jsonb_build_object('undone_revision_id', v_revision.id, 'fields', to_jsonb(v_fields)),
    v_actor
  );

  return v_restored;
end;
$$;

revoke all on function public.admin_undo_product_revision(uuid) from public, anon;
grant execute on function public.admin_undo_product_revision(uuid) to authenticated;
