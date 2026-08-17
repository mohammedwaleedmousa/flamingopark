-- Connect checkout validation to payment methods managed by the admin dashboard.
do $$
declare
  ddl text;
  old_fragment text := 'if p_payment_method not in (''cod'',''bank'') then raise exception ''invalid_payment_method''; end if;';
  new_fragment text := 'if not exists (select 1 from public.payment_methods pm where pm.is_active = true and (pm.code = p_payment_method or (p_payment_method = ''cod'' and pm.type = ''cash''))) then raise exception ''invalid_payment_method''; end if;';
begin
  select pg_get_functiondef('public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid)'::regprocedure) into ddl;
  if position(old_fragment in ddl) = 0 then
    raise exception 'create_secure_order_v2 payment validation fragment not found';
  end if;
  ddl := replace(ddl, old_fragment, new_fragment);
  execute ddl;
end $$;
