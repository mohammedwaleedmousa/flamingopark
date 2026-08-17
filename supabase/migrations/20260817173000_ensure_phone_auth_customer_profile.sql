create or replace function public.handle_customer_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = 'public','auth'
as $function$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text;
  v_name text;
  v_region text;
  v_country text;
begin
  if new.phone is null then
    return new;
  end if;

  v_phone := nullif(btrim(v_meta->>'contact_phone'), '');
  if v_phone is null then
    v_phone := '+' || regexp_replace(new.phone, '^\+', '');
  end if;

  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'invalid customer phone';
  end if;

  v_name := left(regexp_replace(btrim(coalesce(v_meta->>'full_name', v_meta->>'name', '')), '\s+', ' ', 'g'), 100);
  if char_length(v_name) < 2 then
    v_name := 'عميل فلامنجو';
  end if;

  v_region := nullif(left(regexp_replace(btrim(coalesce(v_meta->>'region', '')), '\s+', ' ', 'g'), 100), '');
  v_country := upper(nullif(left(btrim(coalesce(v_meta->>'country', '')), 2), ''));
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then
    v_country := null;
  end if;

  insert into public.customers (user_id, name, phone, region, country)
  values (new.id, v_name, v_phone, v_region, v_country);

  return new;
end;
$function$;
