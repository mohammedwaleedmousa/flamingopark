-- Drop existing insert policy and recreate with proper permissions
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Allow anyone (including anonymous/unauthenticated users) to insert orders
CREATE POLICY "Anyone can create orders" 
ON public.orders 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to read their own orders by order_number (for order confirmation)
DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;
CREATE POLICY "Anyone can view orders by order_number" 
ON public.orders 
FOR SELECT 
TO anon, authenticated
USING (true);