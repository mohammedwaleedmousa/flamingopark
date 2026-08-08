CREATE TABLE IF NOT EXISTS public.customer_assistant_rate_limits (
  client_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  request_count integer NOT NULL DEFAULT 1 CHECK (request_count > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE public.customer_assistant_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.customer_assistant_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_assistant_rate_limits TO service_role;

CREATE INDEX IF NOT EXISTS customer_assistant_rate_limits_updated_at_idx
  ON public.customer_assistant_rate_limits (updated_at);

CREATE OR REPLACE FUNCTION public.consume_customer_assistant_rate_limit(
  p_client_hash text,
  p_limit integer DEFAULT 12,
  p_window_seconds integer DEFAULT 600
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
BEGIN
  IF p_client_hash IS NULL OR length(p_client_hash) <> 64 OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  INSERT INTO public.customer_assistant_rate_limits AS limits (
    client_hash,
    window_started_at,
    request_count,
    updated_at
  )
  VALUES (p_client_hash, v_now, 1, v_now)
  ON CONFLICT (client_hash) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now THEN v_now
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now THEN 1
      ELSE LEAST(limits.request_count + 1, p_limit + 1)
    END,
    updated_at = v_now
  RETURNING limits.window_started_at, limits.request_count
  INTO v_window_started_at, v_request_count;

  allowed := v_request_count <= p_limit;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer)
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_customer_assistant_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_customer_assistant_rate_limit(text, integer, integer) TO service_role;

COMMENT ON TABLE public.customer_assistant_rate_limits IS 'Hashed, short-lived counters used to protect the public customer assistant from abuse.';
COMMENT ON FUNCTION public.consume_customer_assistant_rate_limit(text, integer, integer) IS 'Atomically consumes one fixed-window customer-assistant request without storing raw IP addresses.';
