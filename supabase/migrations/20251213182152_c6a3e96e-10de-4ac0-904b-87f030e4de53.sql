
-- Add section_ids array to products table
ALTER TABLE public.products 
ADD COLUMN section_ids UUID[] DEFAULT '{}'::uuid[];

-- Create index for better query performance
CREATE INDEX idx_products_section_ids ON public.products USING GIN(section_ids);
