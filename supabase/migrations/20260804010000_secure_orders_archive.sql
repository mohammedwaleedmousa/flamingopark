DROP POLICY IF EXISTS "Orders archive is readable by everyone" ON public.orders_archive;

CREATE POLICY "Admins read archived orders"
  ON public.orders_archive
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));