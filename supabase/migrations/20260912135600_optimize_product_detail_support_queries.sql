-- Match the storefront PDP access patterns so inventory and Q&A queries stay fast as data grows.
create index if not exists idx_inventory_skus_product_default_label
on public.inventory_skus (product_id, is_default asc, label asc);

create index if not exists idx_product_questions_product_helpful_created
on public.product_questions (product_id, helpful_count desc, created_at desc);
