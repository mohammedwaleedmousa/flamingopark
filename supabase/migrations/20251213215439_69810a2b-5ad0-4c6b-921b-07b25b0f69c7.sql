-- Add product_ids column to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS product_ids uuid[] DEFAULT '{}'::uuid[];