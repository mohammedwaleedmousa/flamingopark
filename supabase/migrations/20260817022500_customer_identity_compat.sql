alter table public.customer_addresses drop constraint if exists customer_addresses_user_id_fkey;

drop policy if exists "customers manage own addresses" on public.customer_addresses;
create policy "customers manage own addresses" on public.customer_addresses for all to authenticated
using (
  user_id = (select auth.uid())
  or exists (select 1 from public.customers c where c.id = customer_addresses.user_id and c.user_id = (select auth.uid()))
)
with check (
  user_id = (select auth.uid())
  or exists (select 1 from public.customers c where c.id = customer_addresses.user_id and c.user_id = (select auth.uid()))
);

drop policy if exists "customer notifications" on public.customer_notifications;
drop policy if exists "users read own notifications" on public.customer_notifications;
drop policy if exists "users mark own notifications read" on public.customer_notifications;
create policy "customers read own notifications" on public.customer_notifications for select to authenticated
using (
  broadcast = true
  or user_id = (select auth.uid())
  or customer_id in (select id from public.customers where user_id = (select auth.uid()))
);
create policy "customers update own notifications" on public.customer_notifications for update to authenticated
using (user_id = (select auth.uid()) or customer_id in (select id from public.customers where user_id = (select auth.uid())))
with check (user_id = (select auth.uid()) or customer_id in (select id from public.customers where user_id = (select auth.uid())));

create or replace function public.customer_self(_id uuid, _phone text)
returns table(id uuid, name text, phone text, country text, region text, avatar_url text, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select c.id,c.name,c.phone,c.country,c.region,c.avatar_url,c.created_at
  from public.customers c
  where c.id=_id and c.phone=_phone and c.user_id=(select auth.uid());
$$;

create or replace function public.customer_update_self(_id uuid, _phone text, _name text, _region text, _avatar_url text)
returns table(id uuid, name text, phone text, country text, region text, avatar_url text)
language plpgsql security definer set search_path=public as $$
begin
  return query update public.customers c
  set name=coalesce(nullif(_name,''),c.name), region=coalesce(nullif(_region,''),c.region), avatar_url=coalesce(nullif(_avatar_url,''),c.avatar_url), updated_at=now()
  where c.id=_id and c.phone=_phone and c.user_id=(select auth.uid())
  returning c.id,c.name,c.phone,c.country,c.region,c.avatar_url;
end;
$$;

grant execute on function public.customer_self(uuid,text) to authenticated;
grant execute on function public.customer_update_self(uuid,text,text,text,text) to authenticated;
