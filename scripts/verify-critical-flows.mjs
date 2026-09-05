import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const checks = [
  {
    file: "src/pages/CheckoutPage.tsx",
    needles: ["create_secure_order_v2", "p_items", "p_delivery_company_id", "trackingToken: createdOrder.tracking_token"],
    message: "Checkout must continue using the secure server-side order RPC and pass its tracking token only into confirmation state.",
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
    needles: ["Promise<boolean>", "if (error) throw error", "database track failed", "gtag forward failed", "recordPurchaseAnalytics", "record_purchase_analytics", "return persisted"],
    message: "Analytics delivery must remain isolated and purchase persistence must use the verified server-side RPC.",
  },
  {
    file: "src/store/useStore.ts",
    needles: ["getCartItemUnitTotal", "event_type: \"add_to_cart\"", "event_type: \"remove_from_cart\"", "selected_size", "selected_color"],
    message: "Cart add/remove analytics must use the same item-value calculation and preserve variant selection metadata.",
  },
  {
    file: "functions/sitemap.xml.ts",
    needles: ["products", "brands", "categories", "application/xml"],
    message: "The storefront sitemap must continue including dynamic catalog routes.",
  },
  {
    file: "src/main.tsx",
    needles: ["createRoot", "startRuntimeMonitoring", "CustomerCartSync"],
    forbidden: [
      "./pages/ProductDetailPage",
      "accountInvoiceEnhancements",
      "accountInvoiceRenderer",
      "myOrdersInvoiceBridge",
      "adminDashboardDomCompat",
      "adminDashboardDrilldowns",
      "adminDrilldownRestore",
      "adminProductsMobileEnhancements",
      "adminUiEnhancements",
    ],
    message: "The entrypoint must keep route-only customer/admin features lazy while mounting the invisible cart persistence service.",
  },
  {
    file: "vite.config.ts",
    needles: ["react", "motion", "commerce"],
    forbidden: ["recharts", "jspdf", "html2canvas"],
    message: "Admin-only chart and PDF libraries must not be manually preloaded for every storefront visitor.",
  },
  {
    file: "index.html",
    needles: ["rel=\"dns-prefetch\"", "rel=\"preconnect\"", "hcomhdkmtqttzghjxjcb.supabase.co"],
    message: "The first storefront request must start the Supabase image/API connection early.",
  },
  {
    file: "src/components/HeroSlider.tsx",
    needles: ["staleTime: 5 * 60 * 1000", "refetchOnMount: false", "const slides = managedSlides", "fetchPriority={index === 0 ? \"high\" : \"auto\"}"],
    forbidden: ["isFetching ? [] : managedSlides"],
    message: "Cached hero images must stay visible during refreshes and the first slide must retain high fetch priority.",
  },
  {
    file: "src/components/AnalyticsTracker.tsx",
    needles: ["product_view", "begin_checkout", "recordPurchaseAnalytics", "trackingToken", "gtag(\"event\", \"purchase\"", "lastProductView", "lastCheckout", "lastPurchase", "converted_order_id", "isAdminRoute"],
    forbidden: ["event_type: \"purchase\""],
    message: "Customer conversion analytics must use verified purchase persistence, preserve the funnel, and avoid direct client purchase inserts.",
  },
  {
    file: "supabase/migrations/20260830213726_lock_purchase_analytics_to_verified_rpc.sql",
    needles: ["Anyone can insert non-purchase events", "order_id is null", "begin_checkout"],
    forbidden: ["event_type = 'purchase'"],
    message: "Direct browser inserts must not be allowed to persist purchase events.",
  },
  {
    file: "supabase/migrations/20260830213751_remove_legacy_direct_purchase_trigger.sql",
    needles: ["drop trigger if exists analytics_events_verify_purchase", "drop function if exists public.normalize_purchase_analytics_event"],
    message: "The obsolete direct-purchase normalization trigger must stay removed after verified RPC cutover.",
  },
  {
    file: "src/components/CustomerCartSync.tsx",
    needles: ["customer_carts", "onConflict: \"user_id\"", "status: itemCount > 0 ? \"active\" : \"cleared\"", "getConfirmedOrderId", "status: \"converted\"", "converted_order_id", "hadItems", "lastPayload"],
    message: "Authenticated carts must remain debounced, distinguish manual clearing from checkout conversion, and never overwrite a previous recovery state on an empty app start.",
  },
  {
    file: "src/pages/ProductsPage.tsx",
    needles: ["catalog-live-filter-facets", "draftBrandFilter", "brandScopedFacetMetadata", "audienceScopedFacetMetadata", "نوع الأحذية", "audience.eq.women", "setDraftBrand", "setDraftAudience", "getCategoryDescendantIds", "currentCategoryBranchLevels", "draftCategoryBranchLevels", "أقسام {parent.name_ar}", "hierarchy-v2", "home_collections", "isBestSellerProduct", "isFeaturedProduct", "setParam(\"sort\", value)", "h-[92dvh]", "aria-label=\"إغلاق الفلترة\"", "document.documentElement", "root.style.overflow = \"hidden\"", "product={product} index={index}"],
    forbidden: ["if (categorySlug)", "body.style.position = \"fixed\"", "window.setTimeout(() => {\n      setParam(\"sort\""],
    message: "Catalog filters must apply immediately, rank assigned collections correctly, expose only relevant facets, load the complete category hierarchy, and stay fully visible on mobile.",
  },
  {
    file: "src/components/ProductListFilters.tsx",
    needles: ["latestValuesRef", "onChangeRef", "h-[92dvh]", "aria-label=\"إغلاق الفلترة\"", "root.style.overflow = \"hidden\""],
    forbidden: ["body.style.position = \"fixed\""],
    message: "Shared category and collection filters must not let delayed search updates overwrite newer filter choices and must remain usable on mobile.",
  },
  {
    file: "src/pages/CategoriesPage.tsx",
    needles: ["categories-all-active", "hierarchy-v2", "parent_id", "setSearchParams((current)"],
    message: "The categories page must share the complete hierarchy cache and update filters from the latest URL state.",
  },
  {
    file: "src/pages/BrandSectionPage.tsx",
    needles: ["new Date(b._createdAt || 0)", "document.documentElement", "root.style.overflow = \"hidden\""],
    forbidden: ["body.style.position = \"fixed\""],
    message: "Brand section sorting must implement newest order and its filter sheets must stay in the mobile viewport.",
  },
  {
    file: "src/pages/SearchPage.tsx",
    needles: ["categories-all-active", "search-labels-v1"],
    forbidden: ["queryKey: ['categories-all-active']"],
    message: "Search category labels must not overwrite the complete catalog hierarchy cache.",
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
