import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type BootstrapBody = { mode?: unknown; phone?: unknown; password?: unknown; pin?: unknown };

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 4096;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_BYTES = 72;

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store" } });
const toLatinDigits = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
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
const isValidPassword = (value: string) => value.length >= MIN_PASSWORD_LENGTH && value.trim().length > 0 && new TextEncoder().encode(value).byteLength <= MAX_PASSWORD_BYTES && !value.includes(String.fromCharCode(0));
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const fingerprint = async (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwarded || "unknown";
  const agent = (req.headers.get("user-agent") || "unknown").slice(0, 160);
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "flamingo-auth-v2";
  return sha256(`${salt}:${address}:${agent}`);
};
const publicError = (message: string) => {
  if (message.includes("rate_limited")) return { message: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.", status: 429 };
  if (message.includes("invalid_credentials")) return { message: "رقم الهاتف أو كلمة المرور غير صحيحة.", status: 401 };
  if (message.includes("already_migrated")) return { message: "الحساب تم ترحيله مسبقاً. جرّب تسجيل الدخول.", status: 409 };
  return { message: "تعذر ترحيل الحساب القديم حالياً. حاول مرة أخرى.", status: 500 };
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

  // New accounts must use Supabase phone signUp + SMS OTP. This endpoint exists
  // only as a one-time bridge for legacy bcrypt customer accounts.
  if (body.mode !== "migrate") return json({ error: "إنشاء الحسابات الجديدة يتطلب تحقق SMS." }, 403, origin);

  const phone = normalizePhone(body.phone);
  const password = typeof body.password === "string" ? body.password : typeof body.pin === "string" ? body.pin : "";
  if (!phone || !isValidPassword(password)) return json({ error: "تحقق من رقم الهاتف وكلمة المرور." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let createdUserId: string | null = null;

  try {
    const { data: prepared, error: prepareError } = await service.rpc("prepare_customer_phone_auth", {
      p_mode: "migrate",
      p_phone: phone,
      p_password: password,
      p_fingerprint_hash: await fingerprint(req),
    });
    if (prepareError) throw prepareError;

    const preparedRow = Array.isArray(prepared) ? prepared[0] : null;
    if (!preparedRow || preparedRow.result_code !== "prepared" || !preparedRow.customer_id) throw new Error(preparedRow?.result_code || "invalid_credentials");

    const { data: created, error: createError } = await service.auth.admin.createUser({ phone, password, phone_confirm: true, user_metadata: { country: "YE", legacy_migrated: true } });
    if (createError || !created.user) throw createError || new Error("auth_user_creation_failed");
    createdUserId = created.user.id;

    const { error: completeError } = await service.rpc("complete_customer_phone_auth", {
      p_mode: "migrate",
      p_auth_user_id: createdUserId,
      p_phone: phone,
      p_name: null,
      p_region: null,
      p_customer_id: preparedRow.customer_id,
    });
    if (completeError) throw completeError;

    return json({ ok: true }, 200, origin);
  } catch (error) {
    if (createdUserId) await service.auth.admin.deleteUser(createdUserId, false);
    const safe = publicError(error instanceof Error ? error.message : "");
    return json({ error: safe.message }, safe.status, origin);
  }
});
