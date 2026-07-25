-- Phase 3: authenticated customer identity, addresses, and favorites.
-- Existing customer records remain unlinked until a verified identity explicitly claims them.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id) WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Customer reads own record" ON public.customers;
DROP POLICY IF EXISTS "Customer updates own record" ON public.customers;
CREATE POLICY "Customer reads own record" ON public.customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Customer updates own record" ON public.customers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.link_authenticated_customer(p_claim_existing boolean DEFAULT false)
RETURNS public.customers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_phone text;
  v_customer public.customers%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND OR v_user.phone_confirmed_at IS NULL OR coalesce(v_user.phone, '') = '' THEN
    RAISE EXCEPTION 'verified phone authentication is required';
  END IF;
  v_phone := v_user.phone;

  SELECT * INTO v_customer FROM public.customers WHERE user_id = auth.uid();
  IF FOUND THEN RETURN v_customer; END IF;

  SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone FOR UPDATE;
  IF FOUND THEN
    IF NOT p_claim_existing THEN
      RAISE EXCEPTION 'existing customer requires explicit claim';
    END IF;
    UPDATE public.customers SET user_id = auth.uid(), updated_at = now() WHERE id = v_customer.id RETURNING * INTO v_customer;
    RETURN v_customer;
  END IF;

  INSERT INTO public.customers (user_id, name, phone, country)
  VALUES (
    auth.uid(),
    coalesce(nullif(v_user.raw_user_meta_data->>'full_name', ''), nullif(v_user.raw_user_meta_data->>'name', ''), 'عميل'),
    v_phone,
    CASE WHEN v_user.raw_user_meta_data->>'country' IN ('SA', 'YE') THEN v_user.raw_user_meta_data->>'country' ELSE 'SA' END
  ) RETURNING * INTO v_customer;
  RETURN v_customer;
END;
$$;
REVOKE ALL ON FUNCTION public.link_authenticated_customer(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_authenticated_customer(boolean) TO authenticated;

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  label text NOT NULL,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_updated ON public.customer_addresses(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_addresses_one_default ON public.customer_addresses(user_id) WHERE is_default;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.customer_addresses FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_user_created ON public.customer_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer ON public.customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_product ON public.customer_favorites(product_id);
GRANT SELECT, INSERT, DELETE ON public.customer_favorites TO authenticated;
GRANT ALL ON public.customer_favorites TO service_role;
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.customer_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
