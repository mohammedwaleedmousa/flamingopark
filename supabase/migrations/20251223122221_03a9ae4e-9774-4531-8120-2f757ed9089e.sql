-- Add coupon_code and discount_amount columns to orders table
ALTER TABLE public.orders 
ADD COLUMN coupon_code text DEFAULT NULL,
ADD COLUMN discount_amount numeric DEFAULT 0;