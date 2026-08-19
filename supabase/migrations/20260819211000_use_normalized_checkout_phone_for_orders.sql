-- Ensure checkout always writes the normalized phone submitted by the client.
-- This avoids legacy customer profile phone values (for example malformed Yemen numbers)
-- from overriding the validated checkout phone and causing invalid_yemen_phone.

do $migration$
declare
  ddl text;
  old_fragment text := 'case when v_user_id is null then left(btrim(p_customer_phone),40) else v_customer.phone end';
  new_fragment text := 'left(btrim(p_customer_phone),40)';
begin
  select pg_get_functiondef('public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid)'::regprocedure) into ddl;

  if position(old_fragment in ddl) > 0 then
    ddl := replace(ddl, old_fragment, new_fragment);
    execute ddl;
  end if;
end
$migration$;
