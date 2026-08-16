drop policy if exists "Customers can view their created orders" on public.orders;
drop policy if exists "Anyone can create orders" on public.orders;
drop policy if exists "customers view own orders" on public.orders;
create policy "customers view own orders" on public.orders for select to authenticated using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.customers c
    where c.user_id = auth.uid()
      and (orders.customer_id = c.id or orders.customer_phone = c.phone)
  )
);

revoke select, insert, update, delete on public.orders from anon;

drop policy if exists "Anyone can register as customer" on public.customers;
revoke select, insert, update, delete on public.customers from anon;

drop policy if exists "customer notifications" on public.customer_notifications;
drop policy if exists "users read own notifications" on public.customer_notifications;
drop policy if exists "users mark own notifications read" on public.customer_notifications;
drop policy if exists "customers read own notifications" on public.customer_notifications;
drop policy if exists "customers update own notifications" on public.customer_notifications;
create policy "customers read own notifications" on public.customer_notifications for select to authenticated using (
  broadcast = true
  or user_id = auth.uid()
  or customer_id in (select id from public.customers where user_id = auth.uid())
);
create policy "customers update own notifications" on public.customer_notifications for update to authenticated using (
  user_id = auth.uid()
  or customer_id in (select id from public.customers where user_id = auth.uid())
) with check (
  user_id = auth.uid()
  or customer_id in (select id from public.customers where user_id = auth.uid())
);

revoke execute on function public.customer_register(text,text,text,text,text) from anon;
