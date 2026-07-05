ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_variants JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.color_variants IS 'Array of {name, hex, images[]} for per-color image swap on product detail.';