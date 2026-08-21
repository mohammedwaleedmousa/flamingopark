import { supabase } from "@/integrations/supabase/client";

const VIEW_ID = "admin-dashboard-drilldown-view";
const STATUS_KEYS = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];
type FunnelStage = "visitors" | "cart" | "checkout" | "purchases";

type AnalyticsEvent = {
  id: number;
  event_type: string;
  session_id: string;
  user_id: string | null;
  path: string | null;
  product_id: string | null;
  order_id: string | null;
  device: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type CustomerRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  phone: string | null;
  region: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  images: string[] | null;
  stock_quantity: number | null;
  in_stock: boolean | null;
  is_active: boolean | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number | string | null;
  status: string | null;
  created_at: string;
  items: unknown;
};

type InventorySkuRow = {
  id: string;
  product_id: string;
  label: string;
  color_name: string | null;
  size: string | null;
  stock_quantity: number;
  is_default: boolean;
};

const STATUS_META: Record<StatusKey, { label: string; tone: string }> = {
  pending: { label: "قيد الانتظار", tone: "#C38838" },
  confirmed: { label: "مؤكد", tone: "#5680CF" },
  processing: { label: "قيد التجهيز", tone: "#675CBA" },
  shipped: { label: "تم الشحن", tone: "#4A90A6" },
  delivered: { label: "تم التوصيل", tone: "#629067" },
  cancelled: { label: "ملغي", tone: "#D06C6C" },
};

const FUNNEL_META: Record<FunnelStage, { label: string; hint: string; tone: string }> = {
  visitors: { label: "الزيارات", hint: "الأشخاص والجلسات التي زارت المتجر اليوم", tone: "#675CBA" },
  cart: { label: "إضافة للسلة", hint: "من أضاف منتجات إلى السلة اليوم والمنتجات التي أضافها", tone: "#5680CF" },
  checkout: { label: "بدء الدفع", hint: "الجلسات التي وصلت إلى مرحلة إتمام الطلب اليوم", tone: "#C38838" },
  purchases: { label: "طلبات مكتملة", hint: "الطلبات التي تم إنشاؤها اليوم ولم تُلغَ", tone: "#629067" },
};

const CART_TYPES = new Set(["add_to_cart", "cart_add", "add_cart"]);
const CHECKOUT_TYPES = new Set(["checkout", "begin_checkout", "checkout_start"]);

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);

const fmt = (value: unknown) => Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

const dateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
};

const outletShell = () => document.querySelector<HTMLElement>(".admin-page-scroll > div");

const drilldownStyles = `
#${VIEW_ID}{direction:rtl;color:#20242d;font-family:inherit}
#${VIEW_ID} *{box-sizing:border-box}
#${VIEW_ID} .dd-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid #e4e8ed}
#${VIEW_ID} .dd-kicker{display:flex;align-items:center;gap:7px;font-size:8px;font-weight:800;letter-spacing:.08em;color:#979faa}
#${VIEW_ID} .dd-dot{width:6px;height:6px;border-radius:50%;background:#675cba}
#${VIEW_ID} h1{margin:8px 0 0;font-size:24px;line-height:1.15;color:#20252e}
#${VIEW_ID} .dd-sub{margin:7px 0 0;font-size:10px;color:#8f97a2;line-height:1.8}
#${VIEW_ID} .dd-actions{display:flex;gap:7px;flex-wrap:wrap}
#${VIEW_ID} .dd-btn{display:inline-flex;height:36px;align-items:center;justify-content:center;border:1px solid #e2e6eb;border-radius:10px;background:#fff;padding:0 12px;color:#59616c;font-size:9px;font-weight:700;text-decoration:none;cursor:pointer}
#${VIEW_ID} .dd-btn:hover{background:#f8fafc}
#${VIEW_ID} .dd-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}
#${VIEW_ID} .dd-tab{display:block;border:1px solid #e5e9ef;border-radius:13px;background:#fff;padding:12px;text-decoration:none;color:#3c424c}
#${VIEW_ID} .dd-tab.active{border-color:var(--tone);box-shadow:inset 0 2px 0 var(--tone)}
#${VIEW_ID} .dd-tab-label{font-size:8px;color:#8c939d}
#${VIEW_ID} .dd-tab-value{margin-top:5px;font-size:19px;font-weight:750;line-height:1;color:#303640}
#${VIEW_ID} .dd-card{margin-top:12px;overflow:hidden;border:1px solid #e5e9ef;border-radius:16px;background:#fff}
#${VIEW_ID} .dd-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border-bottom:1px solid #ebeff3}
#${VIEW_ID} .dd-card-title{font-size:11px;font-weight:700;color:#343a44}
#${VIEW_ID} .dd-card-hint{margin-top:3px;font-size:7.5px;color:#9aa1ab}
#${VIEW_ID} .dd-count{display:inline-flex;min-width:27px;height:25px;align-items:center;justify-content:center;border-radius:8px;background:#f1efff;color:#675cba;padding:0 8px;font-size:9px;font-weight:800}
#${VIEW_ID} .dd-table-wrap{overflow-x:auto}
#${VIEW_ID} table{width:100%;min-width:760px;border-collapse:collapse}
#${VIEW_ID} th{background:#fafbfc;padding:10px 13px;text-align:right;font-size:7.5px;color:#969da7;font-weight:700;border-bottom:1px solid #edf0f3}
#${VIEW_ID} td{padding:11px 13px;font-size:8.5px;color:#616975;border-bottom:1px solid #f0f2f5;vertical-align:middle}
#${VIEW_ID} tr:last-child td{border-bottom:0}
#${VIEW_ID} .dd-primary{font-weight:700;color:#404750}
#${VIEW_ID} .dd-muted{margin-top:3px;font-size:7px;color:#9ca3ac}
#${VIEW_ID} .dd-badge{display:inline-flex;align-items:center;border-radius:7px;background:#f6f4ff;padding:4px 7px;font-size:7px;font-weight:700;color:#675cba}
#${VIEW_ID} .dd-product{display:inline-flex;margin:2px 2px 2px 0;border-radius:7px;background:#f2f6fb;padding:4px 7px;font-size:7px;color:#5f7189}
#${VIEW_ID} .dd-empty{display:flex;min-height:230px;align-items:center;justify-content:center;padding:28px;text-align:center;color:#9aa1ab;font-size:9px}
#${VIEW_ID} .dd-loading{display:flex;min-height:320px;flex-direction:column;align-items:center;justify-content:center;gap:12px}
#${VIEW_ID} .dd-spinner{width:28px;height:28px;border:2px solid #e7e9f2;border-top-color:#675cba;border-radius:50%;animation:ddSpin .75s linear infinite}
#${VIEW_ID} .dd-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:12px}
#${VIEW_ID} .dd-stat{border:1px solid #e5e9ef;border-radius:14px;background:#fff;padding:13px}
#${VIEW_ID} .dd-stat-label{font-size:8px;color:#8f96a0}
#${VIEW_ID} .dd-stat-value{margin-top:6px;font-size:20px;font-weight:750;line-height:1;color:#343a44}
#${VIEW_ID} .dd-search{height:36px;width:min(320px,100%);border:1px solid #e2e6eb;border-radius:10px;background:#fff;padding:0 11px;font:inherit;font-size:9px;color:#404750;outline:none}
#${VIEW_ID} .dd-stock-low{font-weight:800;color:#c76161}
#${VIEW_ID} .dd-stock-zero{font-weight:800;color:#b34f4f}
@keyframes ddSpin{to{transform:rotate(360deg)}}
@media(max-width:760px){#${VIEW_ID} .dd-head{flex-direction:column}#${VIEW_ID} .dd-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}#${VIEW_ID} .dd-grid{grid-template-columns:1fr}#${VIEW_ID} h1{font-size:21px}}
`;

const mountView = (key: string, body: string) => {
  const shell = outletShell();
  if (!shell) return null;

  let view = document.getElementById(VIEW_ID) as HTMLElement | null;
  if (!view) {
    Array.from(shell.children).forEach((child) => {
      if (child instanceof HTMLElement) child.style.display = "none";
    });
    view = document.createElement("div");
    view.id = VIEW_ID;
    shell.appendChild(view);
  }

  if (view.dataset.key !== key || view.dataset.state !== "ready") {
    view.dataset.key = key;
    view.innerHTML = `<style>${drilldownStyles}</style>${body}`;
  }
  return view;
};

const loadingMarkup = (title: string, subtitle: string) => `
  <div class="dd-head">
    <div><div class="dd-kicker"><span class="dd-dot"></span>FLAMINGO ADMIN</div><h1>${escapeHtml(title)}</h1><p class="dd-sub">${escapeHtml(subtitle)}</p></div>
    <div class="dd-actions"><a class="dd-btn" href="/admin">العودة للوحة التحكم</a></div>
  </div>
  <div class="dd-card"><div class="dd-loading"><span class="dd-spinner"></span><span class="dd-sub">جاري تحميل البيانات...</span></div></div>`;

const errorMarkup = (title: string, message: string) => `
  <div class="dd-head"><div><div class="dd-kicker"><span class="dd-dot"></span>FLAMINGO ADMIN</div><h1>${escapeHtml(title)}</h1><p class="dd-sub">تعذر تحميل البيانات المطلوبة.</p></div><div class="dd-actions"><a class="dd-btn" href="/admin">العودة للوحة التحكم</a></div></div>
  <div class="dd-card"><div class="dd-empty">${escapeHtml(message)}</div></div>`;

const normalizeEventType = (value: unknown) => String(value || "").trim().toLowerCase();

const customerDisplay = (customer: CustomerRow | undefined, sessionId: string) => {
  if (customer) {
    return {
      name: customer.name || "عميل مسجل",
      detail: customer.phone || customer.region || "حساب مسجل",
    };
  }
  return { name: "زائر غير مسجل", detail: `جلسة ${sessionId.slice(0, 10)}` };
};

const loadFunnelView = async (stage: FunnelStage) => {
  const key = `funnel:${stage}`;
  const view = mountView(key, loadingMarkup("تفاصيل مسار المبيعات", FUNNEL_META[stage].hint));
  if (!view || view.dataset.loading === "1") return;
  view.dataset.loading = "1";

  try {
    const range = todayRange();
    const [eventsResult, ordersResult] = await Promise.all([
      (supabase as any).from("analytics_events").select("id,event_type,session_id,user_id,path,product_id,order_id,device,created_at,metadata").gte("created_at", range.start).lte("created_at", range.end).order("created_at", { ascending: false }).limit(5000),
      (supabase as any).from("orders").select("id,order_number,customer_name,customer_phone,total,status,created_at,items").gte("created_at", range.start).lte("created_at", range.end).order("created_at", { ascending: false }).limit(1000),
    ]);

    if (eventsResult.error) throw eventsResult.error;
    if (ordersResult.error) throw ordersResult.error;

    const events = (eventsResult.data || []) as AnalyticsEvent[];
    const allOrders = (ordersResult.data || []) as OrderRow[];
    const validOrders = allOrders.filter((order) => !["cancelled", "canceled"].includes(String(order.status || "").toLowerCase()));

    const userIds = Array.from(new Set(events.map((event) => event.user_id).filter((id): id is string => Boolean(id))));
    const productIds = Array.from(new Set(events.map((event) => event.product_id).filter((id): id is string => Boolean(id))));

    const [customersResult, productsResult] = await Promise.all([
      userIds.length ? (supabase as any).from("customers").select("id,user_id,name,phone,region").in("user_id", userIds) : Promise.resolve({ data: [], error: null }),
      productIds.length ? (supabase as any).from("products").select("id,name,name_ar,images").in("id", productIds) : Promise.resolve({ data: [], error: null }),
    ]);

    if (customersResult.error) throw customersResult.error;
    if (productsResult.error) throw productsResult.error;

    const customers = new Map<string, CustomerRow>();
    ((customersResult.data || []) as CustomerRow[]).forEach((customer) => {
      if (customer.user_id) customers.set(customer.user_id, customer);
    });

    const products = new Map<string, ProductRow>();
    ((productsResult.data || []) as ProductRow[]).forEach((product) => products.set(product.id, product));

    const sessions = new Map<string, AnalyticsEvent[]>();
    events.forEach((event) => {
      const sessionId = String(event.session_id || "").trim();
      if (!sessionId) return;
      const current = sessions.get(sessionId) || [];
      current.push(event);
      sessions.set(sessionId, current);
    });

    const cartSessions = Array.from(sessions.entries()).filter(([, rows]) => rows.some((event) => CART_TYPES.has(normalizeEventType(event.event_type))));
    const checkoutSessions = Array.from(sessions.entries()).filter(([, rows]) => rows.some((event) => CHECKOUT_TYPES.has(normalizeEventType(event.event_type))));

    const counts: Record<FunnelStage, number> = {
      visitors: sessions.size,
      cart: cartSessions.length,
      checkout: checkoutSessions.length,
      purchases: validOrders.length,
    };

    const tabs = (Object.keys(FUNNEL_META) as FunnelStage[]).map((tab) => {
      const meta = FUNNEL_META[tab];
      return `<a class="dd-tab ${tab === stage ? "active" : ""}" style="--tone:${meta.tone}" href="/admin/reports/customers?funnel=${tab}"><div class="dd-tab-label">${escapeHtml(meta.label)}</div><div class="dd-tab-value">${fmt(counts[tab])}</div></a>`;
    }).join("");

    let tableRows = "";
    let tableHead = "";

    if (stage === "purchases") {
      tableHead = "<tr><th>الطلب</th><th>العميل</th><th>الهاتف</th><th>الإجمالي</th><th>الحالة</th><th>الوقت</th></tr>";
      tableRows = validOrders.map((order) => `
        <tr>
          <td><div class="dd-primary" dir="ltr">${escapeHtml(order.order_number)}</div></td>
          <td><div class="dd-primary">${escapeHtml(order.customer_name || "عميل")}</div></td>
          <td dir="ltr">${escapeHtml(order.customer_phone || "—")}</td>
          <td><span class="dd-primary">${fmt(order.total)}</span></td>
          <td><span class="dd-badge">${escapeHtml(String(order.status || "pending"))}</span></td>
          <td>${escapeHtml(dateTime(order.created_at))}</td>
        </tr>`).join("");
    } else {
      const source = stage === "cart" ? cartSessions : stage === "checkout" ? checkoutSessions : Array.from(sessions.entries());
      tableHead = `<tr><th>الزائر</th><th>${stage === "cart" ? "المنتجات المضافة" : "آخر صفحة"}</th><th>الجهاز</th><th>عدد الأحداث</th><th>آخر نشاط</th></tr>`;
      tableRows = source.map(([sessionId, rows]) => {
        const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sorted[0];
        const customer = latest?.user_id ? customers.get(latest.user_id) : undefined;
        const display = customerDisplay(customer, sessionId);
        const paths = Array.from(new Set(sorted.map((event) => event.path).filter(Boolean))).slice(0, 2);
        const cartEvents = sorted.filter((event) => CART_TYPES.has(normalizeEventType(event.event_type)));
        const productNames = Array.from(new Set(cartEvents.map((event) => {
          const product = event.product_id ? products.get(event.product_id) : undefined;
          const metadataName = event.metadata && typeof event.metadata.name === "string" ? event.metadata.name : "";
          return product?.name_ar || product?.name || metadataName || "منتج";
        })));
        const secondCell = stage === "cart"
          ? (productNames.length ? productNames.map((name) => `<span class="dd-product">${escapeHtml(name)}</span>`).join("") : "—")
          : escapeHtml(paths[0] || latest?.path || "—");
        return `<tr><td><div class="dd-primary">${escapeHtml(display.name)}</div><div class="dd-muted">${escapeHtml(display.detail)}</div></td><td>${secondCell}</td><td><span class="dd-badge">${escapeHtml(latest?.device || "غير محدد")}</span></td><td>${fmt(rows.length)}</td><td>${escapeHtml(dateTime(latest?.created_at || ""))}</td></tr>`;
      }).join("");
    }

    const meta = FUNNEL_META[stage];
    view.innerHTML = `<style>${drilldownStyles}</style>
      <div class="dd-head">
        <div><div class="dd-kicker"><span class="dd-dot"></span>SALES FUNNEL · TODAY</div><h1>تفاصيل مسار المبيعات</h1><p class="dd-sub">${escapeHtml(meta.hint)}. البيانات تخص اليوم حسب توقيت الجهاز.</p></div>
        <div class="dd-actions"><a class="dd-btn" href="/admin">العودة للوحة التحكم</a><a class="dd-btn" href="/admin/reports/customers">تحليل العملاء الكامل</a></div>
      </div>
      <div class="dd-tabs">${tabs}</div>
      <div class="dd-card">
        <div class="dd-card-head"><div><div class="dd-card-title">${escapeHtml(meta.label)}</div><div class="dd-card-hint">${escapeHtml(meta.hint)}</div></div><span class="dd-count">${fmt(counts[stage])}</span></div>
        ${tableRows ? `<div class="dd-table-wrap"><table><thead>${tableHead}</thead><tbody>${tableRows}</tbody></table></div>` : `<div class="dd-empty">لا توجد بيانات في هذه المرحلة اليوم.</div>`}
      </div>`;
    view.dataset.state = "ready";
  } catch (error) {
    console.error("Admin funnel drilldown failed", error);
    view.innerHTML = `<style>${drilldownStyles}</style>${errorMarkup("تفاصيل مسار المبيعات", "تحقق من صلاحيات الأدمن أو الاتصال ثم حاول مرة أخرى.")}`;
    view.dataset.state = "ready";
  } finally {
    delete view.dataset.loading;
  }
};

const loadStatusView = async (status: StatusKey) => {
  const meta = STATUS_META[status];
  const key = `orders:${status}`;
  const view = mountView(key, loadingMarkup(`طلبات: ${meta.label}`, "عرض الطلبات المطابقة للمرحلة التي ضغطت عليها من لوحة التحكم."));
  if (!view || view.dataset.loading === "1") return;
  view.dataset.loading = "1";

  try {
    let query = (supabase as any).from("orders").select("id,order_number,customer_name,customer_phone,total,status,created_at,customer_region,customer_city", { count: "exact" });
    query = status === "cancelled" ? query.in("status", ["cancelled", "canceled"]) : query.eq("status", status);
    const { data, count, error } = await query.order("created_at", { ascending: false }).limit(300);
    if (error) throw error;

    const rows = (data || []) as Array<OrderRow & { customer_region?: string | null; customer_city?: string | null }>;
    const body = rows.map((order) => `<tr><td><div class="dd-primary" dir="ltr">${escapeHtml(order.order_number)}</div></td><td><div class="dd-primary">${escapeHtml(order.customer_name || "عميل")}</div><div class="dd-muted" dir="ltr">${escapeHtml(order.customer_phone || "—")}</div></td><td>${escapeHtml(order.customer_region || order.customer_city || "—")}</td><td><span class="dd-primary">${fmt(order.total)}</span></td><td><span class="dd-badge" style="color:${meta.tone}">${escapeHtml(meta.label)}</span></td><td>${escapeHtml(dateTime(order.created_at))}</td></tr>`).join("");

    view.innerHTML = `<style>${drilldownStyles}</style>
      <div class="dd-head"><div><div class="dd-kicker"><span class="dd-dot" style="background:${meta.tone}"></span>ORDER STATUS</div><h1>${escapeHtml(meta.label)}</h1><p class="dd-sub">الطلبات الموجودة حاليًا في هذه المرحلة.</p></div><div class="dd-actions"><a class="dd-btn" href="/admin">العودة للوحة التحكم</a><a class="dd-btn" href="/admin/orders">إدارة كل الطلبات</a></div></div>
      <div class="dd-grid"><div class="dd-stat"><div class="dd-stat-label">إجمالي هذه المرحلة</div><div class="dd-stat-value">${fmt(count || rows.length)}</div></div><div class="dd-stat"><div class="dd-stat-label">المعروض الآن</div><div class="dd-stat-value">${fmt(rows.length)}</div></div><div class="dd-stat"><div class="dd-stat-label">الحالة</div><div class="dd-stat-value" style="font-size:14px;color:${meta.tone}">${escapeHtml(meta.label)}</div></div></div>
      <div class="dd-card"><div class="dd-card-head"><div><div class="dd-card-title">الطلبات المطابقة</div><div class="dd-card-hint">مرتبة من الأحدث إلى الأقدم</div></div><span class="dd-count">${fmt(count || rows.length)}</span></div>${body ? `<div class="dd-table-wrap"><table><thead><tr><th>الطلب</th><th>العميل</th><th>المنطقة</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="dd-empty">لا توجد طلبات في هذه المرحلة.</div>`}</div>`;
    view.dataset.state = "ready";
  } catch (error) {
    console.error("Admin order status drilldown failed", error);
    view.innerHTML = `<style>${drilldownStyles}</style>${errorMarkup(`طلبات: ${meta.label}`, "تعذر تحميل الطلبات المطابقة.")}`;
    view.dataset.state = "ready";
  } finally {
    delete view.dataset.loading;
  }
};

const loadLowStockView = async () => {
  const key = "low-stock";
  const view = mountView(key, loadingMarkup("المخزون المنخفض", "صفحة مخصصة للمنتجات والـSKU التي وصلت إلى 5 قطع أو أقل."));
  if (!view || view.dataset.loading === "1") return;
  view.dataset.loading = "1";

  try {
    const [skuResult, directProductsResult] = await Promise.all([
      (supabase as any).from("inventory_skus").select("id,product_id,label,color_name,size,stock_quantity,is_default").lte("stock_quantity", 5).order("stock_quantity", { ascending: true }).limit(2500),
      (supabase as any).from("products").select("id,name,name_ar,images,stock_quantity,in_stock,is_active").or("stock_quantity.lte.5,in_stock.eq.false").order("stock_quantity", { ascending: true }).limit(1000),
    ]);
    if (skuResult.error) throw skuResult.error;
    if (directProductsResult.error) throw directProductsResult.error;

    const skus = (skuResult.data || []) as InventorySkuRow[];
    const directProducts = (directProductsResult.data || []) as ProductRow[];
    const skuProductIds = Array.from(new Set(skus.map((sku) => sku.product_id)));
    const productsResult = skuProductIds.length
      ? await (supabase as any).from("products").select("id,name,name_ar,images,stock_quantity,in_stock,is_active").in("id", skuProductIds)
      : { data: [], error: null };
    if (productsResult.error) throw productsResult.error;

    const productMap = new Map<string, ProductRow>();
    [...directProducts, ...((productsResult.data || []) as ProductRow[])].forEach((product) => productMap.set(product.id, product));

    const grouped = new Map<string, { product: ProductRow; skus: InventorySkuRow[] }>();
    productMap.forEach((product) => grouped.set(product.id, { product, skus: [] }));
    skus.forEach((sku) => {
      const group = grouped.get(sku.product_id);
      if (group) group.skus.push(sku);
    });

    const rows = Array.from(grouped.values()).map((group) => {
      const skuStocks = group.skus.map((sku) => Number(sku.stock_quantity || 0));
      const directStock = Number(group.product.stock_quantity ?? 0);
      const lowest = skuStocks.length ? Math.min(...skuStocks) : directStock;
      return { ...group, lowest };
    }).filter((row) => row.lowest <= 5 || row.product.in_stock === false).sort((a, b) => a.lowest - b.lowest || String(a.product.name_ar || a.product.name).localeCompare(String(b.product.name_ar || b.product.name), "ar"));

    const outOfStock = rows.filter((row) => row.lowest <= 0).length;
    const lowOnly = rows.length - outOfStock;
    const body = rows.map(({ product, skus: lowSkus, lowest }) => {
      const variants = lowSkus.slice(0, 5).map((sku) => `<span class="dd-product">${escapeHtml(sku.label || [sku.color_name, sku.size].filter(Boolean).join(" · ") || "SKU")} · ${fmt(sku.stock_quantity)}</span>`).join("");
      const more = lowSkus.length > 5 ? `<span class="dd-muted">+${lowSkus.length - 5} خيارات أخرى منخفضة</span>` : "";
      return `<tr data-low-stock-row data-search="${escapeHtml(`${product.name_ar || ""} ${product.name || ""}`.toLowerCase())}"><td><div class="dd-primary">${escapeHtml(product.name_ar || product.name || "منتج")}</div><div class="dd-muted">${product.is_active === false ? "غير نشط" : "نشط"}</div></td><td>${variants || `<span class="dd-product">المخزون العام</span>`}${more}</td><td><span class="${lowest <= 0 ? "dd-stock-zero" : "dd-stock-low"}">${fmt(lowest)}</span></td><td>${fmt(lowSkus.length)}</td><td><a class="dd-btn" style="height:30px" href="/admin/products/${encodeURIComponent(product.id)}">فتح المنتج</a></td></tr>`;
    }).join("");

    view.innerHTML = `<style>${drilldownStyles}</style>
      <div class="dd-head"><div><div class="dd-kicker"><span class="dd-dot" style="background:#c66a7f"></span>INVENTORY ALERTS</div><h1>المخزون المنخفض</h1><p class="dd-sub">فقط المنتجات التي تحتاج لإعادة تزويد. يتم احتساب المخزون العام ومخزون المقاسات/الألوان.</p></div><div class="dd-actions"><a class="dd-btn" href="/admin">العودة للوحة التحكم</a><a class="dd-btn" href="/admin/inventory-adjustments">تعديلات المخزون</a></div></div>
      <div class="dd-grid"><div class="dd-stat"><div class="dd-stat-label">منتجات تحتاج انتباه</div><div class="dd-stat-value">${fmt(rows.length)}</div></div><div class="dd-stat"><div class="dd-stat-label">نفد المخزون</div><div class="dd-stat-value" style="color:#b34f4f">${fmt(outOfStock)}</div></div><div class="dd-stat"><div class="dd-stat-label">منخفض ولم ينفد</div><div class="dd-stat-value" style="color:#c38838">${fmt(lowOnly)}</div></div></div>
      <div class="dd-card"><div class="dd-card-head"><div><div class="dd-card-title">قائمة المخزون المنخفض</div><div class="dd-card-hint">الحد الحالي: 5 قطع أو أقل</div></div><input class="dd-search" data-low-stock-search placeholder="ابحث عن منتج..." /></div>${body ? `<div class="dd-table-wrap"><table><thead><tr><th>المنتج</th><th>الخيارات المنخفضة</th><th>أقل كمية</th><th>عدد SKU منخفض</th><th></th></tr></thead><tbody>${body}</tbody></table></div>` : `<div class="dd-empty">لا توجد منتجات منخفضة المخزون.</div>`}</div>`;

    const search = view.querySelector<HTMLInputElement>("[data-low-stock-search]");
    search?.addEventListener("input", () => {
      const term = search.value.trim().toLowerCase();
      view.querySelectorAll<HTMLElement>("[data-low-stock-row]").forEach((row) => {
        row.style.display = !term || String(row.dataset.search || "").includes(term) ? "" : "none";
      });
    });
    view.dataset.state = "ready";
  } catch (error) {
    console.error("Admin low stock drilldown failed", error);
    view.innerHTML = `<style>${drilldownStyles}</style>${errorMarkup("المخزون المنخفض", "تعذر تحميل بيانات المخزون.")}`;
    view.dataset.state = "ready";
  } finally {
    delete view.dataset.loading;
  }
};

const textElements = (root: ParentNode, text: string) => Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,p,span")).filter((element) => element.textContent?.trim() === text);

const closestCard = (element: HTMLElement, stop: HTMLElement) => {
  let current: HTMLElement | null = element;
  while (current && current !== stop) {
    const className = typeof current.className === "string" ? current.className : "";
    if (className.includes("rounded-[12px]") && className.includes("border")) return current;
    current = current.parentElement;
  }
  return null;
};

const makeClickable = (card: HTMLElement, url: string, label: string) => {
  if (card.dataset.adminDrilldownUrl === url) return;
  card.dataset.adminDrilldownUrl = url;
  card.setAttribute("role", "link");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", label);
  card.style.cursor = "pointer";
  card.style.transition = "border-color .15s ease, box-shadow .15s ease, transform .15s ease";
  card.addEventListener("mouseenter", () => { card.style.borderColor = "#d9ddea"; card.style.boxShadow = "0 7px 18px rgba(44,50,60,.05)"; });
  card.addEventListener("mouseleave", () => { card.style.borderColor = ""; card.style.boxShadow = ""; });
  card.addEventListener("click", (event) => {
    if ((event.target as Element | null)?.closest("a,button,input,select,textarea")) return;
    window.location.assign(url);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.assign(url);
    }
  });
};

const appendDetailsLink = (heading: HTMLElement, href: string, text: string) => {
  const holder = heading.parentElement;
  if (!holder || holder.querySelector(`[data-admin-details-link="${href}"]`)) return;
  const link = document.createElement("a");
  link.href = href;
  link.dataset.adminDetailsLink = href;
  link.textContent = text;
  link.className = "mt-[6px] inline-flex text-[7.5px] font-semibold text-[#675CBA] hover:underline";
  holder.appendChild(link);
};

const enhanceDashboard = () => {
  if (window.location.pathname !== "/admin") return;
  const root = document.querySelector<HTMLElement>(".admin-page-scroll");
  if (!root) return;

  const funnelHeading = textElements(root, "مسار المبيعات")[0];
  if (funnelHeading) {
    appendDetailsLink(funnelHeading, "/admin/reports/customers?funnel=visitors", "عرض تفاصيل المسار ←");
    const funnelRoot = funnelHeading.closest<HTMLElement>("div.rounded-[16px]") || root;
    const funnelTargets: Array<[string, FunnelStage]> = [["الزيارات", "visitors"], ["إضافة للسلة", "cart"], ["بدء الدفع", "checkout"], ["طلبات مكتملة", "purchases"]];
    funnelTargets.forEach(([label, stage]) => {
      textElements(funnelRoot, label).forEach((element) => {
        const card = closestCard(element, funnelRoot);
        if (card) makeClickable(card, `/admin/reports/customers?funnel=${stage}`, `فتح تفاصيل ${label}`);
      });
    });
  }

  const statusHeading = textElements(root, "حالة الطلبات")[0];
  if (statusHeading) {
    const statusRoot = statusHeading.closest<HTMLElement>("div.rounded-[16px]") || root;
    const labels: Record<StatusKey, string> = { pending: "قيد الانتظار", confirmed: "مؤكد", processing: "قيد التجهيز", shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي" };
    STATUS_KEYS.forEach((status) => {
      textElements(statusRoot, labels[status]).forEach((element) => {
        const card = closestCard(element, statusRoot);
        if (card) makeClickable(card, `/admin/orders?status=${status}`, `فتح طلبات ${labels[status]}`);
      });
    });
  }

  const lowHeading = textElements(root, "المخزون المنخفض")[0];
  if (lowHeading) appendDetailsLink(lowHeading, "/admin/inventory-adjustments?view=low-stock", "فتح صفحة المخزون المنخفض ←");

  textElements(root, "عرض جميع المنتجات").forEach((element) => {
    const link = element.closest<HTMLAnchorElement>("a");
    if (link && lowHeading) {
      link.href = "/admin/inventory-adjustments?view=low-stock";
      link.textContent = "عرض المخزون المنخفض";
    }
  });

  textElements(root, "منتجات منخفضة المخزون").forEach((element) => {
    const link = element.closest<HTMLAnchorElement>("a");
    if (link) link.href = "/admin/inventory-adjustments?view=low-stock";
  });
};

let scheduled = false;
const run = () => {
  scheduled = false;
  if (!window.location.pathname.startsWith("/admin") || window.location.pathname === "/admin/login") return;

  const params = new URLSearchParams(window.location.search);
  const funnel = params.get("funnel");
  const status = params.get("status");
  const view = params.get("view");

  if (window.location.pathname === "/admin/reports/customers" && ["visitors", "cart", "checkout", "purchases"].includes(String(funnel))) {
    void loadFunnelView(funnel as FunnelStage);
    return;
  }
  if (window.location.pathname === "/admin/orders" && STATUS_KEYS.includes(status as StatusKey)) {
    void loadStatusView(status as StatusKey);
    return;
  }
  if (window.location.pathname === "/admin/inventory-adjustments" && view === "low-stock") {
    void loadLowStockView();
    return;
  }
  enhanceDashboard();
};

const scheduleRun = () => {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(run);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleRun, { once: true });
  else scheduleRun();

  const observer = new MutationObserver(scheduleRun);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("popstate", scheduleRun);
}
