-- Private invoice storage aligned with Phase 4.1 order ownership.
-- Existing files are retained; recognized legacy public Storage URLs become private paths.

UPDATE public.orders
SET invoice_url = regexp_replace(
  invoice_url,
  '^https?://[^/]+/storage/v1/object/public/invoices/',
  ''
)
WHERE invoice_url ~ '^https?://[^/]+/storage/v1/object/public/invoices/';

UPDATE storage.buckets SET public = false WHERE id = 'invoices';

DROP POLICY IF EXISTS "Anyone can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from invoices bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage private invoices" ON storage.objects;

CREATE POLICY "Admins manage private invoices"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'::app_role));
