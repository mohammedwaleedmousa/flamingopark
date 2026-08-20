-- Some legacy products expose storefront color/size choices while their inventory
-- is tracked by a single default SKU. Keep strict matching for detailed SKU
-- products, but allow the sole default SKU to back those legacy display variants.
DO $migration$
DECLARE
  v_ddl text;
  v_old text := E'      if v_sku.id is null then raise exception ''variant_selection_required''; end if;';
  v_new text := E'      -- Legacy storefront variants may carry a display color/size while inventory is tracked\n      -- by one default SKU only. In that case reserve the default SKU instead of rejecting\n      -- a valid in-stock product. Detailed SKU products still require an exact match.\n      if v_sku.id is null and v_sku_count = 1 then\n        select * into v_sku\n        from public.inventory_skus\n        where product_id = v_product.id and is_default = true\n        limit 1\n        for update;\n      end if;\n\n      if v_sku.id is null then raise exception ''variant_selection_required''; end if;';
BEGIN
  SELECT pg_get_functiondef(p.oid)
    INTO v_ddl
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_secure_order_v2'
  LIMIT 1;

  IF v_ddl IS NULL THEN
    RAISE EXCEPTION 'create_secure_order_v2 not found';
  END IF;

  IF position(v_old in v_ddl) = 0 THEN
    RAISE EXCEPTION 'expected create_secure_order_v2 variant guard not found';
  END IF;

  v_ddl := replace(v_ddl, v_old, v_new);
  EXECUTE v_ddl;
END
$migration$;
