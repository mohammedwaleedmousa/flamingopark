-- Add sizes and accessories columns to products table
ALTER TABLE public.products 
ADD COLUMN has_sizes BOOLEAN DEFAULT false,
ADD COLUMN sizes TEXT[] DEFAULT '{}',
ADD COLUMN accessories JSONB DEFAULT '[]';

-- accessories format: [{"name": "سلسلة ذهبية", "name_ar": "سلسلة ذهبية", "price": 50}, ...]

COMMENT ON COLUMN public.products.has_sizes IS 'Whether this product has size options';
COMMENT ON COLUMN public.products.sizes IS 'Array of available sizes like S, M, L, XL or custom sizes';
COMMENT ON COLUMN public.products.accessories IS 'JSON array of accessories with name, name_ar, and price';