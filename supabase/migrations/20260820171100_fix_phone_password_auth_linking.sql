create or replace function public.handle_customer_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_phone text;
  v_digits text;
  v_name text;
  v_region text;
  v_country text;
  v_existing_id uuid;
  v_existing_user_id uuid;
  v_legacy_migration boolean := coalesce((v_meta->>'legacy_migration')::boolean, false);
begin
  if new.phone is null then
    return new;
  end if;

  v_phone := nullif(btrim(v_meta->>'contact_phone'), '');
  if v_phone is null then
    v_phone := '+' || regexp_replace(new.phone, '\D', '', 'g');
  end if;

  v_digits := regexp_replace(v_phone, '\D', '', 'g');
  if v_digits !~ '^[1-9][0-9]{7,14}$' then
    raise exception 'invalid customer phone';
  end if;
  v_phone := '+' || v_digits;

  v_name := left(regexp_replace(btrim(coalesce(nullif(v_meta->>'full_name',''), nullif(v_meta->>'name',''), 'عميل فلامنجو')), '\s+', ' ', 'g'), 100);
  if char_length(v_name) < 2 then
    v_name := 'عميل فلامنجو';
  end if;

  v_region := nullif(left(regexp_replace(btrim(coalesce(v_meta->>'region', '')), '\s+', ' ', 'g'), 100), '');
  v_country := upper(nullif(left(btrim(coalesce(v_meta->>'country', '')), 2), ''));
  if v_country is null then
    v_country := case when v_phone like '+967%' then 'YE' else null end;
  elsif v_country !~ '^[A-Z]{2}$' then
    v_country := null;
  end if;

  select c.id, c.user_id
    into v_existing_id, v_existing_user_id
  from public.customers c
  where regexp_replace(c.phone, '\D', '', 'g') = v_digits
  limit 1
  for update;

  if v_existing_id is not null then
    if v_existing_user_id = new.id then
      return new;
    end if;

    if v_existing_user_id is not null then
      raise exception 'phone already linked to another account' using errcode = '23505';
    end if;

    if not v_legacy_migration then
      raise exception 'existing customer requires password migration' using errcode = '23505';
    end if;

    update public.customers
    set user_id = new.id,
        password_hash = null,
        region = coalesce(region, v_region),
        country = coalesce(country, v_country)
    where id = v_existing_id;

    return new;
  end if;

  insert into public.customers (user_id, name, phone, region, country)
  values (new.id, v_name, v_phone, v_region, v_country);

  return new;
end;
$$;
