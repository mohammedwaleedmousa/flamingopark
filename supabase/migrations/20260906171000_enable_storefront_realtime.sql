-- Enable Supabase Realtime for customer-facing storefront data.
-- This is idempotent so it is safe when some tables are already in the publication.
DO $$
DECLARE
  table_name text;
  realtime_tables text[] := ARRAY[
    'products',
    'inventory_skus',
    'size_price_rules',
    'categories',
    'brands',
    'brand_categories',
    'brand_pages',
    'brand_banners',
    'brand_sections',
    'brand_filters',
    'product_brand_filters',
    'brand_section_pages',
    'brand_section_products',
    'banners',
    'homepage_sections',
    'site_settings',
    'site_content',
    'offers',
    'offers_settings',
    'campaign_pages',
    'delivery_companies',
    'cod_regions',
    'payment_methods',
    'currencies',
    'countries',
    'product_reviews',
    'reviews',
    'product_questions',
    'orders'
  ];
BEGIN
  FOREACH table_name IN ARRAY realtime_tables
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      )
    THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        table_name
      );
    END IF;
  END LOOP;
END
$$;
