create or replace function public.create_secure_order(
  p_customer_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_customer_notes text,
  p_country text, p_customer_city text, p_customer_region text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric,
  p_total numeric, p_payment_method text, p_currency_mode text, p_currency_code text, p_exchange_rate_snapshot numeric,
  p_total_base numeric, p_coupon_code text default null, p_discount_amount numeric default 0
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_customer public.customers;
  v_item jsonb;
  v_product public.products;
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
  v_coupon public.coupons;
  v_delivery public.delivery_companies;
  v_tracking text := encode(gen_random_bytes(24), 'hex');
  v_order public.orders;
  v_safe_items jsonb := '[]'::jsonb;
  v_safe_accessories jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then raise exception 'invalid_items'; end if;
  if p_payment_method not in ('cod','bank') then raise exception 'invalid_payment_method'; end if;

  if v_user_id is not null then
    select * into v_customer from public.customers where user_id = v_user_id limit 1;
    if v_customer.id is null then raise exception 'customer_profile_required'; end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(100, coalesce((v_item->>'quantity')::integer, 1)));
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true limit 1;
    if v_product.id is null or coalesce(v_product.in_stock, true) = false then raise exception 'product_unavailable'; end if;
    if v_product.stock_quantity >= 0 and v_qty > v_product.stock_quantity then raise exception 'insufficient_stock'; end if;

    v_unit := round((v_product.price * (1 - coalesce(v_product.discount,0)::numeric / 100.0))::numeric, 2);
    v_accessories := 0;
    v_safe_accessories := '[]'::jsonb;

    if jsonb_typeof(v_item->'selected_accessories') = 'array' then
      for v_acc in select value from jsonb_array_elements(v_item->'selected_accessories') loop
        v_acc_qty := greatest(1, least(20, coalesce((v_acc->>'quantity')::integer,1)));
        select value into v_acc_def
        from jsonb_array_elements(coalesce(v_product.accessories,'[]'::jsonb))
        where coalesce(value->>'name_ar','') = coalesce(v_acc->>'name_ar','') or coalesce(value->>'name','') = coalesce(v_acc->>'name','')
        limit 1;
        if v_acc_def is null then raise exception 'invalid_accessory'; end if;
        v_accessories := v_accessories + coalesce((v_acc_def->>'price')::numeric,0) * v_acc_qty;
        v_safe_accessories := v_safe_accessories || jsonb_build_array(jsonb_build_object('name',coalesce(v_acc_def->>'name',''),'name_ar',coalesce(v_acc_def->>'name_ar',v_acc_def->>'name'),'price',coalesce((v_acc_def->>'price')::numeric,0),'quantity',v_acc_qty,'image_url',coalesce(v_acc_def->>'image_url','')));
        v_acc_def := null;
      end loop;
    end if;

    v_subtotal := v_subtotal + (v_unit + v_accessories) * v_qty;
    v_safe_items := v_safe_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'product_name',coalesce(v_product.name_ar,v_product.name),'product_image',coalesce(v_product.images[1],''),
      'quantity',v_qty,'price',v_unit + v_accessories,'selected_size',v_item->>'selected_size','selected_color',v_item->>'selected_color','selected_accessories',v_safe_accessories
    ));
  end loop;

  if p_delivery_fee is not null and p_delivery_fee > 0 then
    select * into v_delivery from public.delivery_companies where is_active = true and base_fee = p_delivery_fee order by created_at desc limit 1;
    if v_delivery.id is not null then v_delivery_fee := v_delivery.base_fee; end if;
  end if;

  if nullif(trim(coalesce(p_coupon_code,'')), '') is not null then
    select * into v_coupon from public.coupons where upper(trim(code)) = upper(trim(p_coupon_code)) and coalesce(is_active,true) = true limit 1;
    if v_coupon.id is not null then
      if v_coupon.type = 'percentage' then v_discount := least(v_subtotal, v_subtotal * v_coupon.value / 100.0);
      elsif v_coupon.type = 'fixed' then v_discount := least(v_subtotal, v_coupon.value); end if;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);

  insert into public.orders(order_number, tracking_token, tracking_token_hash, owner_user_id, customer_id, customer_name, customer_phone, customer_address, customer_notes, country, customer_city, customer_region, items, subtotal, delivery_fee, total, payment_method, status, currency_mode, currency_code, exchange_rate_snapshot, total_base, coupon_code, discount_amount, delivery_company_id)
  values('FP-' || floor(random()*900000+100000)::text, v_tracking, encode(extensions.digest(v_tracking,'sha256'),'hex'), v_user_id, case when v_user_id is null then null else v_customer.id end, case when v_user_id is null then left(trim(p_customer_name),150) else v_customer.name end, case when v_user_id is null then left(trim(p_customer_phone),40) else v_customer.phone end, left(trim(p_customer_address),500), nullif(left(trim(coalesce(p_customer_notes,'')),1000),''), coalesce(nullif(p_country,''),'YE'), left(trim(coalesce(p_customer_city,'')),120), case when v_user_id is null then p_customer_region else v_customer.region end, v_safe_items, v_subtotal, v_delivery_fee, v_total, p_payment_method, 'pending', coalesce(nullif(p_currency_mode,''),'SAR'), coalesce(nullif(p_currency_code,''),coalesce(nullif(p_currency_mode,''),'SAR')), 1, v_total, case when v_discount > 0 then upper(trim(p_coupon_code)) else null end, v_discount, v_delivery.id)
  returning * into v_order;

  return json_build_object('order_id',v_order.id,'order_number',v_order.order_number,'tracking_token',v_tracking,'created_at',v_order.created_at,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,'total',v_order.total,'discount_amount',v_order.discount_amount,'currency_mode',v_order.currency_mode,'delivery_company',v_delivery.name);
end;
$$;
