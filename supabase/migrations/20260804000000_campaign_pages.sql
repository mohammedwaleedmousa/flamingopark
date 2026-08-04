CREATE TABLE IF NOT EXISTS public.campaign_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  title_ar text NOT NULL,
  description text,
  description_ar text,
  image_url text,
  cta_label text,
  page_type text NOT NULL DEFAULT 'campaign' CHECK (page_type IN ('campaign', 'service')),
  product_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pages_active_order ON public.campaign_pages (page_type, is_active, sort_order);

ALTER TABLE public.campaign_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active campaign pages"
  ON public.campaign_pages FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage campaign pages"
  ON public.campaign_pages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER campaign_pages_updated_at
  BEFORE UPDATE ON public.campaign_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();