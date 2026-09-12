do $migration$
declare
  v_ddl text;
  v_old text := 'perform private.consume_order_submission_limit(v_ip_identity,12,50);';
  v_new text := 'perform private.consume_order_submission_limit(v_ip_identity,120,1000);';
begin
  select pg_get_functiondef(p.oid)
    into v_ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_secure_order_v2'
  limit 1;

  if v_ddl is null then
    raise exception 'create_secure_order_v2_not_found';
  end if;

  if position(v_old in v_ddl) = 0 then
    raise exception 'create_secure_order_v2_rate_limit_anchor_not_found';
  end if;

  v_ddl := replace(v_ddl, v_old, v_new);
  execute v_ddl;
end
$migration$;
