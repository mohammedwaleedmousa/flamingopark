-- Trigger functions should only be invoked by PostgreSQL triggers, not through the exposed RPC API.
revoke all on function public.capture_product_cost_price() from public;
revoke all on function public.capture_product_cost_price() from anon;
revoke all on function public.capture_product_cost_price() from authenticated;

revoke all on function public.normalize_product_price_draft() from public;
revoke all on function public.normalize_product_price_draft() from anon;
revoke all on function public.normalize_product_price_draft() from authenticated;
