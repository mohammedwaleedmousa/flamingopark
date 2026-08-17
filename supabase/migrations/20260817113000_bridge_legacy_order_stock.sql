-- Distinguish legacy orders (reserve on confirmation) from v2 orders (reserve at creation).

alter table public.orders add column if not exists stock_reserved_at timestamptz;

create or replace function public.mark_launch_order_stock_reserved()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  if new.order_number ~ '^FP-[0-9]{6}-[0-9]{7}$' then
    new.stock_reserved_at := coalesce(new.stock_reserved_at, now());
  end if;
  return new;
end;
$function$;

revoke execute on function public.mark_launch_order_stock_reserved() from public, anon, authenticated;
grant execute on function public.mark_launch_order_stock_reserved() to service_role;

drop trigger if exists mark_launch_order_stock_reserved_trg on public.orders;
create trigger mark_launch_order_stock_reserved_trg
before insert on public.orders
for each row execute function public.mark_launch_order_stock_reserved();

update public.orders
set stock_reserved_at = created_at
where stock_reserved_at is null
  and order_number ~ '^FP-[0-9]{6}-[0-9]{7}$';

create or replace function public.reserve_legacy_order_stock_on_confirmation()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  it jsonb;
  pid uuid;
  qty integer;
  v_color text;
  v_size text;
  v_sku public.inventory_skus%rowtype;
  v_sku_count integer;
  v_product_stock integer;
begin
  if new.stock_reserved_at is not null then return new; end if;
  if new.status is null or new.status not in ('confirmed','shipped','delivered','completed') then return new; end if;
  if old.status in ('confirmed','shipped','delivered','completed') then return new; end if;
  if new.items is null then return new; end if;

  for it in select value from jsonb_array_elements(new.items)
  loop
    begin
      pid := (it->>'product_id')::uuid;
      qty := greatest(1, coalesce((it->>'quantity')::integer,1));
      v_color := nullif(btrim(it->>'selected_color'),'');
      v_size := nullif(btrim(it->>'selected_size'),'');
    exception when others then
      raise exception 'invalid_order_item';
    end;

    v_sku.id := null;
    select count(*) into v_sku_count from public.inventory_skus where product_id = pid;

    if v_sku_count > 0 then
      if v_color is not null and v_size is not null then
        select * into v_sku from public.inventory_skus
        where product_id = pid and is_default = false
          and lower(btrim(coalesce(color_name,''))) = lower(v_color)
          and btrim(coalesce(size,'')) = v_size
        order by created_at limit 1 for update;
      elsif v_size is not null then
        if (select count(*) from public.inventory_skus where product_id = pid and is_default = false and btrim(coalesce(size,'')) = v_size) = 1 then
          select * into v_sku from public.inventory_skus where product_id = pid and is_default = false and btrim(coalesce(size,'')) = v_size limit 1 for update;
        end if;
      elsif v_color is not null then
        select * into v_sku from public.inventory_skus
        where product_id = pid and is_default = false
          and lower(btrim(coalesce(color_name,''))) = lower(v_color)
          and size is null
        order by created_at limit 1 for update;
      else
        select * into v_sku from public.inventory_skus where product_id = pid and is_default = true order by created_at limit 1 for update;
        if v_sku.id is null and v_sku_count = 1 then
          select * into v_sku from public.inventory_skus where product_id = pid limit 1 for update;
        end if;
      end if;

      if v_sku.id is null then raise exception 'variant_selection_required'; end if;
      if v_sku.stock_quantity < qty then raise exception 'insufficient_stock'; end if;
      update public.inventory_skus set stock_quantity = stock_quantity - qty where id = v_sku.id;
      perform public.sync_product_inventory_from_skus(pid);
    else
      select stock_quantity into v_product_stock from public.products where id = pid for update;
      if not found or coalesce(v_product_stock,0) < qty then raise exception 'insufficient_stock'; end if;
      update public.products set stock_quantity = stock_quantity - qty, in_stock = ((stock_quantity - qty) > 0) where id = pid;
    end if;
  end loop;

  update public.orders set stock_reserved_at = now() where id = new.id;
  new.stock_reserved_at := now();
  return new;
end;
$function$;

revoke execute on function public.reserve_legacy_order_stock_on_confirmation() from public, anon, authenticated;
grant execute on function public.reserve_legacy_order_stock_on_confirmation() to service_role;

drop trigger if exists decrement_stock_on_order_trg on public.orders;
drop trigger if exists reserve_legacy_order_stock_on_confirmation_trg on public.orders;
create trigger reserve_legacy_order_stock_on_confirmation_trg
after update of status on public.orders
for each row execute function public.reserve_legacy_order_stock_on_confirmation();

create or replace function public.release_reserved_stock_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  it jsonb;
  pid uuid;
  qty integer;
  v_color text;
  v_size text;
  v_sku public.inventory_skus%rowtype;
  v_sku_count integer;
begin
  if old.status in ('cancelled','canceled') and new.status not in ('cancelled','canceled') then
    raise exception 'cancelled_order_is_final';
  end if;

  if new.status not in ('cancelled','canceled') or old.status in ('cancelled','canceled') then return new; end if;
  if old.stock_reserved_at is null then return new; end if;
  if new.items is null then return new; end if;

  for it in select value from jsonb_array_elements(new.items)
  loop
    begin
      pid := (it->>'product_id')::uuid;
      qty := greatest(1, coalesce((it->>'quantity')::integer,1));
      v_color := nullif(btrim(it->>'selected_color'),'');
      v_size := nullif(btrim(it->>'selected_size'),'');
    exception when others then
      continue;
    end;

    if pid is null then continue; end if;
    v_sku.id := null;
    select count(*) into v_sku_count from public.inventory_skus where product_id = pid;

    if v_sku_count > 0 then
      if v_color is not null and v_size is not null then
        select * into v_sku from public.inventory_skus where product_id = pid and is_default = false and lower(btrim(coalesce(color_name,''))) = lower(v_color) and btrim(coalesce(size,'')) = v_size order by created_at limit 1 for update;
      elsif v_size is not null then
        if (select count(*) from public.inventory_skus where product_id = pid and is_default = false and btrim(coalesce(size,'')) = v_size) = 1 then
          select * into v_sku from public.inventory_skus where product_id = pid and is_default = false and btrim(coalesce(size,'')) = v_size limit 1 for update;
        end if;
      elsif v_color is not null then
        select * into v_sku from public.inventory_skus where product_id = pid and is_default = false and lower(btrim(coalesce(color_name,''))) = lower(v_color) and size is null order by created_at limit 1 for update;
      else
        select * into v_sku from public.inventory_skus where product_id = pid and is_default = true order by created_at limit 1 for update;
        if v_sku.id is null and v_sku_count = 1 then select * into v_sku from public.inventory_skus where product_id = pid limit 1 for update; end if;
      end if;

      if v_sku.id is not null then
        update public.inventory_skus set stock_quantity = stock_quantity + qty where id = v_sku.id;
        perform public.sync_product_inventory_from_skus(pid);
        continue;
      end if;
    end if;

    update public.products set stock_quantity = greatest(0,coalesce(stock_quantity,0)) + qty, in_stock = true where id = pid;
  end loop;

  return new;
end;
$function$;

revoke execute on function public.release_reserved_stock_on_cancel() from public, anon, authenticated;
grant execute on function public.release_reserved_stock_on_cancel() to service_role;
