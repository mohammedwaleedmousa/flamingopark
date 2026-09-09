-- Track signed-in customer activity without exposing presence writes to clients.
alter table public.customers
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_logout_at timestamptz;

create index if not exists idx_customers_last_seen_at
  on public.customers (last_seen_at desc)
  where user_id is not null;

create or replace function public.customer_presence_ping()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.customers
  set last_seen_at = now()
  where user_id = auth.uid();
end;
$$;

create or replace function public.customer_presence_logout()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.customers
  set last_seen_at = now(),
      last_logout_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.customer_presence_ping() from public, anon;
revoke all on function public.customer_presence_logout() from public, anon;
grant execute on function public.customer_presence_ping() to authenticated;
grant execute on function public.customer_presence_logout() to authenticated;

comment on column public.customers.last_seen_at is 'Latest storefront heartbeat for authenticated customer.';
comment on column public.customers.last_logout_at is 'Latest explicit customer logout time.';