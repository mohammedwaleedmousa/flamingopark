
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

INSERT INTO public.site_settings (key, value)
VALUES (
  'currency_rates',
  '{"base":"SAR","yer_south":410,"yer_north":140,"enabled":["SAR","YER_SOUTH","YER_NORTH"]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value)
VALUES (
  'hero_banner_grid',
  '{"main":{"image":"","title_ar":"مجموعة الموسم","subtitle_ar":"إطلالات جديدة تنتظرك","cta_ar":"تسوق الآن","link":"/products"},"side_top":{"image":"","title_ar":"الأكثر مبيعاً","link":"/best-sellers"},"side_bottom":{"image":"","title_ar":"وصل حديثاً","link":"/new-arrivals"}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
