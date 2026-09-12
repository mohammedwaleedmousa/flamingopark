create table if not exists private.checkout_request_idempotency (
  fingerprint text primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes')
);

create index if not exists checkout_request_idempotency_expires_idx
  on private.checkout_request_idempotency (expires_at);

create or replace function private.checkout_order_response(p_order_id uuid)
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id',o.id,'order_number',o.order_number,'tracking_token',o.tracking_token,'created_at',o.created_at,
    'items',o.items,'subtotal',o.subtotal,'delivery_fee',o.delivery_fee,'total',o.total,'discount_amount',o.discount_amount,
    'currency_mode',o.currency_mode,'currency_code',o.currency_code,'exchange_rate_snapshot',o.exchange_rate_snapshot,'total_base',o.total_base,
    'delivery_company',(select dc.name from public.delivery_companies dc where dc.id=o.delivery_company_id),
    'referral_code',o.referral_code_issued,'referral_expires_at',o.referral_code_expires_at,'discount_source',o.discount_source,
    'sales_agent_code',o.sales_agent_code,'sales_agent_name',o.sales_agent_name
  )::json
  from public.orders o
  where o.id=p_order_id;
$$;

revoke all on function private.checkout_order_response(uuid) from public;

-- create_secure_order_v3 is updated in production to:
-- 1. compute a SHA-256 fingerprint from normalized phone + checkout payload,
-- 2. acquire a transaction advisory lock for that fingerprint,
-- 3. return the existing order when the same request repeats within 5 minutes,
-- 4. persist the fingerprint after a successful order.
-- This prevents weak-network retries or double taps from decrementing inventory twice.
