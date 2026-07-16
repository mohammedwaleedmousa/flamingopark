CREATE TABLE IF NOT EXISTS public.brand_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  filter_type TEXT NOT NULL DEFAULT 'multi',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, slug)
);

GRANT SELECT ON public.brand_filters TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_filters TO authenticated;
GRANT ALL ON public.brand_filters TO service_role;

ALTER TABLE public.brand_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active brand filters"
  ON public.brand_filters FOR SELECT
  USING (true);

CREATE POLICY "Admins manage brand filters"
  ON public.brand_filters FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_brand_filters_updated_at
  BEFORE UPDATE ON public.brand_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS brand_filters_brand_id_idx ON public.brand_filters(brand_id);