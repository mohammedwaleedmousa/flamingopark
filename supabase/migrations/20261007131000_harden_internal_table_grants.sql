-- Defense-in-depth: these tables are accessed through RLS, trusted RPCs, or Edge Functions.
-- Remove direct API-role table privileges where no direct PostgREST access is required.

revoke all on table public.invoices from anon;
revoke all on table public.invoices from authenticated;

revoke all on table public.customer_sessions from anon;

revoke all on table public.user_roles from anon;

