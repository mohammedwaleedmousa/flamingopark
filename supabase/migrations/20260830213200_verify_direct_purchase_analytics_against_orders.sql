create or replace function public.normalize_purchase_analytics_event()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_order public.orders%rowtype;
  v_items_count integer := 0;
  v_unique_products integer := 0;
begin
  if new.event_type <> 'purchase' then return new; end if;
  if new.order_id is null then raise exception 'purchase_order_required' using errcode='23514'; end if;
  select * into v_order from public.orders where id = new.order_id limit 1;
  if v_order.id is null then raise exception 'purchase_order_not_found' using errcode='23503'; end if;
  if auth.uid() is not null and v_order.owner_user_id is distinct from auth.uid() then
    raise exception 'purchase_order_not_owned' using errcode='42501';
  end if;
  if jsonb_typeof(v_order.items) = 'array' then
    select coalesce(sum(greatest(0, coalesce(nullif(item->>'quantity','')::integer, 0))), 0)::integer,
           count(distinct nullif(item->>'product_id',''))::integer
    into v_items_count, v_unique_products from jsonb_array_elements(v_order.items) item;
  end if;
  new.user_id := v_order.owner_user_id;
  new.country := v_order.country;
  new.product_id := null;
  new.value := v_order.total;
  new.metadata := jsonb_build_object('order_number',v_order.order_number,'currency',v_order.currency_mode,'payment_method',v_order.payment_method,'items_count',v_items_count,'unique_products',v_unique_products,'verified',true);
  return new;
end;
$$;

drop trigger if exists analytics_events_verify_purchase on public.analytics_events;
create trigger analytics_events_verify_purchase
before insert on public.analytics_events
for each row execute function public.normalize_purchase_analytics_event();

drop policy if exists "Anyone can insert non-purchase events" on public.analytics_events;
create policy "Anyone can insert validated events"
on public.analytics_events
for insert
to anon, authenticated
with check (
  (event_type = any (array['page_view','product_view','add_to_cart','remove_from_cart','begin_checkout','search','add_to_wishlist','ad_click','client_error','slow_resource']::text[])
   and (user_id is null or user_id = (select auth.uid())) and order_id is null)
  or
  (event_type = 'purchase' and order_id is not null and exists (select 1 from public.orders o where o.id = order_id))
);
