alter table public.banners
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'banners_schedule_window_valid'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners
      add constraint banners_schedule_window_valid
      check (starts_at is null or ends_at is null or ends_at > starts_at);
  end if;
end $$;

create index if not exists banners_schedule_window_idx
  on public.banners (is_active, starts_at, ends_at, sort_order);

drop policy if exists "admins read profiles for permissions" on public.profiles;
create policy "admins read profiles for permissions"
  on public.profiles
  for select
  to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
