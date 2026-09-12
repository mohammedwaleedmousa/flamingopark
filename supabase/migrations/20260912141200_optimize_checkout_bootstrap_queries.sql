create index if not exists idx_delivery_companies_active_name
  on public.delivery_companies (name)
  where is_active = true;

create index if not exists idx_payment_methods_active_sort
  on public.payment_methods (sort_order)
  where is_active = true;

create index if not exists idx_cod_regions_active_name_ar
  on public.cod_regions (region_name_ar)
  where is_active = true;

create index if not exists idx_customer_addresses_user_default_updated
  on public.customer_addresses (user_id, is_default desc, updated_at desc)
  where user_id is not null;

analyze public.delivery_companies;
analyze public.payment_methods;
analyze public.cod_regions;
analyze public.customer_addresses;
