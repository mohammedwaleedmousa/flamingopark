import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const DEFAULT_ORIGINS = ["https://flamingoparkaden.com", "https://www.flamingoparkaden.com", "https://flamingopark.store", "https://www.flamingopark.store", "http://localhost:5173", "http://localhost:8080"];
const MAX_BODY_BYTES = 2048;

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const corsHeaders = (origin: string | null) => ({ "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0], "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" });
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const normalizePhone = (value: unknown) => {
  if (typeof value !== "string") return null;
  const latin = value.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  let compact = latin.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\D/g, "");
    if (/^0?7\d{8}$/.test(digits)) { if (digits.startsWith("0")) digits = digits.slice(1); return `+967${digits}`; }
    return null;
  }
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
};
const authPasswordFor = async (phone: string, password: string) => {
  if (password.length >= 6) return password;
  const source = new TextEncoder().encode(`flamingopark:v1:${phone}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin);

  let body: { phone?: unknown; password?: unknown };
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin);
    body = JSON.parse(raw);
  } catch {
    return json({ error: "طلب غير صالح." }, 400, origin);
  }

  const phone = normalizePhone(body.phone);
  const rawPassword = typeof body.password === "string" ? body.password : "";
  if (!phone || rawPassword.length < 1 || rawPassword.length > 200) return json({ error: "بيانات الدخول غير صحيحة." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: customer, error: customerError } = await service.from("customers").select("id,user_id,name,phone,region,country,password_hash").eq("phone", phone).maybeSingle();
  if (customerError) return json({ error: "تعذر التحقق من الحساب." }, 500, origin);
  if (!customer || customer.user_id || !customer.password_hash) return json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة." }, 401, origin);

  const { data: verified, error: verifyError } = await service.rpc("customer_login", { _phone: phone, _password: rawPassword });
  if (verifyError || !verified?.length || String(verified[0]?.id || "") !== String(customer.id)) return json({ error: "رقم الهاتف أو كلمة المرور غير صحيحة." }, 401, origin);

  const authPassword = await authPasswordFor(phone, rawPassword);
  const { data: created, error: createError } = await service.auth.admin.createUser({ phone, password: authPassword, phone_confirm: true, user_metadata: { name: customer.name, region: customer.region || "عدن", country: customer.country || "YE" } });
  if (createError || !created.user) return json({ error: "تعذر ترحيل الحساب. تواصل مع خدمة العملاء." }, 409, origin);

  const { data: linked, error: linkError } = await service.from("customers").update({ user_id: created.user.id, password_hash: null }).eq("id", customer.id).is("user_id", null).select("id,user_id,name,phone,region,country,avatar_url,created_at").maybeSingle();
  if (linkError || !linked) {
    await service.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return json({ error: "تعذر ترحيل الحساب. حاول مرة أخرى." }, 409, origin);
  }

  return json({ ok: true }, 200, origin);
});
