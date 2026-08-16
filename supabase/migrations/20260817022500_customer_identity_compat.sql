alter table public.customer_addresses drop constraint if exists customer_addresses_user_id_fkey;

update public.customer_addresses a
set customer_id = coalesce(a.customer_id, c.id),
    user_id = c.id
from public.customers c
where a.user_id = c.user_id or a.customer_id = c.id;

drop policy if exists "customers manage own addresses" on public.customer_addresses;
create policy "customers manage own addresses" on public.customer_addresses for all to authenticated using (
  exists (select 1 from public.customers c where c.id = customer_addresses.customer_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.customers c where c.id = customer_addresses.customer_id and c.user_id = auth.uid())
  and customer_addresses.user_id = customer_addresses.customer_id
);

drop policy if exists "customer notifications" on public.customer_notifications;
drop policy if exists "users read own notifications" on public.customer_notifications;
drop policy if exists "users mark own notifications read" on public.customer_notifications;
drop policy if exists "customers read own notifications" on public.customer_notifications;
drop policy if exists "customers update own notifications" on public.customer_notifications;
create policy "customers read own notifications" on public.customer_notifications for select to authenticated using (
  broadcast = true or user_id = auth.uid() or customer_id in (select id from public.customers where user_id = auth.uid())
);
create policy "customers update own notifications" on public.customer_notifications for update to authenticated using (
  user_id = auth.uid() or customer_id in (select id from public.customers where user_id = auth.uid())
) with check (
  user_id = auth.uid() or customer_id in (select id from public.customers where user_id = auth.uid())
);

drop function if exists public.customer_self(uuid,text);
create function public.customer_self(_id uuid, _phone text)
returns setof public.customers language sql stable security definer set search_path=public as $$
  select c.* from public.customers c where c.user_id = auth.uid() limit 1;
$$;

drop function if exists public.customer_update_self(uuid,text,text,text,text);
create function public.customer_update_self(_id uuid, _phone text, _name text, _region text, _avatar_url text)
returns setof public.customers language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query update public.customers c
  set name=coalesce(nullif(trim(_name),''),c.name),
      region=coalesce(nullif(trim(_region),''),c.region),
      avatar_url=case when _avatar_url is null then c.avatar_url else nullif(trim(_avatar_url),'') end,
      updated_at=now()
  where c.user_id=auth.uid()
  returning c.*;
end;
$$;

grant execute on function public.customer_self(uuid,text) to authenticated;
grant execute on function public.customer_update_self(uuid,text,text,text,text) to authenticated;
revoke execute on function public.customer_self(uuid,text) from anon;
revoke execute on function public.customer_update_self(uuid,text,text,text,text) from anon;

create or replace function public.normalize_customer_address_owner()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_customer_id uuid;
begin
  select c.id into v_customer_id from public.customers c where c.user_id = auth.uid() limit 1;
  if v_customer_id is null then raise exception 'customer_profile_required'; end if;
  new.customer_id := v_customer_id;
  new.user_id := v_customer_id;
  return new;
end;
$$;

drop trigger if exists normalize_customer_address_owner_trg on public.customer_addresses;
create trigger normalize_customer_address_owner_trg before insert or update on public.customer_addresses for each row execute function public.normalize_customer_address_owner();
