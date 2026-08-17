-- Keep legacy password verification available only to trusted server-side code.
-- The storefront migrates old accounts through the legacy-customer-migrate Edge Function.
revoke all on function public.customer_login(text, text) from public;
revoke all on function public.customer_login(text, text) from anon;
revoke all on function public.customer_login(text, text) from authenticated;
grant execute on function public.customer_login(text, text) to service_role;
