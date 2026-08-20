import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type VerificationChannel = "none" | "sms" | "whatsapp" | "email";
type RegistrationBody = { name?: unknown; phone?: unknown; email?: unknown; region?: unknown; country?: unknown; channel?: unknown; legacyPassword?: unknown };
const DEFAULT_ORIGINS = ["https://flamingopark.vercel.app", "https://flamingopark.store", "https://www.flamingopark.store", "https://flamingoparkaden.com", "https://www.flamingoparkaden.com", "http://localhost:5173", "http://localhost:8080"];
const MAX_BODY_BYTES = 4096;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const corsHeaders = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store" } });
const cleanText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().replaceAll(String.fromCharCode(0), "").replace(/\s+/g, " ").slice(0, maxLength) : "";
const normalizePhone = (value: unknown) => {
  if (typeof value !== "string") return null;
  const latin = value.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  let compact = latin.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  let digits = compact.replace(/\D/g, "");
  if (!compact.startsWith("+") && /^0?7\d{8}$/.test(digits)) {
    if (digits.startsWith("0")) digits = digits.slice(1);
    return `+967${digits}`;
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin);
  let body: RegistrationBody;
  try { const raw = await req.text(); if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin); body = JSON.parse(raw) as RegistrationBody; } catch { return json({ error: "طلب غير صالح." }, 400, origin); }

  const name = cleanText(body.name, 100);
  const phone = normalizePhone(body.phone);
  const email = cleanText(body.email, 254).toLowerCase();
  const region = cleanText(body.region, 100);
  const country = cleanText(body.country, 2).toUpperCase();
  const legacyPassword = typeof body.legacyPassword === "string" ? body.legacyPassword.slice(0, 200) : "";
  const channel: VerificationChannel | null = body.channel === "none" || body.channel === "sms" || body.channel === "whatsapp" || body.channel === "email" ? body.channel : null;
  if (name.length < 2 || !phone || region.length < 2 || !/^[A-Z]{2}$/.test(country) || !channel || (email && !EMAIL_PATTERN.test(email))) return json({ error: "بيانات العميل غير مكتملة." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL"); const anonKey = Deno.env.get("SUPABASE_ANON_KEY"); const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const authorization = req.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const accessToken = tokenMatch?.[1]?.trim() || "";
  if (!accessToken) return json({ error: "جلسة التسجيل غير صالحة." }, 401, origin);

  const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: { user }, error: userError } = await auth.auth.getUser(accessToken);
  if (userError || !user) return json({ error: "جلسة التسجيل غير صالحة." }, 401, origin);

  if (channel === "email") { if (!user.email || !user.email_confirmed_at || user.email.toLowerCase() !== email) return json({ error: "يجب تأكيد البريد الإلكتروني أولاً." }, 401, origin); }
  else if (channel === "sms" || channel === "whatsapp") { if (!user.phone || !user.phone_confirmed_at || normalizePhone(user.phone) !== phone) return json({ error: "يجب تأكيد رقم الهاتف أولاً." }, 401, origin); }
  else if (!user.phone || normalizePhone(user.phone) !== phone) return json({ error: "رقم الهاتف لا يطابق جلسة التسجيل." }, 401, origin);

  const { data: existingByUser, error: userLookupError } = await service.from("customers").select("id,user_id,name,phone,region,country,avatar_url,created_at").eq("user_id", user.id).maybeSingle();
  if (userLookupError) return json({ error: "تعذر التحقق من الحساب." }, 500, origin);
  if (existingByUser) return json({ ok: true, customer: existingByUser }, 200, origin);

  const digits = phone.replace(/\D/g, "");
  const { data: existingByPhone, error: phoneLookupError } = await service.from("customers").select("id,user_id,name,phone,region,country,avatar_url,created_at").or(`phone.eq.${phone},phone.eq.${digits}`).maybeSingle();
  if (phoneLookupError) return json({ error: "تعذر التحقق من الحساب." }, 500, origin);
  if (existingByPhone) {
    if (existingByPhone.user_id && existingByPhone.user_id !== user.id) return json({ error: "رقم الهاتف مرتبط بحساب آخر." }, 409, origin);
    if (!legacyPassword) return json({ error: "رقم الهاتف مرتبط بحساب سابق. استخدم تسجيل الدخول مع خيار ربط الحساب القديم." }, 409, origin);
    const { data: verified, error: verifyError } = await service.rpc("customer_login", { _phone: existingByPhone.phone, _password: legacyPassword });
    if (verifyError || !verified?.length || String(verified[0]?.id || "") !== String(existingByPhone.id)) return json({ error: "كلمة مرور الحساب السابق غير صحيحة." }, 401, origin);
    const { data: linked, error: linkError } = await service.from("customers").update({ user_id: user.id, password_hash: null, region: existingByPhone.region || region, country: existingByPhone.country || country }).eq("id", existingByPhone.id).is("user_id", null).select("id,user_id,name,phone,region,country,avatar_url,created_at").single();
    if (linkError || !linked) return json({ error: "تعذر ربط الحساب السابق." }, 409, origin);
    return json({ ok: true, customer: linked, migrated: true }, 200, origin);
  }

  const { data: created, error: createError } = await service.from("customers").insert({ user_id: user.id, name, phone, country, region }).select("id,user_id,name,phone,region,country,avatar_url,created_at").single();
  if (createError || !created) return json({ error: "تعذر إنشاء ملف العميل." }, 500, origin);
  return json({ ok: true, customer: created }, 201, origin);
});