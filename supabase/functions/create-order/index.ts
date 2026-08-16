import { createClient } from "npm:@supabase/supabase-js@2.112.0";

type RequestAction = "quote" | "create";
type OrderBody = {
  action?: unknown;
  customerName?: unknown;
  customerPhone?: unknown;
  customerAddress?: unknown;
  customerCity?: unknown;
  customerRegion?: unknown;
  customerNotes?: unknown;
  paymentMethod?: unknown;
  deliveryCompanyId?: unknown;
  couponCode?: unknown;
  currencyMode?: unknown;
  items?: unknown;
};

const DEFAULT_ORIGINS = [
  "https://flamingopark.vercel.app",
  "https://flamingopark.store",
  "https://www.flamingopark.store",
  "https://flamingoparkaden.com",
  "https://www.flamingoparkaden.com",
  "http://localhost:5173",
];
const MAX_BODY_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedOrigins = () => new Set((Deno.env.get("ALLOWED_ORIGINS") || DEFAULT_ORIGINS.join(",")).split(",").map((origin) => origin.trim()).filter(Boolean));
const headers = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins().has(origin) ? origin : DEFAULT_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
});
const json = (body: unknown, status: number, origin: string | null) => Response.json(body, { status, headers: { ...headers(origin), "Cache-Control": "no-store" } });
const cleanText = (value: unknown, max: number) => typeof value === "string" ? value.trim().replaceAll(String.fromCharCode(0), "").replace(/\s+/g, " ").slice(0, max) : "";
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
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};
const fingerprint = async (req: Request) => {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || forwarded || "unknown";
  const agent = (req.headers.get("user-agent") || "unknown").slice(0, 160);
  const salt = Deno.env.get("RATE_LIMIT_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "flamingo-orders-v1";
  return sha256(`${salt}:${address}:${agent}`);
};

const sanitizeItems = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const items = value.map((raw) => {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const productId = cleanText(item.product_id, 36);
    const quantity = Number(item.quantity);
    const accessoriesRaw = Array.isArray(item.selected_accessories) ? item.selected_accessories.slice(0, 20) : [];
    if (!UUID_PATTERN.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) return null;
    const accessories = accessoriesRaw.map((rawAccessory) => {
      if (!rawAccessory || typeof rawAccessory !== "object") return null;
      const accessory = rawAccessory as Record<string, unknown>;
      const accessoryQuantity = Number(accessory.quantity);
      const name = cleanText(accessory.name, 200);
      const nameAr = cleanText(accessory.name_ar, 200);
      if ((!name && !nameAr) || !Number.isInteger(accessoryQuantity) || accessoryQuantity < 1 || accessoryQuantity > 20) return null;
      return { name, name_ar: nameAr, quantity: accessoryQuantity };
    });
    if (accessories.some((accessory) => accessory === null)) return null;
    return {
      product_id: productId,
      quantity,
      selected_size: cleanText(item.selected_size, 100) || null,
      selected_color: cleanText(item.selected_color, 100) || null,
      selected_accessories: accessories,
    };
  });
  return items.some((item) => item === null) ? null : items;
};

const safeFailure = (message: string) => {
  if (message.includes("rate_limited")) return { status: 429, error: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى." };
  if (message.includes("invalid_coupon")) return { status: 400, error: "كود الخصم غير صالح أو غير متاح." };
  if (message.includes("product_unavailable") || message.includes("stock_unavailable")) return { status: 409, error: "أحد المنتجات لم يعد متاحاً بالكمية المطلوبة." };
  if (message.includes("delivery_unavailable")) return { status: 409, error: "شركة التوصيل المختارة غير متاحة." };
  if (message.includes("invalid_input") || message.includes("invalid_order")) return { status: 400, error: "بيانات الطلب غير صحيحة." };
  return { status: 500, error: "تعذر إكمال الطلب حالياً. حاول مرة أخرى." };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json({ error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);

  let body: OrderBody;
  try {
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "الطلب أكبر من الحد المسموح." }, 413, origin);
    body = JSON.parse(raw) as OrderBody;
  } catch {
    return json({ error: "طلب غير صالح." }, 400, origin);
  }

  const action: RequestAction | null = body.action === "quote" || body.action === "create" ? body.action : null;
  const items = sanitizeItems(body.items);
  const deliveryCompanyId = cleanText(body.deliveryCompanyId, 36) || null;
  const couponCode = cleanText(body.couponCode, 50) || null;
  const currencyMode = cleanText(body.currencyMode, 30).toUpperCase() || "SAR";
  if (!action || !items || (deliveryCompanyId && !UUID_PATTERN.test(deliveryCompanyId))) return json({ error: "بيانات الطلب غير صحيحة." }, 400, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) return json({ error: "الخدمة غير مهيأة." }, 500, origin);

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const auth = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: req.headers.get("authorization") || "" } },
  });
  const { data: { user } } = await auth.auth.getUser();

  let ownerUserId: string | null = null;
  let customerId: string | null = null;
  let customerName = cleanText(body.customerName, 100);
  let customerPhone = normalizePhone(body.customerPhone);
  let customerRegion = cleanText(body.customerRegion, 80) || null;

  if (user) {
    const { data: profile, error: profileError } = await service.from("customers").select("id,user_id,name,phone,region").eq("user_id", user.id).maybeSingle();
    if (profileError || !profile) return json({ error: "جلسة العميل غير صالحة." }, 403, origin);
    ownerUserId = user.id;
    customerId = profile.id;
    customerName = profile.name;
    customerPhone = normalizePhone(profile.phone);
    customerRegion = cleanText(profile.region, 80) || customerRegion;
  }

  const clientFingerprint = await fingerprint(req);
  const { data: rateRows, error: rateError } = await service.rpc("consume_order_creation_rate_limit", {
    p_action: action,
    p_phone: customerPhone || clientFingerprint,
    p_fingerprint_hash: clientFingerprint,
  });
  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (rateError || !rate?.allowed) return json({ error: "محاولات كثيرة. انتظر قليلاً ثم حاول مرة أخرى.", retryAfter: rate?.retry_after_seconds || 600 }, 429, origin);

  try {
    if (action === "quote") {
      const { data, error } = await service.rpc("quote_secure_order", {
        p_delivery_company_id: deliveryCompanyId,
        p_coupon_code: couponCode,
        p_currency_mode: currencyMode,
        p_items: items,
      });
      if (error) throw error;
      return json(data, 200, origin);
    }

    const address = cleanText(body.customerAddress, 500);
    const city = cleanText(body.customerCity, 100);
    const notes = cleanText(body.customerNotes, 1000) || null;
    const paymentMethod = body.paymentMethod === "cod" || body.paymentMethod === "bank" ? body.paymentMethod : null;
    if (!customerName || !customerPhone || !address || !city || !paymentMethod || !deliveryCompanyId) return json({ error: "أكمل بيانات الطلب المطلوبة." }, 400, origin);

    const { data, error } = await service.rpc("create_secure_order", {
      p_owner_user_id: ownerUserId,
      p_customer_id: customerId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_address: address,
      p_customer_city: city,
      p_customer_region: customerRegion,
      p_customer_notes: notes,
      p_payment_method: paymentMethod,
      p_delivery_company_id: deliveryCompanyId,
      p_coupon_code: couponCode,
      p_currency_mode: currencyMode,
      p_items: items,
    });
    if (error) throw error;
    return json(data, 201, origin);
  } catch (error) {
    const failure = safeFailure(error instanceof Error ? error.message : "");
    return json({ error: failure.error }, failure.status, origin);
  }
});
