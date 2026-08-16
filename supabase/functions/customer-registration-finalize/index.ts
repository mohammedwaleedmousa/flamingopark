import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type RegistrationBody = { name?: unknown; region?: unknown };

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 4096;

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...corsHeaders(origin), "Cache-Control": "no-store" } });
const cleanText = (value: unknown, maxLength: number) => typeof value === "string" ? value.trim().replaceAll(String.fromCharCode(0), "").replace(/\s+/g, " ").slice(0, maxLength) : "";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin);

  let body: RegistrationBody;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "طلب غير صالح." }, 413, origin);
    body = JSON.parse(raw) as RegistrationBody;
  } catch {
    return json({ error: "طلب غير صالح." }, 400, origin);
  }

  const name = cleanText(body.name, 100);
  const region = cleanText(body.region, 80);
  if (name.length < 2 || region.length < 2) return json({ error: "بيانات العميل غير مكتملة." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const authorization = req.headers.get("authorization") || "";
  const auth = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: authorization } } });
  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: { user }, error: userError } = await auth.auth.getUser();
  if (userError || !user || !user.phone || !user.phone_confirmed_at) return json({ error: "يجب تأكيد رقم الهاتف أولاً." }, 401, origin);

  const { data: existingByUser } = await service.from("customers").select("id,user_id,name,phone,region").eq("user_id", user.id).maybeSingle();
  if (existingByUser) return json({ ok: true, customer: existingByUser }, 200, origin);

  const { data: existingByPhone, error: phoneLookupError } = await service.from("customers").select("id,user_id").eq("phone", user.phone).maybeSingle();
  if (phoneLookupError) return json({ error: "تعذر التحقق من الحساب." }, 500, origin);
  if (existingByPhone) return json({ error: "هذا الرقم مرتبط بحساب سابق. استخدم تسجيل الدخول لاستعادة حسابك القديم." }, 409, origin);

  const { data: created, error: createError } = await service.from("customers").insert({
    user_id: user.id,
    name,
    phone: user.phone,
    country: "YE",
    region,
  }).select("id,user_id,name,phone,region,country,avatar_url,created_at").single();

  if (createError || !created) return json({ error: "تعذر إنشاء ملف العميل." }, 500, origin);
  return json({ ok: true, customer: created }, 201, origin);
});
