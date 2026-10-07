-- Defense-in-depth: only intended public checkout/tracking functions remain callable by guests.
revoke execute on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) from anon, authenticated;
revoke execute on function public.customer_clear_avatar() from anon;
revoke execute on function public.enforce_required_order_item_options() from anon, authenticated;
