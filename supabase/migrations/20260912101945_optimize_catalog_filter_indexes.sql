create index if not exists idx_products_active_sizes_gin
  on public.products using gin (sizes)
  where is_active = true;

create index if not exists idx_products_active_color_variants_gin
  on public.products using gin (color_variants)
  where is_active = true;

create index if not exists idx_products_active_in_stock_category_created
  on public.products (category_id, created_at desc)
  where is_active = true and in_stock = true;

create index if not exists idx_products_active_in_stock_brand_created
  on public.products (brand, created_at desc)
  where is_active = true and in_stock = true;

analyze public.products;
