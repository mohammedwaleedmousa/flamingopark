-- Make delivery coverage explicit and enforce it for every order write.
alter table public.delivery_companies
  add column if not exists service_scope text not null default 'outside';

alter table public.delivery_companies
  drop constraint if exists delivery_companies_service_scope_check;

alter table public.delivery_companies
  add constraint delivery_companies_service_scope_check
  check (service_scope in ('aden', 'outside', 'all'));

update public.delivery_companies
set service_scope = case
  when name ilike '%فلامنجو%' or coalesce(delivery_days, '') ilike '%داخل عدن%' then 'aden'
  else 'outside'
end;

create or replace function public.enforce_order_fulfillment_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery_scope text;
  v_location text;
  v_is_aden boolean;
  v_has_known_outside_governorate boolean;
begin
  v_location := lower(btrim(concat_ws(' ', new.customer_region, new.customer_city)));
  v_is_aden := position('عدن' in v_location) > 0 or position('aden' in v_location) > 0;

  select exists (
    select 1
    from unnest(array[
      'أمانة العاصمة', 'صنعاء', 'تعز', 'حضرموت', 'إب', 'الحديدة', 'ذمار',
      'لحج', 'أبين', 'شبوة', 'مأرب', 'الجوف', 'صعدة', 'عمران', 'حجة',
      'المحويت', 'ريمة', 'الضالع', 'البيضاء', 'المهرة', 'أرخبيل سقطرى'
    ]) as governorate(name)
    where position(lower(governorate.name) in v_location) > 0
  ) into v_has_known_outside_governorate;

  if new.delivery_company_id is not null then
    select company.service_scope
    into v_delivery_scope
    from public.delivery_companies as company
    where company.id = new.delivery_company_id;

    if v_delivery_scope = 'aden'
      and v_has_known_outside_governorate then
      raise exception 'invalid_delivery_scope'
        using errcode = '22023';
    end if;

    if v_delivery_scope = 'outside'
      and v_is_aden then
      raise exception 'invalid_delivery_scope'
        using errcode = '22023';
    end if;
  end if;

  if lower(coalesce(new.payment_method, '')) in ('cod', 'cash')
    and v_has_known_outside_governorate
    and not exists (
      select 1
      from public.cod_regions as region
      where coalesce(region.is_active, false)
        and (
          position(lower(btrim(region.region_name)) in v_location) > 0
          or position(lower(btrim(region.region_name_ar)) in v_location) > 0
        )
    ) then
    raise exception 'invalid_cod_region'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_order_fulfillment_scope_trigger on public.orders;

create trigger enforce_order_fulfillment_scope_trigger
before insert or update of delivery_company_id, payment_method, customer_region, customer_city
on public.orders
for each row
execute function public.enforce_order_fulfillment_scope();

revoke all on function public.enforce_order_fulfillment_scope() from public, anon, authenticated;

comment on column public.delivery_companies.service_scope is
  'Where this carrier can be offered: aden, outside, or all.';

comment on function public.enforce_order_fulfillment_scope() is
  'Rejects delivery-company and cash-on-delivery combinations that do not match the order location.';
