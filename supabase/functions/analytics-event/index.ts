import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type AnalyticsBody = {
  eventType?: unknown;
  sessionId?: unknown;
  path?: unknown;
  referrer?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  device?: unknown;
  productId?: unknown;
  orderId?: unknown;
  value?: unknown;
  metadata?: unknown;
};

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 12 * 1024;
const MAX_METADATA_BYTES = 4 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_PATTERN = /^[a-zA-Z0-9._:-]{8,128}$/;
const EVENT_TYPES = new Set(["page_view", "product_view", "add_to_cart", "remove_from_cart", "begin_checkout", "purchase", "search", "add_to_wishlist", "ad_click"]);

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const headers = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...headers(origin), "Cache-Control": "no-store" } });
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replaceAll(String.fromCharCode(0), "").slice(0, max) : "";
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const fingerprint = async (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwarded || "unknown";
  const agent = (req.headers.get("user-agent") || "unknown").slice(0, 160);
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "flamingo-analytics-v1";
  return sha256(`${salt}:${address}:${agent}`);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413, origin);

  let body: AnalyticsBody;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413, origin);
    body = JSON.parse(raw) as AnalyticsBody;
  } catch {
    return json({ error: "Invalid payload" }, 400, origin);
  }

  const eventType = cleanText(body.eventType, 40);
  const sessionId = cleanText(body.sessionId, 128);
  const productId = cleanText(body.productId, 36) || null;
  const orderId = cleanText(body.orderId, 36) || null;
  const device = cleanText(body.device, 20);
  const numericValue = body.value == null ? null : Number(body.value);
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata as Record<string, unknown> : {};
  const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata)).byteLength;

  if (!EVENT_TYPES.has(eventType) || !SESSION_PATTERN.test(sessionId)) return json({ error: "Invalid event" }, 400, origin);
  if ((productId && !UUID_PATTERN.test(productId)) || (orderId && !UUID_PATTERN.test(orderId))) return json({ error: "Invalid reference" }, 400, origin);
  if (device && !["mobile", "tablet", "desktop"].includes(device)) return json({ error: "Invalid device" }, 400, origin);
  if (numericValue !== null && (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 1_000_000_000)) return json({ error: "Invalid value" }, 400, origin);
  if (metadataBytes > MAX_METADATA_BYTES) return json({ error: "Metadata too large" }, 413, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: "Service unavailable" }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "Authentication required" }, 401, origin);
  const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await auth.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401, origin);

  const clientFingerprint = await fingerprint(req);
  const { data: rateRows, error: rateError } = await service.rpc("consume_public_submission_rate_limit", {
    p_scope: "analytics",
    p_fingerprint_hash: clientFingerprint,
    p_subject: sessionId,
  });
  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (rateError || !rate?.allowed) return json({ error: "Rate limited", retryAfter: rate?.retry_after_seconds || 600 }, 429, origin);

  const { error } = await service.from("analytics_events").insert({
    event_type: eventType,
    session_id: sessionId,
    user_id: user.id,
    path: cleanText(body.path, 500) || null,
    referrer: cleanText(body.referrer, 1000) || null,
    utm_source: cleanText(body.utmSource, 120) || null,
    utm_medium: cleanText(body.utmMedium, 120) || null,
    utm_campaign: cleanText(body.utmCampaign, 160) || null,
    utm_content: cleanText(body.utmContent, 160) || null,
    device: device || null,
    country: null,
    product_id: productId,
    order_id: orderId,
    value: numericValue,
    metadata,
  });

  if (error) return json({ error: "Could not record event" }, 500, origin);
  return json({ ok: true }, 202, origin);
});
