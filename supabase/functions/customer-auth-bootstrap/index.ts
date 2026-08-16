import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type BootstrapMode = "register" | "migrate";
type BootstrapBody = { mode?: unknown; name?: unknown; phone?: unknown; pin?: unknown; region?: unknown };

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 4096;

const allowedOrigins = () => new Set(
  (Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});

const json = (body: unknown, status: number, origin: string | null) => Response.json(body, {
  status,
  headers: { ...corsHeaders(origin), "Cache-Control": "no-store" },
});

const toLatinDigits = (value: string) => value
  .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
  .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizePhone = (raw: unknown) => {
  if (typeof raw !== "string") return null;
  const value = toLatinDigits(raw.trim()).replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(value)) return null;
  let local = value;
  if (value.startsWith("+967")) local = value.slice(4);
  else if (value.startsWith("00967")) local = value.slice(5);
  else if (value.startsWith("967")) local = value.slice(3);
  else if (/^07\d{8}$/.test(value)) local = value.slice(1);
  return /^7\d{8}$/.test(local) ? `+967${local}` : null;
};

const cleanText = (value: unknown, maxLength: number) => typeof value === "string"
  ? value.trim().replaceAll(String.fromCharCode(0), "").replace(/\s+/g, " ").slice(0, maxLength)
  : "";

const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const fingerprint = async (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwarded || "unknown";
  const agent = (req.headers.get("user-agent") || "unknown").slice(0, 160);
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "flamingo-auth-v1";
  return sha256(`${salt}:${address}:${agent}`);
};

const publicError = (message: string) => {
  if (message.includes("rate_limited")) return { message: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.", status: 429 };
  if (message.includes("weak_pin")) return { message: "اختر رمزاً سرياً أصعب وغير متكرر.", status: 400 };
  if (message.includes("already_registered")) return { message: "تعذر إنشاء الحساب. جرّب تسجيل الدخول بهذا الرقم.", status: 409 };
  if (message.includes("invalid_input")) return { message: "تحقق من رقم الهاتف والرمز السري والبيانات المدخلة.", status: 400 };
  if (message.includes("invalid_credentials")) return { message: "رقم الهاتف أو الرمز السري غير صحيح.", status: 401 };
  return { message: "تعذر إكمال تسجيل الدخول حالياً. حاول مرة أخرى.", status: 500 };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);

  let body: BootstrapBody;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);
    body = JSON.parse(rawBody) as BootstrapBody;
  } catch {
    return json({ error: "طلب غير صالح." }, 400, origin);
  }

  const mode: BootstrapMode | null = body.mode === "register" || body.mode === "migrate" ? body.mode : null;
  const phone = normalizePhone(body.phone);
  const pin = typeof body.pin === "string" ? toLatinDigits(body.pin) : "";
  const name = cleanText(body.name, 100);
  const region = cleanText(body.region, 80);
  if (!mode || !phone || !/^\d{6,12}$/.test(pin) || (mode === "register" && (name.length < 2 || region.length < 2))) {
    return json({ error: "تحقق من رقم الهاتف والرمز السري والبيانات المدخلة." }, 400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let createdUserId: string | null = null;

  try {
    const { data: prepared, error: prepareError } = await service.rpc("prepare_customer_phone_auth", {
      p_mode: mode,
      p_phone: phone,
      p_pin: pin,
      p_fingerprint_hash: await fingerprint(req),
    });
    if (prepareError) throw prepareError;

    const preparedRow = Array.isArray(prepared) ? prepared[0] : null;
    if (!preparedRow || preparedRow.result_code !== "prepared") {
      throw new Error(preparedRow?.result_code || "auth_preparation_failed");
    }
    const customerId = preparedRow.customer_id || null;
    const { data: created, error: createError } = await service.auth.admin.createUser({
      phone,
      password: pin,
      phone_confirm: true,
      user_metadata: mode === "register" ? { full_name: name, region, country: "YE" } : { country: "YE" },
    });
    if (createError || !created.user) throw createError || new Error("auth_user_creation_failed");
    createdUserId = created.user.id;

    const { error: completeError } = await service.rpc("complete_customer_phone_auth", {
      p_mode: mode,
      p_auth_user_id: createdUserId,
      p_phone: phone,
      p_name: mode === "register" ? name : null,
      p_region: mode === "register" ? region : null,
      p_customer_id: customerId,
    });
    if (completeError) throw completeError;

    return json({ ok: true }, 200, origin);
  } catch (error) {
    if (createdUserId) await service.auth.admin.deleteUser(createdUserId, false);
    const safe = publicError(error instanceof Error ? error.message : "");
    return json({ error: safe.message }, safe.status, origin);
  }
});
