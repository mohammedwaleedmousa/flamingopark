revoke execute on function public.mark_stale_customer_carts() from public, anon, authenticated;
grant execute on function public.mark_stale_customer_carts() to service_role;

revoke execute on function public.bind_product_review_identity() from public, anon, authenticated;
grant execute on function public.bind_product_review_identity() to service_role;

revoke execute on function public.current_customer_id() from anon;
