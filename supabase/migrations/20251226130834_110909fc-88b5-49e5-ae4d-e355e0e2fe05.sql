-- Add sort_order column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON public.products(sort_order);

-- Update existing products to have a default sort_order based on created_at
UPDATE public.products 
SET sort_order = EXTRACT(EPOCH FROM created_at)::integer 
WHERE sort_order = 0 OR sort_order IS NULL;