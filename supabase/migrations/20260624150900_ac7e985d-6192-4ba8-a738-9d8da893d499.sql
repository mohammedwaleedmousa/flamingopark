-- Enable trigram extension for fast ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PRODUCTS indexes
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_countries_gin ON public.products USING GIN(countries);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_name_ar_trgm ON public.products USING GIN(name_ar gin_trgm_ops);

-- ORDERS indexes
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_country ON public.orders(country);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_number_trgm ON public.orders USING GIN(order_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name_trgm ON public.orders USING GIN(customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_beneficiary_id ON public.orders(beneficiary_id);

-- CUSTOMERS indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_country ON public.customers(country);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING GIN(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm ON public.customers USING GIN(phone gin_trgm_ops);

-- ORDERS_ARCHIVE indexes
CREATE INDEX IF NOT EXISTS idx_orders_archive_created_at ON public.orders_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_archive_status ON public.orders_archive(status);
CREATE INDEX IF NOT EXISTS idx_orders_archive_country ON public.orders_archive(country);
CREATE INDEX IF NOT EXISTS idx_orders_archive_order_number_trgm ON public.orders_archive USING GIN(order_number gin_trgm_ops);

-- ADMIN NOTIFICATIONS index
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);