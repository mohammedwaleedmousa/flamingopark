import { supabase } from "@/integrations/supabase/client";
import { optimizeImage } from "@/lib/imageUrl";

type InvoiceAccessory = {
  name?: string | null;
  name_ar?: string | null;
  price?: number | string | null;
  quantity?: number | string | null;
};

type InvoiceItem = {
  product_id?: string | null;
  product_name?: string | null;
  product_image?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: InvoiceAccessory[] | null;
};

type AccountInvoiceOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_region: string | null;
  customer_notes: string | null;
  items: InvoiceItem[] | null;
  subtotal: number | string | null;
  delivery_fee: number | string | null;
  discount_amount: number | string | null;
  coupon_code: string | null;
  total: number | string | null;
  payment_method: string | null;
  status: string | null;
  delivery_company_id: string | null;
  currency_code: string | null;
  currency_mode: string | null;
  created_at: string;
};

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);

const safeImage = (value: unknown) => {
  const raw = typeof value === "string" ? value.trim() : "";
  const fallback = `${window.location.origin}/placeholder.svg`;

  if (!raw) return fallback;

  try {
    const optimized = optimizeImage(raw, 180, 72);
    if (optimized.startsWith("/")) return `${window.location.origin}${optimized}`;
    if (/^https?:\/\//i.test(optimized)) return optimized;
  } catch {
    return fallback;
  }

  return fallback;
};

const currencySymbol = (order: AccountInvoiceOrder) => {
  const code = String(order.currency_code || order.currency_mode || "SAR").toUpperCase();
  if (code === "SAR") return "ر.س";
  if (code === "YER" || code === "YER_SOUTH" || code === "YER_NORTH") return "ر.ي";
  return code;
};

const money = (value: unknown, symbol: string) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${symbol}`;

const paymentLabel = (method: string | null) => {
  const key = String(method || "").toLowerCase();
  if (key === "cod") return "الدفع عند الاستلام";
  if (key === "bank") return "تحويل بنكي أو عبر صراف";
  if (key === "cash") return "نقداً";
  return method || "—";
};

const statusLabel = (status: string | null) => {
  const labels: Record<string, string> = {
    pending: "بانتظار التأكيد",
    confirmed: "تم التأكيد",
    processing: "قيد التجهيز",
    shipped: "قيد الشحن",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التسليم",
    cancelled: "ملغي",
    canceled: "ملغي",
  };

  return labels[String(status || "").toLowerCase()] || status || "تم استلام الطلب";
};

const loadingHtml = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة Flamingo Park</title><style>body{margin:0;background:#fffdfc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif;color:#514540}.loading{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}.spinner{width:28px;height:28px;border:2px solid #eaded9;border-top-color:#d4777d;border-radius:50%;animation:s .8s linear infinite}.loading p{font-size:12px;color:#9b8d88}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div class="loading"><span class="spinner"></span><p>جاري تحميل الفاتورة...</p></div></body></html>`;

const buildInvoiceHtml = (order: AccountInvoiceOrder, deliveryCompany: string) => {
  const symbol = currencySymbol(order);
  const items = Array.isArray(order.items) ? order.items : [];
  const logo = `${window.location.origin}/icons/flamingo.jpeg`;
  const address = [order.customer_region, order.customer_city, order.customer_address].filter(Boolean).map(escapeHtml).join(" - ") || "—";

  const itemRows = items.length
    ? items.map((item, index) => {
        const quantity = Math.max(1, Number(item.quantity || 1));
        const price = Number(item.price || 0);
        const accessories = Array.isArray(item.selected_accessories) ? item.selected_accessories : [];
        const accessoriesHtml = accessories.length
          ? `<div class="accessories"><p class="accessories-title">الإضافات</p>${accessories.map((accessory) => {
              const accessoryQuantity = Math.max(1, Number(accessory.quantity || 1));
              const accessoryPrice = Number(accessory.price || 0);
              return `<div class="accessory-row"><div><strong>${escapeHtml(accessory.name_ar || accessory.name || "إضافة")}</strong><small>الكمية ×${accessoryQuantity.toLocaleString("ar-EG")}</small></div><span>+${escapeHtml(money(accessoryPrice * accessoryQuantity, symbol))}</span></div>`;
            }).join("")}</div>`
          : "";

        return `<div class="product ${index !== items.length - 1 ? "with-border" : ""}"><div class="product-main"><div class="product-image"><img src="${escapeHtml(safeImage(item.product_image))}" alt="${escapeHtml(item.product_name || "منتج")}" onerror="this.src='${window.location.origin}/placeholder.svg'"></div><div class="product-info"><h4>${escapeHtml(item.product_name || "منتج")}</h4><div class="meta"><span>الكمية: ${quantity.toLocaleString("ar-EG")}</span>${item.selected_size ? `<i>•</i><span>المقاس: ${escapeHtml(item.selected_size)}</span>` : ""}${item.selected_color ? `<i>•</i><span>اللون: ${escapeHtml(item.selected_color)}</span>` : ""}</div><p>${quantity.toLocaleString("ar-EG")} × ${escapeHtml(money(price, symbol))}</p></div><strong class="line-total">${escapeHtml(money(price * quantity, symbol))}</strong></div>${accessoriesHtml}</div>`;
      }).join("")
    : `<div class="empty">لا توجد تفاصيل منتجات محفوظة لهذه الفاتورة.</div>`;

  const discount = Number(order.discount_amount || 0);
  const subtotal = Number(order.subtotal ?? order.total ?? 0);
  const deliveryFee = Number(order.delivery_fee || 0);
  const total = Number(order.total || 0);
  const date = new Date(order.created_at).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة ${escapeHtml(order.order_number)}</title><style>
*{box-sizing:border-box}html,body{margin:0;background:#fffdfc;color:#403633;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif}body{-webkit-font-smoothing:antialiased}.page{width:100%;max-width:820px;margin:0 auto;padding:28px 14px 48px}.invoice{overflow:hidden;border:1px solid #e9dfdb;border-radius:16px;background:#fff}.invoice-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;border-bottom:1px solid #eee5e1;padding:18px 20px}.logo{height:52px;width:auto;object-fit:contain}.invoice-caption{margin:5px 0 0;font-size:10px;color:#a0938e}.order-side{text-align:left;min-width:0}.overline{margin:0;font-size:9px;letter-spacing:.12em;color:#a79a95}.order-number{margin:5px 0 0;font:600 12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#514540;direction:ltr}.date{margin:6px 0 0;font-size:9px;line-height:1.6;color:#a0938e}.status-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #eee5e1;background:#fffcfb}.status-cell{padding:13px 20px}.status-cell:first-child{border-left:1px solid #eee5e1}.mini-label{display:flex;align-items:center;gap:6px;font-size:9px;color:#9d8f8a}.mini-dot{width:6px;height:6px;border-radius:50%;background:#c66c72}.status-value{margin:6px 0 0;font-size:11px;font-weight:700;color:#527258}.delivery-value{margin:6px 0 0;font-size:11px;font-weight:700;color:#514540;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.customer-grid{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #eee5e1}.customer-block{padding:16px 20px}.customer-block:first-child{border-left:1px solid #eee5e1}.section-label{margin:0;font-size:10px;font-weight:600;color:#a0938e}.customer-name{margin:9px 0 0;font-size:12px;font-weight:700;color:#514540}.phone{margin:7px 0 0;font-size:10px;color:#7e706b;direction:ltr;text-align:right}.address{margin:9px 0 0;font-size:11px;line-height:1.8;color:#625550}.note{margin:8px 0 0;border-radius:7px;background:#f8f5f3;padding:8px 10px;font-size:9px;line-height:1.7;color:#8c7e79}.products-section{padding:18px 20px}.products-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.products-title h3{margin:0;font-size:12px;color:#514540}.products-title span{font-size:9px;color:#a0938e}.product{padding:12px 0}.product.with-border{border-bottom:1px solid #f0e8e5}.product-main{display:flex;align-items:center;gap:12px}.product-image{width:64px;height:64px;flex:0 0 64px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #eee7e4;border-radius:9px;background:#f7f5f3;padding:4px}.product-image img{width:100%;height:100%;object-fit:contain;object-position:center}.product-info{min-width:0;flex:1}.product-info h4{margin:0;font-size:12px;font-weight:700;color:#4a3e3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta{display:flex;flex-wrap:wrap;align-items:center;gap:5px 8px;margin-top:7px;font-size:9px;color:#948681}.meta i{font-style:normal;color:#d2c8c4}.product-info p{margin:7px 0 0;font-size:9px;color:#a0938e}.line-total{flex:0 0 auto;font-size:12px;color:#a95b61}.accessories{margin:10px 76px 0 0;border-radius:9px;background:#faf8f7;padding:10px 12px}.accessories-title{margin:0 0 8px;font-size:9px;font-weight:600;color:#9b8d88}.accessory-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0}.accessory-row strong{display:block;font-size:9px;color:#685a55}.accessory-row small{display:block;margin-top:3px;font-size:8px;color:#a0938e}.accessory-row>span{font-size:9px;font-weight:600;color:#a95b61}.empty{text-align:center;padding:28px 10px;color:#a0938e;font-size:11px}.totals-section{border-top:1px solid #eee5e1;background:#fffcfb;padding:17px 20px}.summary-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:5px 0;font-size:10px;color:#746661}.summary-row.discount{font-weight:600;color:#5f8066}.coupon{margin-right:6px;border-radius:4px;background:#eaf4ec;padding:2px 6px;font:600 8px ui-monospace,SFMono-Regular,Menlo,monospace;color:#58735d}.grand-total{display:flex;align-items:flex-end;justify-content:space-between;border-top:1px solid #e8dfdb;margin-top:12px;padding-top:14px}.grand-total strong{font-size:12px;color:#514540}.grand-total small{display:block;margin-top:3px;font-size:8px;font-weight:400;color:#a99c97}.grand-total span{font-size:22px;font-weight:800;color:#b86168}.payment-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;border-top:1px solid #eee5e1;margin-top:14px;padding-top:12px}.payment-item{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:9px;color:#9a8c87}.payment-item strong{font-size:10px;color:#5d504b}.stamp{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid #eee5e1;padding:12px 20px}.stamp-left{display:flex;align-items:center;gap:6px;font-size:8px;color:#9b8d88}.check{display:flex;width:14px;height:14px;align-items:center;justify-content:center;border-radius:50%;background:#edf7ee;color:#6e9274;font-size:10px;font-weight:800}.stamp-brand{font-size:8px;letter-spacing:.08em;color:#b5aaa6}.actions{margin-top:14px}.print-btn{width:100%;height:44px;border:1px solid #e5dad6;border-radius:10px;background:white;color:#655752;font-size:11px;font-weight:700;cursor:pointer}.print-btn:active{background:#faf8f7}@media(max-width:600px){.page{padding:16px 10px 32px}.invoice-head{padding:15px 14px}.logo{height:48px}.status-cell,.customer-block,.products-section,.totals-section{padding-left:14px;padding-right:14px}.customer-grid{grid-template-columns:1fr}.customer-block:first-child{border-left:0;border-bottom:1px solid #eee5e1}.product-main{gap:10px}.product-image{width:58px;height:58px;flex-basis:58px}.accessories{margin-right:68px}.payment-row{grid-template-columns:1fr}.grand-total span{font-size:19px}.stamp{padding-left:14px;padding-right:14px}}@media print{html,body{background:white}.page{max-width:none;padding:0}.invoice{border:0;border-radius:0}.actions{display:none}.product,.customer-block,.totals-section{break-inside:avoid}}
</style></head><body><main class="page"><div class="invoice"><div class="invoice-head"><div><img class="logo" src="${escapeHtml(logo)}" alt="Flamingo Park"><p class="invoice-caption">فاتورة طلب Flamingo Park</p></div><div class="order-side"><p class="overline">ORDER NUMBER</p><p class="order-number">${escapeHtml(order.order_number)}</p><p class="date">${escapeHtml(date)}</p></div></div><div class="status-grid"><div class="status-cell"><div class="mini-label"><span class="mini-dot"></span><span>حالة الطلب</span></div><p class="status-value">${escapeHtml(statusLabel(order.status))}</p></div><div class="status-cell"><div class="mini-label"><span class="mini-dot"></span><span>شركة التوصيل</span></div><p class="delivery-value">${escapeHtml(deliveryCompany)}</p></div></div><div class="customer-grid"><div class="customer-block"><p class="section-label">معلومات العميل</p><p class="customer-name">${escapeHtml(order.customer_name || "—")}</p><p class="phone">${escapeHtml(order.customer_phone || "—")}</p></div><div class="customer-block"><p class="section-label">عنوان التوصيل</p><p class="address">${address}</p>${order.customer_notes ? `<p class="note">ملاحظة: ${escapeHtml(order.customer_notes)}</p>` : ""}</div></div><div class="products-section"><div class="products-title"><h3>المنتجات</h3><span>${items.length.toLocaleString("ar-EG")} ${items.length === 1 ? "منتج" : "منتجات"}</span></div>${itemRows}</div><div class="totals-section"><div class="summary-row"><span>المجموع الفرعي</span><span>${escapeHtml(money(subtotal, symbol))}</span></div><div class="summary-row"><span>رسوم التوصيل (${escapeHtml(deliveryCompany)})</span><span>${escapeHtml(money(deliveryFee, symbol))}</span></div>${discount > 0 ? `<div class="summary-row discount"><span>الخصم${order.coupon_code ? `<span class="coupon">${escapeHtml(order.coupon_code)}</span>` : ""}</span><span>-${escapeHtml(money(discount, symbol))}</span></div>` : ""}<div class="grand-total"><div><strong>الإجمالي</strong><small>الإجمالي النهائي للطلب</small></div><span>${escapeHtml(money(total, symbol))}</span></div><div class="payment-row"><div class="payment-item"><span>طريقة الدفع</span><strong>${escapeHtml(paymentLabel(order.payment_method))}</strong></div>${order.customer_region ? `<div class="payment-item"><span>منطقة الاستلام</span><strong>${escapeHtml(order.customer_region)}</strong></div>` : ""}</div></div><div class="stamp"><div class="stamp-left"><span class="check">✓</span><span>تم إنشاء الطلب إلكترونياً</span></div><span class="stamp-brand">FLAMINGO PARK</span></div></div><div class="actions"><button class="print-btn" onclick="window.print()">طباعة أو حفظ الفاتورة PDF</button></div></main></body></html>`;
};

const openAccountInvoice = async (orderNumber: string) => {
  const invoiceWindow = window.open("", "_blank");
  if (!invoiceWindow) return;

  invoiceWindow.opener = null;
  invoiceWindow.document.open();
  invoiceWindow.document.write(loadingHtml);
  invoiceWindow.document.close();

  try {
    const { data, error } = await (supabase as any)
      .from("orders")
      .select("id,order_number,customer_name,customer_phone,customer_address,customer_city,customer_region,customer_notes,items,subtotal,delivery_fee,discount_amount,coupon_code,total,payment_method,status,delivery_company_id,currency_code,currency_mode,created_at")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (error || !data) throw error || new Error("Invoice unavailable");

    const order = data as AccountInvoiceOrder;
    let deliveryCompany = "شركة التوصيل";

    if (order.delivery_company_id) {
      const { data: company } = await (supabase as any)
        .from("delivery_companies")
        .select("name")
        .eq("id", order.delivery_company_id)
        .maybeSingle();

      if (company?.name) deliveryCompany = String(company.name);
    }

    invoiceWindow.document.open();
    invoiceWindow.document.write(buildInvoiceHtml(order, deliveryCompany));
    invoiceWindow.document.close();
  } catch {
    invoiceWindow.document.open();
    invoiceWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تعذر فتح الفاتورة</title><style>body{margin:0;background:#fffdfc;color:#514540;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Tahoma,Arial,sans-serif}.box{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{max-width:380px;border:1px solid #eaded9;border-radius:16px;background:white;padding:24px;text-align:center}.card h1{font-size:17px;margin:0;color:#a95b61}.card p{font-size:11px;line-height:1.8;color:#8c7e79}</style></head><body><div class="box"><div class="card"><h1>تعذر فتح الفاتورة</h1><p>تحقق من اتصال الإنترنت ثم أغلق هذه النافذة وحاول مرة أخرى.</p></div></div></body></html>`);
    invoiceWindow.document.close();
  }
};

if (typeof document !== "undefined") {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("#account-orders button");
    if (!(button instanceof HTMLButtonElement)) return;
    if (!button.textContent?.includes("عرض الفاتورة")) return;

    const row = button.closest("#account-orders [class*='justify-between']");
    const orderNumber = row?.querySelector("p")?.textContent?.trim() || "";
    if (!orderNumber) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void openAccountInvoice(orderNumber);
  }, true);
}
