-- Secure private invoice storage with authenticated ownership and guest access tokens.
-- Existing invoice files are retained; legacy invoices remain available to admins.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_access_token_hash text,
  ADD COLUMN IF NOT EXISTS invoice_access_token_issued_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_invoice_owner_user_id
  ON public.orders (invoice_owner_user_id)
  WHERE invoice_owner_user_id IS NOT NULL;

-- Preserve legacy invoice records without guessing customer ownership. Convert only
-- recognizable public Storage URLs into private bucket paths; unmatched legacy rows
-- remain accessible to admins but not customers.
UPDATE public.orders
SET invoice_url = regexp_replace(
  invoice_url,
  '^https?://[^/]+/storage/v1/object/public/invoices/',
  ''
)
WHERE invoice_url ~ '^https?://[^/]+/storage/v1/object/public/invoices/';

CREATE OR REPLACE FUNCTION public.set_invoice_owner_on_order_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.invoice_owner_user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_invoice_owner_on_order_insert ON public.orders;
CREATE TRIGGER set_invoice_owner_on_order_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_owner_on_order_insert();

-- Private bucket: signed URLs are issued only by the verified edge-access flow.
UPDATE storage.buckets SET public = false WHERE id = 'invoices';

DROP POLICY IF EXISTS "Anyone can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage invoices" ON storage.objects;

CREATE POLICY "Admins manage private invoices"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));
