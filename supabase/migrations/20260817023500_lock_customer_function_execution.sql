revoke execute on function public.customer_register(text,text,text,text,text) from public, anon, authenticated;

revoke execute on function public.customer_self(uuid,text) from public, anon;
grant execute on function public.customer_self(uuid,text) to authenticated;

revoke execute on function public.customer_update_self(uuid,text,text,text,text) from public, anon;
grant execute on function public.customer_update_self(uuid,text,text,text,text) to authenticated;

revoke execute on function public.normalize_customer_address_owner() from public, anon, authenticated;

revoke execute on function public.get_order_by_tracking(text,text) from public, anon, authenticated;

revoke execute on function public.customer_login(text,text) from public;
grant execute on function public.customer_login(text,text) to anon, authenticated, service_role;

revoke execute on function public.create_secure_order(uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,numeric,numeric,text,numeric) from public;
grant execute on function public.create_secure_order(uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,numeric,numeric,text,numeric) to anon, authenticated, service_role;

revoke execute on function public.get_order_tracking(text,text) from public;
grant execute on function public.get_order_tracking(text,text) to anon, authenticated, service_role;
