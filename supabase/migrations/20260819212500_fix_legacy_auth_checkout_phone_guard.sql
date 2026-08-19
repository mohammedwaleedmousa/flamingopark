-- Keep Yemen phone validation strict for guests and normal customer profiles,
-- while allowing legacy authenticated accounts that do not yet have a
-- public.customers profile to complete checkout with a non-empty contact phone.

create or replace function public.guard_guest_order_submission()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_digits text;
  v_limit public.order_submission_limits%rowtype;
  v_has_customer_profile boolean := false;
begin
  if coalesce(new.country, 'YE') = 'YE' then
    v_digits := regexp_replace(coalesce(new.customer_phone, ''), '[^0-9]', '', 'g');

    if left(v_digits, 5) = '00967' then
      v_digits := substr(v_digits, 6);
    elsif left(v_digits, 3) = '967' then
      v_digits := substr(v_digits, 4);
    elsif left(v_digits, 1) = '0' then
      v_digits := substr(v_digits, 2);
    end if;

    if v_digits ~ '^7[0-9]{8}$' then
      new.customer_phone := '+967' || v_digits;
    else
      if new.owner_user_id is not null then
        select exists (
          select 1
          from public.customers c
          where c.user_id = new.owner_user_id
        ) into v_has_customer_profile;
      end if;

      -- Guests and fully registered customer profiles keep strict Yemen validation.
      if new.owner_user_id is null or v_has_customer_profile then
        raise exception 'invalid_yemen_phone';
      end if;

      -- Legacy authenticated accounts without a customer profile must at least
      -- provide a usable contact value instead of being blocked by old auth data.
      if nullif(btrim(coalesce(new.customer_phone, '')), '') is null then
        raise exception 'phone_required';
      end if;
    end if;
  end if;

  if new.owner_user_id is null and new.order_number ~ '^FP-[0-9]{6}-[0-9]{7}$' then
    insert into public.order_submission_limits(identity_key)
    values ('global:guest')
    on conflict(identity_key) do nothing;

    select * into v_limit
    from public.order_submission_limits
    where identity_key = 'global:guest'
    for update;

    if v_limit.day_started_at <> current_date then
      v_limit.day_started_at := current_date;
      v_limit.day_count := 0;
    end if;

    if v_limit.window_started_at < now() - interval '10 minutes' then
      v_limit.window_started_at := now();
      v_limit.window_count := 0;
    end if;

    if v_limit.window_count >= 30 or v_limit.day_count >= 300 then
      raise exception 'guest_order_capacity_limit';
    end if;

    update public.order_submission_limits
    set window_started_at = v_limit.window_started_at,
        window_count = v_limit.window_count + 1,
        day_started_at = v_limit.day_started_at,
        day_count = v_limit.day_count + 1,
        updated_at = now()
    where identity_key = 'global:guest';
  end if;

  return new;
end;
$function$;
