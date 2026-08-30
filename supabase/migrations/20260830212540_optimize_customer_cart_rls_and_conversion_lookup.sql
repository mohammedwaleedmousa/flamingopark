drop policy if exists customer_carts_select_own on public.customer_carts;
create policy customer_carts_select_own
on public.customer_carts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists customer_carts_insert_own on public.customer_carts;
create policy customer_carts_insert_own
on public.customer_carts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists customer_carts_update_own on public.customer_carts;
create policy customer_carts_update_own
on public.customer_carts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists customer_carts_converted_order_id_idx
on public.customer_carts(converted_order_id)
where converted_order_id is not null;
