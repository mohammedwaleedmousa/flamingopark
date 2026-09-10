create table if not exists public.sales_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  platform text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_agents_name_length check (char_length(btrim(name)) between 2 and 100),
  constraint sales_agents_code_length check (char_length(btrim(code)) between 2 and 40)
);

create unique index if not exists sales_agents_code_unique_ci on public.sales_agents (upper(btrim(code)));
alter table public.sales_agents enable row level security;
revoke all on table public.sales_agents from anon;
revoke all on table public.sales_agents from authenticated;
grant select, insert, update, delete on table public.sales_agents to authenticated;
grant all on table public.sales_agents to service_role;

drop policy if exists "Admins can read sales agents" on public.sales_agents;
create policy "Admins can read sales agents" on public.sales_agents for select to authenticated using ((select public.is_current_user_admin()));
drop policy if exists "Admins can insert sales agents" on public.sales_agents;
create policy "Admins can insert sales agents" on public.sales_agents for insert to authenticated with check ((select public.is_current_user_admin()));
drop policy if exists "Admins can update sales agents" on public.sales_agents;
create policy "Admins can update sales agents" on public.sales_agents for update to authenticated using ((select public.is_current_user_admin())) with check ((select public.is_current_user_admin()));
drop policy if exists "Admins can delete sales agents" on public.sales_agents;
create policy "Admins can delete sales agents" on public.sales_agents for delete to authenticated using ((select public.is_current_user_admin()));

alter table public.orders
  add column if not exists sales_agent_id uuid references public.sales_agents(id) on delete set null,
  add column if not exists sales_agent_code text,
  add column if not exists sales_agent_name text;

alter table public.orders_archive
  add column if not exists sales_agent_id uuid,
  add column if not exists sales_agent_code text,
  add column if not exists sales_agent_name text;

create index if not exists orders_sales_agent_id_idx on public.orders(sales_agent_id);
create index if not exists orders_sales_agent_code_idx on public.orders(sales_agent_code);

create or replace function public.validate_checkout_coupon(p_code text, p_customer_phone text default null::text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_code text := upper(btrim(coalesce(p_code,'')));
  v_phone_key text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  v_user_id uuid := auth.uid();
  v_referral private.flamingo_referral_codes%rowtype;
  v_coupon public.coupons%rowtype;
  v_agent public.sales_agents%rowtype;
  v_used boolean := false;
begin
  if v_code = '' or length(v_code) > 100 then return jsonb_build_object('valid',false,'reason','invalid'); end if;
  select exists(select 1 from private.flamingo_discount_benefits b where b.phone_key = v_phone_key or (v_user_id is not null and b.user_id = v_user_id)) into v_used;
  select * into v_agent from public.sales_agents a where upper(btrim(a.code)) = v_code and a.is_active = true limit 1;
  if v_agent.id is not null then
    return jsonb_build_object('valid',true,'kind','sales_agent','type','percentage','value',case when v_used then 0 else 10 end,'code',v_agent.code,'agent_name',v_agent.name);
  end if;
  select * into v_referral from private.flamingo_referral_codes r where upper(btrim(r.code)) = v_code limit 1;
  if v_referral.id is not null then
    if not v_referral.is_active or v_referral.expires_at <= now() then return jsonb_build_object('valid',false,'reason','expired'); end if;
    if v_phone_key = '' then return jsonb_build_object('valid',false,'reason','phone_required'); end if;
    if v_referral.owner_phone_key = v_phone_key or (v_user_id is not null and v_referral.owner_user_id is not null and v_referral.owner_user_id = v_user_id) then return jsonb_build_object('valid',false,'reason','self_referral'); end if;
    if v_used then return jsonb_build_object('valid',false,'reason','already_used'); end if;
    return jsonb_build_object('valid',true,'kind','referral','type','percentage','value',10,'code',v_referral.code,'expires_at',v_referral.expires_at);
  end if;
  select * into v_coupon from public.coupons where upper(btrim(code)) = v_code and coalesce(is_active,true)=true limit 1;
  if v_coupon.id is null then return jsonb_build_object('valid',false,'reason','invalid'); end if;
  return jsonb_build_object('valid',true,'kind','coupon','type',v_coupon.type,'value',v_coupon.value,'code',v_coupon.code);
end;
$function$;

create or replace function public.create_secure_order_v3(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_notes text,
  p_country text,
  p_customer_city text,
  p_customer_region text,
  p_items jsonb,
  p_payment_method text,
  p_currency_mode text,
  p_currency_code text,
  p_coupon_code text default null::text,
  p_delivery_company_id uuid default null::uuid
)
returns json language plpgsql security definer set search_path to '' as $function$
declare
  v_user_id uuid := auth.uid();
  v_phone_key text := regexp_replace(coalesce(p_customer_phone,''),'[^0-9]','','g');
  v_coupon_code text := upper(btrim(coalesce(p_coupon_code,'')));
  v_referral private.flamingo_referral_codes%rowtype;
  v_agent public.sales_agents%rowtype;
  v_used boolean := false;
  v_is_referral boolean := false;
  v_is_sales_agent boolean := false;
  v_result jsonb;
  v_order public.orders%rowtype;
  v_discount numeric := 0;
  v_precision integer := 2;
  v_referral_code text;
  v_referral_expires_at timestamptz;
begin
  if v_phone_key = '' then raise exception 'phone_required'; end if;
  select exists(select 1 from private.flamingo_discount_benefits b where b.phone_key = v_phone_key or (v_user_id is not null and b.user_id = v_user_id)) into v_used;
  if v_coupon_code <> '' then
    select * into v_agent from public.sales_agents a where upper(btrim(a.code)) = v_coupon_code and a.is_active = true limit 1;
    if v_agent.id is not null then
      v_is_sales_agent := true;
    else
      select * into v_referral from private.flamingo_referral_codes r where upper(btrim(r.code)) = v_coupon_code limit 1;
      if v_referral.id is not null then
        v_is_referral := true;
        if not v_referral.is_active or v_referral.expires_at <= now() then raise exception 'referral_code_expired'; end if;
        if v_referral.owner_phone_key = v_phone_key or (v_user_id is not null and v_referral.owner_user_id is not null and v_referral.owner_user_id = v_user_id) then raise exception 'self_referral_not_allowed'; end if;
        if v_used then raise exception 'referral_discount_already_used'; end if;
      end if;
    end if;
  end if;

  v_result := public.create_secure_order_v2(p_customer_name,p_customer_phone,p_customer_address,p_customer_notes,p_country,p_customer_city,p_customer_region,p_items,p_payment_method,p_currency_mode,p_currency_code,case when v_is_referral or v_is_sales_agent then null else nullif(v_coupon_code,'') end,p_delivery_company_id)::jsonb;
  select * into v_order from public.orders where id = (v_result->>'order_id')::uuid for update;

  if v_is_sales_agent then
    update public.orders set sales_agent_id=v_agent.id,sales_agent_code=v_agent.code,sales_agent_name=v_agent.name where id=v_order.id returning * into v_order;
  end if;

  v_precision := case when upper(coalesce(v_order.currency_code,v_order.currency_mode,'SAR'))='SAR' then 2 else 0 end;
  if v_is_referral then
    v_discount := least(v_order.subtotal, round(v_order.subtotal*0.10,v_precision));
    update public.orders set discount_amount=v_discount,total=greatest(0,subtotal+delivery_fee-v_discount),total_base=case when coalesce(exchange_rate_snapshot,0)>0 then round(greatest(0,subtotal+delivery_fee-v_discount)/exchange_rate_snapshot,2) else total_base end,coupon_code=v_referral.code,discount_source='referral',referral_code_issued=null,referral_code_expires_at=null where id=v_order.id returning * into v_order;
    insert into private.flamingo_discount_benefits(phone_key,user_id,order_id,source,referral_code,discount_percentage) values(v_phone_key,v_user_id,v_order.id,'referral',v_referral.code,10);
  elsif (v_coupon_code='' or v_is_sales_agent) and not v_used then
    v_discount := least(v_order.subtotal, round(v_order.subtotal*0.10,v_precision));
    v_referral_code := 'FLM-' || upper(substr(replace(v_order.id::text,'-',''),1,12));
    v_referral_expires_at := now()+interval '48 hours';
    update public.orders set discount_amount=v_discount,total=greatest(0,subtotal+delivery_fee-v_discount),total_base=case when coalesce(exchange_rate_snapshot,0)>0 then round(greatest(0,subtotal+delivery_fee-v_discount)/exchange_rate_snapshot,2) else total_base end,coupon_code=null,discount_source='direct',referral_code_issued=v_referral_code,referral_code_expires_at=v_referral_expires_at where id=v_order.id returning * into v_order;
    insert into private.flamingo_discount_benefits(phone_key,user_id,order_id,source,referral_code,discount_percentage) values(v_phone_key,v_user_id,v_order.id,'direct',null,10);
    insert into private.flamingo_referral_codes(code,owner_user_id,owner_phone_key,source_order_id,discount_percentage,expires_at,is_active) values(v_referral_code,v_user_id,v_phone_key,v_order.id,10,v_referral_expires_at,true);
  else
    update public.orders set discount_source=case when coalesce(discount_amount,0)>0 and coupon_code is not null then 'coupon' else discount_source end where id=v_order.id returning * into v_order;
  end if;

  return jsonb_build_object('order_id',v_order.id,'order_number',v_order.order_number,'tracking_token',v_order.tracking_token,'created_at',v_order.created_at,'items',v_order.items,'subtotal',v_order.subtotal,'delivery_fee',v_order.delivery_fee,'total',v_order.total,'discount_amount',v_order.discount_amount,'currency_mode',v_order.currency_mode,'currency_code',v_order.currency_code,'exchange_rate_snapshot',v_order.exchange_rate_snapshot,'total_base',v_order.total_base,'delivery_company',(select dc.name from public.delivery_companies dc where dc.id=v_order.delivery_company_id),'referral_code',v_order.referral_code_issued,'referral_expires_at',v_order.referral_code_expires_at,'discount_source',v_order.discount_source,'sales_agent_code',v_order.sales_agent_code,'sales_agent_name',v_order.sales_agent_name)::json;
end;
$function$;

create or replace function public.update_archive_on_order_update()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  update public.orders_archive
  set status=new.status, invoice_url=new.invoice_url, sales_agent_id=new.sales_agent_id, sales_agent_code=new.sales_agent_code, sales_agent_name=new.sales_agent_name
  where original_order_id=new.id;
  return new;
end;
$function$;
