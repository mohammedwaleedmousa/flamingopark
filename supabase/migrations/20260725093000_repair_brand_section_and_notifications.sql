-- Phase 2: source-controlled schema repair only.
-- This is a forward migration. It does not modify the malformed historical migration.

CREATE TABLE IF NOT EXISTS public.brand_section_products (
  section_id uuid NOT NULL REFERENCES public.brand_sections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_section_products_section_sort
  ON public.brand_section_products (section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_brand_section_products_product
  ON public.brand_section_products (product_id);

GRANT SELECT ON public.brand_section_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_section_products TO authenticated;
GRANT ALL ON public.brand_section_products TO service_role;

ALTER TABLE public.brand_section_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public reads active section products" ON public.brand_section_products;
CREATE POLICY "Public reads active section products"
  ON public.brand_section_products FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.brand_sections section_row
      WHERE section_row.id = brand_section_products.section_id
        AND section_row.is_active = true
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins manage section products" ON public.brand_section_products;
CREATE POLICY "Admins manage section products"
  ON public.brand_section_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_brand_section_products_updated_at ON public.brand_section_products;
CREATE TRIGGER trg_brand_section_products_updated_at
  BEFORE UPDATE ON public.brand_section_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_phone text,
  country text,
  title text NOT NULL,
  body text NOT NULL,
  message text,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  broadcast boolean NOT NULL DEFAULT false,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reconcile the database with the current frontend payload without changing historical migrations.
ALTER TABLE public.customer_notifications
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_cust_notif_user_created
  ON public.customer_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_notif_customer_created
  ON public.customer_notifications (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_notif_phone_created
  ON public.customer_notifications (customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_notif_broadcast_created
  ON public.customer_notifications (broadcast, country, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cust_notif_public_broadcast_created
  ON public.customer_notifications (created_at DESC)
  WHERE broadcast = true AND is_public = true;

GRANT SELECT ON public.customer_notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_notifications TO authenticated;
GRANT ALL ON public.customer_notifications TO service_role;

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage customer notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "users read own notifications" ON public.customer_notifications;
DROP POLICY IF EXISTS "anon read broadcasts" ON public.customer_notifications;
DROP POLICY IF EXISTS "users mark own notifications read" ON public.customer_notifications;

CREATE POLICY "Admins manage customer notifications"
  ON public.customer_notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own or broadcast notifications"
  ON public.customer_notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      broadcast = true
      AND customer_id IS NULL
      AND user_id IS NULL
      AND customer_phone IS NULL
    )
  );

-- Anonymous reads require an explicit publication flag and cannot return targeted data.
CREATE POLICY "Anonymous reads explicitly public broadcasts"
  ON public.customer_notifications FOR SELECT TO anon
  USING (
    broadcast = true
    AND is_public = true
    AND customer_id IS NULL
    AND user_id IS NULL
    AND customer_phone IS NULL
  );

CREATE POLICY "Users mark own notifications read"
  ON public.customer_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_customer_notifications_updated_at ON public.customer_notifications;
CREATE TRIGGER update_customer_notifications_updated_at
  BEFORE UPDATE ON public.customer_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
