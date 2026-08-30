alter table public.analytics_events
drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
add constraint analytics_events_event_type_check
check (event_type = any (array[
  'page_view','product_view','add_to_cart','remove_from_cart','begin_checkout',
  'purchase','search','add_to_wishlist','ad_click','client_error','slow_resource'
]::text[]));

create unique index if not exists analytics_events_purchase_order_uidx
on public.analytics_events(order_id)
where event_type = 'purchase' and order_id is not null;

drop policy if exists "Anyone can insert events" on public.analytics_events;
create policy "Anyone can insert non-purchase events"
on public.analytics_events
for insert
to anon, authenticated
with check (
  event_type = any (array[
    'page_view','product_view','add_to_cart','remove_from_cart','begin_checkout',
    'search','add_to_wishlist','ad_click','client_error','slow_resource'
  ]::text[])
  and (user_id is null or user_id = (select auth.uid()))
  and order_id is null
);

create or replace function public.record_purchase_analytics(
  p_order_id uuid,
  p_tracking_token text,
  p_session_id text default null,
  p_path text default null,
  p_referrer text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_device text default null
)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $$
declare
  v_order public.orders%rowtype;
  v_items_count integer := 0;
  v_unique_products integer := 0;
  v_inserted integer := 0;
begin
  if p_order_id is null or nullif(btrim(coalesce(p_tracking_token,'')), '') is null then return false; end if;
  select * into v_order from public.orders
  where id = p_order_id and tracking_token_hash = encode(extensions.digest(p_tracking_token, 'sha256'), 'hex') limit 1;
  if v_order.id is null then return false; end if;
  if jsonb_typeof(v_order.items) = 'array' then
    select coalesce(sum(greatest(0, coalesce(nullif(item->>'quantity','')::integer, 0))), 0)::integer,
           count(distinct nullif(item->>'product_id',''))::integer
    into v_items_count, v_unique_products from jsonb_array_elements(v_order.items) item;
  end if;
  insert into public.analytics_events(event_type,session_id,user_id,path,referrer,utm_source,utm_medium,utm_campaign,utm_content,device,country,product_id,order_id,value,metadata)
  values('purchase',nullif(left(coalesce(p_session_id,''),120),''),v_order.owner_user_id,nullif(left(coalesce(p_path,''),300),''),nullif(left(coalesce(p_referrer,''),1000),''),nullif(left(coalesce(p_utm_source,''),150),''),nullif(left(coalesce(p_utm_medium,''),150),''),nullif(left(coalesce(p_utm_campaign,''),200),''),nullif(left(coalesce(p_utm_content,''),200),''),case when p_device in ('mobile','tablet','desktop') then p_device else null end,v_order.country,null,v_order.id,v_order.total,jsonb_build_object('order_number',v_order.order_number,'currency',v_order.currency_mode,'payment_method',v_order.payment_method,'items_count',v_items_count,'unique_products',v_unique_products,'verified',true))
  on conflict (order_id) where event_type='purchase' and order_id is not null do nothing;
  get diagnostics v_inserted = row_count;
  return v_inserted = 1 or exists(select 1 from public.analytics_events where event_type='purchase' and order_id=v_order.id);
end;
$$;

revoke all on function public.record_purchase_analytics(uuid,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.record_purchase_analytics(uuid,text,text,text,text,text,text,text,text,text) to anon, authenticated;
