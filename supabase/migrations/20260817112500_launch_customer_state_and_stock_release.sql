-- Complete launch behavior for cancelled reservations, notification state, and legacy-login throttling.

create table if not exists public.customer_notification_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_key text not null,
  is_read boolean not null default false,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, notification_key)
);

alter table public.customer_notification_states enable row level security;
revoke all on public.customer_notification_states from anon;
grant select, insert, update, delete on public.customer_notification_states to authenticated;

drop policy if exists "customers manage own notification states" on public.customer_notification_states;
create policy "customers manage own notification states" on public.customer_notification_states
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

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
  if new.status not in ('cancelled','canceled') or old.status in ('cancelled','canceled') then
    return new;
  end if;

  if new.items is null then return new; end if;

  for it in select value from jsonb_array_elements(new.items)
  loop
    begin
      pid := (it->>'product_id')::uuid;
      qty := greatest(1, coalesce((it->>'quantity')::integer, 1));
      v_color := nullif(btrim(it->>'selected_color'), '');
      v_size := nullif(btrim(it->>'selected_size'), '');
    exception when others then
      continue;
    end;

    if pid is null then continue; end if;

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
          select * into v_sku from public.inventory_skus
          where product_id = pid and is_default = false and btrim(coalesce(size,'')) = v_size
          limit 1 for update;
        end if;
      elsif v_color is not null then
        select * into v_sku from public.inventory_skus
        where product_id = pid and is_default = false
          and lower(btrim(coalesce(color_name,''))) = lower(v_color)
          and size is null
        order by created_at limit 1 for update;
      else
        select * into v_sku from public.inventory_skus
        where product_id = pid and is_default = true
        order by created_at limit 1 for update;
        if v_sku.id is null and v_sku_count = 1 then
          select * into v_sku from public.inventory_skus where product_id = pid limit 1 for update;
        end if;
      end if;

      if v_sku.id is not null then
        update public.inventory_skus set stock_quantity = stock_quantity + qty where id = v_sku.id;
        perform public.sync_product_inventory_from_skus(pid);
        continue;
      end if;
    end if;

    update public.products
    set stock_quantity = greatest(0, coalesce(stock_quantity,0)) + qty,
        in_stock = true
    where id = pid;
  end loop;

  return new;
end;
$function$;

revoke execute on function public.release_reserved_stock_on_cancel() from public, anon, authenticated;
grant execute on function public.release_reserved_stock_on_cancel() to service_role;

drop trigger if exists release_reserved_stock_on_cancel_trg on public.orders;
create trigger release_reserved_stock_on_cancel_trg
after update of status on public.orders
for each row execute function public.release_reserved_stock_on_cancel();

create table if not exists public.customer_login_limits (
  phone_key text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.customer_login_limits enable row level security;
revoke all on public.customer_login_limits from public, anon, authenticated;
grant all on public.customer_login_limits to service_role;

create or replace function public.customer_login(_phone text, _password text)
returns table(id uuid, name text, phone text, country text, region text, avatar_url text)
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
declare
  v_phone text := btrim(coalesce(_phone,''));
  v_limit public.customer_login_limits%rowtype;
  v_match public.customers%rowtype;
begin
  if v_phone = '' or length(v_phone) > 40 or coalesce(_password,'') = '' or length(_password) > 200 then
    return;
  end if;

  insert into public.customer_login_limits(phone_key) values (v_phone)
  on conflict (phone_key) do nothing;

  select * into v_limit from public.customer_login_limits where phone_key = v_phone for update;
  if v_limit.window_started_at < now() - interval '15 minutes' then
    v_limit.window_started_at := now();
    v_limit.attempt_count := 0;
  end if;

  if v_limit.attempt_count >= 10 then
    return;
  end if;

  update public.customer_login_limits
  set window_started_at = v_limit.window_started_at,
      attempt_count = v_limit.attempt_count + 1,
      updated_at = now()
  where phone_key = v_phone;

  select * into v_match
  from public.customers c
  where c.phone = v_phone
    and c.password_hash is not null
    and c.password_hash = extensions.crypt(_password, c.password_hash)
  limit 1;

  if v_match.id is null then
    return;
  end if;

  update public.customer_login_limits set attempt_count = 0, window_started_at = now(), updated_at = now() where phone_key = v_phone;

  return query select v_match.id, v_match.name, v_match.phone, v_match.country, v_match.region, v_match.avatar_url;
end;
$function$;

revoke all on function public.customer_login(text,text) from public, authenticated;
grant execute on function public.customer_login(text,text) to anon, service_role;
