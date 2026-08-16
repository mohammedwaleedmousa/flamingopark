create table if not exists public.customer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

alter table public.customer_favorites enable row level security;
drop policy if exists "customers manage own favorites" on public.customer_favorites;
create policy "customers manage own favorites" on public.customer_favorites for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  label text not null default 'عنوان',
  recipient_name text not null default '',
  phone text not null default '',
  city text not null,
  address_line1 text not null,
  notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_addresses enable row level security;
drop policy if exists "customers manage own addresses" on public.customer_addresses;
create policy "customers manage own addresses" on public.customer_addresses for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index if not exists customer_favorites_user_idx on public.customer_favorites(user_id, created_at desc);
create index if not exists customer_addresses_user_idx on public.customer_addresses(user_id, updated_at desc);

alter table public.orders add column if not exists owner_user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists tracking_token_hash text;
create index if not exists orders_owner_user_id_idx on public.orders(owner_user_id, created_at desc);

update public.orders o set owner_user_id = c.user_id from public.customers c where o.customer_id = c.id and o.owner_user_id is null and c.user_id is not null;
update public.orders set tracking_token_hash = encode(extensions.digest(tracking_token, 'sha256'), 'hex') where tracking_token is not null and tracking_token_hash is null;

create or replace function public.claim_legacy_customer(_user_id uuid, _phone text, _password text)
returns table(id uuid, user_id uuid, name text, phone text, country text, region text, avatar_url text, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if _user_id is null then raise exception 'invalid_user'; end if;
  return query
  update public.customers c set user_id = _user_id, updated_at = now()
  where c.phone = _phone and c.user_id is null and c.password_hash is not null and c.password_hash = extensions.crypt(_password, c.password_hash)
  returning c.id, c.user_id, c.name, c.phone, c.country, c.region, c.avatar_url, c.created_at;
end;
$$;
revoke all on function public.claim_legacy_customer(uuid,text,text) from public, anon, authenticated;
grant execute on function public.claim_legacy_customer(uuid,text,text) to service_role;

create or replace function public.create_secure_order(
  p_customer_id uuid, p_customer_name text, p_customer_phone text, p_customer_address text, p_customer_notes text,
  p_country text, p_customer_city text, p_customer_region text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric,
  p_total numeric, p_payment_method text, p_currency_mode text, p_currency_code text, p_exchange_rate_snapshot numeric,
  p_total_base numeric, p_coupon_code text default null, p_discount_amount numeric default 0
) returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user_id uuid := auth.uid();
  v_customer public.customers;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
  v_unit numeric;
  v_accessories numeric;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery_fee numeric := 0;
  v_total numeric := 0;
  v_coupon public.coupons;
  v_delivery public.delivery_companies;
  v_tracking text := encode(gen_random_bytes(24), 'hex');
  v_order public.orders;
  v_safe_items jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then raise exception 'invalid_items'; end if;
  if p_payment_method not in ('cod','bank') then raise exception 'invalid_payment_method'; end if;

  if v_user_id is not null then
    select * into v_customer from public.customers where user_id = v_user_id limit 1;
    if v_customer.id is null then raise exception 'customer_profile_required'; end if;
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(100, coalesce((v_item->>'quantity')::integer, 1)));
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid and is_active = true limit 1;
    if v_product.id is null or coalesce(v_product.in_stock, true) = false then raise exception 'product_unavailable'; end if;
    v_unit := round((v_product.price * (1 - coalesce(v_product.discount,0)::numeric / 100.0))::numeric, 2);
    v_accessories := 0;
    if jsonb_typeof(v_item->'selected_accessories') = 'array' then
      select coalesce(sum((coalesce(a->>'price','0'))::numeric * greatest(1, least(100, coalesce((a->>'quantity')::integer,1)))),0) into v_accessories from jsonb_array_elements(v_item->'selected_accessories') a;
    end if;
    v_subtotal := v_subtotal + (v_unit + v_accessories) * v_qty;
    v_safe_items := v_safe_items || jsonb_build_array(v_item || jsonb_build_object('product_name', coalesce(v_product.name_ar,v_product.name), 'product_image', coalesce(v_product.images[1],''), 'price', v_unit + v_accessories));
  end loop;

  if p_delivery_fee is not null and p_delivery_fee > 0 then
    select * into v_delivery from public.delivery_companies where is_active = true and base_fee = p_delivery_fee order by created_at desc limit 1;
    if v_delivery.id is not null then v_delivery_fee := v_delivery.base_fee; end if;
  end if;

  if nullif(trim(coalesce(p_coupon_code,'')), '') is not null then
    select * into v_coupon from public.coupons where upper(trim(code)) = upper(trim(p_coupon_code)) and coalesce(is_active,true) = true limit 1;
    if v_coupon.id is not null then
      if v_coupon.type = 'percentage' then v_discount := least(v_subtotal, v_subtotal * v_coupon.value / 100.0);
      elsif v_coupon.type = 'fixed' then v_discount := least(v_subtotal, v_coupon.value); end if;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);

  insert into public.orders(order_number, tracking_token, tracking_token_hash, owner_user_id, customer_id, customer_name, customer_phone, customer_address, customer_notes, country, customer_city, customer_region, items, subtotal, delivery_fee, total, payment_method, status, currency_mode, currency_code, exchange_rate_snapshot, total_base, coupon_code, discount_amount, delivery_company_id)
  values('FP-' || floor(random()*900000+100000)::text, v_tracking, encode(extensions.digest(v_tracking,'sha256'),'hex'), v_user_id, case when v_user_id is null then null else v_customer.id end, case when v_user_id is null then left(trim(p_customer_name),150) else v_customer.name end, case when v_user_id is null then left(trim(p_customer_phone),40) else v_customer.phone end, left(trim(p_customer_address),500), nullif(left(trim(coalesce(p_customer_notes,'')),1000),''), coalesce(nullif(p_country,''),'YE'), left(trim(coalesce(p_customer_city,'')),120), coalesce(v_customer.region,p_customer_region), v_safe_items, v_subtotal, v_delivery_fee, v_total, p_payment_method, 'pending', coalesce(nullif(p_currency_mode,''),'SAR'), coalesce(nullif(p_currency_code,''),coalesce(nullif(p_currency_mode,''),'SAR')), 1, v_total, case when v_discount > 0 then upper(trim(p_coupon_code)) else null end, v_discount, v_delivery.id)
  returning * into v_order;

  return json_build_object('order_id',v_order.id,'order_number',v_order.order_number,'tracking_token',v_tracking,'created_at',v_order.created_at,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,'total',v_order.total,'discount_amount',v_order.discount_amount,'currency_mode',v_order.currency_mode,'delivery_company',v_delivery.name);
end;
$$;

grant execute on function public.create_secure_order(uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,text,text,text,numeric,numeric,text,numeric) to anon, authenticated;

create or replace function public.get_order_tracking(p_order_number text, p_tracking_token text)
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  select json_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'customer_name',o.customer_name,'customer_city',o.customer_city,'total',o.total,'currency_code',o.currency_code,'created_at',o.created_at,'items',o.items)
  into result from public.orders o where o.order_number = p_order_number and o.tracking_token_hash = encode(extensions.digest(p_tracking_token,'sha256'),'hex');
  return result;
end;
$$;

drop policy if exists "Customers can view their created orders" on public.orders;
drop policy if exists "customers can view own orders" on public.orders;
create policy "customers can view own orders" on public.orders for select to authenticated using (owner_user_id = (select auth.uid()) or has_role((select auth.uid()), 'admin'::app_role));

drop policy if exists "Anyone can create orders" on public.orders;

revoke execute on function public.customer_self(uuid,text) from anon;
revoke execute on function public.customer_update_self(uuid,text,text,text,text) from anon;
