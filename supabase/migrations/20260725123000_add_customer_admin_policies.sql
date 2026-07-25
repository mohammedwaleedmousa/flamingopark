-- Phase 3.1: administrators may manage all authenticated customer-owned records.
-- Existing owner policies remain unchanged.

CREATE POLICY "Admins manage all customer addresses"
  ON public.customer_addresses
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all customer favorites"
  ON public.customer_favorites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
