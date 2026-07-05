-- Add customer_city, coupon_code, and discount_amount columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_city TEXT,
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.customer_city IS 'City/Province of delivery address';
COMMENT ON COLUMN public.orders.coupon_code IS 'Applied coupon code if any';
COMMENT ON COLUMN public.orders.discount_amount IS 'Total discount amount applied to order';
