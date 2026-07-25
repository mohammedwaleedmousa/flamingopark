-- Phase 1: secure customer orders and archived-order access.
-- Rollback: drop the two RPCs and the owner/tracking columns in a forward migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_token_hash text;

CREATE INDEX IF NOT EXISTS idx_orders_owner_user_created
  ON public.orders (owner_user_id, created_at DESC)
  WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token_hash
  ON public.orders (tracking_token_hash)
  WHERE tracking_token_hash IS NOT NULL;

-- The previous policy exposed every order to both anonymous and authenticated users.
DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order owners read own orders" ON public.orders;

CREATE POLICY "Order owners read own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Keep administrative order management; direct public writes are replaced by create_secure_order.
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Orders archive is readable by everyone" ON public.orders_archive;
DROP POLICY IF EXISTS "Admins can manage orders archive" ON public.orders_archive;
CREATE POLICY "Admins can manage orders archive"
  ON public.orders_archive FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE ALL ON public.orders_archive FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders_archive TO authenticated;

CREATE OR REPLACE FUNCTION public.create_secure_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_city text,
  p_customer_notes text,
  p_country text,
  p_currency_mode text,
  p_payment_method text,
  p_delivery_company_id uuid,
  p_coupon_code text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_delivery public.delivery_companies%ROWTYPE;
  v_customer_id uuid;
  v_product_id uuid;
  v_quantity integer;
  v_accessory jsonb;
  v_requested_accessory jsonb;
  v_accessories jsonb;
  v_accessories_total numeric := 0;
  v_line_price numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_total numeric := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_coupon public.coupons%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_tracking_token text;
  v_currency_mode text;
  v_currency_code text;
  v_exchange_rate numeric;
BEGIN
  IF coalesce(trim(p_customer_name), '') = ''
     OR coalesce(trim(p_customer_phone), '') = ''
     OR coalesce(trim(p_customer_address), '') = '' THEN
    RAISE EXCEPTION 'customer name, phone, and address are required';
  END IF;

  IF p_payment_method NOT IN ('cod', 'bank') THEN
    RAISE EXCEPTION 'unsupported payment method';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'order must contain between 1 and 100 items';
  END IF;

  SELECT * INTO v_delivery
  FROM public.delivery_companies
  WHERE id = p_delivery_company_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'delivery company is unavailable';
  END IF;

  v_currency_mode := CASE upper(coalesce(p_currency_mode, 'SAR'))
    WHEN 'YER_S' THEN 'YER_SOUTH'
    WHEN 'YER_N' THEN 'YER_NORTH'
    WHEN 'YER_SOUTH' THEN 'YER_SOUTH'
    WHEN 'YER_NORTH' THEN 'YER_NORTH'
    ELSE 'SAR'
  END;
  v_currency_code := CASE v_currency_mode
    WHEN 'YER_SOUTH' THEN 'YER_S'
    WHEN 'YER_NORTH' THEN 'YER_N'
    ELSE 'SAR'
  END;
  SELECT rate_to_base INTO v_exchange_rate
  FROM public.currencies WHERE code = v_currency_code AND is_active = true;
  v_exchange_rate := coalesce(v_exchange_rate, 1);

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid product item';
    END;

    IF v_quantity IS NULL OR v_quantity < 1 OR v_quantity > 100 THEN
      RAISE EXCEPTION 'invalid product quantity';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_product_id AND is_active = true
    FOR UPDATE;
    IF NOT FOUND OR NOT coalesce(v_product.in_stock, false) OR v_product.stock_quantity < v_quantity THEN
      RAISE EXCEPTION 'product is unavailable';
    END IF;

    v_accessories := '[]'::jsonb;
    v_accessories_total := 0;
    FOR v_requested_accessory IN SELECT value FROM jsonb_array_elements(coalesce(v_item->'selected_accessories', '[]'::jsonb))
    LOOP
      SELECT accessory INTO v_accessory
      FROM jsonb_array_elements(coalesce(v_product.accessories, '[]'::jsonb)) AS accessory
      WHERE accessory->>'name' = v_requested_accessory->>'name'
         OR accessory->>'name_ar' = v_requested_accessory->>'name_ar'
      LIMIT 1;
      IF v_accessory IS NULL THEN
        RAISE EXCEPTION 'invalid selected accessory';
      END IF;
      IF coalesce((v_requested_accessory->>'quantity')::integer, 0) < 1
         OR coalesce((v_requested_accessory->>'quantity')::integer, 0) > 100 THEN
        RAISE EXCEPTION 'invalid accessory quantity';
      END IF;
      v_accessories_total := v_accessories_total
        + coalesce((v_accessory->>'price')::numeric, 0)
          * (v_requested_accessory->>'quantity')::integer;
      v_accessories := v_accessories || jsonb_build_array(jsonb_build_object(
        'name', coalesce(v_accessory->>'name', ''),
        'name_ar', coalesce(v_accessory->>'name_ar', v_accessory->>'name', ''),
        'price', coalesce((v_accessory->>'price')::numeric, 0),
        'quantity', (v_requested_accessory->>'quantity')::integer,
        'image_url', coalesce(v_accessory->>'image_url', '')
      ));
    END LOOP;

    v_line_price := coalesce(v_product.price, 0) * (1 - coalesce(v_product.discount, 0)::numeric / 100) + v_accessories_total;
    v_subtotal := v_subtotal + (v_line_price * v_quantity);
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', coalesce(v_product.name_ar, v_product.name),
      'product_image', coalesce(v_product.images[1], ''),
      'quantity', v_quantity,
      'price', v_line_price,
      'selected_size', nullif(v_item->>'selected_size', ''),
      'selected_accessories', v_accessories
    ));
  END LOOP;

  IF nullif(trim(coalesce(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code))
      AND is_active = true
      AND (coalesce(p_country, 'GLOBAL') = 'GLOBAL' OR coalesce(p_country, 'GLOBAL') = ANY(countries))
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'coupon is invalid';
    END IF;
    v_discount := CASE v_coupon.type
      WHEN 'percentage' THEN round(v_subtotal * v_coupon.value / 100, 2)
      ELSE v_coupon.value
    END;
    v_discount := least(v_discount, v_subtotal);
  END IF;

  v_total := v_subtotal + coalesce(v_delivery.base_fee, 0) - v_discount;
  SELECT id INTO v_customer_id FROM public.customers WHERE phone = trim(p_customer_phone) LIMIT 1;
  v_tracking_token := encode(gen_random_bytes(32), 'hex');
  v_order_number := 'ORD-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

  INSERT INTO public.orders (
    order_number, customer_id, owner_user_id, customer_name, customer_phone,
    customer_address, customer_city, customer_notes, country, items, subtotal,
    delivery_fee, discount_amount, total, total_base, currency_code, currency_mode,
    exchange_rate_snapshot, delivery_company_id, payment_method, coupon_code,
    tracking_token_hash
  ) VALUES (
    v_order_number, v_customer_id, auth.uid(), trim(p_customer_name), trim(p_customer_phone),
    trim(p_customer_address), nullif(trim(coalesce(p_customer_city, '')), ''),
    nullif(trim(coalesce(p_customer_notes, '')), ''), coalesce(nullif(trim(p_country), ''), 'GLOBAL'),
    v_order_items, v_subtotal, coalesce(v_delivery.base_fee, 0), v_discount, v_total,
    v_total, v_currency_code, v_currency_mode, v_exchange_rate, v_delivery.id,
    p_payment_method, nullif(upper(trim(coalesce(p_coupon_code, ''))), ''),
    encode(digest(v_tracking_token, 'sha256'), 'hex')
  ) RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', v_tracking_token,
    'items', v_order_items,
    'subtotal', v_subtotal,
    'delivery_fee', coalesce(v_delivery.base_fee, 0),
    'discount_amount', v_discount,
    'total', v_total,
    'currency_mode', v_currency_mode,
    'delivery_company', v_delivery.name,
    'created_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_order_tracking(
  p_order_number text,
  p_tracking_token text
)
RETURNS TABLE (
  order_number text,
  status text,
  created_at timestamptz,
  delivery_company_id uuid,
  delivery_company_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.order_number, o.status, o.created_at, o.delivery_company_id, d.name
  FROM public.orders o
  LEFT JOIN public.delivery_companies d ON d.id = o.delivery_company_id
  WHERE o.order_number = p_order_number
    AND o.tracking_token_hash = encode(digest(p_tracking_token, 'sha256'), 'hex')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.create_secure_order(text, text, text, text, text, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_secure_order(text, text, text, text, text, text, text, text, uuid, text, jsonb) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_order_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text, text) TO anon, authenticated;
