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
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
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
  IF coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
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

COMMIT;
