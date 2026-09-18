-- Product discounts must never consume delivery fees, including manual invoices.
-- Existing order amounts are not rewritten.
set lock_timeout = '5s';

alter table public.orders
  add constraint orders_discount_products_only_check
  check (
    coalesce(discount_amount, 0) >= 0
    and coalesce(discount_amount, 0) <= greatest(subtotal, 0)
  ) not valid;

alter table public.orders
  validate constraint orders_discount_products_only_check;

reset lock_timeout;
