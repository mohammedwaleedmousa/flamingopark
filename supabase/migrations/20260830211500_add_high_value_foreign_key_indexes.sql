-- Cover high-value foreign keys used by order/customer workflows.
-- Index-only change: no storefront/UI behavior changes.
create index if not exists orders_customer_id_idx
  on public.orders(customer_id);

create index if not exists orders_delivery_company_id_idx
  on public.orders(delivery_company_id);

create index if not exists customer_carts_converted_order_id_idx
  on public.customer_carts(converted_order_id)
  where converted_order_id is not null;

create index if not exists invoices_order_id_idx
  on public.invoices(order_id);

create index if not exists admin_notifications_related_order_id_idx
  on public.admin_notifications(related_order_id)
  where related_order_id is not null;

create index if not exists customer_addresses_customer_id_idx
  on public.customer_addresses(customer_id)
  where customer_id is not null;

create index if not exists customer_favorites_customer_id_idx
  on public.customer_favorites(customer_id)
  where customer_id is not null;
