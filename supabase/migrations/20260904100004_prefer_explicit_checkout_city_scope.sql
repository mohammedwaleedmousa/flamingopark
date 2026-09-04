-- Prefer the explicitly selected checkout governorate embedded in customer_city.
-- Signed-in legacy customers can retain an older customer_region value, so the
-- new structured checkout value must win whenever it names a known governorate.
create or replace function public.enforce_order_fulfillment_scope()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_delivery_scope text;
  v_city_location text;
  v_location text;
  v_city_has_known_governorate boolean;
  v_is_aden boolean;
  v_has_known_outside_governorate boolean;
begin
  v_city_location := lower(btrim(coalesce(new.customer_city, '')));

  select exists (
    select 1
    from unnest(array[
      'عدن', 'aden', 'أمانة العاصمة', 'صنعاء', 'تعز', 'حضرموت', 'إب',
      'الحديدة', 'ذمار', 'لحج', 'أبين', 'شبوة', 'مأرب', 'الجوف', 'صعدة',
      'عمران', 'حجة', 'المحويت', 'ريمة', 'الضالع', 'البيضاء', 'المهرة',
      'أرخبيل سقطرى'
    ]) as governorate(name)
    where position(lower(governorate.name) in v_city_location) > 0
  ) into v_city_has_known_governorate;

  v_location := case
    when v_city_has_known_governorate then v_city_location
    else lower(btrim(concat_ws(' ', new.customer_region, new.customer_city)))
  end;

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

revoke all on function public.enforce_order_fulfillment_scope() from public, anon, authenticated;

comment on function public.enforce_order_fulfillment_scope() is
  'Rejects delivery and COD combinations that conflict with the explicit checkout governorate.';
