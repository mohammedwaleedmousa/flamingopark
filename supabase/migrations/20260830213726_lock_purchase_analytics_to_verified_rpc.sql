drop policy if exists "Anyone can insert validated events" on public.analytics_events;
drop policy if exists "Anyone can insert non-purchase events" on public.analytics_events;

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
