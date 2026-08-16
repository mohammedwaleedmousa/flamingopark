BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.normalize_yemen_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path = pg_catalog
AS $$
DECLARE
  v_phone text;
  v_local text;
BEGIN
  v_phone := translate(trim(p_phone), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789');
  v_phone := regexp_replace(v_phone, '[[:space:]().-]', '', 'g');
  IF v_phone !~ '^\+?[0-9]+$' THEN RETURN NULL; END IF;

  v_local := CASE
    WHEN v_phone LIKE '+967%' THEN substr(v_phone, 5)
    WHEN v_phone LIKE '00967%' THEN substr(v_phone, 6)
    WHEN v_phone LIKE '967%' THEN substr(v_phone, 4)
    WHEN v_phone ~ '^07[0-9]{8}$' THEN substr(v_phone, 2)
    ELSE v_phone
  END;

  IF v_local !~ '^7[0-9]{8}$' THEN RETURN NULL; END IF;
  RETURN '+967' || v_local;
END;
$$;

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS password_hash text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tracking_token text,
  ADD COLUMN IF NOT EXISTS tracking_token_hash text,
  ADD COLUMN IF NOT EXISTS customer_city text,
  ADD COLUMN IF NOT EXISTS customer_region text,
  ADD COLUMN IF NOT EXISTS currency_mode text;

CREATE INDEX IF NOT EXISTS orders_owner_user_created_idx
  ON public.orders(owner_user_id, created_at DESC)
  WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_tracking_token_hash_idx
  ON public.orders(tracking_token_hash)
  WHERE tracking_token_hash IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.customers
    WHERE private.normalize_yemen_phone(phone) IS NULL
  ) THEN
    RAISE EXCEPTION 'invalid legacy customer phone data';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.customers
    GROUP BY private.normalize_yemen_phone(phone)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate normalized customer phone data';
  END IF;
END;
$$;

UPDATE public.customers
SET phone = private.normalize_yemen_phone(phone),
    region = coalesce(nullif(region, ''), CASE WHEN country NOT IN ('YE', 'SA') THEN country END, 'عدن'),
    country = 'YE'
WHERE phone IS DISTINCT FROM private.normalize_yemen_phone(phone)
   OR region IS NULL
   OR country <> 'YE';

CREATE UNIQUE INDEX IF NOT EXISTS customers_user_id_unique_idx
  ON public.customers(user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS customers_normalized_phone_unique_idx
  ON public.customers((private.normalize_yemen_phone(phone)));

CREATE TABLE IF NOT EXISTS private.customer_legacy_credentials (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  migrated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO private.customer_legacy_credentials (customer_id, password_hash)
SELECT id, password_hash
FROM public.customers
WHERE nullif(password_hash, '') IS NOT NULL
ON CONFLICT (customer_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'customer_login',
        'customer_register',
        'customer_self',
        'customer_update_self',
        'link_authenticated_customer'
      )
  LOOP
    EXECUTE format('DROP FUNCTION %s', v_function);
  END LOOP;
END;
$$;

ALTER TABLE public.customers DROP COLUMN IF EXISTS password_hash;

CREATE TABLE IF NOT EXISTS private.customer_auth_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone_hash text NOT NULL,
  fingerprint_hash text NOT NULL,
  action text NOT NULL CHECK (action IN ('register', 'migrate')),
  succeeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_auth_attempts_phone_created_idx
  ON private.customer_auth_attempts(phone_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_auth_attempts_fingerprint_created_idx
  ON private.customer_auth_attempts(fingerprint_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.prepare_customer_phone_auth(
  p_mode text,
  p_phone text,
  p_pin text,
  p_fingerprint_hash text
)
RETURNS TABLE(normalized_phone text, customer_id uuid, result_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_catalog
AS $$
DECLARE
  v_phone text := private.normalize_yemen_phone(p_phone);
  v_phone_hash text;
  v_customer_id uuid;
  v_user_id uuid;
  v_password_hash text;
  v_rate_limited boolean := false;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_mode NOT IN ('register', 'migrate')
     OR v_phone IS NULL
     OR p_pin !~ '^[0-9]{6,12}$'
     OR p_fingerprint_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT v_phone, NULL::uuid, 'invalid_input'::text;
    RETURN;
  END IF;

  v_phone_hash := encode(digest(v_phone, 'sha256'), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-auth-phone:' || v_phone_hash, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-auth-client:' || p_fingerprint_hash, 0));

  DELETE FROM private.customer_auth_attempts WHERE created_at < now() - interval '24 hours';

  SELECT
    count(*) FILTER (WHERE phone_hash = v_phone_hash AND NOT succeeded AND created_at >= now() - interval '15 minutes') >= 5
    OR count(*) FILTER (WHERE fingerprint_hash = p_fingerprint_hash AND NOT succeeded AND created_at >= now() - interval '15 minutes') >= 20
    OR (
      p_mode = 'register'
      AND count(*) FILTER (WHERE fingerprint_hash = p_fingerprint_hash AND action = 'register' AND succeeded AND created_at >= now() - interval '1 day') >= 5
    )
  INTO v_rate_limited
  FROM private.customer_auth_attempts;

  IF v_rate_limited THEN
    INSERT INTO private.customer_auth_attempts(phone_hash, fingerprint_hash, action, succeeded)
    VALUES (v_phone_hash, p_fingerprint_hash, p_mode, false);
    RETURN QUERY SELECT v_phone, NULL::uuid, 'rate_limited'::text;
    RETURN;
  END IF;

  IF p_mode = 'register' AND (
    p_pin ~ '^([0-9])\1+$'
    OR p_pin ~ '^([0-9]{1,3})\1+$'
    OR position(p_pin IN '0123456789012') > 0
    OR position(p_pin IN '9876543210987') > 0
    OR right(replace(v_phone, '+', ''), length(p_pin)) = p_pin
  ) THEN
    INSERT INTO private.customer_auth_attempts(phone_hash, fingerprint_hash, action, succeeded)
    VALUES (v_phone_hash, p_fingerprint_hash, p_mode, false);
    RETURN QUERY SELECT v_phone, NULL::uuid, 'weak_pin'::text;
    RETURN;
  END IF;

  SELECT c.id, c.user_id, credentials.password_hash
  INTO v_customer_id, v_user_id, v_password_hash
  FROM public.customers c
  LEFT JOIN private.customer_legacy_credentials credentials ON credentials.customer_id = c.id
  WHERE c.phone = v_phone
  FOR UPDATE OF c;

  IF p_mode = 'register' THEN
    IF v_customer_id IS NOT NULL THEN
      INSERT INTO private.customer_auth_attempts(phone_hash, fingerprint_hash, action, succeeded)
      VALUES (v_phone_hash, p_fingerprint_hash, p_mode, false);
      RETURN QUERY SELECT v_phone, NULL::uuid, 'already_registered'::text;
      RETURN;
    END IF;
  ELSIF v_customer_id IS NULL
        OR v_user_id IS NOT NULL
        OR v_password_hash IS NULL
        OR crypt(p_pin, v_password_hash) <> v_password_hash THEN
    INSERT INTO private.customer_auth_attempts(phone_hash, fingerprint_hash, action, succeeded)
    VALUES (v_phone_hash, p_fingerprint_hash, p_mode, false);
    RETURN QUERY SELECT v_phone, NULL::uuid, 'invalid_credentials'::text;
    RETURN;
  END IF;

  INSERT INTO private.customer_auth_attempts(phone_hash, fingerprint_hash, action, succeeded)
  VALUES (v_phone_hash, p_fingerprint_hash, p_mode, true);
  RETURN QUERY SELECT v_phone, v_customer_id, 'prepared'::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_customer_phone_auth(
  p_mode text,
  p_auth_user_id uuid,
  p_phone text,
  p_name text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_catalog
AS $$
DECLARE
  v_phone text := private.normalize_yemen_phone(p_phone);
  v_customer public.customers%ROWTYPE;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_mode NOT IN ('register', 'migrate') OR v_phone IS NULL OR p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('customer-auth-phone:' || v_phone, 0));
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_auth_user_id
      AND private.normalize_yemen_phone(u.phone) = v_phone
      AND u.phone_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'invalid_auth_identity';
  END IF;

  IF p_mode = 'migrate' THEN
    SELECT * INTO v_customer
    FROM public.customers
    WHERE id = p_customer_id AND phone = v_phone
    FOR UPDATE;
    IF NOT FOUND OR v_customer.user_id IS NOT NULL THEN RAISE EXCEPTION 'invalid_credentials'; END IF;
    IF NOT EXISTS (SELECT 1 FROM private.customer_legacy_credentials WHERE customer_id = v_customer.id) THEN
      RAISE EXCEPTION 'invalid_credentials';
    END IF;

    UPDATE public.customers
    SET user_id = p_auth_user_id, updated_at = now()
    WHERE id = v_customer.id
    RETURNING * INTO v_customer;
    DELETE FROM private.customer_legacy_credentials WHERE customer_id = v_customer.id;
  ELSE
    IF EXISTS (SELECT 1 FROM public.customers WHERE phone = v_phone OR user_id = p_auth_user_id) THEN
      RAISE EXCEPTION 'already_registered';
    END IF;
    IF length(trim(coalesce(p_name, ''))) NOT BETWEEN 2 AND 100
       OR length(trim(coalesce(p_region, ''))) NOT BETWEEN 2 AND 80 THEN
      RAISE EXCEPTION 'invalid_input';
    END IF;

    INSERT INTO public.customers(user_id, name, phone, country, region)
    VALUES (p_auth_user_id, trim(p_name), v_phone, 'YE', trim(p_region))
    RETURNING * INTO v_customer;
  END IF;

  UPDATE public.orders
  SET owner_user_id = p_auth_user_id
  WHERE customer_id = v_customer.id AND owner_user_id IS NULL;

  IF to_regclass('public.customer_notifications') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'customer_notifications' AND column_name = 'user_id'
     ) THEN
    EXECUTE 'UPDATE public.customer_notifications SET user_id = $1 WHERE customer_id = $2 AND user_id IS NULL'
    USING p_auth_user_id, v_customer.id;
  END IF;

  RETURN v_customer.id;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_customer_phone_auth(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_customer_phone_auth(text, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_customer_phone_auth(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_customer_phone_auth(text, uuid, text, text, text, uuid) TO service_role;

REVOKE ALL ON TABLE private.customer_legacy_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.customer_auth_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA private FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can register as customer" ON public.customers;
DROP POLICY IF EXISTS "Customers can read own data" ON public.customers;
DROP POLICY IF EXISTS "Only admins can read customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Customer reads own record" ON public.customers;
DROP POLICY IF EXISTS "Customer updates own record" ON public.customers;

CREATE POLICY "Customers read own record"
  ON public.customers FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Admins manage customers"
  ON public.customers FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

REVOKE ALL ON public.customers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

UPDATE public.orders
SET tracking_token_hash = encode(digest(tracking_token, 'sha256'), 'hex')
WHERE nullif(tracking_token, '') IS NOT NULL
  AND tracking_token_hash IS NULL;
UPDATE public.orders SET tracking_token = NULL WHERE tracking_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS private.order_request_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('quote', 'create')),
  phone_hash text NOT NULL,
  fingerprint_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_request_attempts_phone_created_idx
  ON private.order_request_attempts(action, phone_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS order_request_attempts_client_created_idx
  ON private.order_request_attempts(action, fingerprint_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.consume_order_creation_rate_limit(
  p_action text,
  p_phone text,
  p_fingerprint_hash text
)
RETURNS TABLE(allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, extensions, pg_catalog
AS $$
DECLARE
  v_phone_hash text;
  v_phone_limit integer;
  v_client_limit integer;
  v_phone_count integer;
  v_client_count integer;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('quote', 'create') OR p_fingerprint_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  v_phone_hash := encode(digest(left(coalesce(p_phone, 'guest'), 64), 'sha256'), 'hex');
  v_phone_limit := CASE WHEN p_action = 'create' THEN 4 ELSE 12 END;
  v_client_limit := CASE WHEN p_action = 'create' THEN 6 ELSE 20 END;
  PERFORM pg_advisory_xact_lock(hashtextextended('order-phone:' || p_action || ':' || v_phone_hash, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('order-client:' || p_action || ':' || p_fingerprint_hash, 0));
  DELETE FROM private.order_request_attempts WHERE created_at < now() - interval '24 hours';

  SELECT count(*) INTO v_phone_count
  FROM private.order_request_attempts
  WHERE action = p_action AND phone_hash = v_phone_hash AND created_at >= now() - interval '10 minutes';
  SELECT count(*) INTO v_client_count
  FROM private.order_request_attempts
  WHERE action = p_action AND fingerprint_hash = p_fingerprint_hash AND created_at >= now() - interval '10 minutes';

  INSERT INTO private.order_request_attempts(action, phone_hash, fingerprint_hash)
  VALUES (p_action, v_phone_hash, p_fingerprint_hash);
  RETURN QUERY SELECT (v_phone_count < v_phone_limit AND v_client_count < v_client_limit), 600;
END;
$$;

CREATE OR REPLACE FUNCTION private.compute_order_quote(
  p_delivery_company_id uuid,
  p_coupon_code text,
  p_currency_mode text,
  p_items jsonb,
  p_lock_products boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_catalog
AS $$
DECLARE
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_delivery public.delivery_companies%ROWTYPE;
  v_coupon public.coupons%ROWTYPE;
  v_currency public.currencies%ROWTYPE;
  v_accessory jsonb;
  v_requested_accessory jsonb;
  v_color_variant jsonb;
  v_accessories jsonb;
  v_items jsonb := '[]'::jsonb;
  v_requested_by_product jsonb := '{}'::jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_accessory_quantity integer;
  v_selected_size text;
  v_selected_color text;
  v_requested_total integer;
  v_accessories_base numeric;
  v_unit_base numeric;
  v_unit_transaction numeric;
  v_subtotal_base numeric := 0;
  v_subtotal numeric := 0;
  v_delivery_base numeric := 0;
  v_delivery_fee numeric := 0;
  v_discount_base numeric := 0;
  v_discount numeric := 0;
  v_total_base numeric;
  v_total numeric;
  v_rate numeric;
  v_round_scale integer;
  v_mode text;
BEGIN
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'invalid_order';
  END IF;

  v_mode := CASE upper(coalesce(nullif(trim(p_currency_mode), ''), 'SAR'))
    WHEN 'YER_S' THEN 'YER_SOUTH'
    WHEN 'YER_N' THEN 'YER_NORTH'
    ELSE upper(coalesce(nullif(trim(p_currency_mode), ''), 'SAR'))
  END;
  SELECT * INTO v_currency FROM public.currencies WHERE code = v_mode AND is_active = true;
  IF NOT FOUND AND v_mode = 'YER_SOUTH' THEN SELECT * INTO v_currency FROM public.currencies WHERE code = 'YER_S' AND is_active = true; END IF;
  IF NOT FOUND AND v_mode = 'YER_NORTH' THEN SELECT * INTO v_currency FROM public.currencies WHERE code = 'YER_N' AND is_active = true; END IF;
  IF NOT FOUND OR coalesce(v_currency.rate_to_base, 0) <= 0 THEN RAISE EXCEPTION 'invalid_order'; END IF;
  v_rate := v_currency.rate_to_base;
  v_round_scale := CASE WHEN coalesce(v_currency.is_base, false) THEN 2 ELSE 0 END;

  IF p_delivery_company_id IS NOT NULL THEN
    SELECT * INTO v_delivery
    FROM public.delivery_companies
    WHERE id = p_delivery_company_id AND is_active = true AND country = 'YE';
    IF NOT FOUND THEN RAISE EXCEPTION 'delivery_unavailable'; END IF;
    v_delivery_base := greatest(coalesce(v_delivery.base_fee, 0), 0);
    v_delivery_fee := round(v_delivery_base * v_rate, v_round_scale);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    BEGIN
      v_product_id := (v_item->>'product_id')::uuid;
      v_quantity := (v_item->>'quantity')::integer;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_order';
    END;
    IF v_quantity NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_order'; END IF;

    v_requested_total := coalesce((v_requested_by_product->>v_product_id::text)::integer, 0) + v_quantity;
    v_requested_by_product := jsonb_set(v_requested_by_product, ARRAY[v_product_id::text], to_jsonb(v_requested_total), true);

    IF p_lock_products THEN
      SELECT * INTO v_product FROM public.products WHERE id = v_product_id AND is_active = true FOR UPDATE;
    ELSE
      SELECT * INTO v_product FROM public.products WHERE id = v_product_id AND is_active = true;
    END IF;
    IF NOT FOUND OR NOT coalesce(v_product.in_stock, false) THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    IF coalesce(v_product.stock_quantity, 0) < v_requested_total THEN RAISE EXCEPTION 'stock_unavailable'; END IF;

    v_selected_size := nullif(left(trim(coalesce(v_item->>'selected_size', '')), 100), '');
    v_selected_color := nullif(left(trim(coalesce(v_item->>'selected_color', '')), 100), '');
    IF coalesce(array_length(v_product.sizes, 1), 0) > 0
       AND (v_selected_size IS NULL OR NOT v_selected_size = ANY(v_product.sizes)) THEN
      RAISE EXCEPTION 'product_unavailable';
    END IF;

    IF jsonb_typeof(coalesce(v_product.color_variants, '[]'::jsonb)) = 'array'
       AND jsonb_array_length(coalesce(v_product.color_variants, '[]'::jsonb)) > 0 THEN
      IF v_selected_color IS NULL THEN RAISE EXCEPTION 'product_unavailable'; END IF;
      SELECT color INTO v_color_variant
      FROM jsonb_array_elements(v_product.color_variants) AS color
      WHERE lower(trim(coalesce(color->>'name', ''))) = lower(v_selected_color)
      LIMIT 1;
      IF v_color_variant IS NULL THEN RAISE EXCEPTION 'product_unavailable'; END IF;
    END IF;

    IF jsonb_typeof(coalesce(v_item->'selected_accessories', '[]'::jsonb)) <> 'array'
       OR jsonb_array_length(coalesce(v_item->'selected_accessories', '[]'::jsonb)) > 20 THEN
      RAISE EXCEPTION 'invalid_order';
    END IF;
    v_accessories := '[]'::jsonb;
    v_accessories_base := 0;
    FOR v_requested_accessory IN SELECT value FROM jsonb_array_elements(coalesce(v_item->'selected_accessories', '[]'::jsonb))
    LOOP
      v_accessory := NULL;
      BEGIN
        v_accessory_quantity := (v_requested_accessory->>'quantity')::integer;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'invalid_order';
      END;
      IF v_accessory_quantity NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid_order'; END IF;
      SELECT accessory INTO v_accessory
      FROM jsonb_array_elements(coalesce(v_product.accessories, '[]'::jsonb)) AS accessory
      WHERE (nullif(trim(v_requested_accessory->>'name'), '') IS NOT NULL AND accessory->>'name' = v_requested_accessory->>'name')
         OR (nullif(trim(v_requested_accessory->>'name_ar'), '') IS NOT NULL AND accessory->>'name_ar' = v_requested_accessory->>'name_ar')
      LIMIT 1;
      IF v_accessory IS NULL THEN RAISE EXCEPTION 'invalid_order'; END IF;
      v_accessories_base := v_accessories_base + greatest(coalesce((v_accessory->>'price')::numeric, 0), 0) * v_accessory_quantity;
      v_accessories := v_accessories || jsonb_build_array(jsonb_build_object(
        'name', left(coalesce(v_accessory->>'name', ''), 200),
        'name_ar', left(coalesce(v_accessory->>'name_ar', v_accessory->>'name', ''), 200),
        'price', round(greatest(coalesce((v_accessory->>'price')::numeric, 0), 0) * v_rate, v_round_scale),
        'quantity', v_accessory_quantity,
        'image_url', left(coalesce(v_accessory->>'image_url', ''), 2000)
      ));
    END LOOP;

    v_unit_base := greatest(coalesce(v_product.price, 0), 0)
      * (1 - least(greatest(coalesce(v_product.discount, 0), 0), 100)::numeric / 100)
      + v_accessories_base;
    v_unit_transaction := round(v_unit_base * v_rate, v_round_scale);
    v_subtotal_base := v_subtotal_base + v_unit_base * v_quantity;
    v_subtotal := v_subtotal + v_unit_transaction * v_quantity;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', left(coalesce(v_product.name_ar, v_product.name), 500),
      'product_image', left(coalesce(v_product.images[1], ''), 2000),
      'quantity', v_quantity,
      'price', v_unit_transaction,
      'selected_size', v_selected_size,
      'selected_color', v_selected_color,
      'selected_accessories', v_accessories
    ));
  END LOOP;

  IF v_subtotal_base <= 0 OR v_subtotal_base > 1000000000 THEN RAISE EXCEPTION 'invalid_order'; END IF;
  IF nullif(trim(coalesce(p_coupon_code, '')), '') IS NOT NULL THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE upper(code) = upper(trim(p_coupon_code))
      AND is_active = true
      AND (countries IS NULL OR 'YE' = ANY(countries))
    LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_coupon'; END IF;
    IF v_coupon.type = 'percentage' THEN
      IF v_coupon.value < 0 OR v_coupon.value > 100 THEN RAISE EXCEPTION 'invalid_coupon'; END IF;
      v_discount_base := round(v_subtotal_base * v_coupon.value / 100, 2);
    ELSE
      v_discount_base := greatest(v_coupon.value, 0);
    END IF;
    v_discount_base := least(v_discount_base, v_subtotal_base);
    v_discount := round(v_discount_base * v_rate, v_round_scale);
  END IF;

  v_total_base := greatest(v_subtotal_base + v_delivery_base - v_discount_base, 0);
  v_total := greatest(v_subtotal + v_delivery_fee - v_discount, 0);
  RETURN jsonb_build_object(
    'items', v_items,
    'subtotal', v_subtotal,
    'delivery_fee', v_delivery_fee,
    'discount_amount', v_discount,
    'total', v_total,
    'total_base', round(v_total_base, 2),
    'currency_mode', v_mode,
    'currency_code', v_currency.code,
    'exchange_rate_snapshot', v_rate,
    'delivery_company', CASE WHEN p_delivery_company_id IS NULL THEN NULL ELSE v_delivery.name END
  );
END;
$$;

DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('create_secure_order', 'quote_secure_order', 'get_order_tracking', 'get_order_by_tracking')
  LOOP
    EXECUTE format('DROP FUNCTION %s', v_function);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.quote_secure_order(
  p_delivery_company_id uuid,
  p_coupon_code text,
  p_currency_mode text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public, pg_catalog
AS $$
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  RETURN private.compute_order_quote(p_delivery_company_id, p_coupon_code, p_currency_mode, p_items, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_secure_order(
  p_owner_user_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_city text,
  p_customer_region text,
  p_customer_notes text,
  p_payment_method text,
  p_delivery_company_id uuid,
  p_coupon_code text,
  p_currency_mode text,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_catalog
AS $$
DECLARE
  v_phone text := private.normalize_yemen_phone(p_customer_phone);
  v_quote jsonb;
  v_order_id uuid;
  v_order_number text;
  v_tracking_token text;
  v_created_at timestamptz;
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role', current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF v_phone IS NULL
     OR length(trim(coalesce(p_customer_name, ''))) NOT BETWEEN 2 AND 100
     OR length(trim(coalesce(p_customer_address, ''))) NOT BETWEEN 5 AND 500
     OR length(trim(coalesce(p_customer_city, ''))) NOT BETWEEN 2 AND 100
     OR length(coalesce(p_customer_notes, '')) > 1000
     OR length(coalesce(p_customer_region, '')) > 80
     OR p_payment_method NOT IN ('cod', 'bank')
     OR p_delivery_company_id IS NULL THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  IF p_owner_user_id IS NULL THEN
    IF p_customer_id IS NOT NULL THEN RAISE EXCEPTION 'invalid_input'; END IF;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = p_customer_id AND user_id = p_owner_user_id AND phone = v_phone
  ) THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;

  v_quote := private.compute_order_quote(p_delivery_company_id, p_coupon_code, p_currency_mode, p_items, true);
  v_tracking_token := encode(gen_random_bytes(32), 'hex');
  v_order_number := 'ORD-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

  INSERT INTO public.orders(
    order_number, customer_id, owner_user_id, customer_name, customer_phone,
    customer_address, customer_city, customer_region, customer_notes, country,
    items, subtotal, delivery_fee, discount_amount, total, total_base,
    currency_code, currency_mode, exchange_rate_snapshot, delivery_company_id,
    payment_method, coupon_code, tracking_token_hash
  ) VALUES (
    v_order_number, p_customer_id, p_owner_user_id, trim(p_customer_name), v_phone,
    trim(p_customer_address), trim(p_customer_city), nullif(trim(coalesce(p_customer_region, '')), ''),
    nullif(trim(coalesce(p_customer_notes, '')), ''), 'YE',
    v_quote->'items', (v_quote->>'subtotal')::numeric, (v_quote->>'delivery_fee')::numeric,
    (v_quote->>'discount_amount')::numeric, (v_quote->>'total')::numeric, (v_quote->>'total_base')::numeric,
    v_quote->>'currency_code', v_quote->>'currency_mode', (v_quote->>'exchange_rate_snapshot')::numeric,
    p_delivery_company_id, p_payment_method, nullif(upper(trim(coalesce(p_coupon_code, ''))), ''),
    encode(digest(v_tracking_token, 'sha256'), 'hex')
  ) RETURNING id, created_at INTO v_order_id, v_created_at;

  RETURN v_quote || jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'tracking_token', v_tracking_token,
    'created_at', v_created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_order_tracking(p_order_number text, p_tracking_token text DEFAULT NULL)
RETURNS TABLE(
  order_number text,
  status text,
  created_at timestamptz,
  delivery_company_id uuid,
  delivery_company_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
BEGIN
  IF length(trim(coalesce(p_order_number, ''))) NOT BETWEEN 8 AND 80
     OR length(coalesce(p_tracking_token, '')) > 128 THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT o.order_number, o.status, o.created_at, o.delivery_company_id, d.name
  FROM public.orders o
  LEFT JOIN public.delivery_companies d ON d.id = o.delivery_company_id
  WHERE o.order_number = trim(p_order_number)
    AND (
      o.owner_user_id = (SELECT auth.uid())
      OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR (
        nullif(p_tracking_token, '') IS NOT NULL
        AND o.tracking_token_hash = encode(digest(p_tracking_token, 'sha256'), 'hex')
      )
    )
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_order_creation_rate_limit(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.quote_secure_order(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_secure_order(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_order_creation_rate_limit(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.quote_secure_order(uuid, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_secure_order(uuid, uuid, text, text, text, text, text, text, text, uuid, text, text, jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.get_order_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text, text) TO anon, authenticated;
REVOKE ALL ON FUNCTION private.compute_order_quote(uuid, text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.order_request_attempts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order owners read own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Order owners read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));
CREATE POLICY "Admins manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE ALL ON public.orders FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE ALL ON public.coupons FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT _user_id IS NOT NULL
    AND _user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_customer_profile(
  p_name text,
  p_region text,
  p_avatar_url text DEFAULT NULL
)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_customer public.customers%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_customer
  FROM public.customers
  WHERE user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF length(trim(coalesce(p_name, ''))) NOT BETWEEN 2 AND 100
     OR trim(coalesce(p_region, '')) <> ALL (ARRAY[
       'عدن', 'صنعاء', 'تعز', 'حضرموت', 'إب', 'الحديدة', 'ذمار', 'لحج', 'أبين',
       'شبوة', 'المهرة', 'مأرب', 'البيضاء', 'الجوف', 'صعدة', 'ريمة', 'الضالع',
       'حجة', 'عمران', 'المحويت'
     ]::text[]) THEN
    RAISE EXCEPTION 'invalid_profile' USING ERRCODE = '22023';
  END IF;

  IF p_avatar_url IS DISTINCT FROM v_customer.avatar_url
     AND p_avatar_url IS NOT NULL
     AND (
       length(p_avatar_url) > 2048
       OR p_avatar_url !~ (
         '^https://[^/]+/storage/v1/object/public/uploads/avatars/'
         || auth.uid()::text
         || '/avatar\.(jpg|jpeg|png|webp)(\?v=[0-9]+)?$'
       )
     ) THEN
    RAISE EXCEPTION 'invalid_avatar_url' USING ERRCODE = '22023';
  END IF;

  UPDATE public.customers
  SET name = trim(p_name),
      region = trim(p_region),
      avatar_url = p_avatar_url,
      updated_at = now()
  WHERE id = v_customer.id
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;
REVOKE ALL ON FUNCTION public.update_customer_profile(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION private.protect_customer_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF coalesce(
       nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
       current_setting('request.jwt.claim.role', true),
       ''
     ) = 'service_role'
     OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.country IS DISTINCT FROM OLD.country
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'customer_identity_is_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_customer_identity_trigger ON public.customers;
CREATE TRIGGER protect_customer_identity_trigger
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION private.protect_customer_identity();

CREATE OR REPLACE FUNCTION private.bind_customer_address_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, private, pg_catalog
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF coalesce(
       nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
       current_setting('request.jwt.claim.role', true),
       ''
     ) = 'service_role'
     OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0002';
  END IF;

  NEW.user_id := auth.uid();
  NEW.customer_id := v_customer_id;
  NEW.phone := private.normalize_yemen_phone(NEW.phone);
  IF NEW.phone IS NULL
     OR length(trim(coalesce(NEW.label, ''))) NOT BETWEEN 1 AND 80
     OR length(trim(coalesce(NEW.recipient_name, ''))) NOT BETWEEN 1 AND 100
     OR length(trim(coalesce(NEW.city, ''))) NOT BETWEEN 1 AND 80
     OR length(trim(coalesce(NEW.address_line1, ''))) NOT BETWEEN 3 AND 500
     OR length(coalesce(NEW.address_line2, '')) > 500
     OR length(coalesce(NEW.notes, '')) > 1000 THEN
    RAISE EXCEPTION 'invalid_address' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS bind_customer_address_identity_trigger ON public.customer_addresses;
CREATE TRIGGER bind_customer_address_identity_trigger
  BEFORE INSERT OR UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION private.bind_customer_address_identity();

DROP POLICY IF EXISTS "Users manage own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Customers manage own addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Admins manage customer addresses" ON public.customer_addresses;
CREATE POLICY "Customers manage own addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Admins manage customer addresses" ON public.customer_addresses
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE ALL ON public.customer_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;

CREATE OR REPLACE FUNCTION private.bind_customer_favorite_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  IF coalesce(
       nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'role',
       current_setting('request.jwt.claim.role', true),
       ''
     ) = 'service_role'
     OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO v_customer_id FROM public.customers WHERE user_id = auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0002';
  END IF;

  NEW.user_id := auth.uid();
  NEW.customer_id := v_customer_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS bind_customer_favorite_identity_trigger ON public.customer_favorites;
CREATE TRIGGER bind_customer_favorite_identity_trigger
  BEFORE INSERT OR UPDATE ON public.customer_favorites
  FOR EACH ROW EXECUTE FUNCTION private.bind_customer_favorite_identity();

DROP POLICY IF EXISTS "Users manage own favorites" ON public.customer_favorites;
DROP POLICY IF EXISTS "Customers manage own favorites" ON public.customer_favorites;
DROP POLICY IF EXISTS "Admins manage customer favorites" ON public.customer_favorites;
CREATE POLICY "Customers manage own favorites" ON public.customer_favorites
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Admins manage customer favorites" ON public.customer_favorites
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE ALL ON public.customer_favorites FROM anon;
GRANT SELECT, INSERT, DELETE ON public.customer_favorites TO authenticated;
GRANT ALL ON public.customer_favorites TO service_role;

DROP POLICY IF EXISTS "Orders archive is readable by everyone" ON public.orders_archive;
DROP POLICY IF EXISTS "Admins can manage orders archive" ON public.orders_archive;
CREATE POLICY "Admins manage orders archive" ON public.orders_archive
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
REVOKE ALL ON public.orders_archive FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders_archive TO authenticated;

UPDATE public.orders
SET invoice_url = regexp_replace(invoice_url, '^.*?/storage/v1/object/(?:public|sign)/invoices/', '')
WHERE invoice_url ~* '^https?://.*/storage/v1/object/(public|sign)/invoices/';

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('invoices', 'invoices', false, 6000000, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic', 'image/heif']
WHERE id = 'uploads';

DO $$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') ILIKE '%invoices%'
        OR coalesce(with_check, '') ILIKE '%invoices%'
        OR (
          cmd <> 'SELECT'
          AND (coalesce(qual, '') ILIKE '%uploads%' OR coalesce(with_check, '') ILIKE '%uploads%')
        )
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', v_policy.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "Admins manage invoice objects" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'invoices' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'invoices' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Admins manage upload objects" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'uploads' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'uploads' AND public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Customers upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND name ~ ('^avatars/' || (SELECT auth.uid())::text || '/avatar\.(jpg|jpeg|png|webp)$')
    AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
  );
CREATE POLICY "Customers update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'uploads' AND name LIKE ('avatars/' || (SELECT auth.uid())::text || '/avatar.%'))
  WITH CHECK (
    bucket_id = 'uploads'
    AND name ~ ('^avatars/' || (SELECT auth.uid())::text || '/avatar\.(jpg|jpeg|png|webp)$')
    AND lower(coalesce(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
  );
CREATE POLICY "Customers delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND name LIKE ('avatars/' || (SELECT auth.uid())::text || '/avatar.%'));

DO $$
BEGIN
  IF to_regclass('public.customer_sessions') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.customer_sessions FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT ALL ON public.customer_sessions TO service_role';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "admins manage customer notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "users read own notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "anon read broadcasts" ON public.customer_notifications;
DROP POLICY IF EXISTS "users mark own notifications read" ON public.customer_notifications;
CREATE POLICY "Admins manage customer notifications" ON public.customer_notifications
  FOR ALL TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));
CREATE POLICY "Customers read own notifications" ON public.customer_notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR broadcast = true);
CREATE POLICY "Customers mark own notifications read" ON public.customer_notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
REVOKE ALL ON public.customer_notifications FROM anon;
GRANT SELECT, UPDATE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;

CREATE OR REPLACE FUNCTION private.protect_customer_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF public.has_role((SELECT auth.uid()), 'admin'::public.app_role) THEN RETURN NEW; END IF;
  IF OLD.user_id <> (SELECT auth.uid())
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.customer_phone IS DISTINCT FROM OLD.customer_phone
     OR NEW.country IS DISTINCT FROM OLD.country
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.link IS DISTINCT FROM OLD.link
     OR NEW.broadcast IS DISTINCT FROM OLD.broadcast
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'notification_identity_is_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_customer_notification_update_trigger ON public.customer_notifications;
CREATE TRIGGER protect_customer_notification_update_trigger
  BEFORE UPDATE ON public.customer_notifications
  FOR EACH ROW EXECUTE FUNCTION private.protect_customer_notification_update();

-- SECURITY DEFINER functions are not browser-callable by default. Only the
-- narrowly reviewed customer and administrator entry points are re-granted.
DO $$
DECLARE
  v_function regprocedure;
BEGIN
  FOR v_function IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', v_function);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text, text) TO anon, authenticated;

DO $$
DECLARE
  v_signature text;
  v_function regprocedure;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.apply_inventory_adjustment(uuid,text,integer,text,text,text,uuid)',
    'public.coupon_usage_summary()',
    'public.create_manual_journal_entry(date,text,text,text,jsonb)',
    'public.create_refund_request(uuid,text,uuid,text,text,numeric,text,text,text,jsonb,text,text)',
    'public.currency_usage_summary()',
    'public.delete_coupon_safe(uuid)',
    'public.delete_currency_safe(text)',
    'public.delete_product_from_inventory(uuid)',
    'public.delete_refund_safe(uuid)',
    'public.get_inventory_summary()',
    'public.replace_product_inventory_skus(uuid,jsonb)',
    'public.reverse_journal_entry(uuid,date,text)',
    'public.update_refund_status(uuid,text,text)'
  ]::text[]
  LOOP
    v_function := to_regprocedure(v_signature);
    IF v_function IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', v_function);
    END IF;
  END LOOP;
END;
$$;

-- Browser roles never need schema-maintenance table privileges. Row-level
-- security does not govern these privileges, so remove inherited broad grants.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

COMMIT;
