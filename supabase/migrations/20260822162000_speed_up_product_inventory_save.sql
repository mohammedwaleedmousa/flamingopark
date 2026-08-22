create or replace function public.inventory_skus_sync_product_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- replace_product_inventory_skus performs a batch rewrite and syncs once at the end.
  -- Skipping the expensive per-row rebuild during that batch keeps product saves fast.
  if current_setting('app.inventory_batch_sync', true) = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.sync_product_inventory_from_skus(old.product_id);
    return old;
  end if;

  perform public.sync_product_inventory_from_skus(new.product_id);

  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    perform public.sync_product_inventory_from_skus(old.product_id);
  end if;

  return new;
end;
$function$;

create or replace function public.replace_product_inventory_skus(p_product_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_product public.products%rowtype;
  v_item jsonb;
  v_count integer := 0;
  v_key text;
  v_stock integer;
  v_existing jsonb;
  v_requested jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'غير مصرح بإدارة مخزون الخيارات' using errcode = '42501';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'المنتج غير موجود'; end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'بيانات المخزون غير صالحة';
  end if;

  -- Validate once before touching inventory rows.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_key := nullif(btrim(v_item->>'variant_key'), '');
    if v_key is null then raise exception 'variant_key مطلوب لكل خيار'; end if;

    begin
      v_stock := coalesce((v_item->>'stock_quantity')::integer, 0);
    exception when others then
      raise exception 'كمية غير صالحة للخيار %', coalesce(v_item->>'label', v_key);
    end;

    if v_stock < 0 then raise exception 'المخزون لا يمكن أن يكون سالباً'; end if;
    v_count := v_count + 1;
  end loop;

  -- Normalize both sides and return immediately when stock did not actually change.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'variant_key', s.variant_key,
        'label', s.label,
        'color_name', s.color_name,
        'color_hex', s.color_hex,
        'color_hex2', s.color_hex2,
        'size', s.size,
        'stock_quantity', s.stock_quantity,
        'is_default', s.is_default
      ) order by s.variant_key
    ),
    '[]'::jsonb
  )
  into v_existing
  from public.inventory_skus s
  where s.product_id = p_product_id;

  if v_count = 0 then
    v_requested := jsonb_build_array(jsonb_build_object(
      'variant_key', 'default',
      'label', 'غير موزع على الخيارات',
      'color_name', null,
      'color_hex', null,
      'color_hex2', null,
      'size', null,
      'stock_quantity', 0,
      'is_default', true
    ));
  else
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'variant_key', nullif(btrim(item->>'variant_key'), ''),
          'label', coalesce(nullif(btrim(item->>'label'), ''), nullif(btrim(item->>'variant_key'), '')),
          'color_name', nullif(btrim(item->>'color_name'), ''),
          'color_hex', nullif(btrim(item->>'color_hex'), ''),
          'color_hex2', nullif(btrim(item->>'color_hex2'), ''),
          'size', nullif(btrim(item->>'size'), ''),
          'stock_quantity', coalesce((item->>'stock_quantity')::integer, 0),
          'is_default', coalesce((item->>'is_default')::boolean, false)
        ) order by nullif(btrim(item->>'variant_key'), '')
      ),
      '[]'::jsonb
    )
    into v_requested
    from jsonb_array_elements(p_items) as items(item);
  end if;

  if v_existing = v_requested then
    return greatest(v_count, 1);
  end if;

  -- Suppress the row-level inventory rebuild during this batch. We sync exactly once below.
  perform set_config('app.inventory_batch_sync', 'on', true);

  delete from public.inventory_skus where product_id = p_product_id;

  if v_count = 0 then
    insert into public.inventory_skus(product_id, variant_key, label, stock_quantity, is_default)
    values (p_product_id, 'default', 'غير موزع على الخيارات', 0, true);
    v_count := 1;
  else
    insert into public.inventory_skus(
      product_id, variant_key, label, color_name, color_hex, color_hex2, size, stock_quantity, is_default
    )
    select
      p_product_id,
      nullif(btrim(item->>'variant_key'), ''),
      coalesce(nullif(btrim(item->>'label'), ''), nullif(btrim(item->>'variant_key'), '')),
      nullif(btrim(item->>'color_name'), ''),
      nullif(btrim(item->>'color_hex'), ''),
      nullif(btrim(item->>'color_hex2'), ''),
      nullif(btrim(item->>'size'), ''),
      coalesce((item->>'stock_quantity')::integer, 0),
      coalesce((item->>'is_default')::boolean, false)
    from jsonb_array_elements(p_items) as items(item);
  end if;

  perform set_config('app.inventory_batch_sync', 'off', true);
  perform public.sync_product_inventory_from_skus(p_product_id);

  return v_count;
end;
$function$;
