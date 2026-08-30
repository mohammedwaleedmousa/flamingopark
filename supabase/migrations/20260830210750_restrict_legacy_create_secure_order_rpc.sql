-- The storefront uses create_secure_order_v2. Keep the legacy compatibility wrapper
-- available only to trusted server-side service-role callers so old client-supplied
-- totals cannot remain exposed as a public RPC surface.
revoke all on function public.create_secure_order(
  uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,
  text,text,text,numeric,numeric,text,numeric
) from public, anon, authenticated;

grant execute on function public.create_secure_order(
  uuid,text,text,text,text,text,text,text,jsonb,numeric,numeric,numeric,
  text,text,text,numeric,numeric,text,numeric
) to service_role;
