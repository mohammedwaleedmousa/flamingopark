-- Align the productivity policies with the existing admin role helper used by production.
-- This only replaces policies created by the productivity foundation.

drop policy if exists "admins manage own preferences" on public.admin_preferences;
create policy "admins manage own preferences"
on public.admin_preferences
for all
to authenticated
using (
  user_id = (select auth.uid())
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  user_id = (select auth.uid())
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "admins manage whatsapp templates" on public.whatsapp_templates;
create policy "admins manage whatsapp templates"
on public.whatsapp_templates
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admins manage customer internal notes" on public.customer_internal_notes;
create policy "admins manage customer internal notes"
on public.customer_internal_notes
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admins manage order internal notes" on public.order_internal_notes;
create policy "admins manage order internal notes"
on public.order_internal_notes
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admins manage change revisions" on public.admin_change_revisions;
create policy "admins manage change revisions"
on public.admin_change_revisions
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admins manage approval requests" on public.admin_approval_requests;
create policy "admins manage approval requests"
on public.admin_approval_requests
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "admins manage user permissions" on public.admin_user_permissions;
create policy "admins manage user permissions"
on public.admin_user_permissions
for all
to authenticated
using (public.has_role((select auth.uid()), 'admin'::public.app_role))
with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
