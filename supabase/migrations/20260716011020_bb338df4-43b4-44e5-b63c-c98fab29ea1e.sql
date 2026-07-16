-- 1) Product-level extensions
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS return_policy TEXT,
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS has_quality_variants BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_variants JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.specs IS 'Array of {label, value} pairs shown on product page';
COMMENT ON COLUMN public.products.quality_variants IS 'Array of {id, name, price, description, images[], in_stock}';

-- 2) Global defaults in site_settings
INSERT INTO public.site_settings (key, value)
VALUES
  ('default_return_policy', to_jsonb('يمكنك إرجاع المنتج خلال 7 أيام من تاريخ الاستلام بشرط أن يكون بحالته الأصلية دون استخدام. لا تُقبل إرجاعات المنتجات المخصصة أو المفتوحة.'::text)),
  ('default_display_currency', to_jsonb('SAR'::text))
ON CONFLICT (key) DO NOTHING;