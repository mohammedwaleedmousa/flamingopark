create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric not null default 0 check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

alter table public.product_costs enable row level security;
drop policy if exists "Admins manage product costs" on public.product_costs;
create policy "Admins manage product costs" on public.product_costs
for all to authenticated
using (public.has_role(auth.uid(), 'admin'::app_role))
with check (public.has_role(auth.uid(), 'admin'::app_role));

revoke all on public.product_costs from anon;
grant select, insert, update, delete on public.product_costs to authenticated;

insert into public.product_costs(product_id, cost_price, updated_at)
select id, greatest(0, coalesce(cost_price,0)), now()
from public.products
on conflict (product_id) do update
set cost_price=excluded.cost_price, updated_at=now();

update public.products set cost_price=null where cost_price is not null;

create or replace function public.capture_product_cost_price()
returns trigger
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if new.cost_price is not null then
    if auth.uid() is not null and not public.has_role(auth.uid(), 'admin'::app_role) then
      raise exception 'not_authorized' using errcode='42501';
    end if;
    insert into public.product_costs(product_id,cost_price,updated_at)
    values(new.id,greatest(0,new.cost_price),now())
    on conflict(product_id) do update
      set cost_price=excluded.cost_price,updated_at=now();
    new.cost_price:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists capture_product_cost_price_trigger on public.products;
create trigger capture_product_cost_price_trigger
before insert or update of cost_price on public.products
for each row execute function public.capture_product_cost_price();

drop policy if exists "Products are viewable by everyone" on public.products;
drop policy if exists "Active products are viewable by everyone" on public.products;
create policy "Active products are viewable by everyone"
on public.products for select to public
using (is_active=true);

update public.products set is_active=false where coalesce(price,0)<=0;
alter table public.products drop constraint if exists products_active_price_positive;
alter table public.products add constraint products_active_price_positive
check (is_active is not true or (price is not null and price>0));

create or replace function public.get_inventory_summary()
returns table(total_products bigint,active_products bigint,total_units bigint,inventory_value numeric,low_stock bigint,out_of_stock bigint,sku_tracked bigint)
language sql
security definer
set search_path to 'public','auth'
as $$
  select
    count(*)::bigint,
    count(*) filter(where p.is_active is true)::bigint,
    coalesce(sum(greatest(0,p.stock_quantity)),0)::bigint,
    coalesce(sum(greatest(0,p.stock_quantity)*greatest(0,coalesce(pc.cost_price,0))),0)::numeric,
    count(*) filter(where p.stock_quantity between 1 and 3)::bigint,
    count(*) filter(where p.stock_quantity=0)::bigint,
    count(*) filter(where exists(select 1 from public.inventory_skus s where s.product_id=p.id and s.is_default=false))::bigint
  from public.products p
  left join public.product_costs pc on pc.product_id=p.id
  where public.has_role(auth.uid(),'admin'::app_role);
$$;

create or replace function public.apply_inventory_adjustment(
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity integer,
  p_reason text,
  p_reference text default null,
  p_notes text default null,
  p_inventory_sku_id uuid default null
)
returns public.inventory_adjustments
language plpgsql
security definer
set search_path to 'public','auth'
as $$
declare
  v_product public.products%rowtype;
  v_sku public.inventory_skus%rowtype;
  v_sku_count integer;
  v_before integer;
  v_after integer;
  v_change integer;
  v_product_before integer;
  v_product_after integer;
  v_unit_cost numeric;
  v_adjustment public.inventory_adjustments%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'غير مصرح بتنفيذ تسويات المخزون' using errcode='42501';
  end if;
  if p_product_id is null then raise exception 'المنتج مطلوب'; end if;
  if p_adjustment_type not in ('increase','decrease','recount','damage') then raise exception 'نوع التسوية غير صالح'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'سبب التسوية مطلوب'; end if;
  if p_quantity is null then raise exception 'الكمية مطلوبة'; end if;
  if p_adjustment_type='recount' and p_quantity<0 then raise exception 'كمية الجرد لا يمكن أن تكون سالبة'; end if;
  if p_adjustment_type<>'recount' and p_quantity<=0 then raise exception 'الكمية يجب أن تكون أكبر من صفر'; end if;

  select * into v_product from public.products where id=p_product_id for update;
  if not found then raise exception 'المنتج غير موجود'; end if;
  v_product_before:=greatest(0,coalesce(v_product.stock_quantity,0));
  select greatest(0,coalesce(cost_price,0)) into v_unit_cost
  from public.product_costs where product_id=p_product_id;
  v_unit_cost:=coalesce(v_unit_cost,0);

  select count(*) into v_sku_count from public.inventory_skus where product_id=p_product_id;
  if v_sku_count=0 then
    insert into public.inventory_skus(product_id,variant_key,label,stock_quantity,is_default)
    values(p_product_id,'default','غير موزع على الخيارات',v_product_before,true)
    returning * into v_sku;
    v_sku_count:=1;
  end if;

  if p_inventory_sku_id is not null then
    select * into v_sku from public.inventory_skus
    where id=p_inventory_sku_id and product_id=p_product_id for update;
    if not found then raise exception 'خيار المخزون المحدد غير موجود'; end if;
  else
    select * into v_sku from public.inventory_skus
    where product_id=p_product_id and is_default=true
    order by created_at limit 1 for update;
    if not found then
      if v_sku_count=1 then
        select * into v_sku from public.inventory_skus where product_id=p_product_id limit 1 for update;
      else
        raise exception 'هذا المنتج موزع على عدة خيارات. اختر اللون أو المقاس المطلوب.';
      end if;
    end if;
  end if;

  v_before:=greatest(0,coalesce(v_sku.stock_quantity,0));
  case p_adjustment_type
    when 'increase' then v_change:=p_quantity; v_after:=v_before+p_quantity;
    when 'decrease' then
      if p_quantity>v_before then raise exception 'لا يمكن إنقاص % قطعة، مخزون الخيار الحالي هو % فقط',p_quantity,v_before; end if;
      v_change:=-p_quantity; v_after:=v_before-p_quantity;
    when 'damage' then
      if p_quantity>v_before then raise exception 'كمية التالف أكبر من مخزون الخيار الحالي'; end if;
      v_change:=-p_quantity; v_after:=v_before-p_quantity;
    when 'recount' then v_after:=p_quantity; v_change:=v_after-v_before;
  end case;

  update public.inventory_skus set stock_quantity=v_after where id=v_sku.id;
  select stock_quantity into v_product_after from public.products where id=p_product_id;

  insert into public.inventory_adjustments(
    product_id,product_name,inventory_sku_id,variant_label,adjustment_type,
    quantity_before,quantity_change,quantity_after,product_quantity_before,product_quantity_after,
    unit_cost,total_cost,reason,reference,notes,created_by
  ) values(
    v_product.id,v_product.name_ar,v_sku.id,v_sku.label,p_adjustment_type,
    v_before,v_change,v_after,v_product_before,v_product_after,
    v_unit_cost,abs(v_change)*v_unit_cost,btrim(p_reason),
    nullif(btrim(coalesce(p_reference,'')),''),nullif(btrim(coalesce(p_notes,'')),''),auth.uid()
  ) returning * into v_adjustment;

  return v_adjustment;
end;
$$;

insert into public.site_settings(key,value) values
('whatsapp','"+967778579777"'::jsonb),
('whatsapp_ye','"+967778579777"'::jsonb),
('whatsapp_sa','"+967778579777"'::jsonb)
on conflict(key) do update set value=excluded.value;

update public.homepage_sections
set view_all_link='/seasonal-offers'
where view_all_link='/offers';