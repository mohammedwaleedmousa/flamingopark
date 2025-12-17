-- Add countries column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS countries text[] DEFAULT '{SA,YE}'::text[];

-- Update existing categories to have both countries
UPDATE public.categories SET countries = '{SA,YE}'::text[] WHERE countries IS NULL;