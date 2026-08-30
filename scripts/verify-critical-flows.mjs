import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const checks = [
  {
    file: "src/pages/CheckoutPage.tsx",
    needles: ["create_secure_order_v2", "p_items", "p_delivery_company_id"],
    message: "Checkout must continue using the secure server-side order RPC.",
  },
  {
    file: "supabase/migrations/20260817112000_launch_readiness_customer_orders.sql",
    needles: ["for update", "insufficient_stock", "stock_quantity = stock_quantity -"],
    message: "Order creation must reserve stock atomically.",
  },
  {
    file: "supabase/migrations/20260828182748_atomic_refund_inventory_restoration.sql",
    needles: ["inventory_restored_at", "Refund quantity exceeds remaining refundable quantity", "update public.inventory_skus set stock_quantity = v_after"],
    message: "Completed refunds must restore inventory once and prevent over-refunds.",
  },
  {
    file: "supabase/migrations/20260828182924_automatic_order_customer_notifications.sql",
    needles: ["notify_customer_order_status", "customer_notifications", "order_status_"],
    message: "Order status changes must continue creating customer notifications.",
  },
  {
    file: "src/lib/runtimeMonitoring.ts",
    needles: ["client_error", "slow_resource", "SLOW_RESOURCE_MS"],
    message: "Runtime monitoring must continue capturing errors and slow product resources.",
  },
  {
    file: "src/lib/analytics.ts",
    needles: ["Promise<boolean>", "if (error) throw error", "database track failed", "gtag forward failed", "return persisted"],
    message: "Analytics database and GA delivery must remain isolated so one failing destination cannot break the storefront or suppress the other destination.",
  },
  {
    file: "functions/sitemap.xml.ts",
    needles: ["products", "brands", "categories", "application/xml"],
    message: "The storefront sitemap must continue including dynamic catalog routes.",
  },
  {
    file: "src/main.tsx",
    needles: ["createRoot", "startRuntimeMonitoring", "CustomerCartSync"],
    forbidden: ["./pages/ProductDetailPage"],
    message: "The entrypoint must keep product detail lazy while mounting the invisible cart persistence service.",
  },
  {
    file: "src/components/AnalyticsTracker.tsx",
    needles: ["product_view", "begin_checkout", "purchase", "lastProductView", "lastCheckout", "lastPurchase", "converted_order_id", "isAdminRoute"],
    message: "Customer conversion analytics must preserve the full product-to-purchase funnel and mark converted carts without affecting admin routes.",
  },
  {
    file: "src/components/CustomerCartSync.tsx",
    needles: ["customer_carts", "onConflict: \"user_id\"", "status: itemCount > 0 ? \"active\" : \"cleared\"", "getConfirmedOrderId", "status: \"converted\"", "converted_order_id", "hadItems", "lastPayload"],
    message: "Authenticated carts must remain debounced, distinguish manual clearing from checkout conversion, and never overwrite a previous recovery state on an empty app start.",
  },
];

let failures = 0;

for (const check of checks) {
  let source = "";
  try {
    source = read(check.file);
  } catch {
    console.error(`FAIL ${check.file}: file is missing.`);
    failures += 1;
    continue;
  }

  const normalized = source.toLowerCase();
  const missing = check.needles.filter((needle) => !normalized.includes(needle.toLowerCase()));
  const forbidden = (check.forbidden || []).filter((needle) => normalized.includes(needle.toLowerCase()));
  if (missing.length || forbidden.length) {
    console.error(`FAIL ${check.file}: ${check.message}`);
    if (missing.length) console.error(`  Missing: ${missing.join(", ")}`);
    if (forbidden.length) console.error(`  Forbidden: ${forbidden.join(", ")}`);
    failures += 1;
    continue;
  }

  console.log(`PASS ${check.file}`);
}

if (failures > 0) {
  console.error(`Critical flow verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log("Critical flow verification passed.");
