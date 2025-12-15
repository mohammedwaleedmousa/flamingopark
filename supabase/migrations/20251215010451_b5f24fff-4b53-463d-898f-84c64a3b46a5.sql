-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Customers can read own data" ON public.customers;

-- Create a more restrictive policy: admins can read all, others cannot read any
-- The INSERT policy already allows registration, and admin can manage all
-- For phone lookup during registration, we'll handle this differently in the app
CREATE POLICY "Only admins can read customers"
ON public.customers
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));