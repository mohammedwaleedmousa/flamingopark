import { supabase } from "@/integrations/supabase/client";
import { exportXlsx, type XlsxColumn } from "@/lib/xlsxExport";

const db = supabase as any;
const BATCH_SIZE = 1000;

type ExportDefinition = {
  filename: string;
  sheetName: string;
  columns: XlsxColumn[];
  loadRows: () => Promise<Array<Record<string, unknown>>>;
};

const text = (value: unknown) => value == null ? "" : String(value);
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const boolLabel = (value: unknown) => value === true ? "نعم" : value === false ? "لا" : "";
const dateLabel = (value: unknown) => {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return text(value);
  return date.toLocaleString("ar-YE", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const first = (row: Record<string, any>, keys: string[]) => {
  for (const key of keys) if (row?.[key] != null && row[key] !== "") return row[key];
  return "";
};

const statusLabel = (status: unknown) => {
  const key = text(status).toLowerCase();
  const labels: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
    canceled: "ملغي",
    approved: "مقبول",
    rejected: "مرفوض",
    completed: "مكتمل",
    refunded: "مسترد",
  };
  return labels[key] || text(status);
};

const paymentLabel = (payment: unknown) => {
  const key = text(payment).toLowerCase();
  const labels: Record<string, string> = {
    cod: "الدفع عند الاستلام",
    cash: "نقدًا",
    bank: "تحويل بنكي",
    bank_transfer: "تحويل بنكي",
    transfer: "تحويل بنكي",
    card: "بطاقة",
    mada: "مدى",
    apple_pay: "Apple Pay",
  };
  return labels[key] || text(payment);
};

const fetchAll = async (table: string, select = "*") => {
  const rows: any[] = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await db.from(table).select(select).range(from, from + BATCH_SIZE - 1);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }
  return rows;
};

const itemSummary = (items: unknown) => {
  if (!Array.isArray(items)) return "";
  return items.map((item: any) => {
    const name = item?.product_name || item?.name || "منتج";
    const qty = Math.max(1, Number(item?.quantity || 1));
    const extras = [item?.selected_color, item?.selected_size].filter(Boolean).join(" / ");
    return `${name} × ${qty}${extras ? ` (${extras})` : ""}`;
  }).join(" | ");
};

const itemCount = (items: unknown) => Array.isArray(items)
  ? items.reduce((sum, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0)
  : 0;

const orderColumns: XlsxColumn[] = [
  { key: "order_number", header: "رقم الطلب", width: 18 },
  { key: "customer_name", header: "اسم العميل", width: 24 },
  { key: "customer_phone", header: "رقم الهاتف", width: 18 },
  { key: "location", header: "المدينة / المنطقة", width: 22 },
  { key: "address", header: "العنوان", width: 34 },
  { key: "country", header: "الدولة", width: 12 },
  { key: "status", header: "حالة الطلب", width: 18 },
  { key: "payment", header: "طريقة الدفع", width: 20 },
  { key: "items_count", header: "عدد القطع", width: 12 },
  { key: "items", header: "المنتجات", width: 48 },
  { key: "subtotal", header: "المجموع الفرعي", width: 16 },
  { key: "delivery_fee", header: "رسوم التوصيل", width: 15 },
  { key: "discount", header: "الخصم", width: 13 },
  { key: "total", header: "الإجمالي", width: 16 },
  { key: "currency", header: "العملة", width: 14 },
  { key: "coupon", header: "القسيمة", width: 14 },
  { key: "created_at", header: "تاريخ الطلب", width: 22 },
];

const mapOrder = (order: Record<string, any>) => ({
  order_number: first(order, ["order_number", "id"]),
  customer_name: first(order, ["customer_name", "name"]),
  customer_phone: text(first(order, ["customer_phone", "phone"])),
  location: first(order, ["customer_region", "customer_city", "region", "city"]),
  address: first(order, ["customer_address", "address"]),
  country: first(order, ["country"]),
  status: statusLabel(order.status),
  payment: paymentLabel(first(order, ["payment_method", "payment"])),
  items_count: itemCount(order.items),
  items: itemSummary(order.items),
  subtotal: number(order.subtotal),
  delivery_fee: number(order.delivery_fee),
  discount: number(first(order, ["discount_amount", "discount"])),
  total: number(order.total),
  currency: first(order, ["currency_mode", "currency_code"]),
  coupon: first(order, ["coupon_code"]),
  created_at: dateLabel(order.created_at),
});

const customersDefinition = (): ExportDefinition => ({
  filename: `flamingo-customers-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "العملاء",
  columns: [
    { key: "name", header: "اسم العميل", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "email", header: "البريد الإلكتروني", width: 28 },
    { key: "country", header: "الدولة", width: 13 },
    { key: "city", header: "المدينة", width: 18 },
    { key: "region", header: "المنطقة", width: 18 },
    { key: "address", header: "العنوان", width: 34 },
    { key: "active", header: "الحساب نشط", width: 13 },
    { key: "created_at", header: "تاريخ التسجيل", width: 22 },
    { key: "last_login", header: "آخر دخول", width: 22 },
  ],
  loadRows: async () => (await fetchAll("customers")).map((row) => ({
    name: first(row, ["name", "full_name"]),
    phone: text(first(row, ["phone", "mobile"])),
    email: first(row, ["email"]),
    country: first(row, ["country"]),
    city: first(row, ["city"]),
    region: first(row, ["region"]),
    address: first(row, ["address"]),
    active: row.is_active == null ? "" : boolLabel(row.is_active),
    created_at: dateLabel(row.created_at),
    last_login: dateLabel(first(row, ["last_login_at", "last_seen_at", "updated_at"])),
  })),
});

const ordersDefinition = (): ExportDefinition => ({
  filename: `flamingo-orders-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "الطلبات",
  columns: orderColumns,
  loadRows: async () => (await fetchAll("orders")).map(mapOrder),
});

const customerDetailDefinition = (id: string): ExportDefinition => ({
  filename: `flamingo-customer-${id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "سجل العميل",
  columns: orderColumns,
  loadRows: async () => {
    const { data: customer, error } = await db.from("customers").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    const query = db.from("orders").select("*").eq("customer_id", id).range(0, 4999);
    const { data: orders, error: ordersError } = await query;
    if (ordersError) throw ordersError;
    if ((orders || []).length) return orders.map(mapOrder);
    return customer ? [{
      order_number: "—",
      customer_name: first(customer, ["name", "full_name"]),
      customer_phone: text(first(customer, ["phone", "mobile"])),
      location: first(customer, ["region", "city"]),
      address: first(customer, ["address"]),
      country: first(customer, ["country"]),
      status: "لا توجد طلبات",
      payment: "",
      items_count: 0,
      items: "",
      subtotal: 0,
      delivery_fee: 0,
      discount: 0,
      total: 0,
      currency: "",
      coupon: "",
      created_at: dateLabel(customer.created_at),
    }] : [];
  },
});

const invoiceDefinition = (): ExportDefinition => ({
  filename: `flamingo-invoices-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "الفواتير",
  columns: [
    { key: "invoice", header: "رقم الفاتورة", width: 20 },
    { key: "order", header: "رقم الطلب", width: 18 },
    { key: "customer", header: "العميل", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "status", header: "الحالة", width: 16 },
    { key: "subtotal", header: "المجموع الفرعي", width: 16 },
    { key: "tax", header: "الضريبة", width: 13 },
    { key: "discount", header: "الخصم", width: 13 },
    { key: "total", header: "الإجمالي", width: 16 },
    { key: "currency", header: "العملة", width: 13 },
    { key: "created_at", header: "تاريخ الفاتورة", width: 22 },
  ],
  loadRows: async () => {
    const [invoices, orders] = await Promise.all([fetchAll("invoices"), fetchAll("orders")]);
    const orderMap = new Map(orders.map((order) => [order.id, order]));
    return invoices.map((invoice) => {
      const order = orderMap.get(invoice.order_id) || {};
      return {
        invoice: first(invoice, ["invoice_number", "number", "id"]),
        order: first(order, ["order_number"]) || first(invoice, ["order_number", "order_id"]),
        customer: first(invoice, ["customer_name"]) || first(order, ["customer_name"]),
        phone: text(first(invoice, ["customer_phone"]) || first(order, ["customer_phone"])),
        status: statusLabel(first(invoice, ["status"])),
        subtotal: number(first(invoice, ["subtotal"]) || first(order, ["subtotal"])),
        tax: number(first(invoice, ["tax_amount", "tax"])),
        discount: number(first(invoice, ["discount_amount", "discount"]) || first(order, ["discount_amount"])),
        total: number(first(invoice, ["total", "amount"]) || first(order, ["total"])),
        currency: first(invoice, ["currency_code", "currency_mode"]) || first(order, ["currency_code", "currency_mode"]),
        created_at: dateLabel(first(invoice, ["created_at", "issued_at"])),
      };
    });
  },
});

const refundsDefinition = (): ExportDefinition => ({
  filename: `flamingo-refunds-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "المرتجعات",
  columns: [
    { key: "order", header: "رقم الطلب", width: 18 },
    { key: "customer", header: "اسم العميل", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "amount", header: "المبلغ", width: 15 },
    { key: "status", header: "الحالة", width: 16 },
    { key: "reason", header: "سبب الإرجاع", width: 36 },
    { key: "method", header: "طريقة الاسترداد", width: 20 },
    { key: "created_at", header: "التاريخ", width: 22 },
  ],
  loadRows: async () => {
    const [refunds, orders, customers] = await Promise.all([fetchAll("refunds"), fetchAll("orders"), fetchAll("customers")]);
    const orderMap = new Map(orders.map((row) => [row.id, row]));
    const customerMap = new Map(customers.map((row) => [row.id, row]));
    return refunds.map((refund) => {
      const order = orderMap.get(refund.order_id) || {};
      const customer = customerMap.get(refund.customer_id) || {};
      return {
        order: first(order, ["order_number"]) || first(refund, ["order_number", "order_id"]),
        customer: first(refund, ["customer_name"]) || first(order, ["customer_name"]) || first(customer, ["name"]),
        phone: text(first(refund, ["customer_phone"]) || first(order, ["customer_phone"]) || first(customer, ["phone"])),
        amount: number(first(refund, ["amount", "refund_amount"])),
        status: statusLabel(refund.status),
        reason: first(refund, ["reason", "notes", "description"]),
        method: paymentLabel(first(refund, ["refund_method", "payment_method", "method"])),
        created_at: dateLabel(refund.created_at),
      };
    });
  },
});

const reviewsDefinition = (): ExportDefinition => ({
  filename: `flamingo-reviews-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "تقييمات العملاء",
  columns: [
    { key: "customer", header: "اسم العميل", width: 24 },
    { key: "product", header: "المنتج", width: 30 },
    { key: "rating", header: "التقييم", width: 11 },
    { key: "comment", header: "التعليق", width: 48 },
    { key: "country", header: "الدولة", width: 12 },
    { key: "approved", header: "معتمد", width: 12 },
    { key: "images", header: "عدد الصور", width: 12 },
    { key: "created_at", header: "التاريخ", width: 22 },
  ],
  loadRows: async () => {
    const [reviews, products] = await Promise.all([fetchAll("product_reviews"), fetchAll("products", "id,name,name_ar")]);
    const productMap = new Map(products.map((product) => [product.id, product.name_ar || product.name || product.id]));
    return reviews.map((review) => ({
      customer: first(review, ["customer_name", "name"]),
      product: productMap.get(review.product_id) || review.product_id || "",
      rating: number(review.rating),
      comment: first(review, ["comment", "review"]),
      country: first(review, ["country"]),
      approved: boolLabel(review.is_approved),
      images: Array.isArray(review.images) ? review.images.length : 0,
      created_at: dateLabel(review.created_at),
    }));
  },
});

const notificationsDefinition = (): ExportDefinition => ({
  filename: `flamingo-customer-notifications-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "إشعارات العملاء",
  columns: [
    { key: "customer", header: "العميل", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "title", header: "عنوان الإشعار", width: 28 },
    { key: "message", header: "نص الإشعار", width: 50 },
    { key: "read", header: "تمت القراءة", width: 13 },
    { key: "created_at", header: "التاريخ", width: 22 },
  ],
  loadRows: async () => {
    const [notifications, customers] = await Promise.all([fetchAll("customer_notifications"), fetchAll("customers")]);
    const customerMap = new Map(customers.map((row) => [row.id, row]));
    return notifications.map((notification) => {
      const customer = customerMap.get(notification.customer_id) || {};
      return {
        customer: first(customer, ["name", "full_name"]) || first(notification, ["customer_name"]),
        phone: text(first(customer, ["phone"]) || first(notification, ["customer_phone"])),
        title: first(notification, ["title", "subject"]),
        message: first(notification, ["message", "body", "content"]),
        read: notification.is_read == null ? "" : boolLabel(notification.is_read),
        created_at: dateLabel(notification.created_at),
      };
    });
  },
});

const deliveriesDefinition = (): ExportDefinition => ({
  filename: `flamingo-notification-deliveries-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "سجل الإرسال",
  columns: [
    { key: "recipient", header: "المستلم", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "channel", header: "القناة", width: 14 },
    { key: "status", header: "حالة الإرسال", width: 16 },
    { key: "title", header: "الإشعار", width: 30 },
    { key: "error", header: "سبب الفشل", width: 38 },
    { key: "created_at", header: "التاريخ", width: 22 },
  ],
  loadRows: async () => (await fetchAll("notification_deliveries")).map((row) => ({
    recipient: first(row, ["customer_name", "recipient_name", "recipient"]),
    phone: text(first(row, ["customer_phone", "phone", "recipient_phone"])),
    channel: first(row, ["channel", "provider", "type"]),
    status: statusLabel(first(row, ["status", "delivery_status"])),
    title: first(row, ["title", "notification_title", "subject"]),
    error: first(row, ["error_message", "error", "failure_reason"]),
    created_at: dateLabel(first(row, ["created_at", "sent_at"])),
  })),
});

const customerAnalysisDefinition = (): ExportDefinition => ({
  filename: `flamingo-customer-analysis-${new Date().toISOString().slice(0, 10)}`,
  sheetName: "تحليل العملاء",
  columns: [
    { key: "name", header: "اسم العميل", width: 24 },
    { key: "phone", header: "رقم الهاتف", width: 18 },
    { key: "city", header: "المدينة / المنطقة", width: 22 },
    { key: "country", header: "الدولة", width: 12 },
    { key: "orders", header: "عدد الطلبات", width: 13 },
    { key: "spent", header: "إجمالي الإنفاق", width: 17 },
    { key: "aov", header: "متوسط الطلب", width: 16 },
    { key: "last_order", header: "آخر طلب", width: 22 },
    { key: "segment", header: "الشريحة", width: 16 },
  ],
  loadRows: async () => {
    const [customers, orders] = await Promise.all([fetchAll("customers"), fetchAll("orders")]);
    const activeOrders = orders.filter((order) => !["cancelled", "canceled"].includes(text(order.status).toLowerCase()));
    const byCustomer = new Map<string, any[]>();
    activeOrders.forEach((order) => {
      const key = text(order.customer_id || order.customer_phone || order.customer_name || order.id);
      const list = byCustomer.get(key) || [];
      list.push(order);
      byCustomer.set(key, list);
    });

    return customers.map((customer) => {
      const keys = [text(customer.id), text(customer.phone)].filter(Boolean);
      const customerOrders = keys.flatMap((key) => byCustomer.get(key) || []);
      const uniqueOrders = Array.from(new Map(customerOrders.map((order) => [order.id, order])).values());
      const spent = uniqueOrders.reduce((sum, order) => sum + number(order.total_base ?? order.total), 0);
      const last = uniqueOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const count = uniqueOrders.length;
      const segment = count >= 6 || spent >= 8000 ? "VIP" : count >= 2 || spent >= 2000 ? "متوسط" : "عادي";
      return {
        name: first(customer, ["name", "full_name"]),
        phone: text(first(customer, ["phone", "mobile"])),
        city: first(customer, ["region", "city", "address"]),
        country: first(customer, ["country"]),
        orders: count,
        spent,
        aov: count ? Math.round((spent / count) * 100) / 100 : 0,
        last_order: dateLabel(last?.created_at),
        segment,
      };
    });
  },
});

export const getAdminExportDefinition = (pathname: string): ExportDefinition | null => {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin/orders") return ordersDefinition();
  if (path === "/admin/customers") return customersDefinition();
  if (/^\/admin\/customers\/[^/]+$/.test(path)) return customerDetailDefinition(path.split("/").pop() || "");
  if (path === "/admin/invoices") return invoiceDefinition();
  if (path === "/admin/refunds") return refundsDefinition();
  if (path === "/admin/reviews") return reviewsDefinition();
  if (path === "/admin/customer-notifications") return notificationsDefinition();
  if (path === "/admin/notification-deliveries") return deliveriesDefinition();
  if (path === "/admin/reports/customers") return customerAnalysisDefinition();
  return null;
};

export const exportAdminPageData = async (pathname: string) => {
  const definition = getAdminExportDefinition(pathname);
  if (!definition) throw new Error("هذه الصفحة لا تحتوي على تصدير بيانات عملاء");
  const rows = await definition.loadRows();
  exportXlsx({ filename: definition.filename, sheetName: definition.sheetName, columns: definition.columns, rows });
  return rows.length;
};
