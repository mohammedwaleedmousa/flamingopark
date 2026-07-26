-- Make invoices private and leave legacy records/files intact.
-- Legacy external URLs remain accessible to administrators only.

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
