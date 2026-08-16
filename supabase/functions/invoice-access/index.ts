import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.0";

type InvoiceBody = { action?: unknown; orderId?: unknown; trackingToken?: unknown; pdfBase64?: unknown };

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 8_100_000;
const MAX_PDF_BYTES = 6_000_000;

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const headers = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...headers(origin), "Cache-Control": "no-store" } });
const hashToken = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const signInvoice = async (service: SupabaseClient<any>, path: string) => {
  if (!path || /^https?:\/\//i.test(path) || path.includes("..") || path.startsWith("/")) return null;
  const { data, error } = await service.storage.from("invoices").createSignedUrl(path, 300);
  return error ? null : data?.signedUrl || null;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Invoice request is too large" }, 413, origin);

  let body: InvoiceBody;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "Invoice request is too large" }, 413, origin);
    body = JSON.parse(raw) as InvoiceBody;
  } catch {
    return json({ error: "Invalid invoice request" }, 400, origin);
  }

  const action = body.action === "upload" || body.action === "signed_url" ? body.action : null;
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const trackingToken = typeof body.trackingToken === "string" ? body.trackingToken : "";
  if (!action || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId) || trackingToken.length > 128) {
    return json({ error: "Invalid invoice request" }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: "Invoice service unavailable" }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: req.headers.get("authorization") || "" } },
  });
  const { data: { user } } = await auth.auth.getUser();
  const { data: order, error: orderError } = await service
    .from("orders")
    .select("id,order_number,invoice_url,owner_user_id,tracking_token_hash")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) return json({ error: "Invoice access denied" }, 403, origin);

  let isAdmin = false;
  if (user) {
    const { data: role } = await service.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    isAdmin = Boolean(role);
  }
  const isOwner = Boolean(user && order.owner_user_id === user.id);
  const validTrackingToken = Boolean(trackingToken && order.tracking_token_hash && await hashToken(trackingToken) === order.tracking_token_hash);
  if (!isAdmin && !isOwner && !validTrackingToken) return json({ error: "Invoice access denied" }, 403, origin);

  if (action === "signed_url") {
    const signedUrl = await signInvoice(service, order.invoice_url || "");
    return signedUrl ? json({ signedUrl }, 200, origin) : json({ error: "Invoice unavailable" }, 404, origin);
  }

  if (!isAdmin && order.invoice_url) {
    const signedUrl = await signInvoice(service, order.invoice_url);
    return signedUrl ? json({ path: order.invoice_url, signedUrl }, 200, origin) : json({ error: "Invoice unavailable" }, 409, origin);
  }
  if (typeof body.pdfBase64 !== "string" || body.pdfBase64.length < 8 || body.pdfBase64.length > 8_000_000) {
    return json({ error: "Invalid invoice request" }, 400, origin);
  }

  let binary: Uint8Array;
  try {
    binary = Uint8Array.from(atob(body.pdfBase64), (character) => character.charCodeAt(0));
  } catch {
    return json({ error: "Invalid invoice request" }, 400, origin);
  }
  if (binary.byteLength > MAX_PDF_BYTES || new TextDecoder().decode(binary.slice(0, 5)) !== "%PDF-") {
    return json({ error: "Invalid PDF file" }, 400, origin);
  }

  const path = `orders/${order.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await service.storage.from("invoices").upload(path, binary, { contentType: "application/pdf", cacheControl: "3600", upsert: false });
  if (uploadError) return json({ error: "Invoice upload failed" }, 500, origin);

  let updateQuery = service.from("orders").update({ invoice_url: path }).eq("id", order.id);
  if (!isAdmin) updateQuery = updateQuery.is("invoice_url", null);
  const { data: updated, error: updateError } = await updateQuery.select("id").maybeSingle();
  if (updateError || !updated) {
    await service.storage.from("invoices").remove([path]);
    const { data: current } = await service.from("orders").select("invoice_url").eq("id", order.id).maybeSingle();
    const signedUrl = await signInvoice(service, current?.invoice_url || "");
    return signedUrl ? json({ path: current?.invoice_url, signedUrl }, 200, origin) : json({ error: "Invoice upload failed" }, 500, origin);
  }

  const signedUrl = await signInvoice(service, path);
  return json({ path, signedUrl }, 201, origin);
});
