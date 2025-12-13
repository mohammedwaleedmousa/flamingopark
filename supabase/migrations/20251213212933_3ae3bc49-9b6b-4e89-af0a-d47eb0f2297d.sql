-- Add delete policy for admins on invoices bucket
CREATE POLICY "Admins can delete from invoices bucket"
ON storage.objects
FOR DELETE
USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));