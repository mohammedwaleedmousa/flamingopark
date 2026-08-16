create or replace function public.validate_customer_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_coupon public.coupons;
begin
  if nullif(btrim(coalesce(p_code,'')), '') is null or length(btrim(p_code)) > 100 then
    return jsonb_build_object('valid',false);
  end if;

  select * into v_coupon
  from public.coupons
  where upper(btrim(code))=upper(btrim(p_code))
    and coalesce(is_active,true)=true
  limit 1;

  if v_coupon.id is null then return jsonb_build_object('valid',false); end if;

  return jsonb_build_object('valid',true,'type',v_coupon.type,'value',v_coupon.value,'code',v_coupon.code);
end;
$$;

revoke execute on function public.validate_customer_coupon(text) from public;
grant execute on function public.validate_customer_coupon(text) to anon, authenticated, service_role;
