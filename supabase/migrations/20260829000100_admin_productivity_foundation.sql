-- Admin productivity foundation
-- Additive only: no existing tables, columns, policies, or data are removed.

create table if not exists public.admin_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  favorite_routes text[] not null default '{}',
  quick_actions text[] not null default '{}',
  dashboard_layout jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  template_key text,
  category text not null default 'general',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists whatsapp_templates_template_key_uidx
  on public.whatsapp_templates (template_key)
  where template_key is not null;

create table if not exists public.customer_internal_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null,
  note text not null,
  is_pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_internal_notes_customer_idx
  on public.customer_internal_notes (customer_id, created_at desc);

create table if not exists public.order_internal_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  note text not null,
  is_pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_internal_notes_order_idx
  on public.order_internal_notes (order_id, created_at desc);

create table if not exists public.admin_change_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists admin_change_revisions_entity_idx
  on public.admin_change_revisions (entity_type, entity_id, created_at desc);

create index if not exists admin_change_revisions_created_at_idx
  on public.admin_change_revisions (created_at desc);

create table if not exists public.admin_approval_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  review_note text
);

create index if not exists admin_approval_requests_status_idx
  on public.admin_approval_requests (status, requested_at desc);

create table if not exists public.admin_user_permissions (
  user_id uuid not null references auth.users(id) on delete cascade,
  permission text not null,
  granted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create index if not exists admin_user_permissions_permission_idx
  on public.admin_user_permissions (permission, granted);

-- Keep all new admin-only data protected from the public Data API by default.
alter table public.admin_preferences enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.customer_internal_notes enable row level security;
alter table public.order_internal_notes enable row level security;
alter table public.admin_change_revisions enable row level security;
alter table public.admin_approval_requests enable row level security;
alter table public.admin_user_permissions enable row level security;

revoke all on table public.admin_preferences from anon, authenticated;
revoke all on table public.whatsapp_templates from anon, authenticated;
revoke all on table public.customer_internal_notes from anon, authenticated;
revoke all on table public.order_internal_notes from anon, authenticated;
revoke all on table public.admin_change_revisions from anon, authenticated;
revoke all on table public.admin_approval_requests from anon, authenticated;
revoke all on table public.admin_user_permissions from anon, authenticated;

-- Existing application logic already uses public.user_roles with role='admin'.
-- These policies intentionally reuse that model instead of replacing it.
create policy "admins manage own preferences"
on public.admin_preferences
for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage whatsapp templates"
on public.whatsapp_templates
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage customer internal notes"
on public.customer_internal_notes
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage order internal notes"
on public.order_internal_notes
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage change revisions"
on public.admin_change_revisions
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage approval requests"
on public.admin_approval_requests
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

create policy "admins manage user permissions"
on public.admin_user_permissions
for all
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = 'admin'
  )
);

-- Explicit grants paired with RLS policies.
grant select, insert, update, delete on public.admin_preferences to authenticated;
grant select, insert, update, delete on public.whatsapp_templates to authenticated;
grant select, insert, update, delete on public.customer_internal_notes to authenticated;
grant select, insert, update, delete on public.order_internal_notes to authenticated;
grant select, insert, update, delete on public.admin_change_revisions to authenticated;
grant select, insert, update, delete on public.admin_approval_requests to authenticated;
grant select, insert, update, delete on public.admin_user_permissions to authenticated;
