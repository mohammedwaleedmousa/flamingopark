-- Direct mapping table between brands and categories for admin-controlled catalog structure
CREATE TABLE IF NOT EXISTS public.brand_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (brand_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_categories_brand_id
  ON public.brand_categories (brand_id);

CREATE INDEX IF NOT EXISTS idx_brand_categories_category_id
  ON public.brand_categories (category_id);

ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_categories'
      AND policyname = 'Anyone can view brand category mapping'
  ) THEN
    CREATE POLICY "Anyone can view brand category mapping"
      ON public.brand_categories
      FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'brand_categories'
      AND policyname = 'Authenticated can manage brand category mapping'
  ) THEN
    CREATE POLICY "Authenticated can manage brand category mapping"
      ON public.brand_categories
      FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
