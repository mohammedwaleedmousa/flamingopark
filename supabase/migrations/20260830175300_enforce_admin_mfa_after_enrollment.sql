create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'::public.app_role
  );
$$;

revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
  and (
    _role <> 'admin'::public.app_role
    or coalesce((select auth.jwt() ->> 'role'), '') = 'service_role'
    or not exists (
      select 1
      from auth.mfa_factors mf
      where mf.user_id = _user_id
        and mf.status::text = 'verified'
    )
    or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  );
$$;

create or replace function private.admin_permission_gate(p_permissions text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then false
    when not exists (
      select 1
      from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and ur.role = 'admin'::public.app_role
    ) then true
    when exists (
      select 1
      from auth.mfa_factors mf
      where mf.user_id = (select auth.uid())
        and mf.status::text = 'verified'
    ) and coalesce((select auth.jwt() ->> 'aal'), 'aal1') <> 'aal2' then false
    else exists (
      select 1
      from unnest(coalesce(p_permissions, '{}'::text[])) as requested(permission)
      where coalesce((
        select aup.granted
        from public.admin_user_permissions aup
        where aup.user_id = (select auth.uid())
          and aup.permission = requested.permission
      ), true)
    )
  end;
$$;

create or replace function private.require_admin_permission(p_permission text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
  v_aal text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'aal', 'aal1');
  v_granted boolean;
begin
  if v_role = 'service_role' then
    return;
  end if;

  if v_actor is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_actor
      and ur.role = 'admin'::public.app_role
  ) then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  if exists (
    select 1
    from auth.mfa_factors mf
    where mf.user_id = v_actor
      and mf.status::text = 'verified'
  ) and v_aal <> 'aal2' then
    raise exception 'mfa verification required' using errcode = '42501';
  end if;

  select coalesce((
    select aup.granted
    from public.admin_user_permissions aup
    where aup.user_id = v_actor
      and aup.permission = p_permission
  ), true)
  into v_granted;

  if not v_granted then
    raise exception 'admin permission % required', p_permission using errcode = '42501';
  end if;
end;
$$;
