-- Restore customer authentication on the current main branch.
-- The client uses Supabase Auth sessions; legacy customer records are claimed only explicitly.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON public.customers(user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "Customer reads own record" ON public.customers;
DROP POLICY IF EXISTS "Customer updates own record" ON public.customers;

CREATE POLICY "Customer reads own record"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customer updates own record"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.link_authenticated_customer(p_claim_existing boolean DEFAULT false)
RETURNS public.customers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
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
  IF FOUND THEN
    RETURN v_customer;
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE phone = v_phone FOR UPDATE;
  IF FOUND THEN
    IF NOT p_claim_existing THEN
      RAISE EXCEPTION 'existing customer requires explicit claim';
    END IF;

    UPDATE public.customers
    SET user_id = auth.uid(), updated_at = now()
    WHERE id = v_customer.id
    RETURNING * INTO v_customer;
    RETURN v_customer;
  END IF;

  INSERT INTO public.customers (user_id, name, phone, country)
  VALUES (
    auth.uid(),
    coalesce(nullif(v_user.raw_user_meta_data->>'full_name', ''), nullif(v_user.raw_user_meta_data->>'name', ''), 'عميل'),
    v_phone,
    CASE WHEN v_user.raw_user_meta_data->>'country' IN ('SA', 'YE') THEN v_user.raw_user_meta_data->>'country' ELSE 'SA' END
  )
  RETURNING * INTO v_customer;

  RETURN v_customer;
END;
$$;

REVOKE ALL ON FUNCTION public.link_authenticated_customer(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_authenticated_customer(boolean) TO authenticated;
