import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type ReviewBody = {
  action?: unknown;
  productId?: unknown;
  rating?: unknown;
  comment?: unknown;
  images?: unknown;
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "flamingo-reviews-v1";
  return sha256(`${salt}:${address}:${agent}`);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);

  let body: ReviewBody;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);
    body = JSON.parse(raw) as ReviewBody;
  } catch {
    return json({ error: "طلب غير صالح." }, 400, origin);
  }

  const action = body.action === "upload-url" || body.action === "submit" ? body.action : null;
  const productId = cleanText(body.productId, 36);
  if (!action || !UUID_PATTERN.test(productId)) return json({ error: "بيانات التقييم غير صحيحة." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "يجب تسجيل الدخول أولاً." }, 401, origin);

  const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await auth.auth.getUser();
  if (userError || !user) return json({ error: "جلسة العميل غير صالحة." }, 401, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const [{ data: customer, error: customerError }, { data: product, error: productError }] = await Promise.all([
    service.from("customers").select("id,user_id,name,country").eq("user_id", user.id).maybeSingle(),
    service.from("products").select("id,is_active").eq("id", productId).eq("is_active", true).maybeSingle(),
  ]);
  if (customerError || !customer) return json({ error: "حساب العميل غير مكتمل." }, 403, origin);
  if (productError || !product) return json({ error: "المنتج غير متاح." }, 404, origin);

  const clientFingerprint = await fingerprint(req);
  const rateScope = action === "upload-url" ? "review_upload" : "review";
  const { data: rateRows, error: rateError } = await service.rpc("consume_public_submission_rate_limit", {
    p_scope: rateScope,
    p_fingerprint_hash: clientFingerprint,
    p_subject: `${user.id}:${productId}`,
  });
  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (rateError || !rate?.allowed) return json({ error: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.", retryAfter: rate?.retry_after_seconds || 3600 }, 429, origin);

  if (action === "upload-url") {
    const path = `reviews/${user.id}/${productId}/${crypto.randomUUID()}.webp`;
    const { data, error } = await service.storage.from("uploads").createSignedUploadUrl(path);
    if (error || !data?.token) return json({ error: "تعذر تجهيز رفع الصورة." }, 500, origin);
    return json({ path, token: data.token }, 200, origin);
  }

  const rating = Number(body.rating);
  const comment = cleanText(body.comment, 1500) || null;
  const rawImages = Array.isArray(body.images) ? body.images : [];
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || rawImages.length > 5) return json({ error: "بيانات التقييم غير صحيحة." }, 400, origin);

  const storageOrigin = new URL(supabaseUrl).origin;
  const expectedPathPrefix = `/storage/v1/object/public/uploads/reviews/${user.id}/${productId}/`;
  const images: string[] = [];
  for (const rawImage of rawImages) {
    const value = cleanText(rawImage, 1000);
    try {
      const url = new URL(value);
      const filename = url.pathname.slice(expectedPathPrefix.length);
      if (url.origin !== storageOrigin || !url.pathname.startsWith(expectedPathPrefix) || url.search || url.hash || !UUID_PATTERN.test(filename.replace(/\.webp$/i, "")) || !filename.toLowerCase().endsWith(".webp")) {
        return json({ error: "رابط صورة التقييم غير صالح." }, 400, origin);
      }
      images.push(url.toString());
    } catch {
      return json({ error: "رابط صورة التقييم غير صالح." }, 400, origin);
    }
  }

  const { error: insertError } = await service.from("product_reviews").insert({
    product_id: productId,
    customer_id: customer.id,
    user_id: user.id,
    customer_name: cleanText(customer.name, 100) || "عميل فلامنجو",
    rating,
    comment,
    is_approved: false,
    images,
    country: cleanText(customer.country, 10) || "YE",
  });

  if (insertError?.code === "23505") return json({ error: "سبق أن أرسلت تقييماً لهذا المنتج." }, 409, origin);
  if (insertError) return json({ error: "تعذر حفظ التقييم حالياً." }, 500, origin);
  return json({ ok: true }, 201, origin);
});
