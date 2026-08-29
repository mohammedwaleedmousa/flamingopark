-- Admin productivity foundation RLS smoke tests.
-- Intended for `supabase test db` once the migration is applied locally/CI.

begin;

select plan(9);

select has_table('public', 'admin_preferences', 'admin_preferences exists');
select has_table('public', 'whatsapp_templates', 'whatsapp_templates exists');
select has_table('public', 'customer_internal_notes', 'customer_internal_notes exists');
select has_table('public', 'order_internal_notes', 'order_internal_notes exists');
select has_table('public', 'admin_change_revisions', 'admin_change_revisions exists');
select has_table('public', 'admin_approval_requests', 'admin_approval_requests exists');
select has_table('public', 'admin_user_permissions', 'admin_user_permissions exists');

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'admin_preferences'),
  'admin_preferences has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'admin_user_permissions'),
  'admin_user_permissions has RLS enabled'
);

select * from finish();
rollback;
