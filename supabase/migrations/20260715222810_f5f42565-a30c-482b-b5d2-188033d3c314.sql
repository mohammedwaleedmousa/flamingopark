
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS hero_image text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.brands
SET slug = lower(regexp_replace(trim(name), '\s+', '-', 'g'))
WHERE slug IS NULL OR slug = '';

-- Dedupe: append short id suffix to any duplicates
WITH ranked AS (
  SELECT id, slug,
    row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.brands
)
UPDATE public.brands b
SET slug = b.slug || '-' || substr(b.id::text, 1, 6)
FROM ranked r
WHERE b.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_unique ON public.brands(slug);

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.brand_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  image_url text,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

GRANT SELECT ON public.brand_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_sections TO authenticated;
GRANT ALL ON public.brand_sections TO service_role;

ALTER TABLE public.brand_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active brand sections" ON public.brand_sections;
CREATE POLICY "Public can view active brand sections"
ON public.brand_sections FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage brand sections" ON public.brand_sections;
CREATE POLICY "Admins manage brand sections"
ON public.brand_sections FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_brand_sections_updated_at ON public.brand_sections;
CREATE TRIGGER trg_brand_sections_updated_at
BEFORE UPDATE ON public.brand_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS brand_sections_brand_idx ON public.brand_sections(brand_id, sort_order);
