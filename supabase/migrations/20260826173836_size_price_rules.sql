create table if not exists public.size_price_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  adjustments jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint size_price_rules_adjustments_object check (jsonb_typeof(adjustments) = 'object')
);

alter table public.size_price_rules enable row level security;

drop policy if exists "Public read active size price rules" on public.size_price_rules;
create policy "Public read active size price rules"
on public.size_price_rules for select to anon
using (is_active = true);

drop policy if exists "Authenticated read size price rules" on public.size_price_rules;
create policy "Authenticated read size price rules"
on public.size_price_rules for select to authenticated
using (is_active = true or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins manage size price rules" on public.size_price_rules;
create policy "Admins manage size price rules"
on public.size_price_rules for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

grant select on public.size_price_rules to anon, authenticated;
grant insert, update, delete on public.size_price_rules to authenticated;

alter table public.products
add column if not exists size_price_rule_id uuid null references public.size_price_rules(id) on delete set null;

create index if not exists products_size_price_rule_id_idx
on public.products(size_price_rule_id)
where size_price_rule_id is not null;

create or replace function public.get_product_size_price_adjustment(
  p_product_id uuid,
  p_size text
)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce((
    select greatest(0, value::numeric)
    from public.products p
    join public.size_price_rules r on r.id = p.size_price_rule_id and r.is_active = true
    cross join lateral jsonb_each_text(r.adjustments) as adjustment(key, value)
    where p.id = p_product_id
      and nullif(btrim(coalesce(p_size, '')), '') is not null
      and lower(btrim(adjustment.key)) = lower(btrim(p_size))
      and adjustment.value ~ '^\s*[0-9]+(?:\.[0-9]+)?\s*$'
    limit 1
  ), 0::numeric);
$$;

grant execute on function public.get_product_size_price_adjustment(uuid, text) to anon, authenticated;

insert into public.size_price_rules(name, adjustments, is_active)
values (
  'مقاسات كبيرة',
  '{"XL":0,"XXL":0,"3XL":0,"4XL":0}'::jsonb,
  true
)
on conflict (name) do nothing;

do $$
declare
  v_oid oid;
  v_def text;
  v_old text := 'v_unit := round((v_product.price*(1-coalesce(v_product.discount,0)::numeric/100.0))::numeric,2);';
  v_new text := 'v_unit := round(((v_product.price + public.get_product_size_price_adjustment(v_product.id, v_selected_size))*(1-coalesce(v_product.discount,0)::numeric/100.0))::numeric,2);';
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_secure_order_v2'
  order by p.oid desc
  limit 1;

  if v_oid is null then
    raise exception 'create_secure_order_v2 not found';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if position(v_new in v_def) > 0 then
    return;
  end if;

  if position(v_old in v_def) = 0 then
    raise exception 'create_secure_order_v2 price expression changed; size pricing patch not applied';
  end if;

  v_def := replace(v_def, v_old, v_new);
  execute v_def;
end;
$$;
