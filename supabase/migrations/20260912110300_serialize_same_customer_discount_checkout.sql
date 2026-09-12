do $migration$
declare
  v_ddl text;
  v_old text := $$  if v_phone_key = '' then
    raise exception 'phone_required';
  end if;

  select exists($$;
  v_new text := $$  if v_phone_key = '' then
    raise exception 'phone_required';
  end if;

  -- Serialize checkout only for the same normalized phone number. This prevents
  -- concurrent submissions from racing the one-time discount/referral benefit
  -- while preserving full concurrency across different customers.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_phone_key, 0));

  select exists($$;
begin
  select pg_get_functiondef(p.oid)
    into v_ddl
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_secure_order_v3'
  limit 1;

  if v_ddl is null then
    raise exception 'create_secure_order_v3_not_found';
  end if;

  if position(v_old in v_ddl) = 0 then
    raise exception 'create_secure_order_v3_anchor_not_found';
  end if;

  v_ddl := replace(v_ddl, v_old, v_new);
  execute v_ddl;
end
$migration$;
