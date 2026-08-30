drop trigger if exists analytics_events_verify_purchase on public.analytics_events;
revoke all on function public.normalize_purchase_analytics_event() from public, anon, authenticated;
drop function if exists public.normalize_purchase_analytics_event();
