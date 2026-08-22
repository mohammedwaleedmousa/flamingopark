create index if not exists idx_products_active_created_at
  on public.products (created_at desc)
  where is_active = true;

create index if not exists idx_products_active_category_created
  on public.products (category_id, created_at desc)
  where is_active = true;

create index if not exists idx_products_active_brand_created
  on public.products (brand, created_at desc)
  where is_active = true;

create index if not exists idx_products_active_price
  on public.products (price)
  where is_active = true;

create index if not exists idx_products_active_best_seller_created
  on public.products (created_at desc)
  where is_active = true and is_best_seller = true;

create index if not exists idx_products_active_featured_created
  on public.products (created_at desc)
  where is_active = true and is_featured = true;
