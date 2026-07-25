-- Phase 4.1: authenticated order ownership and secure guest tracking.
-- Existing orders remain unclaimed and admin-only; customer_id remains unchanged.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS guest_access_token_hash text,
  ADD COLUMN IF NOT EXISTS guest_access_token_issued_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_owner_user_created
  ON public.orders (owner_user_id, created_at DESC)
  WHERE owner_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_order_owner_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_owner_on_insert ON public.orders;
CREATE TRIGGER set_order_owner_on_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_owner_on_insert();

-- Remove public enumeration. Guest tracking uses the verified Edge Function instead.
DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;
DROP POLICY IF EXISTS "Customer reads own orders" ON public.orders;

CREATE POLICY "Customers read owned orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (owner_user_id = auth.uid());

-- Preserve guest checkout inserts. Authenticated ownership is assigned by the trigger.
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (owner_user_id IS NULL OR owner_user_id = auth.uid());

-- Historical archives are private operational records.
DROP POLICY IF EXISTS "Orders archive is readable by everyone" ON public.orders_archive;
DROP POLICY IF EXISTS "Admins can manage orders archive" ON public.orders_archive;
CREATE POLICY "Admins manage orders archive"
  ON public.orders_archive
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
