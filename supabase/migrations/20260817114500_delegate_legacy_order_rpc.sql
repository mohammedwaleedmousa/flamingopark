-- Keep cached storefront clients compatible without preserving the legacy trust boundary.
-- The old RPC no longer creates orders itself; it resolves the delivery company and delegates
-- all validation, rate limiting, pricing, coupon handling, stock reservation, and insertion to v2.

create or replace function public.create_secure_order(
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_notes text,
  p_country text,
  p_customer_city text,
  p_customer_region text,
  p_items jsonb,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_total numeric,
  p_payment_method text,
  p_currency_mode text,
  p_currency_code text,
  p_exchange_rate_snapshot numeric,
  p_total_base numeric,
  p_coupon_code text default null,
  p_discount_amount numeric default 0
)
returns json
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_delivery_company_id uuid;
begin
  -- p_customer_id and all client totals are intentionally ignored.
  select id
  into v_delivery_company_id
  from public.delivery_companies
  where is_active = true
    and base_fee = greatest(0, coalesce(p_delivery_fee, 0))
  order by created_at desc
  limit 1;

  if v_delivery_company_id is null then
    raise exception 'invalid_delivery_company';
  end if;

  return public.create_secure_order_v2(
    p_customer_name,
    p_customer_phone,
    p_customer_address,
    p_customer_notes,
    coalesce(nullif(p_country, ''), 'YE'),
    p_customer_city,
    p_customer_region,
    p_items,
    p_payment_method,
    p_currency_mode,
    p_currency_code,
    p_coupon_code,
    v_delivery_company_id
  );
end;
$function$;

revoke all on function public.create_secure_order(uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,numeric,numeric,text,numeric) from public;
grant execute on function public.create_secure_order(uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,numeric,numeric,text,numeric) to anon, authenticated, service_role;
