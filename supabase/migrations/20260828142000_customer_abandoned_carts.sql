create table if not exists public.customer_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid null references public.customers(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  item_count integer not null default 0 check (item_count >= 0),
  cart_value numeric(12,2) not null default 0 check (cart_value >= 0),
  currency text not null default 'SAR',
  status text not null default 'active' check (status in ('active','abandoned','converted','cleared')),
  last_activity_at timestamptz not null default now(),
  abandoned_at timestamptz null,
  converted_order_id uuid null references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists customer_carts_status_activity_idx on public.customer_carts(status,last_activity_at desc);
create index if not exists customer_carts_customer_id_idx on public.customer_carts(customer_id);

alter table public.customer_carts enable row level security;

drop policy if exists customer_carts_select_own on public.customer_carts;
create policy customer_carts_select_own on public.customer_carts for select to authenticated using (auth.uid() = user_id);

drop policy if exists customer_carts_insert_own on public.customer_carts;
create policy customer_carts_insert_own on public.customer_carts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists customer_carts_update_own on public.customer_carts;
create policy customer_carts_update_own on public.customer_carts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.mark_stale_customer_carts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  update public.customer_carts
  set status = 'abandoned', abandoned_at = coalesce(abandoned_at, now()), updated_at = now()
  where status = 'active'
    and item_count > 0
    and last_activity_at < now() - interval '2 hours';
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_stale_customer_carts() from public;
