drop policy if exists "admins read profiles for permissions" on public.profiles;

create policy "admins read profiles for permissions"
  on public.profiles
  for select
  to authenticated
  using (
    has_role(auth.uid(), 'admin'::app_role)
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = profiles.id
        and ur.role = 'admin'::app_role
    )
  );
