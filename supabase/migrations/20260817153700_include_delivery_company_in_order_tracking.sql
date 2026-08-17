create or replace function public.get_order_tracking(p_order_number text, p_tracking_token text)
returns json
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  result json;
begin
  select json_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'customer_name', o.customer_name,
    'customer_city', o.customer_city,
    'total', o.total,
    'currency_code', o.currency_code,
    'created_at', o.created_at,
    'items', o.items,
    'delivery_company_id', o.delivery_company_id,
    'delivery_company_name', dc.name,
    'delivery_fee', o.delivery_fee,
    'delivery_days', dc.delivery_days
  )
  into result
  from public.orders o
  left join public.delivery_companies dc on dc.id = o.delivery_company_id
  where o.order_number = p_order_number
    and o.tracking_token_hash = encode(extensions.digest(p_tracking_token, 'sha256'), 'hex');

  return result;
end;
$function$;
