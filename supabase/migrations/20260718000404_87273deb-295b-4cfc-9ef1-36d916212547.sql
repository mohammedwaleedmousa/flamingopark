-- Make legacy text columns nullable (superseded by brand_id/category_id FKs)
ALTER TABLE public.products ALTER COLUMN category DROP NOT NULL;
ALTER TABLE public.products ALTER COLUMN brand DROP NOT NULL;

-- Bridge table for brand<->category mapping used by admin product form
CREATE TABLE IF NOT EXISTS public.brand_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, category_id)
);

GRANT SELECT ON public.brand_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_categories TO authenticated;
GRANT ALL ON public.brand_categories TO service_role;

ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_categories readable by all"
  ON public.brand_categories FOR SELECT USING (true);

CREATE POLICY "brand_categories admin write"
  ON public.brand_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));