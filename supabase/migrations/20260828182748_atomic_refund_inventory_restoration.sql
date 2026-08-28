alter table public.refunds
  add column if not exists inventory_restored_at timestamptz,
  add column if not exists inventory_restored_by uuid,
  add column if not exists inventory_restore_result jsonb not null default '[]'::jsonb;

create or replace function public.create_refund_request(
  p_order_id uuid,
  p_order_number text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_amount numeric,
  p_reason text,
  p_refund_method text,
  p_notes text,
  p_items jsonb,
  p_currency_code text,
  p_refund_type text
)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_refund_id uuid;
  v_rate numeric := 1;
  v_amount_base numeric;
  v_order_total numeric;
  v_reserved_amount numeric := 0;
  v_order_number text;
  v_customer_id uuid;
  v_customer_name text;
  v_customer_phone text;
  v_order_items jsonb := '[]'::jsonb;
  v_safe_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_order_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_order_qty integer;
  v_reserved_qty integer;
  v_size text;
  v_color text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Admin access required';
  end if;

  if p_amount is null or p_amount <= 0 then raise exception 'Refund amount must be greater than zero'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'Refund reason is required'; end if;
  if p_refund_method not in ('cash','bank','store_credit','original_method') then raise exception 'Invalid refund method'; end if;
  if coalesce(p_refund_type, 'full') not in ('full','partial') then raise exception 'Invalid refund type'; end if;

  select rate_to_base into v_rate
  from public.currencies
  where code = coalesce(p_currency_code, 'SAR') and is_active = true;

  if v_rate is null or v_rate <= 0 then raise exception 'Invalid or inactive currency'; end if;

  v_amount_base := round(p_amount / v_rate, 4);
  v_order_number := nullif(trim(p_order_number), '');
  v_customer_id := p_customer_id;
  v_customer_name := nullif(trim(p_customer_name), '');
  v_customer_phone := nullif(trim(p_customer_phone), '');

  if p_order_id is not null then
    select o.order_number, o.customer_id, o.customer_name, o.customer_phone, o.total, coalesce(o.items, '[]'::jsonb)
    into v_order_number, v_customer_id, v_customer_name, v_customer_phone, v_order_total, v_order_items
    from public.orders o
    where o.id = p_order_id
    for update;

    if not found then raise exception 'Order not found'; end if;

    select coalesce(sum(coalesce(r.amount_base, r.amount)), 0)
    into v_reserved_amount
    from public.refunds r
    where r.order_id = p_order_id
      and r.status not in ('rejected','cancelled');

    if v_amount_base + v_reserved_amount > coalesce(v_order_total, 0) + 0.01 then
      raise exception 'Refund exceeds remaining refundable order amount';
    end if;

    if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
      raise exception 'Refund items are required for an order refund';
    end if;

    for v_item in select value from jsonb_array_elements(p_items) loop
      begin
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := coalesce((v_item->>'refund_quantity')::integer, 0);
      exception when others then
        raise exception 'Invalid refund item';
      end;

      if v_qty <= 0 then continue; end if;

      v_size := nullif(btrim(coalesce(v_item->>'selected_size','')), '');
      v_color := nullif(btrim(coalesce(v_item->>'selected_color','')), '');
      v_order_item := null;

      select oi.value into v_order_item
      from jsonb_array_elements(v_order_items) oi(value)
      where (oi.value->>'product_id')::uuid = v_product_id
        and lower(btrim(coalesce(oi.value->>'selected_size',''))) = lower(coalesce(v_size,''))
        and lower(btrim(coalesce(oi.value->>'selected_color',''))) = lower(coalesce(v_color,''))
      limit 1;

      if v_order_item is null then raise exception 'Refund item does not match the original order'; end if;

      v_order_qty := greatest(0, coalesce((v_order_item->>'quantity')::integer, 0));

      select coalesce(sum(greatest(0, coalesce((ri.value->>'refund_quantity')::integer, 0))), 0)::integer
      into v_reserved_qty
      from public.refunds r
      cross join lateral jsonb_array_elements(coalesce(r.items, '[]'::jsonb)) ri(value)
      where r.order_id = p_order_id
        and r.status not in ('rejected','cancelled')
        and (ri.value->>'product_id')::uuid = v_product_id
        and lower(btrim(coalesce(ri.value->>'selected_size',''))) = lower(coalesce(v_size,''))
        and lower(btrim(coalesce(ri.value->>'selected_color',''))) = lower(coalesce(v_color,''));

      if v_qty + v_reserved_qty > v_order_qty then
        raise exception 'Refund quantity exceeds remaining refundable quantity';
      end if;

      v_safe_items := v_safe_items || jsonb_build_array(v_order_item || jsonb_build_object('refund_quantity', v_qty));
    end loop;

    if jsonb_array_length(v_safe_items) < 1 then raise exception 'Select at least one item to refund'; end if;
  else
    v_safe_items := case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end;
  end if;

  insert into public.refunds (
    order_id, order_number, customer_id, customer_name, customer_phone,
    amount, reason, items, refund_method, status, notes, created_by,
    currency_code, amount_base, refund_type
  ) values (
    p_order_id, v_order_number, v_customer_id, v_customer_name, v_customer_phone,
    p_amount, trim(p_reason), v_safe_items, p_refund_method, 'pending',
    nullif(trim(p_notes), ''), auth.uid(), coalesce(p_currency_code, 'SAR'),
    v_amount_base, coalesce(p_refund_type, 'full')
  )
  returning id into v_refund_id;

  return v_refund_id;
end;
$function$;

create or replace function public.update_refund_status(
  p_refund_id uuid,
  p_status text,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_refund public.refunds%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_sku public.inventory_skus%rowtype;
  v_sku_count integer;
  v_qty integer;
  v_product_id uuid;
  v_size text;
  v_color text;
  v_before integer;
  v_after integer;
  v_product_before integer;
  v_product_after integer;
  v_unit_cost numeric := 0;
  v_restore_result jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then raise exception 'Admin access required'; end if;

  select * into v_refund from public.refunds where id = p_refund_id for update;
  if not found then raise exception 'Refund not found'; end if;

  if p_status not in ('pending','reviewing','approved','rejected','processing','completed','cancelled') then raise exception 'Invalid refund status'; end if;
  if v_refund.status = 'completed' then raise exception 'Completed refund is final'; end if;

  if v_refund.status = 'pending' and p_status not in ('reviewing','approved','rejected','cancelled') then
    raise exception 'Invalid refund transition';
  elsif v_refund.status = 'reviewing' and p_status not in ('approved','rejected','cancelled','pending') then
    raise exception 'Invalid refund transition';
  elsif v_refund.status = 'approved' and p_status not in ('processing','reviewing','cancelled') then
    raise exception 'Invalid refund transition';
  elsif v_refund.status = 'processing' and p_status not in ('completed','approved','cancelled') then
    raise exception 'Invalid refund transition';
  elsif v_refund.status in ('rejected','cancelled') and p_status not in ('reviewing','pending') then
    raise exception 'Invalid refund transition';
  end if;

  if p_status = 'completed' and v_refund.inventory_restored_at is null and v_refund.order_id is not null then
    if jsonb_typeof(v_refund.items) <> 'array' or jsonb_array_length(v_refund.items) < 1 then raise exception 'Refund has no items to restore'; end if;

    for v_item in select value from jsonb_array_elements(v_refund.items) loop
      begin
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty := coalesce((v_item->>'refund_quantity')::integer, 0);
      exception when others then
        raise exception 'Invalid refund inventory item';
      end;

      if v_qty <= 0 then continue; end if;

      select * into v_product from public.products where id = v_product_id for update;
      if not found then raise exception 'Refund product no longer exists'; end if;

      v_size := nullif(btrim(coalesce(v_item->>'selected_size','')), '');
      v_color := nullif(btrim(coalesce(v_item->>'selected_color','')), '');
      v_product_before := greatest(0, coalesce(v_product.stock_quantity, 0));
      v_unit_cost := 0;
      select greatest(0, coalesce(cost_price,0)) into v_unit_cost from public.product_costs where product_id = v_product_id;
      v_unit_cost := coalesce(v_unit_cost, 0);

      select count(*) into v_sku_count from public.inventory_skus where product_id = v_product_id;
      v_sku.id := null;

      if v_sku_count > 0 then
        if v_color is not null and v_size is not null then
          select * into v_sku from public.inventory_skus
          where product_id = v_product_id and is_default = false
            and lower(btrim(coalesce(color_name,''))) = lower(v_color)
            and btrim(coalesce(size,'')) = v_size
          order by created_at limit 1 for update;
        elsif v_size is not null then
          if (select count(*) from public.inventory_skus where product_id=v_product_id and is_default=false and btrim(coalesce(size,''))=v_size) = 1 then
            select * into v_sku from public.inventory_skus where product_id=v_product_id and is_default=false and btrim(coalesce(size,''))=v_size limit 1 for update;
          end if;
        elsif v_color is not null then
          select * into v_sku from public.inventory_skus
          where product_id=v_product_id and is_default=false
            and lower(btrim(coalesce(color_name,'')))=lower(v_color)
            and size is null
          order by created_at limit 1 for update;
        else
          select * into v_sku from public.inventory_skus where product_id=v_product_id and is_default=true order by created_at limit 1 for update;
          if v_sku.id is null and v_sku_count = 1 then select * into v_sku from public.inventory_skus where product_id=v_product_id limit 1 for update; end if;
        end if;

        if v_sku.id is null then raise exception 'Refund inventory variant could not be resolved'; end if;

        v_before := greatest(0, coalesce(v_sku.stock_quantity,0));
        v_after := v_before + v_qty;
        update public.inventory_skus set stock_quantity = v_after where id = v_sku.id;
        perform public.sync_product_inventory_from_skus(v_product_id);
        select stock_quantity into v_product_after from public.products where id=v_product_id;

        insert into public.inventory_adjustments(
          product_id, product_name, inventory_sku_id, variant_label, adjustment_type,
          quantity_before, quantity_change, quantity_after, product_quantity_before, product_quantity_after,
          unit_cost, total_cost, reason, reference, notes, created_by
        ) values (
          v_product_id, v_product.name_ar, v_sku.id, v_sku.label, 'increase',
          v_before, v_qty, v_after, v_product_before, v_product_after,
          v_unit_cost, v_unit_cost * v_qty, 'مرتجع طلب', v_refund.refund_number,
          concat('إعادة مخزون من الطلب ', coalesce(v_refund.order_number,'')), auth.uid()
        );

        v_restore_result := v_restore_result || jsonb_build_array(jsonb_build_object(
          'product_id', v_product_id, 'inventory_sku_id', v_sku.id, 'quantity', v_qty,
          'selected_size', v_size, 'selected_color', v_color
        ));
      else
        v_before := v_product_before;
        v_after := v_before + v_qty;
        update public.products set stock_quantity = v_after, in_stock = true where id = v_product_id;
        v_product_after := v_after;

        insert into public.inventory_adjustments(
          product_id, product_name, inventory_sku_id, variant_label, adjustment_type,
          quantity_before, quantity_change, quantity_after, product_quantity_before, product_quantity_after,
          unit_cost, total_cost, reason, reference, notes, created_by
        ) values (
          v_product_id, v_product.name_ar, null, null, 'increase',
          v_before, v_qty, v_after, v_product_before, v_product_after,
          v_unit_cost, v_unit_cost * v_qty, 'مرتجع طلب', v_refund.refund_number,
          concat('إعادة مخزون من الطلب ', coalesce(v_refund.order_number,'')), auth.uid()
        );

        v_restore_result := v_restore_result || jsonb_build_array(jsonb_build_object(
          'product_id', v_product_id, 'inventory_sku_id', null, 'quantity', v_qty,
          'selected_size', v_size, 'selected_color', v_color
        ));
      end if;
    end loop;

    update public.refunds
    set inventory_restored_at = now(), inventory_restored_by = auth.uid(), inventory_restore_result = v_restore_result
    where id = p_refund_id;
  end if;

  update public.refunds
  set status = p_status,
      admin_notes = case when nullif(trim(p_admin_note), '') is not null then trim(p_admin_note) else admin_notes end,
      approved_by = case when p_status = 'approved' then auth.uid() when p_status in ('pending','reviewing','rejected','cancelled') then null else approved_by end,
      processed_by = case when p_status = 'completed' then auth.uid() when p_status <> 'completed' then null else processed_by end,
      processed_at = case when p_status = 'completed' then now() when p_status <> 'completed' then null else processed_at end,
      updated_at = now()
  where id = p_refund_id;
end;
$function$;

revoke all on function public.create_refund_request(uuid,text,uuid,text,text,numeric,text,text,text,jsonb,text,text) from public, anon;
grant execute on function public.create_refund_request(uuid,text,uuid,text,text,numeric,text,text,text,jsonb,text,text) to authenticated, service_role;
revoke all on function public.update_refund_status(uuid,text,text) from public, anon;
grant execute on function public.update_refund_status(uuid,text,text) to authenticated, service_role;
