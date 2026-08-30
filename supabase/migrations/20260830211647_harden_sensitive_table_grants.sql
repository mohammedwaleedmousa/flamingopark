-- Defense-in-depth for sensitive storefront/admin tables.
-- RLS remains the row-level authorization layer; these grants restrict each API role
-- to the table operations it actually needs.

revoke all on table public.orders from anon;
revoke all on table public.customers from anon;
revoke all on table public.customer_carts from anon;
revoke all on table public.refunds from anon;
revoke all on table public.inventory_skus from anon;
revoke all on table public.analytics_events from anon;

grant select on table public.inventory_skus to anon;
grant insert on table public.analytics_events to anon;

revoke truncate, trigger, references on table public.orders from authenticated;
revoke truncate, trigger, references on table public.customers from authenticated;
revoke truncate, trigger, references on table public.customer_carts from authenticated;
revoke truncate, trigger, references on table public.analytics_events from authenticated;
revoke truncate, trigger, references on table public.refunds from authenticated;
revoke truncate, trigger, references on table public.inventory_skus from authenticated;

revoke delete on table public.customer_carts from authenticated;
revoke delete, update on table public.analytics_events from authenticated;
