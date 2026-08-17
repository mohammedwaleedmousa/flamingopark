-- Launch hardening for customer checkout and privileged database functions.

create sequence if not exists public.order_number_seq;

create table if not exists public.order_submission_limits (
  identity_key text primary key,
  window_started_at timestamptz not null default now(),
  window_count integer not null default 0,
  day_started_at date not null default current_date,
  day_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.order_submission_limits enable row level security;
revoke all on public.order_submission_limits from public, anon, authenticated;
grant all on public.order_submission_limits to service_role;

create or replace function public.create_secure_order_v2(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_notes text,
  p_country text,
  p_customer_city text,
  p_customer_region text,
  p_items jsonb,
  p_payment_method text,
  p_currency_mode text,
  p_currency_code text,
  p_coupon_code text default null,
  p_delivery_company_id uuid default null
)
returns json
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
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
  v_tracking text := encode(gen_random_bytes(24), 'hex');
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
  v_limit public.order_submission_limits%rowtype;
  v_order_number text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'invalid_items';
  end if;
  if p_payment_method not in ('cod','bank') then raise exception 'invalid_payment_method'; end if;
  if nullif(btrim(coalesce(p_customer_address,'')), '') is null then raise exception 'address_required'; end if;
  if nullif(btrim(coalesce(p_customer_city,'')), '') is null then raise exception 'city_required'; end if;

  if v_user_id is not null then
    select * into v_customer from public.customers where user_id = v_user_id limit 1;
    if v_customer.id is null then raise exception 'customer_profile_required'; end if;
    v_identity := 'u:' || v_user_id::text;
  else
    if nullif(regexp_replace(coalesce(p_customer_phone,''), '[^0-9+]', '', 'g'), '') is null then raise exception 'phone_required'; end if;
    if nullif(btrim(coalesce(p_customer_name,'')), '') is null then raise exception 'name_required'; end if;
    v_identity := 'p:' || regexp_replace(coalesce(p_customer_phone,''), '[^0-9]', '', 'g');
  end if;

  insert into public.order_submission_limits(identity_key) values (v_identity)
  on conflict (identity_key) do nothing;
  select * into v_limit from public.order_submission_limits where identity_key = v_identity for update;

  if v_limit.day_started_at <> current_date then
    v_limit.day_started_at := current_date;
    v_limit.day_count := 0;
  end if;
  if v_limit.window_started_at < now() - interval '10 minutes' then
    v_limit.window_started_at := now();
    v_limit.window_count := 0;
  end if;
  if v_limit.window_count >= 5 or v_limit.day_count >= 25 then
    raise exception 'order_rate_limit';
  end if;
  update public.order_submission_limits
  set window_started_at = v_limit.window_started_at,
      window_count = v_limit.window_count + 1,
      day_started_at = v_limit.day_started_at,
      day_count = v_limit.day_count + 1,
      updated_at = now()
  where identity_key = v_identity;

  if p_delivery_company_id is null then raise exception 'delivery_company_required'; end if;
  select * into v_delivery from public.delivery_companies where id = p_delivery_company_id and is_active = true limit 1;
  if v_delivery.id is null then raise exception 'invalid_delivery_company'; end if;
  v_delivery_fee := greatest(0, coalesce(v_delivery.base_fee,0));

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_qty := (v_item->>'quantity')::integer;
    exception when others then
      raise exception 'invalid_quantity';
    end;
    if v_qty < 1 or v_qty > 100 then raise exception 'invalid_quantity'; end if;

    begin
      select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true for update;
    exception when others then
      raise exception 'invalid_product';
    end;
    if v_product.id is null or coalesce(v_product.in_stock,true) = false then raise exception 'product_unavailable'; end if;

    v_selected_size := nullif(btrim(v_item->>'selected_size'),'');
    v_selected_color := nullif(btrim(v_item->>'selected_color'),'');
    v_sku.id := null;
    select count(*) into v_sku_count from public.inventory_skus where product_id = v_product.id;

    if v_sku_count > 0 then
      if v_selected_color is not null and v_selected_size is not null then
        select * into v_sku from public.inventory_skus
        where product_id = v_product.id and is_default = false
          and lower(btrim(coalesce(color_name,''))) = lower(v_selected_color)
          and btrim(coalesce(size,'')) = v_selected_size
        order by created_at limit 1 for update;
      elsif v_selected_size is not null then
        if (select count(*) from public.inventory_skus where product_id=v_product.id and is_default=false and btrim(coalesce(size,''))=v_selected_size) = 1 then
          select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=false and btrim(coalesce(size,''))=v_selected_size limit 1 for update;
        end if;
      elsif v_selected_color is not null then
        select * into v_sku from public.inventory_skus
        where product_id=v_product.id and is_default=false
          and lower(btrim(coalesce(color_name,'')))=lower(v_selected_color)
          and size is null
        order by created_at limit 1 for update;
      else
        select * into v_sku from public.inventory_skus where product_id=v_product.id and is_default=true order by created_at limit 1 for update;
        if v_sku.id is null and v_sku_count = 1 then
          select * into v_sku from public.inventory_skus where product_id=v_product.id limit 1 for update;
        end if;
      end if;

      if v_sku.id is null then raise exception 'variant_selection_required'; end if;
      v_res_key := 's:' || v_sku.id::text;
      v_prev_reserved := coalesce((v_reservations->v_res_key->>'qty')::integer,0);
      if v_sku.stock_quantity < v_prev_reserved + v_qty then raise exception 'insufficient_stock'; end if;
      v_reservations := jsonb_set(v_reservations, array[v_res_key], jsonb_build_object('kind','sku','id',v_sku.id,'product_id',v_product.id,'qty',v_prev_reserved+v_qty), true);
    else
      v_res_key := 'p:' || v_product.id::text;
      v_prev_reserved := coalesce((v_reservations->v_res_key->>'qty')::integer,0);
      if coalesce(v_product.stock_quantity,0) < v_prev_reserved + v_qty then raise exception 'insufficient_stock'; end if;
      v_reservations := jsonb_set(v_reservations, array[v_res_key], jsonb_build_object('kind','product','id',v_product.id,'product_id',v_product.id,'qty',v_prev_reserved+v_qty), true);
    end if;

    v_unit := round((v_product.price * (1 - coalesce(v_product.discount,0)::numeric / 100.0))::numeric, 2);
    v_accessories := 0;
    v_safe_accessories := '[]'::jsonb;

    if jsonb_typeof(v_item->'selected_accessories') = 'array' then
      for v_acc in select value from jsonb_array_elements(v_item->'selected_accessories') loop
        begin v_acc_qty := coalesce((v_acc->>'quantity')::integer,1); exception when others then raise exception 'invalid_accessory_quantity'; end;
        if v_acc_qty < 1 or v_acc_qty > 20 then raise exception 'invalid_accessory_quantity'; end if;
        select value into v_acc_def from jsonb_array_elements(coalesce(v_product.accessories,'[]'::jsonb))
        where coalesce(value->>'name_ar','') = coalesce(v_acc->>'name_ar','') or coalesce(value->>'name','') = coalesce(v_acc->>'name','') limit 1;
        if v_acc_def is null then raise exception 'invalid_accessory'; end if;
        v_accessories := v_accessories + greatest(0,coalesce((v_acc_def->>'price')::numeric,0)) * v_acc_qty;
        v_safe_accessories := v_safe_accessories || jsonb_build_array(jsonb_build_object('name',coalesce(v_acc_def->>'name',''),'name_ar',coalesce(v_acc_def->>'name_ar',v_acc_def->>'name'),'price',greatest(0,coalesce((v_acc_def->>'price')::numeric,0)),'quantity',v_acc_qty,'image_url',coalesce(v_acc_def->>'image_url','')));
        v_acc_def := null;
      end loop;
    end if;

    v_subtotal := v_subtotal + (v_unit + v_accessories) * v_qty;
    v_safe_items := v_safe_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'product_name',coalesce(v_product.name_ar,v_product.name),'product_image',coalesce(v_product.images[1],''),
      'quantity',v_qty,'price',v_unit + v_accessories,'selected_size',v_selected_size,'selected_color',v_selected_color,'selected_accessories',v_safe_accessories
    ));
  end loop;

  if nullif(btrim(coalesce(p_coupon_code,'')), '') is not null then
    select * into v_coupon from public.coupons where upper(btrim(code)) = upper(btrim(p_coupon_code)) and coalesce(is_active,true)=true limit 1;
    if v_coupon.id is null then raise exception 'invalid_coupon'; end if;
    if v_coupon.type = 'percentage' then v_discount := least(v_subtotal, v_subtotal * greatest(0,v_coupon.value) / 100.0);
    elsif v_coupon.type = 'fixed' then v_discount := least(v_subtotal, greatest(0,v_coupon.value));
    else raise exception 'invalid_coupon'; end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);
  v_order_number := 'FP-' || to_char(current_date,'YYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text,7,'0');

  insert into public.orders(order_number,tracking_token,tracking_token_hash,owner_user_id,customer_id,customer_name,customer_phone,customer_address,customer_notes,country,customer_city,customer_region,items,subtotal,delivery_fee,total,payment_method,status,currency_mode,currency_code,exchange_rate_snapshot,total_base,coupon_code,discount_amount,delivery_company_id)
  values(v_order_number,v_tracking,encode(extensions.digest(v_tracking,'sha256'),'hex'),v_user_id,case when v_user_id is null then null else v_customer.id end,case when v_user_id is null then left(btrim(p_customer_name),150) else v_customer.name end,case when v_user_id is null then left(btrim(p_customer_phone),40) else v_customer.phone end,left(btrim(p_customer_address),500),nullif(left(btrim(coalesce(p_customer_notes,'')),1000),''),coalesce(nullif(p_country,''),'YE'),left(btrim(p_customer_city),120),case when v_user_id is null then p_customer_region else v_customer.region end,v_safe_items,v_subtotal,v_delivery_fee,v_total,p_payment_method,'pending',coalesce(nullif(p_currency_mode,''),'SAR'),coalesce(nullif(p_currency_code,''),coalesce(nullif(p_currency_mode,''),'SAR')),1,v_total,case when v_discount>0 then upper(btrim(p_coupon_code)) else null end,v_discount,v_delivery.id)
  returning * into v_order;

  for v_res_key, v_reservation in select key, value from jsonb_each(v_reservations) loop
    if v_reservation->>'kind' = 'sku' then
      update public.inventory_skus set stock_quantity = stock_quantity - (v_reservation->>'qty')::integer where id = (v_reservation->>'id')::uuid;
      perform public.sync_product_inventory_from_skus((v_reservation->>'product_id')::uuid);
    else
      update public.products set stock_quantity = stock_quantity - (v_reservation->>'qty')::integer, in_stock = ((stock_quantity - (v_reservation->>'qty')::integer) > 0) where id = (v_reservation->>'id')::uuid;
    end if;
  end loop;

  return json_build_object('order_id',v_order.id,'order_number',v_order.order_number,'tracking_token',v_tracking,'created_at',v_order.created_at,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,'total',v_order.total,'discount_amount',v_order.discount_amount,'currency_mode',v_order.currency_mode,'delivery_company',v_delivery.name);
end;
$function$;

revoke all on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) from public;
grant execute on function public.create_secure_order_v2(text,text,text,text,text,text,text,jsonb,text,text,text,text,uuid) to anon, authenticated, service_role;

-- Stock is now reserved atomically when the order is created. Avoid a second decrement on status changes.
drop trigger if exists decrement_stock_on_order_trg on public.orders;
revoke execute on function public.decrement_stock_on_order() from public, anon, authenticated;

-- Trigger/event helpers are internal only and must not be exposed as RPC endpoints.
revoke execute on function public.archive_order_on_insert() from public, anon, authenticated;
revoke execute on function public.update_archive_on_order_update() from public, anon, authenticated;
revoke execute on function public.inventory_skus_sync_product_trigger() from public, anon, authenticated;
revoke execute on function public.sync_notification_read_status() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.sync_product_inventory_from_skus(uuid) from public, anon, authenticated;
revoke execute on function public.rebuild_product_variant_stock(uuid) from public, anon, authenticated;

-- Admin-only RPCs: anonymous callers never need EXECUTE. Authenticated callers are checked inside each function.
revoke execute on function public.apply_inventory_adjustment(uuid,text,integer,text,text,text,uuid) from public, anon;
revoke execute on function public.replace_product_inventory_skus(uuid,jsonb) from public, anon;
revoke execute on function public.delete_product_from_inventory(uuid) from public, anon;
revoke execute on function public.get_inventory_summary() from public, anon;
revoke execute on function public.coupon_usage_summary() from public, anon;
revoke execute on function public.delete_coupon_safe(uuid) from public, anon;
revoke execute on function public.currency_usage_summary() from public, anon;
revoke execute on function public.delete_currency_safe(text) from public, anon;
revoke execute on function public.create_manual_journal_entry(date,text,text,text,jsonb) from public, anon;
revoke execute on function public.reverse_journal_entry(uuid,date,text) from public, anon;
revoke execute on function public.create_refund_request(uuid,text,uuid,text,text,numeric,text,text,text,jsonb,text,text) from public, anon;
revoke execute on function public.delete_refund_safe(uuid) from public, anon;
revoke execute on function public.update_refund_status(uuid,text,text) from public, anon;
