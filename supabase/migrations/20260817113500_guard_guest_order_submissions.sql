-- Normalize Yemeni guest phone numbers and add a global guest-order safety bucket.

create or replace function public.guard_guest_order_submission()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_digits text;
  v_limit public.order_submission_limits%rowtype;
begin
  if coalesce(new.country, 'YE') = 'YE' then
    v_digits := regexp_replace(coalesce(new.customer_phone,''), '[^0-9]', '', 'g');
    if left(v_digits,5) = '00967' then v_digits := substr(v_digits,6);
    elsif left(v_digits,3) = '967' then v_digits := substr(v_digits,4);
    elsif left(v_digits,1) = '0' then v_digits := substr(v_digits,2);
    end if;

    if v_digits !~ '^7[0-9]{8}$' then
      raise exception 'invalid_yemen_phone';
    end if;
    new.customer_phone := '+967' || v_digits;
  end if;

  if new.owner_user_id is null and new.order_number ~ '^FP-[0-9]{6}-[0-9]{7}$' then
    insert into public.order_submission_limits(identity_key) values ('global:guest')
    on conflict (identity_key) do nothing;

    select * into v_limit from public.order_submission_limits where identity_key = 'global:guest' for update;
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

revoke execute on function public.guard_guest_order_submission() from public, anon, authenticated;
grant execute on function public.guard_guest_order_submission() to service_role;

drop trigger if exists guard_guest_order_submission_trg on public.orders;
create trigger guard_guest_order_submission_trg
before insert on public.orders
for each row execute function public.guard_guest_order_submission();

revoke execute on function public.has_role(uuid, public.app_role) from anon;
