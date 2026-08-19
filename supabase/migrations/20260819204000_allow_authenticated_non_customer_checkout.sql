-- Some legacy/authenticated users can have an auth.users row without a matching
-- public.customers profile. Do not block checkout for those sessions; fall back
-- to the same validated name/phone identity used by guest checkout.

do $migration$
declare
  ddl text;
  old_fragment text := $old$if v_user_id is not null then select * into v_customer from public.customers where user_id=v_user_id limit 1; if v_customer.id is null then raise exception 'customer_profile_required'; end if; v_identity:='u:'||v_user_id::text; else if nullif(regexp_replace(coalesce(p_customer_phone,''),'[^0-9+]','','g'),'') is null then raise exception 'phone_required'; end if; if nullif(btrim(coalesce(p_customer_name,'')),'') is null then raise exception 'name_required'; end if; v_identity:='p:'||regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'); end if;$old$;
  new_fragment text := $new$if v_user_id is not null then select * into v_customer from public.customers where user_id=v_user_id limit 1; if v_customer.id is not null then v_identity:='u:'||v_user_id::text; else v_user_id:=null; if nullif(regexp_replace(coalesce(p_customer_phone,''),'[^0-9+]','','g'),'') is null then raise exception 'phone_required'; end if; if nullif(btrim(coalesce(p_customer_name,'')),'') is null then raise exception 'name_required'; end if; v_identity:='p:'||regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'); end if; else if nullif(regexp_replace(coalesce(p_customer_phone,''),'[^0-9+]','','g'),'') is null then raise exception 'phone_required'; end if; if nullif(btrim(coalesce(p_customer_name,'')),'') is null then raise exception 'name_required'; end if; v_identity:='p:'||regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g'); end if;$new$;
begin
  select pg_get_functiondef('public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid)'::regprocedure) into ddl;

  if position('customer_profile_required' in ddl) = 0 then
    return;
  end if;

  if position(old_fragment in ddl) = 0 then
    raise exception 'create_secure_order_v2 customer identity fragment not found';
  end if;

  ddl := replace(ddl, old_fragment, new_fragment);
  execute ddl;
end
$migration$;
