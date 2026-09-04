-- Close legacy product-cost exposure, make order currency snapshots consistent,
-- and prevent phone rotation from bypassing checkout throttling.

-- Internal, transaction-safe limiter shared by customer and network identities.
create or replace function private.consume_order_submission_limit(
  p_identity_key text,
  p_window_limit integer,
  p_day_limit integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit public.order_submission_limits%rowtype;
begin
  if nullif(btrim(coalesce(p_identity_key,'')),'') is null then
    raise exception 'invalid_order_identity';
  end if;

  insert into public.order_submission_limits(identity_key)
  values(p_identity_key)
  on conflict(identity_key) do nothing;

  select *
  into v_limit
  from public.order_submission_limits
  where identity_key=p_identity_key
  for update;

  if v_limit.day_started_at <> current_date then
    v_limit.day_started_at:=current_date;
    v_limit.day_count:=0;
  end if;

  if v_limit.window_started_at < now()-interval '10 minutes' then
    v_limit.window_started_at:=now();
    v_limit.window_count:=0;
  end if;

  if v_limit.window_count >= greatest(1,p_window_limit)
    or v_limit.day_count >= greatest(1,p_day_limit) then
    raise exception 'order_rate_limit';
  end if;

  update public.order_submission_limits
  set window_started_at=v_limit.window_started_at,
      window_count=v_limit.window_count+1,
      day_started_at=v_limit.day_started_at,
      day_count=v_limit.day_count+1,
      updated_at=now()
  where identity_key=p_identity_key;
end;
$$;

revoke all on function private.consume_order_submission_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function private.consume_order_submission_limit(text,integer,integer) to service_role;

CREATE OR REPLACE FUNCTION public.create_secure_order_v2(p_customer_name text, p_customer_phone text, p_customer_address text, p_customer_notes text, p_country text, p_customer_city text, p_customer_region text, p_items jsonb, p_payment_method text, p_currency_mode text, p_currency_code text, p_coupon_code text DEFAULT NULL::text, p_delivery_company_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_sku public.inventory_skus%rowtype;
  v_sku_count integer;
  v_qty integer;
  v_unit numeric;
  v_accessories numeric;
  v_acc jsonb;
  v_acc_def jsonb;
  v_acc_qty integer;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_coupon public.coupons%rowtype;
  v_delivery public.delivery_companies%rowtype;
  v_tracking text := encode(gen_random_bytes(24),'hex');
  v_order public.orders%rowtype;
  v_safe_items jsonb := '[]'::jsonb;
  v_safe_accessories jsonb;
  v_reservations jsonb := '{}'::jsonb;
  v_reservation jsonb;
  v_res_key text;
  v_prev_reserved integer;
  v_selected_size text;
  v_selected_color text;
  v_identity text;
  v_order_number text;
  v_currency public.currencies%rowtype;
  v_currency_code text;
  v_rate numeric;
  v_precision integer;
  v_subtotal_native numeric := 0;
  v_discount_native numeric := 0;
  v_delivery_fee_native numeric := 0;
  v_total_native numeric := 0;
  v_acc_price numeric;
  v_headers jsonb := '{}'::jsonb;
  v_client_ip text;
  v_ip_identity text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_items';
  end if;

  v_currency_code := upper(btrim(coalesce(nullif(p_currency_code,''),nullif(p_currency_mode,''),'SAR')));

  if upper(btrim(coalesce(nullif(p_currency_mode,''),v_currency_code))) <> v_currency_code then
    raise exception 'invalid_currency';
  end if;

  select *
  into v_currency
  from public.currencies
  where code = v_currency_code
    and is_active = true
    and rate_to_base > 0
  limit 1;

  if v_currency.code is null then raise exception 'invalid_currency'; end if;

  v_rate := v_currency.rate_to_base;
  v_precision := case when v_currency.is_base or v_currency.code = 'SAR' then 2 else 0 end;

  if not exists (
    select 1
    from public.payment_methods pm
    where pm.is_active = true
      and (pm.code = p_payment_method or (p_payment_method = 'cod' and pm.type = 'cash'))
  ) then
    raise exception 'invalid_payment_method';
  end if;

  if nullif(btrim(coalesce(p_customer_address,'')),'') is null then raise exception 'address_required'; end if;
  if nullif(btrim(coalesce(p_customer_city,'')),'') is null then raise exception 'city_required'; end if;

  if v_user_id is not null then
    select * into v_customer from public.customers where user_id = v_user_id limit 1;

    if v_customer.id is null then
      if nullif(regexp_replace(coalesce(p_customer_phone,''),'[^0-9+]','','g'),'') is null then raise exception 'phone_required'; end if;
      if nullif(btrim(coalesce(p_customer_name,'')),'') is null then raise exception 'name_required'; end if;
    end if;

    v_identity := 'u:' || v_user_id::text;
  else
    if nullif(regexp_replace(coalesce(p_customer_phone,''),'[^0-9+]','','g'),'') is null then raise exception 'phone_required'; end if;
    if nullif(btrim(coalesce(p_customer_name,'')),'') is null then raise exception 'name_required'; end if;
    v_identity := 'p:' || regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  end if;

  perform private.consume_order_submission_limit(v_identity,5,25);

  begin
    v_headers := coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  v_client_ip := btrim(split_part(coalesce(
    v_headers->>'cf-connecting-ip',
    v_headers->>'x-forwarded-for',
    v_headers->>'x-real-ip',
    ''
  ),',',1));

  if v_client_ip <> '' then
    v_ip_identity := 'ip:' || encode(extensions.digest(v_client_ip,'sha256'),'hex');
    perform private.consume_order_submission_limit(v_ip_identity,12,50);
  end if;

  if p_delivery_company_id is null then raise exception 'delivery_company_required'; end if;
  select * into v_delivery from public.delivery_companies where id=p_delivery_company_id and is_active=true limit 1;
  if v_delivery.id is null then raise exception 'invalid_delivery_company'; end if;
  v_delivery_fee := greatest(0,coalesce(v_delivery.base_fee,0));
  v_delivery_fee_native := round(v_delivery_fee*v_rate,v_precision);

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin v_qty := (v_item->>'quantity')::integer; exception when others then raise exception 'invalid_quantity'; end;
    if v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    begin
      select * into v_product from public.products where id=(v_item->>'product_id')::uuid and is_active=true for update;
    exception when others then
      raise exception 'invalid_product';
    end;

    if v_product.id is null or coalesce(v_product.in_stock,true)=false then raise exception 'product_unavailable'; end if;

    v_selected_size := nullif(btrim(v_item->>'selected_size'),'');
    v_selected_color := nullif(btrim(v_item->>'selected_color'),'');
    v_sku.id := null;
    select count(*) into v_sku_count from public.inventory_skus where product_id=v_product.id;

    if v_sku_count > 0 then
      if v_selected_color is not null and v_selected_size is not null then
        select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=false and lower(btrim(coalesce(color_name,'')))=lower(v_selected_color) and btrim(coalesce(size,''))=v_selected_size order by created_at limit 1 for update;
      elsif v_selected_size is not null then
        if (select count(*) from public.inventory_skus where product_id=v_product.id and is_default=false and btrim(coalesce(size,''))=v_selected_size)=1 then
          select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=false and btrim(coalesce(size,''))=v_selected_size limit 1 for update;
        end if;
      elsif v_selected_color is not null then
        select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=false and lower(btrim(coalesce(color_name,'')))=lower(v_selected_color) and size is null order by created_at limit 1 for update;
      else
        select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=true order by created_at limit 1 for update;
        if v_sku.id is null and v_sku_count=1 then select * into v_sku from public.inventory_skus where product_id=v_product.id limit 1 for update; end if;
      end if;

      -- Legacy storefront variants may carry a display color/size while inventory is tracked
      -- by one default SKU only. In that case reserve the default SKU instead of rejecting
      -- a valid in-stock product. Detailed SKU products still require an exact match.
      if v_sku.id is null and v_sku_count = 1 then
        select * into v_sku
        from public.inventory_skus
        where product_id = v_product.id and is_default = true
        limit 1
        for update;
      end if;

      if v_sku.id is null then raise exception 'variant_selection_required'; end if;
      v_res_key := 's:' || v_sku.id::text;
      v_prev_reserved := coalesce((v_reservations->v_res_key->>'qty')::integer,0);
      if v_sku.stock_quantity < v_prev_reserved + v_qty then raise exception 'insufficient_stock'; end if;
      v_reservations := jsonb_set(v_reservations,array[v_res_key],jsonb_build_object('kind','sku','id',v_sku.id,'product_id',v_product.id,'qty',v_prev_reserved+v_qty),true);
    else
      v_res_key := 'p:' || v_product.id::text;
      v_prev_reserved := coalesce((v_reservations->v_res_key->>'qty')::integer,0);
      if coalesce(v_product.stock_quantity,0) < v_prev_reserved + v_qty then raise exception 'insufficient_stock'; end if;
      v_reservations := jsonb_set(v_reservations,array[v_res_key],jsonb_build_object('kind','product','id',v_product.id,'product_id',v_product.id,'qty',v_prev_reserved+v_qty),true);
    end if;

    v_unit := round(((v_product.price + public.get_product_size_price_adjustment(v_product.id, v_selected_size))*(1-coalesce(v_product.discount,0)::numeric/100.0))::numeric,2);
    v_accessories := 0;
    v_safe_accessories := '[]'::jsonb;

    if jsonb_typeof(v_item->'selected_accessories')='array' then
      for v_acc in select value from jsonb_array_elements(v_item->'selected_accessories') loop
        begin v_acc_qty:=coalesce((v_acc->>'quantity')::integer,1); exception when others then raise exception 'invalid_accessory_quantity'; end;
        if v_acc_qty<1 or v_acc_qty>20 then raise exception 'invalid_accessory_quantity'; end if;
        select value into v_acc_def from jsonb_array_elements(coalesce(v_product.accessories,'[]'::jsonb)) where coalesce(value->>'name_ar','')=coalesce(v_acc->>'name_ar','') or coalesce(value->>'name','')=coalesce(v_acc->>'name','') limit 1;
        if v_acc_def is null then raise exception 'invalid_accessory'; end if;
        v_acc_price:=greatest(0,coalesce((v_acc_def->>'price')::numeric,0));
        v_accessories:=v_accessories+v_acc_price*v_acc_qty;
        v_safe_accessories:=v_safe_accessories||jsonb_build_array(jsonb_build_object('name',coalesce(v_acc_def->>'name',''),'name_ar',coalesce(v_acc_def->>'name_ar',v_acc_def->>'name'),'price',round(v_acc_price*v_rate,v_precision),'quantity',v_acc_qty,'image_url',coalesce(v_acc_def->>'image_url','')));
        v_acc_def:=null;
      end loop;
    end if;

    v_subtotal := v_subtotal + (v_unit+v_accessories)*v_qty;
    v_subtotal_native := v_subtotal_native + round((v_unit+v_accessories)*v_rate,v_precision)*v_qty;
    v_safe_items := v_safe_items || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'product_name',coalesce(v_product.name_ar,v_product.name),'product_image',coalesce(v_product.images[1],''),'quantity',v_qty,'price',round((v_unit+v_accessories)*v_rate,v_precision),'selected_size',v_selected_size,'selected_color',v_selected_color,'selected_accessories',v_safe_accessories));
  end loop;

  if nullif(btrim(coalesce(p_coupon_code,'')),'') is not null then
    select * into v_coupon from public.coupons where upper(btrim(code))=upper(btrim(p_coupon_code)) and coalesce(is_active,true)=true limit 1;
    if v_coupon.id is null then raise exception 'invalid_coupon'; end if;
    if v_coupon.type='percentage' then
      v_discount:=least(v_subtotal,v_subtotal*greatest(0,v_coupon.value)/100.0);
      v_discount_native:=least(v_subtotal_native,round(v_subtotal_native*greatest(0,v_coupon.value)/100.0,v_precision));
    elsif v_coupon.type='fixed' then
      v_discount:=least(v_subtotal,greatest(0,v_coupon.value));
      v_discount_native:=least(v_subtotal_native,round(greatest(0,v_coupon.value)*v_rate,v_precision));
    else
      raise exception 'invalid_coupon';
    end if;
  end if;

  v_total := greatest(0,v_subtotal+v_delivery_fee-v_discount);
  v_total_native := greatest(0,v_subtotal_native+v_delivery_fee_native-v_discount_native);
  v_order_number := 'FP-'||to_char(current_date,'YYMMDD')||'-'||lpad(nextval('public.order_number_seq')::text,7,'0');

  insert into public.orders(
    order_number,tracking_token,tracking_token_hash,owner_user_id,customer_id,customer_name,customer_phone,
    customer_address,customer_notes,country,customer_city,customer_region,items,subtotal,delivery_fee,total,
    payment_method,status,currency_mode,currency_code,exchange_rate_snapshot,total_base,coupon_code,discount_amount,delivery_company_id
  ) values (
    v_order_number,
    v_tracking,
    encode(extensions.digest(v_tracking,'sha256'),'hex'),
    v_user_id,
    v_customer.id,
    case when v_customer.id is null then left(btrim(p_customer_name),150) else v_customer.name end,
    case when v_customer.id is null then left(btrim(p_customer_phone),40) else v_customer.phone end,
    left(btrim(p_customer_address),500),
    nullif(left(btrim(coalesce(p_customer_notes,'')),1000),''),
    coalesce(nullif(p_country,''),'YE'),
    left(btrim(p_customer_city),120),
    case when v_customer.id is null then p_customer_region else v_customer.region end,
    v_safe_items,v_subtotal_native,v_delivery_fee_native,v_total_native,p_payment_method,'pending',
    v_currency_code,
    v_currency_code,
    v_rate,v_total,
    case when v_discount>0 then upper(btrim(p_coupon_code)) else null end,
    v_discount_native,
    v_delivery.id
  ) returning * into v_order;

  for v_res_key,v_reservation in select key,value from jsonb_each(v_reservations) loop
    if v_reservation->>'kind'='sku' then
      update public.inventory_skus set stock_quantity=stock_quantity-(v_reservation->>'qty')::integer where id=(v_reservation->>'id')::uuid;
      perform public.sync_product_inventory_from_skus((v_reservation->>'product_id')::uuid);
    else
      update public.products set stock_quantity=stock_quantity-(v_reservation->>'qty')::integer,in_stock=((stock_quantity-(v_reservation->>'qty')::integer)>0) where id=(v_reservation->>'id')::uuid;
    end if;
  end loop;

  return json_build_object(
    'order_id',v_order.id,
    'order_number',v_order.order_number,
    'tracking_token',v_tracking,
    'created_at',v_order.created_at,
    'items',v_order.items,
    'subtotal',v_order.subtotal,
    'delivery_fee',v_order.delivery_fee,
    'total',v_order.total,
    'discount_amount',v_order.discount_amount,
    'currency_mode',v_order.currency_mode,
    'currency_code',v_order.currency_code,
    'exchange_rate_snapshot',v_order.exchange_rate_snapshot,
    'total_base',v_order.total_base,
    'delivery_company',v_delivery.name
  );
end;
$function$;

-- The legacy products.cost_price column must never be reachable through the Data API.
-- Public storefront callers only receive the explicitly approved catalogue columns.
revoke all privileges on table public.products from public,anon;
grant select(id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,is_active,created_at,updated_at,section_ids,has_sizes,sizes,accessories,features,sort_order,color_variants,stock_quantity,return_policy,specs,has_quality_variants,quality_variants,category_id,brand_id,home_collections,audience,size_price_rule_id) on table public.products to anon;

revoke select,insert,update,delete,truncate,references,trigger on table public.products from authenticated;
grant select(id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,is_active,created_at,updated_at,section_ids,has_sizes,sizes,accessories,features,sort_order,color_variants,stock_quantity,return_policy,specs,has_quality_variants,quality_variants,category_id,brand_id,home_collections,audience,size_price_rule_id) on table public.products to authenticated;
grant insert(id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,is_active,created_at,updated_at,section_ids,has_sizes,sizes,accessories,features,sort_order,color_variants,stock_quantity,return_policy,specs,has_quality_variants,quality_variants,category_id,brand_id,home_collections,audience,size_price_rule_id) on table public.products to authenticated;
grant update(id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,is_active,created_at,updated_at,section_ids,has_sizes,sizes,accessories,features,sort_order,color_variants,stock_quantity,return_policy,specs,has_quality_variants,quality_variants,category_id,brand_id,home_collections,audience,size_price_rule_id) on table public.products to authenticated;
grant delete on table public.products to authenticated;

grant all privileges on table public.products to service_role;

revoke all on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) from public;
grant execute on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) to anon,authenticated,service_role;

comment on column public.orders.total is
  'Order total in the selected native currency.';
comment on column public.orders.total_base is
  'Immutable order total in the base currency (SAR) at checkout.';
comment on column public.orders.exchange_rate_snapshot is
  'Selected-currency units per one base SAR captured at checkout.';
comment on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) is
  'Creates an atomic order, stores native and base totals consistently, and rate-limits both customer and network identities.';
