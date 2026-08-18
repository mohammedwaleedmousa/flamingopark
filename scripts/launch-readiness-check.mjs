import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const requireText = (path, needle, label) => {
  const text = read(path);
  if (!text.includes(needle)) throw new Error(`${label}: missing ${JSON.stringify(needle)} in ${path}`);
};
const rejectText = (path, needle, label) => {
  const text = read(path);
  if (text.includes(needle)) throw new Error(`${label}: forbidden ${JSON.stringify(needle)} in ${path}`);
};

requireText("supabase/migrations/20260818194903_fix_launch_readiness_without_password.sql", "public.has_role(auth.uid(), 'admin'::public.app_role)", "uploads admin write policy");
requireText("supabase/migrations/20260818194903_fix_launch_readiness_without_password.sql", "country ~ '^[A-Z]{2}$'", "international customer country constraint");
requireText("supabase/migrations/20260818195259_guard_checkout_payment_codes.sql", "payment_methods_checkout_code_check", "checkout payment code guard");
requireText("supabase/functions/invoice-access/index.ts", "client_upload_disabled", "invoice client persistence guard");
requireText("src/pages/OrderTrackingPage.tsx", 'const STORE_WHATSAPP = "967778579777";', "canonical WhatsApp number");
rejectText("src/pages/OrderTrackingPage.tsx", "967782676054", "stale WhatsApp number");
requireText("src/App.tsx", 'path="product-experience" element={<Navigate to="/admin/products" replace />}', "admin product-experience redirect");
requireText("src/App.tsx", 'path="storefront-map" element={<Navigate to="/admin/sections" replace />}', "admin storefront-map redirect");
requireText("vite.config.ts", 'const siteUrl = \\"https://flamingoparkaden.com\\";', "product canonical compile guard");
requireText("vite.config.ts", 'priceCurrency: \\"SAR\\",', "product currency compile guard");
requireText("vite.config.ts", "نوع الدفع غير مدعوم في صفحة الدفع الحالية", "payment UI compile guard");

console.log("Launch readiness regression checks passed.");
