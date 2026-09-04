import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Bell, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Clock3, Copy, CreditCard, ExternalLink, Eye, FileText, Hash, Loader2, MapPin, MapPinned, MessageCircle, Package, PackageCheck, Percent, Phone, Receipt, ShoppingBag, Tag, Truck, User, Wallet, X, type LucideIcon } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

/* =========================================================
   TYPES
========================================================= */

interface Customer {
  id: string;
  name: string;
  phone: string;
  country: string | null;
  region: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  product_id?: string;
  product_name?: string;
  name?: string;
  product_image?: string;
  image?: string;
  price?: number;
  quantity?: number;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: any[];
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  country: string;
  items: OrderItem[] | any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_company_id: string | null;
  payment_method: string;
  status: string;
  invoice_url: string | null;
  created_at: string;
  updated_at: string;
  coupon_code: string | null;
  discount_amount: number | null;
  customer_city: string | null;
  currency_mode: string;
  currency_code: string | null;
  exchange_rate_snapshot: number | null;
  total_base: number | null;
  tracking_token: string | null;
  customer_region: string | null;
}

interface Notification {
  id: string;
  user_id?: string | null;
  title: string;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  is_read?: boolean | null;
  broadcast?: boolean | null;
  related_order_id?: string | null;
  customer_id?: string | null;
  customer_phone?: string | null;
  country?: string | null;
  link?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface DeliveryCompany {
  id: string;
  name: string;
  country: string | null;
  base_fee: number | null;
  delivery_days: string | null;
  is_active: boolean | null;
}

/* =========================================================
   STATUS
========================================================= */

const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  pending: {
    label: "قيد الانتظار",
    className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]",
    dot: "bg-[#C38838]",
  },
  confirmed: {
    label: "مؤكد",
    className: "border-[#DCE7F5] bg-[#F1F6FC] text-[#5679A4]",
    dot: "bg-[#5680CF]",
  },
  processing: {
    label: "قيد التجهيز",
    className: "border-[#E2DDF2] bg-[#F5F2FF] text-[#675CBA]",
    dot: "bg-[#675CBA]",
  },
  shipped: {
    label: "تم الشحن",
    className: "border-[#D5E8EE] bg-[#EFF8FB] text-[#4A879B]",
    dot: "bg-[#4A90A6]",
  },
  delivered: {
    label: "تم التوصيل",
    className: "border-[#D7E8DC] bg-[#EFF8F2] text-[#568468]",
    dot: "bg-[#629067]",
  },
  cancelled: {
    label: "ملغي",
    className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]",
    dot: "bg-[#D06A5E]",
  },
  canceled: {
    label: "ملغي",
    className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]",
    dot: "bg-[#D06A5E]",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (value?: string | null, withTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ar-EG", withTime ? {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } : {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const countryLabel = (country?: string | null) => {
  const value = String(country || "").toUpperCase();

  if (value === "SA" || value === "SAUDI" || value === "SAUDI ARABIA") return "السعودية";
  if (value === "YE" || value === "YEMEN") return "اليمن";

  return country || "غير محدد";
};

const paymentLabel = (method?: string | null) => {
  const value = String(method || "").toLowerCase();

  const map: Record<string, string> = {
    cod: "الدفع عند الاستلام",
    cash: "نقدًا",
    bank: "تحويل بنكي",
    bank_transfer: "تحويل بنكي",
    transfer: "تحويل بنكي",
    card: "بطاقة",
    mada: "مدى",
    apple_pay: "Apple Pay",
  };

  return map[value] || method || "غير محدد";
};

const currencySymbol = (order: Order) => {
  if (order.currency_mode === "SAR" || String(order.currency_code || "").toUpperCase() === "SAR") return "ر.س";

  return "ر.ي";
};

const formatNativeAmount = (amount: number, order: Order) => {
  return `${Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currencySymbol(order)}`;
};

const orderBaseTotal = (order: Order) => Number(order.total_base ?? order.total ?? 0);

const itemsOf = (order: Order): OrderItem[] => Array.isArray(order.items) ? order.items : [];

const itemsCount = (order: Order) => itemsOf(order).reduce((sum, item) => sum + Math.max(1, Number(item.quantity || 1)), 0);

const itemName = (item: OrderItem) => item.product_name || item.name || "منتج";

const itemImage = (item: OrderItem) => item.product_image || item.image || "";

const uniq = (values: Array<string | null | undefined>) => Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));

/* =========================================================
   PAGE
========================================================= */

const AdminCustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format: formatCurrency } = useCurrency();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) return;

    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const { data: customerData, error: customerError } = await supabase.from("customers").select("id,name,phone,country,region,avatar_url,created_at,updated_at").eq("id", id).maybeSingle();

        if (customerError) throw customerError;
        if (!active) return;

        const resolvedCustomer = customerData as Customer | null;

        setCustomer(resolvedCustomer);

        if (!resolvedCustomer) {
          setOrders([]);
          setNotifications([]);
          return;
        }

        const [ordersResult, notificationsResult, deliveryResult] = await Promise.all([
          supabase.from("orders").select("*").or(`customer_id.eq.${resolvedCustomer.id},customer_phone.eq.${resolvedCustomer.phone}`).order("created_at", { ascending: false }),
          (supabase as any).from("customer_notifications").select("*").or(`customer_id.eq.${resolvedCustomer.id},customer_phone.eq.${resolvedCustomer.phone}`).order("created_at", { ascending: false }),
          supabase.from("delivery_companies").select("id,name,country,base_fee,delivery_days,is_active"),
        ]);

        if (!active) return;

        if (ordersResult.error) console.error("Customer orders error:", ordersResult.error);
        if (notificationsResult.error) console.error("Customer notifications error:", notificationsResult.error);
        if (deliveryResult.error) console.error("Delivery companies error:", deliveryResult.error);

        setOrders((ordersResult.data || []) as Order[]);
        setNotifications((notificationsResult.data || []) as Notification[]);
        setDeliveryCompanies((deliveryResult.data || []) as DeliveryCompany[]);
      } catch (error: any) {
        console.error("Customer detail load error:", error);
        toast.error(error?.message ? `فشل تحميل البيانات: ${error.message}` : "فشل تحميل بيانات العميل");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  const deliveryMap = useMemo(() => new Map(deliveryCompanies.map((company) => [company.id, company])), [deliveryCompanies]);

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + orderBaseTotal(order), 0), [orders]);

  const deliveredOrders = useMemo(() => orders.filter((order) => String(order.status || "").toLowerCase() === "delivered").length, [orders]);

  const cancelledOrders = useMemo(() => orders.filter((order) => ["cancelled", "canceled"].includes(String(order.status || "").toLowerCase())).length, [orders]);

  const activeOrders = useMemo(() => orders.filter((order) => !["delivered", "cancelled", "canceled"].includes(String(order.status || "").toLowerCase())).length, [orders]);

  const averageOrder = orders.length > 0 ? totalSpent / orders.length : 0;

  const totalItems = useMemo(() => orders.reduce((sum, order) => sum + itemsCount(order), 0), [orders]);

  const unreadNotifications = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);

  const addresses = useMemo(() => uniq(orders.map((order) => order.customer_address)), [orders]);

  const cities = useMemo(() => uniq(orders.map((order) => order.customer_city)), [orders]);

  const regions = useMemo(() => uniq([customer?.region, ...orders.map((order) => order.customer_region)]), [customer?.region, orders]);
  const paymentMethods = useMemo(() => {
    const map = new Map<string, number>();

    orders.forEach((order) => {
      const label = paymentLabel(order.payment_method);
      map.set(label, (map.get(label) || 0) + 1);
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  const favoritePayment = paymentMethods[0]?.[0] || "—";

  const latestOrder = orders[0] || null;

  const normalizeWhatsAppPhone = () => {
    if (!customer) return "";

    let phone = String(customer.phone || "").replace(/\D/g, "");

    if (phone.startsWith("00")) phone = phone.slice(2);
    if (phone.startsWith("967") || phone.startsWith("966")) return phone;
    if (phone.startsWith("0")) phone = phone.slice(1);

    if (String(customer.country || "").toUpperCase() === "SA") return `966${phone}`;

    return `967${phone}`;
  };

  const openWhatsApp = () => {
    if (!customer) return;

    const phone = normalizeWhatsAppPhone();
    const message = `مرحباً ${customer.name || ""}، معك فريق Flamingo Park`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`تم نسخ ${label}`);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" strokeWidth={1.8} />
          </div>
          <p className="mt-3 text-[8px] font-medium text-[#969DA7]">جاري تحميل ملف العميل الكامل...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex min-h-[430px] items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
            <User className="h-[19px] w-[19px]" />
          </div>
          <h2 className="mt-3 text-[12px] font-semibold text-[#4A525C]">لم يتم العثور على العميل</h2>
          <button type="button" onClick={() => navigate("/admin/customers")} className="mt-4 inline-flex h-[36px] items-center gap-[6px] rounded-[9px] bg-[#675CBA] px-4 text-[8px] font-semibold text-white">
            <ArrowRight className="h-[11px] w-[11px]" />
            العودة للعملاء
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          BACK
      ===================================================== */}

      <button type="button" onClick={() => navigate("/admin/customers")} className="inline-flex h-[32px] items-center gap-[6px] rounded-[8px] border border-[#E4E8ED] bg-white px-[9px] text-[7.5px] font-semibold text-[#737B86] transition-colors hover:bg-[#F8FAFC] hover:text-[#4D5560]">
        <ArrowRight className="h-[11px] w-[11px]" />
        العودة للعملاء
      </button>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader
        category="ملف العميل"
        title={customer.name || "عميل"}
        description={`عميل منذ ${formatDate(customer.created_at)} • آخر تحديث ${formatDate(customer.updated_at)}`}
        actions={[
          { label: "إرسال إشعار", icon: Bell, href: `/admin/customer-notifications?customerId=${customer.id}`, variant: "primary" },
          { label: "واتساب", icon: MessageCircle, onClick: openWhatsApp, variant: "outline" },
        ]}
      />

      {/* =====================================================
          METRICS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <MetricCard title="إجمالي الإنفاق" value={formatCurrency(totalSpent)} helper="القيمة الأساسية للطلبات" icon={Wallet} tone="indigo" />
        <MetricCard title="إجمالي الطلبات" value={orders.length.toLocaleString("en-US")} helper={`${totalItems} قطعة تم طلبها`} icon={ShoppingBag} tone="blue" />
        <MetricCard title="تم توصيلها" value={deliveredOrders.toLocaleString("en-US")} helper={`${activeOrders} طلب قيد التنفيذ`} icon={PackageCheck} tone="green" />
        <MetricCard title="متوسط الطلب" value={formatCurrency(averageOrder)} helper={`${cancelledOrders} طلب ملغي`} icon={Receipt} tone="coral" />
      </section>

      {/* =====================================================
          CUSTOMER DATA + ORDERS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-12">
        <div className="space-y-[10px] xl:col-span-4">
          {/* PROFILE */}

          <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
            <div className="relative border-b border-[#EDF0F3] px-[14px] py-[15px]">
              <span className="absolute inset-x-0 top-0 h-[3px] bg-[#675CBA]" />

              <div className="flex items-center gap-[11px]">
                <CustomerAvatar customer={customer} />

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[12px] font-semibold text-[#343B45]">{customer.name || "عميل"}</h2>
                  <p dir="ltr" className="mt-[4px] truncate text-right text-[8px] text-[#89919C]">{customer.phone}</p>
                </div>

                <span className="inline-flex h-[24px] items-center gap-[5px] rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[7px] text-[6.5px] font-semibold text-[#568468]">
                  <span className="h-[5px] w-[5px] rounded-full bg-[#629067]" />
                  نشط
                </span>
              </div>
            </div>

            <div className="space-y-[2px] p-[9px]">
              <ProfileRow icon={User} label="الاسم الكامل" value={customer.name || "—"} />
              <ProfileRow icon={Phone} label="رقم الهاتف" value={customer.phone || "—"} ltr copy={() => void copyValue(customer.phone, "رقم الهاتف")} />
              <ProfileRow icon={MapPin} label="الدولة" value={countryLabel(customer.country)} />
              <ProfileRow icon={MapPinned} label="المنطقة المسجلة" value={customer.region || "غير محددة"} />
              <ProfileRow icon={CalendarDays} label="تاريخ إنشاء الحساب" value={formatDate(customer.created_at, true)} />
              <ProfileRow icon={Clock3} label="آخر تحديث للحساب" value={formatDate(customer.updated_at, true)} />
              <ProfileRow icon={Hash} label="معرف العميل" value={customer.id} ltr copy={() => void copyValue(customer.id, "معرف العميل")} />
            </div>

            <div className="grid grid-cols-2 gap-[6px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[8px]">
              <button type="button" onClick={openWhatsApp} className="flex h-[36px] items-center justify-center gap-[6px] rounded-[9px] border border-[#D9E9DE] bg-white text-[8px] font-semibold text-[#57906A] transition-colors hover:bg-[#F2F9F4]">
                <MessageCircle className="h-[12px] w-[12px]" />
                واتساب
              </button>

              <button type="button" onClick={() => navigate(`/admin/customer-notifications?customerId=${customer.id}`)} className="flex h-[36px] items-center justify-center gap-[6px] rounded-[9px] border border-[#E2DEF3] bg-white text-[8px] font-semibold text-[#675CBA] transition-colors hover:bg-[#F6F4FF]">
                <Bell className="h-[12px] w-[12px]" />
                إشعار
              </button>
            </div>
          </div>

          {/* CUSTOMER INSIGHTS */}

          <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <SectionTitle icon={CircleDollarSign} title="ملخص نشاط العميل" description="قراءة سريعة لتاريخ العميل" tone="teal" />

            <div className="mt-4 space-y-[9px]">
              <SummaryRow label="إجمالي الطلبات" value={`${orders.length} طلب`} />
              <SummaryRow label="إجمالي القطع" value={`${totalItems} قطعة`} />
              <SummaryRow label="تم توصيلها" value={`${deliveredOrders} طلب`} />
              <SummaryRow label="قيد التنفيذ" value={`${activeOrders} طلب`} />
              <SummaryRow label="الطلبات الملغاة" value={`${cancelledOrders} طلب`} />
              <SummaryRow label="طريقة الدفع الأكثر استخدامًا" value={favoritePayment} />
              <SummaryRow label="آخر طلب" value={latestOrder ? formatDate(latestOrder.created_at) : "لا يوجد"} />
              <SummaryRow label="الإشعارات المرسلة" value={`${notifications.length} إشعار`} />
              <SummaryRow label="غير المقروء" value={`${unreadNotifications} إشعار`} danger={unreadNotifications > 0} />
            </div>
          </div>

          {/* LOCATIONS */}

          <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
            <SectionTitle icon={MapPinned} title="العناوين والمواقع" description="المواقع المستخدمة في طلبات العميل" tone="blue" />

            <div className="mt-4 space-y-4">
              <ValueList title="المناطق" values={regions} />
              <ValueList title="المدن" values={cities} />
              <ValueList title="العناوين المستخدمة" values={addresses} />
            </div>
          </div>
        </div>

        {/* =====================================================
            ORDER HISTORY
        ===================================================== */}

        <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-8">
          <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[12px]">
            <SectionTitle icon={Package} title="سجل الطلبات" description="اضغط على العين لفتح الطلب مباشرة" tone="blue" />

            <span className="rounded-[7px] bg-[#EDF4FF] px-[7px] py-[4px] text-[7px] font-bold text-[#567BC5]">{orders.length}</span>
          </div>

          {orders.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="لا توجد طلبات" description="لم يقم هذا العميل بإنشاء أي طلب حتى الآن." />
          ) : (
            <div className="divide-y divide-[#F0F2F5]">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} onOpen={() => setSelectedOrder(order)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          NOTIFICATIONS
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[12px]">
          <SectionTitle icon={Bell} title="سجل الإشعارات" description="جميع الإشعارات المرتبطة بهذا العميل" tone="violet" />

          <div className="flex items-center gap-[6px]">
            {unreadNotifications > 0 && <span className="rounded-[7px] bg-[#FFF5E5] px-[7px] py-[4px] text-[6.5px] font-semibold text-[#B17B33]">{unreadNotifications} غير مقروء</span>}
            <span className="rounded-[7px] bg-[#F2F4F7] px-[7px] py-[4px] text-[6.5px] font-semibold text-[#747C86]">{notifications.length} إجمالي</span>
          </div>
        </div>

        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="لا توجد إشعارات" description="لم يتم إرسال إشعار لهذا العميل بعد." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          ORDER DRAWER
      ===================================================== */}

      {selectedOrder && (
        <OrderDrawer order={selectedOrder} deliveryCompany={selectedOrder.delivery_company_id ? deliveryMap.get(selectedOrder.delivery_company_id) || null : null} formatCurrency={formatCurrency} onClose={() => setSelectedOrder(null)} copyValue={copyValue} />
      )}
    </div>
  );
};

/* =========================================================
   ORDER ROW
========================================================= */

const OrderRow = ({ order, onOpen }: { order: Order; onOpen: () => void }) => {
  const status = STATUS_META[String(order.status || "").toLowerCase()] || {
    label: order.status || "غير محدد",
    className: "border-[#E2E5E9] bg-[#F5F6F8] text-[#7B838E]",
    dot: "bg-[#969EA8]",
  };

  return (
    <div className="group flex flex-col gap-[10px] px-[14px] py-[12px] transition-colors hover:bg-[#FCFDFE] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-[10px]">
        <div className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-[10px] bg-[#EDF4FF] text-[#5680CF]">
          <Package className="h-[14px] w-[14px]" strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[6px]">
            <span dir="ltr" className="text-[9px] font-semibold text-[#424A54]">#{order.order_number}</span>

            <span className={cn("inline-flex h-[23px] items-center gap-[4px] rounded-[6px] border px-[6px] text-[6.5px] font-semibold", status.className)}>
              <span className={cn("h-[4px] w-[4px] rounded-full", status.dot)} />
              {status.label}
            </span>
          </div>

          <div className="mt-[6px] flex flex-wrap items-center gap-x-[12px] gap-y-[5px] text-[6.5px] text-[#969DA7]">
            <span className="flex items-center gap-[4px]">
              <CalendarDays className="h-[8px] w-[8px]" />
              {formatDate(order.created_at)}
            </span>

            <span className="flex items-center gap-[4px]">
              <ShoppingBag className="h-[8px] w-[8px]" />
              {itemsCount(order)} قطعة
            </span>

            <span className="flex items-center gap-[4px]">
              <CreditCard className="h-[8px] w-[8px]" />
              {paymentLabel(order.payment_method)}
            </span>

            {(order.customer_city || order.customer_region) && (
              <span className="flex items-center gap-[4px]">
                <MapPin className="h-[8px] w-[8px]" />
                {order.customer_region || order.customer_city}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-[12px] sm:justify-end">
        <div className="text-left">
          <p className="text-[6.5px] text-[#9BA2AC]">قيمة الطلب</p>
          <p dir="ltr" className="mt-[3px] text-[10px] font-semibold text-[#3F4751]">{formatNativeAmount(order.total, order)}</p>
        </div>

        <button type="button" onClick={onOpen} title="عرض الطلب" aria-label="عرض الطلب" className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] transition-colors hover:bg-[#F4F2FF]">
          <Eye className="h-[12px] w-[12px]" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   ORDER DRAWER
========================================================= */

const OrderDrawer = ({ order, deliveryCompany, formatCurrency, onClose, copyValue }: { order: Order; deliveryCompany: DeliveryCompany | null; formatCurrency: (value: number) => string; onClose: () => void; copyValue: (value: string, label: string) => Promise<void> }) => {
  const status = STATUS_META[String(order.status || "").toLowerCase()] || {
    label: order.status || "غير محدد",
    className: "border-[#E2E5E9] bg-[#F5F6F8] text-[#7B838E]",
    dot: "bg-[#969EA8]",
  };

  return (
    <div className="fixed inset-0 z-[90] bg-[#1E2530]/35 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside className="absolute inset-y-0 left-0 w-full overflow-y-auto border-r border-[#E4E8ED] bg-[#F7F8FA] shadow-[20px_0_50px_rgba(26,33,45,0.12)] sm:max-w-[640px]" onMouseDown={(event) => event.stopPropagation()}>
        {/* HEADER */}

        <div className="sticky top-0 z-30 border-b border-[#E5E9EF] bg-white/95 px-[14px] py-[13px] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[7px] font-semibold tracking-[0.06em] text-[#9BA2AC]">ORDER DETAILS</p>

              <div className="mt-[5px] flex flex-wrap items-center gap-[7px]">
                <h2 dir="ltr" className="text-right text-[18px] font-semibold tracking-[-0.03em] text-[#303741]">#{order.order_number}</h2>

                <span className={cn("inline-flex h-[24px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", status.className)}>
                  <span className={cn("h-[4px] w-[4px] rounded-full", status.dot)} />
                  {status.label}
                </span>
              </div>

              <p className="mt-[5px] text-[7px] text-[#969DA7]">{formatDate(order.created_at, true)}</p>
            </div>

            <button type="button" onClick={onClose} className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] border border-[#E3E7EC] bg-white text-[#777F8A] transition-colors hover:bg-[#F5F7F9]">
              <X className="h-[13px] w-[13px]" />
            </button>
          </div>
        </div>

        <div className="space-y-[10px] p-[10px]">
          {/* TOTAL */}

          <section className="relative overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[14px]">
            <span className="absolute inset-y-0 right-0 w-[3px] bg-[#675CBA]" />

            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[7px] text-[#969DA7]">إجمالي الطلب</p>
                <p dir="ltr" className="mt-[5px] text-right text-[22px] font-semibold tracking-[-0.04em] text-[#303741]">{formatNativeAmount(order.total, order)}</p>

                {order.total_base !== null && order.total_base !== undefined && (
                  <p className="mt-[4px] text-[7px] text-[#999FA9]">القيمة الأساسية: {formatCurrency(Number(order.total_base))}</p>
                )}
              </div>

              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                <Wallet className="h-[16px] w-[16px]" />
              </div>
            </div>
          </section>

          {/* CUSTOMER */}

          <DrawerSection icon={User} title="بيانات العميل">
            <InfoGrid>
              <InfoBox label="الاسم" value={order.customer_name || "—"} />
              <InfoBox label="الهاتف" value={order.customer_phone || "—"} ltr />
              <InfoBox label="الدولة" value={countryLabel(order.country)} />
              <InfoBox label="المنطقة" value={order.customer_region || "—"} />
              <InfoBox label="المدينة" value={order.customer_city || "—"} />
              <InfoBox label="معرف العميل" value={order.customer_id || "—"} ltr />
            </InfoGrid>

            {order.customer_address && (
              <div className="mt-[8px] rounded-[10px] bg-[#F8FAFC] p-[10px]">
                <p className="text-[6.5px] font-medium text-[#9AA1AB]">العنوان الكامل</p>
                <p className="mt-[4px] text-[8px] leading-5 text-[#535B65]">{order.customer_address}</p>
              </div>
            )}

            {order.customer_notes && (
              <div className="mt-[8px] rounded-[10px] border border-[#EEE2CD] bg-[#FFF9EF] p-[10px]">
                <p className="text-[6.5px] font-semibold text-[#A17A42]">ملاحظات العميل</p>
                <p className="mt-[4px] text-[8px] leading-5 text-[#78694F]">{order.customer_notes}</p>
              </div>
            )}
          </DrawerSection>

          {/* PRODUCTS */}

          <DrawerSection icon={Package} title={`المنتجات · ${itemsCount(order)} قطعة`}>
            <div className="space-y-[7px]">
              {itemsOf(order).length === 0 ? (
                <p className="py-5 text-center text-[8px] text-[#9BA2AC]">لا توجد تفاصيل للمنتجات</p>
              ) : (
                itemsOf(order).map((item, index) => {
                  const quantity = Math.max(1, Number(item.quantity || 1));
                  const price = Number(item.price || 0);
                  const image = itemImage(item);

                  return (
                    <div key={`${item.product_id || "product"}-${index}`} className="flex gap-[10px] rounded-[11px] border border-[#EAEDF1] bg-[#FAFBFC] p-[8px]">
                      <div className="flex h-[68px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#E6E9EE] bg-white">
                        {image ? <img src={image} alt={itemName(item)} loading="lazy" className="h-full w-full object-contain" /> : <Package className="h-[18px] w-[18px] text-[#A1A7B0]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[9px] font-semibold text-[#454D57]">{itemName(item)}</p>

                        <div className="mt-[6px] flex flex-wrap gap-[5px]">
                          {item.selected_color && <SmallTag>اللون: {item.selected_color}</SmallTag>}
                          {item.selected_size && <SmallTag>المقاس: {item.selected_size}</SmallTag>}
                          <SmallTag>الكمية: {quantity}</SmallTag>
                        </div>

                        {Array.isArray(item.selected_accessories) && item.selected_accessories.length > 0 && (
                          <div className="mt-[6px] text-[6.5px] text-[#8E959F]">
                            الملحقات: {item.selected_accessories.map((accessory: any) => accessory?.name_ar || accessory?.name || "ملحق").join("، ")}
                          </div>
                        )}

                        <div className="mt-[9px] flex items-end justify-between gap-2">
                          <span dir="ltr" className="text-[7px] text-[#969DA7]">{quantity} × {Number(price).toLocaleString("en-US")} {currencySymbol(order)}</span>
                          <span dir="ltr" className="text-[9px] font-semibold text-[#404852]">{Number(quantity * price).toLocaleString("en-US")} {currencySymbol(order)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DrawerSection>

          {/* PAYMENT */}

          <DrawerSection icon={CircleDollarSign} title="تفاصيل المبلغ">
            <div className="space-y-[9px]">
              <AmountRow label="المجموع الفرعي" value={formatNativeAmount(Number(order.subtotal || 0), order)} />
              <AmountRow label="رسوم التوصيل" value={formatNativeAmount(Number(order.delivery_fee || 0), order)} />

              {Number(order.discount_amount || 0) > 0 && <AmountRow label={order.coupon_code ? `الخصم · ${order.coupon_code}` : "الخصم"} value={`- ${formatNativeAmount(Number(order.discount_amount || 0), order)}`} green />}

              <div className="border-t border-[#E9ECF0] pt-[10px]">
                <AmountRow label="الإجمالي" value={formatNativeAmount(Number(order.total || 0), order)} strong />
              </div>
            </div>
          </DrawerSection>

          {/* PAYMENT / CURRENCY */}

          <DrawerSection icon={CreditCard} title="الدفع والعملة">
            <InfoGrid>
              <InfoBox label="طريقة الدفع" value={paymentLabel(order.payment_method)} />
              <InfoBox label="وضع العملة" value={order.currency_mode || "—"} />
              <InfoBox label="رمز العملة" value={order.currency_code || currencySymbol(order)} />
              <InfoBox label="سعر الصرف" value={order.exchange_rate_snapshot !== null ? String(order.exchange_rate_snapshot) : "—"} ltr />
            </InfoGrid>
          </DrawerSection>

          {/* DELIVERY */}

          <DrawerSection icon={Truck} title="التوصيل والشحن">
            <InfoGrid>
              <InfoBox label="شركة التوصيل" value={deliveryCompany?.name || "غير محددة"} />
              <InfoBox label="مدة التوصيل" value={deliveryCompany?.delivery_days || "—"} />
              <InfoBox label="منطقة العميل" value={order.customer_region || "—"} />
              <InfoBox label="المدينة" value={order.customer_city || "—"} />
            </InfoGrid>

            {order.delivery_company_id && <CopyRow label="معرف شركة التوصيل" value={order.delivery_company_id} onCopy={() => void copyValue(order.delivery_company_id!, "معرف شركة التوصيل")} />}

            {order.tracking_token && <CopyRow label="رمز التتبع" value={order.tracking_token} onCopy={() => void copyValue(order.tracking_token!, "رمز التتبع")} />}
          </DrawerSection>

          {/* META */}

          <DrawerSection icon={FileText} title="معلومات الطلب">
            <div className="space-y-[2px]">
              <DetailRow label="رقم الطلب" value={`#${order.order_number}`} />
              <DetailRow label="معرف الطلب" value={order.id} ltr />
              <DetailRow label="تاريخ الإنشاء" value={formatDate(order.created_at, true)} />
              <DetailRow label="آخر تحديث" value={formatDate(order.updated_at, true)} />
              <DetailRow label="الحالة" value={status.label} />
              <DetailRow label="الدولة" value={countryLabel(order.country)} />
            </div>

            {order.invoice_url && (
              <button type="button" onClick={() => window.open(order.invoice_url!, "_blank", "noopener,noreferrer")} className="mt-[10px] flex h-[36px] w-full items-center justify-center gap-[6px] rounded-[9px] border border-[#E2DEF3] bg-[#F8F6FF] text-[8px] font-semibold text-[#675CBA] transition-colors hover:bg-[#F2EFFF]">
                <ExternalLink className="h-[11px] w-[11px]" />
                فتح الفاتورة
              </button>
            )}
          </DrawerSection>
        </div>
      </aside>
    </div>
  );
};

/* =========================================================
   METRIC
========================================================= */

const MetricCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "green" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />

      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
      </div>

      <p className="mt-[12px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[5px] truncate text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

/* =========================================================
   AVATAR
========================================================= */

const CustomerAvatar = ({ customer }: { customer: Customer }) => {
  const initial = String(customer.name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-[#E5E8EF] bg-[linear-gradient(135deg,#EEEAFE_0%,#E7F5FB_100%)] text-[13px] font-bold text-[#655DA0]">
      {customer.avatar_url ? <img src={customer.avatar_url} alt={customer.name} className="h-full w-full object-cover" /> : initial}
    </div>
  );
};

/* =========================================================
   PROFILE
========================================================= */

const ProfileRow = ({ icon: Icon, label, value, ltr = false, copy }: { icon: LucideIcon; label: string; value: string; ltr?: boolean; copy?: () => void }) => {
  return (
    <div className="flex min-h-[45px] items-center gap-[9px] rounded-[10px] px-[7px] transition-colors hover:bg-[#F8FAFC]">
      <div className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[9px] bg-[#F1F3F6] text-[#79818C]">
        <Icon className="h-[12px] w-[12px]" strokeWidth={1.7} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[6.5px] text-[#9BA2AC]">{label}</p>
        <p dir={ltr ? "ltr" : undefined} className={cn("mt-[3px] truncate text-[8.5px] font-semibold text-[#515964]", ltr && "text-right")}>{value}</p>
      </div>

      {copy && (
        <button type="button" onClick={copy} className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-white hover:text-[#675CBA]">
          <Copy className="h-[10px] w-[10px]" />
        </button>
      )}
    </div>
  );
};

/* =========================================================
   SECTION TITLE
========================================================= */

const SectionTitle = ({ icon: Icon, title, description, tone }: { icon: LucideIcon; title: string; description: string; tone: "blue" | "teal" | "violet" }) => {
  const style = {
    blue: "bg-[#EDF4FF] text-[#5680CF]",
    teal: "bg-[#EAF8F4] text-[#4C9687]",
    violet: "bg-[#F4ECFF] text-[#8F63C1]",
  }[tone];

  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <div className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]", style)}>
        <Icon className="h-[13px] w-[13px]" strokeWidth={1.7} />
      </div>

      <div className="min-w-0">
        <h2 className="text-[10px] font-semibold text-[#454C56]">{title}</h2>
        <p className="mt-[2px] truncate text-[6.5px] text-[#9BA2AC]">{description}</p>
      </div>
    </div>
  );
};

/* =========================================================
   SUMMARY
========================================================= */

const SummaryRow = ({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) => {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#F0F2F5] pb-[8px] last:border-b-0 last:pb-0">
      <span className="text-[7.5px] text-[#8D949E]">{label}</span>
      <span className={cn("max-w-[180px] truncate text-[8px] font-semibold", danger ? "text-[#C17A36]" : "text-[#505862]")}>{value}</span>
    </div>
  );
};

/* =========================================================
   VALUE LIST
========================================================= */

const ValueList = ({ title, values }: { title: string; values: string[] }) => {
  return (
    <div>
      <p className="mb-[6px] text-[7px] font-semibold text-[#9299A3]">{title}</p>

      {values.length === 0 ? (
        <p className="text-[7px] text-[#A2A8B1]">لا توجد بيانات</p>
      ) : (
        <div className="flex flex-wrap gap-[5px]">
          {values.map((value) => <span key={value} className="max-w-full truncate rounded-[7px] border border-[#E6E9EE] bg-[#F8FAFC] px-[7px] py-[4px] text-[6.5px] text-[#727A84]">{value}</span>)}
        </div>
      )}
    </div>
  );
};

/* =========================================================
   NOTIFICATION
========================================================= */

const NotificationCard = ({ notification }: { notification: Notification }) => {
  const body = notification.body || notification.message || "—";

  return (
    <article className="relative min-h-[140px] border-b border-[#EDF0F3] p-[13px] transition-colors hover:bg-[#FCFDFE] md:border-l xl:border-b-0">
      {!notification.is_read && <span className="absolute right-0 top-[15px] h-[23px] w-[2px] bg-[#675CBA]" />}

      <div className="flex items-start justify-between gap-[8px]">
        <div className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#F4F1FF] text-[#796BC1]">
          <Bell className="h-[12px] w-[12px]" />
        </div>

        <span className={cn("rounded-[6px] px-[6px] py-[3px] text-[6px] font-semibold", notification.is_read ? "bg-[#F1F3F5] text-[#868E98]" : "bg-[#F1EFFF] text-[#675CBA]")}>{notification.is_read ? "مقروء" : "غير مقروء"}</span>
      </div>

      <h3 className="mt-[9px] truncate text-[8.5px] font-semibold text-[#4B535D]">{notification.title}</h3>
      <p className="mt-[4px] line-clamp-2 text-[7px] leading-[15px] text-[#8F96A0]">{body}</p>

      <div className="mt-[9px] flex items-center justify-between text-[6px] text-[#A0A6AF]">
        <span>{notification.type || "notification"}</span>
        <span>{formatDate(notification.created_at)}</span>
      </div>
    </article>
  );
};

/* =========================================================
   DRAWER HELPERS
========================================================= */

const DrawerSection = ({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) => {
  return (
    <section className="rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <div className="mb-[11px] flex items-center gap-[7px]">
        <div className="flex h-[29px] w-[29px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
          <Icon className="h-[12px] w-[12px]" />
        </div>
        <h3 className="text-[9px] font-semibold text-[#4A525C]">{title}</h3>
      </div>

      {children}
    </section>
  );
};

const InfoGrid = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-2 gap-[7px]">{children}</div>;

const InfoBox = ({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) => {
  return (
    <div className="rounded-[9px] bg-[#F8FAFC] p-[9px]">
      <p className="text-[6px] text-[#9CA3AC]">{label}</p>
      <p dir={ltr ? "ltr" : undefined} className={cn("mt-[4px] truncate text-[8px] font-semibold text-[#525A64]", ltr && "text-right")}>{value}</p>
    </div>
  );
};

const AmountRow = ({ label, value, strong = false, green = false }: { label: string; value: string; strong?: boolean; green?: boolean }) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cn("text-[8px]", strong ? "font-semibold text-[#4A525C]" : "text-[#8D949E]")}>{label}</span>
      <span dir="ltr" className={cn("text-right font-semibold", strong ? "text-[11px] text-[#343B45]" : "text-[8.5px]", green ? "text-[#57906A]" : "text-[#505862]")}>{value}</span>
    </div>
  );
};

const DetailRow = ({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) => {
  return (
    <div className="flex min-h-[35px] items-center justify-between gap-4 border-b border-[#F0F2F5] last:border-b-0">
      <span className="text-[7px] text-[#9198A2]">{label}</span>
      <span dir={ltr ? "ltr" : undefined} className={cn("max-w-[300px] truncate text-[7.5px] font-semibold text-[#535B65]", ltr && "text-right")}>{value}</span>
    </div>
  );
};

const CopyRow = ({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) => {
  return (
    <div className="mt-[8px] flex items-center gap-[7px] rounded-[9px] border border-[#E9ECF0] bg-[#FAFBFC] p-[8px]">
      <div className="min-w-0 flex-1">
        <p className="text-[6px] text-[#A0A6AF]">{label}</p>
        <p dir="ltr" className="mt-[3px] truncate text-right text-[7px] font-medium text-[#606873]">{value}</p>
      </div>

      <button type="button" onClick={onCopy} className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[7px] border border-[#E3E7EC] bg-white text-[#828A94] hover:text-[#675CBA]">
        <Copy className="h-[10px] w-[10px]" />
      </button>
    </div>
  );
};

const SmallTag = ({ children }: { children: React.ReactNode }) => <span className="rounded-[6px] border border-[#E6E9EE] bg-white px-[6px] py-[3px] text-[6px] text-[#7B838D]">{children}</span>;

/* =========================================================
   EMPTY
========================================================= */

const EmptyState = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <h3 className="mt-3 text-[9px] font-semibold text-[#535B65]">{title}</h3>
      <p className="mt-[4px] text-[7px] text-[#9BA2AC]">{description}</p>
    </div>
  );
};

export default AdminCustomerDetailPage;
