-- Phase 5.2.3A: forward-only indexes for canonical catalog filtering and ordering.
-- Existing indexes and schema relationships remain unchanged.

CREATE INDEX IF NOT EXISTS idx_products_category_id_active_created_at
  ON public.products (category_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_brand_id_active_created_at
  ON public.products (brand_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_active_created_at
  ON public.products (created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_active_featured_sort_order
  ON public.products (sort_order)
  WHERE is_active = true AND is_featured = true;

CREATE INDEX IF NOT EXISTS idx_products_active_best_seller_sort_order
  ON public.products (sort_order)
  WHERE is_active = true AND is_best_seller = true;
