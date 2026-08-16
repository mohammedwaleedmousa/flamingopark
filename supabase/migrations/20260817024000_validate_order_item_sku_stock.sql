create or replace function public.validate_order_item_sku_stock()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_size text;
  v_color text;
  v_has_sized_skus boolean;
  v_sku_stock integer;
begin
  if jsonb_typeof(new.items) <> 'array' then
    raise exception 'invalid_items';
  end if;

  for v_item in select value from jsonb_array_elements(new.items) loop
    v_product_id := nullif(v_item->>'product_id','')::uuid;
    v_qty := greatest(1, coalesce((v_item->>'quantity')::integer,1));
    v_size := nullif(btrim(coalesce(v_item->>'selected_size','')), '');
    v_color := nullif(btrim(coalesce(v_item->>'selected_color','')), '');

    if v_product_id is null then raise exception 'invalid_product'; end if;

    select exists(
      select 1 from public.inventory_skus s
      where s.product_id=v_product_id and nullif(btrim(coalesce(s.size,'')),'') is not null
    ) into v_has_sized_skus;

    if v_has_sized_skus then
      if v_size is null then raise exception 'size_required'; end if;

      select s.stock_quantity into v_sku_stock
      from public.inventory_skus s
      where s.product_id=v_product_id
        and btrim(coalesce(s.size,''))=v_size
        and (v_color is null or s.color_name is null or btrim(coalesce(s.color_name,''))=v_color)
      order by case when v_color is not null and btrim(coalesce(s.color_name,''))=v_color then 0 else 1 end, s.is_default desc
      limit 1;

      if v_sku_stock is null then raise exception 'invalid_size'; end if;
      if v_qty > v_sku_stock then raise exception 'insufficient_size_stock'; end if;
    end if;
  end loop;

  return new;
end;
$$;

revoke execute on function public.validate_order_item_sku_stock() from public, anon, authenticated;

drop trigger if exists validate_order_item_sku_stock_trg on public.orders;
create trigger validate_order_item_sku_stock_trg
before insert or update of items on public.orders
for each row execute function public.validate_order_item_sku_stock();
