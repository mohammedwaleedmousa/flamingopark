CREATE TABLE IF NOT EXISTS public.product_recommendations (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recommended_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, recommended_product_id),
  CHECK (product_id <> recommended_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_recommendations_product ON public.product_recommendations(product_id, sort_order);

ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads product recommendations"
  ON public.product_recommendations FOR SELECT USING (true);

CREATE POLICY "Admins manage product recommendations"
  ON public.product_recommendations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));