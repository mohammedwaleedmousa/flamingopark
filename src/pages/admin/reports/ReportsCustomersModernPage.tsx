import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/lib/analytics/dateRange";
import { currencyOptions, downloadCSV, fmtMoney, orderTotalBase } from "./reportHelpers";
import { AlertTriangle, CalendarDays, Download, Heart, Loader2, MapPin, RefreshCw, Repeat, ShoppingBag, Smartphone, TrendingUp, UserPlus, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  total_base: number | null;
  created_at: string;
  status: string;
  items: any;
  customer_id: string | null;
  owner_user_id: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_region: string | null;
  country: string | null;
};

type AnalyticsEvent = {
  event_type: string;
  created_at: string;
  session_id: string | null;
  user_id: string | null;
  product_id: string | null;
  device: string | null;
  utm_source: string | null;
};

type ProductRow = { id: string; name_ar: string | null; name: string | null };
type Segment = "Champions" | "Loyal" | "Potential" | "At Risk" | "Lost";
type Tone = "indigo" | "blue" | "green" | "teal" | "amber" | "violet";

type CustomerRow = {
  key: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  orders: number;
  spent: number;
  lastOrder: string;
  firstOrder: string;
  recency: number;
  segment: Segment;
};

const CANCELLED = new Set(["cancelled", "canceled"]);
const PRODUCT_VIEW_TYPES = new Set(["product_view", "view_product", "view_item", "product_detail"]);
const CART_TYPES = new Set(["add_to_cart", "cart_add", "add_cart"]);
const PURCHASE_TYPES = new Set(["purchase", "order_complete", "order_success", "completed_order", "order_placed"]);

const SEGMENTS: Array<{ key: Segment; label: string; description: string; dot: string }> = [
  { key: "Champions", label: "أبطال — عملاء VIP", description: "حديثون، متكررون وذوو إنفاق مرتفع", dot: "#629067" },
  { key: "Loyal", label: "أوفياء", description: "عملاء متكررون ونشطون", dot: "#5680CF" },
  { key: "Potential", label: "واعدون", description: "فرصة جيدة للتحويل إلى أوفياء", dot: "#675CBA" },
  { key: "At Risk", label: "في خطر الفقد", description: "عملاء سابقون بدأ نشاطهم يتراجع", dot: "#C38838" },
  { key: "Lost", label: "مفقودون", description: "لم يعودوا منذ فترة طويلة", dot: "#D06A5E" },
];

const toneStyles: Record<Tone, { soft: string; text: string }> = {
  indigo: { soft: "bg-[#F1EFFF]", text: "text-[#675CBA]" },
  blue: { soft: "bg-[#EDF4FF]", text: "text-[#5680CF]" },
  green: { soft: "bg-[#ECF7EC]", text: "text-[#629067]" },
  teal: { soft: "bg-[#EAF8F4]", text: "text-[#4C9687]" },
  amber: { soft: "bg-[#FFF5E6]", text: "text-[#C38838]" },
  violet: { soft: "bg-[#F4ECFF]", text: "text-[#8F63C1]" },
};

const db = supabase as any;

function startOfLocalDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function localDateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function extractCity(order: Pick<OrderRow, "customer_city" | "customer_region" | "customer_address">) {
  if (order.customer_city?.trim()) return order.customer_city.trim();
  if (order.customer_region?.trim()) return order.customer_region.trim();
  const source = String(order.customer_address || "").trim();
  if (!source) return "غير محدد";
  return source.split(/[،,\-–|]/).map((part) => part.trim()).filter(Boolean)[0] || source.slice(0, 40);
}

function computeSegment(recency: number, frequency: number, monetary: number): Segment {
  if (frequency >= 4 && recency <= 60 && monetary >= 500) return "Champions";
  if (frequency >= 2 && recency <= 90) return "Loyal";
  if (frequency >= 2 && recency <= 180) return "At Risk";
  if (frequency >= 1 && recency > 180) return "Lost";
  return "Potential";
}

export default function ReportsCustomersModernPage() {
  const { range, setRange } = useDateRange();
  const [currency, setCurrency] = useState("SAR");
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);
  const currencyList = currencyOptions();

  const period = useMemo(() => {
    const start = startOfLocalDate(range.start);
    const endExclusive = addDays(startOfLocalDate(range.end), 1);
    return { start, endExclusive, startISO: start.toISOString(), endExclusiveISO: endExclusive.toISOString() };
  }, [range.start, range.end]);

  const ordersQuery = useQuery({
    queryKey: ["reports-customers-modern-orders"],
    queryFn: async () => {
      const { data, error } = await db.from("orders").select("id,order_number,total,total_base,created_at,status,items,customer_id,owner_user_id,customer_phone,customer_name,customer_address,customer_city,customer_region,country").order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return (data || []).map((row: any) => ({ ...row, total: Number(row.total || 0), total_base: row.total_base == null ? null : Number(row.total_base) })) as OrderRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const eventsQuery = useQuery({
    queryKey: ["reports-customers-modern-events", period.startISO, period.endExclusiveISO],
    queryFn: async () => {
      const { data, error } = await db.from("analytics_events").select("event_type,created_at,session_id,user_id,product_id,device,utm_source").gte("created_at", period.startISO).lt("created_at", period.endExclusiveISO).order("created_at", { ascending: false }).limit(20000);
      if (error) throw error;
      return (data || []) as AnalyticsEvent[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const productsQuery = useQuery({
    queryKey: ["reports-customers-modern-products"],
    queryFn: async () => {
      const { data, error } = await db.from("products").select("id,name,name_ar");
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const allOrders = ordersQuery.data || [];
  const events = eventsQuery.data || [];
  const products = productsQuery.data || [];
  const validOrders = useMemo(() => allOrders.filter((order) => !CANCELLED.has(String(order.status || "").toLowerCase())), [allOrders]);
  const periodOrders = useMemo(() => validOrders.filter((order) => {
    const time = new Date(order.created_at).getTime();
    return time >= period.start.getTime() && time < period.endExclusive.getTime();
  }), [validOrders, period.start, period.endExclusive]);

  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name_ar || product.name || "منتج"])), [products]);

  const customers = useMemo<CustomerRow[]>(() => {
    const now = Date.now();
    const map = new Map<string, CustomerRow>();

    validOrders.forEach((order) => {
      const key = order.customer_id || order.owner_user_id || order.customer_phone || order.order_number;
      if (!key) return;
      const existing = map.get(key) || {
        key,
        name: order.customer_name || "عميل",
        phone: order.customer_phone || "—",
        city: extractCity(order),
        country: order.country || "غير محدد",
        orders: 0,
        spent: 0,
        lastOrder: order.created_at,
        firstOrder: order.created_at,
        recency: 0,
        segment: "Potential" as Segment,
      };
      existing.orders += 1;
      existing.spent += orderTotalBase(order);
      if (new Date(order.created_at) > new Date(existing.lastOrder)) existing.lastOrder = order.created_at;
      if (new Date(order.created_at) < new Date(existing.firstOrder)) existing.firstOrder = order.created_at;
      map.set(key, existing);
    });

    return Array.from(map.values()).map((customer) => {
      const recency = Math.max(0, Math.floor((now - new Date(customer.lastOrder).getTime()) / 86_400_000));
      return { ...customer, recency, segment: computeSegment(recency, customer.orders, customer.spent) };
    }).sort((a, b) => b.spent - a.spent);
  }, [validOrders]);

  const kpis = useMemo(() => {
    const total = customers.length;
    const newCustomers = customers.filter((customer) => {
      const time = new Date(customer.firstOrder).getTime();
      return time >= period.start.getTime() && time < period.endExclusive.getTime();
    }).length;
    const active = customers.filter((customer) => {
      const time = new Date(customer.lastOrder).getTime();
      return time >= period.start.getTime() && time < period.endExclusive.getTime();
    }).length;
    const returning = customers.filter((customer) => customer.orders >= 2).length;
    const orderCount = customers.reduce((sum, customer) => sum + customer.orders, 0);
    const lifetimeRevenue = customers.reduce((sum, customer) => sum + customer.spent, 0);
    return {
      total,
      newCustomers,
      active,
      repeatRate: total ? (returning / total) * 100 : 0,
      ltv: total ? lifetimeRevenue / total : 0,
      aov: orderCount ? lifetimeRevenue / orderCount : 0,
    };
  }, [customers, period.start, period.endExclusive]);

  const segmentStats = useMemo(() => SEGMENTS.map((segment) => {
    const list = customers.filter((customer) => customer.segment === segment.key);
    return {
      ...segment,
      list,
      count: list.length,
      revenue: list.reduce((sum, customer) => sum + customer.spent, 0),
      percent: customers.length ? (list.length / customers.length) * 100 : 0,
    };
  }), [customers]);

  const byCountry = useMemo(() => {
    const map = new Map<string, { key: string; customers: number; revenue: number }>();
    customers.forEach((customer) => {
      const row = map.get(customer.country) || { key: customer.country, customers: 0, revenue: 0 };
      row.customers += 1;
      row.revenue += customer.spent;
      map.set(customer.country, row);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [customers]);

  const byCity = useMemo(() => {
    const map = new Map<string, { key: string; customers: number; revenue: number }>();
    customers.forEach((customer) => {
      const row = map.get(customer.city) || { key: customer.city, customers: 0, revenue: 0 };
      row.customers += 1;
      row.revenue += customer.spent;
      map.set(customer.city, row);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [customers]);

  const viewedVsPurchased = useMemo(() => {
    const views = new Map<string, number>();
    events.forEach((event) => {
      if (event.product_id && PRODUCT_VIEW_TYPES.has(String(event.event_type || "").toLowerCase())) views.set(event.product_id, (views.get(event.product_id) || 0) + 1);
    });
    const purchases = new Map<string, number>();
    periodOrders.forEach((order) => {
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item: any) => {
        if (!item?.product_id) return;
        purchases.set(item.product_id, (purchases.get(item.product_id) || 0) + Math.max(1, Number(item.quantity || 1)));
      });
    });
    const ids = new Set([...views.keys(), ...purchases.keys()]);
    return Array.from(ids).map((id) => {
      const viewCount = views.get(id) || 0;
      const purchaseCount = purchases.get(id) || 0;
      return { id, name: productNames.get(id) || id.slice(0, 8), views: viewCount, purchases: purchaseCount, conversion: viewCount ? (purchaseCount / viewCount) * 100 : 0 };
    }).sort((a, b) => b.views - a.views).slice(0, 15);
  }, [events, periodOrders, productNames]);

  const abandoned = useMemo(() => {
    const cartSessions = new Set<string>();
    const purchasedSessions = new Set<string>();
    events.forEach((event) => {
      if (!event.session_id) return;
      const type = String(event.event_type || "").toLowerCase();
      if (CART_TYPES.has(type)) cartSessions.add(event.session_id);
      if (PURCHASE_TYPES.has(type)) purchasedSessions.add(event.session_id);
    });
    const abandonedCount = Array.from(cartSessions).filter((session) => !purchasedSessions.has(session)).length;
    return { cartSessions: cartSessions.size, purchases: purchasedSessions.size, abandoned: abandonedCount };
  }, [events]);

  const devices = useMemo(() => {
    const map = new Map<string, Set<string>>();
    events.forEach((event) => {
      if (!event.session_id) return;
      const key = event.device || "غير محدد";
      const sessions = map.get(key) || new Set<string>();
      sessions.add(event.session_id);
      map.set(key, sessions);
    });
    return Array.from(map.entries()).map(([device, sessions]) => ({ device, sessions: sessions.size })).sort((a, b) => b.sessions - a.sessions);
  }, [events]);

  const trafficSources = useMemo(() => {
    const map = new Map<string, { sessions: Set<string>; cart: Set<string>; purchases: Set<string> }>();
    events.forEach((event) => {
      if (!event.session_id) return;
      const source = event.utm_source || "direct";
      const row = map.get(source) || { sessions: new Set<string>(), cart: new Set<string>(), purchases: new Set<string>() };
      const type = String(event.event_type || "").toLowerCase();
      row.sessions.add(event.session_id);
      if (CART_TYPES.has(type)) row.cart.add(event.session_id);
      if (PURCHASE_TYPES.has(type)) row.purchases.add(event.session_id);
      map.set(source, row);
    });
    return Array.from(map.entries()).map(([source, row]) => ({ source, sessions: row.sessions.size, cart: row.cart.size, purchases: row.purchases.size, conversion: row.sessions.size ? (row.purchases.size / row.sessions.size) * 100 : 0 })).sort((a, b) => b.purchases - a.purchases || b.sessions - a.sessions);
  }, [events]);

  const crossSell = useMemo(() => {
    const pairs = new Map<string, { a: string; b: string; count: number }>();
    periodOrders.forEach((order) => {
      const ids = Array.from(new Set((Array.isArray(order.items) ? order.items : []).map((item: any) => String(item?.product_id || "")).filter(Boolean)));
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const [a, b] = [ids[i], ids[j]].sort();
          const key = `${a}|${b}`;
          const row = pairs.get(key) || { a, b, count: 0 };
          row.count += 1;
          pairs.set(key, row);
        }
      }
    });
    return Array.from(pairs.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [periodOrders]);

  const kpiCards = [
    { title: "إجمالي العملاء", value: kpis.total.toLocaleString("en-US"), helper: "عملاء فريدون حسب الحساب أو الهاتف", icon: Users, tone: "indigo" as Tone },
    { title: "جدد في الفترة", value: kpis.newCustomers.toLocaleString("en-US"), helper: "أول طلب لهم خلال الفترة", icon: UserPlus, tone: "blue" as Tone },
    { title: "نشطون في الفترة", value: kpis.active.toLocaleString("en-US"), helper: "آخر طلب لهم خلال الفترة", icon: Heart, tone: "teal" as Tone },
    { title: "معدل العودة", value: `${kpis.repeatRate.toFixed(1)}%`, helper: "عملاء لديهم طلبان أو أكثر", icon: Repeat, tone: "green" as Tone },
    { title: "متوسط قيمة العميل", value: fmtMoney(kpis.ltv, currency), helper: "LTV حسب سجل الطلبات", icon: TrendingUp, tone: "violet" as Tone },
    { title: "متوسط قيمة الطلب", value: fmtMoney(kpis.aov, currency), helper: "AOV لكل الطلبات الصالحة", icon: ShoppingBag, tone: "amber" as Tone },
  ];

  const isLoading = ordersQuery.isLoading || eventsQuery.isLoading || productsQuery.isLoading;
  const isFetching = ordersQuery.isFetching || eventsQuery.isFetching || productsQuery.isFetching;
  const error = ordersQuery.error || eventsQuery.error || productsQuery.error;
  const openList = openSegment ? segmentStats.find((segment) => segment.key === openSegment)?.list || [] : [];

  const refresh = async () => {
    await Promise.all([ordersQuery.refetch(), eventsQuery.refetch(), productsQuery.refetch()]);
  };

  const exportCustomers = (rows = customers, filename = "all-customers.csv") => {
    downloadCSV(filename, rows.map((customer) => ({ name: customer.name, phone: customer.phone, city: customer.city, country: customer.country, orders: customer.orders, spent_sar: Math.round(customer.spent), last_order: customer.lastOrder.slice(0, 10), recency_days: customer.recency, segment: customer.segment })));
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التقارير والتحليلات" title="تحليل العملاء" description="فهم قيمة العملاء وسلوكهم وشرائحهم لاتخاذ قرارات تسويقية أدق" />

      <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[10px]">
        <div className="flex flex-col gap-[8px] xl:flex-row xl:items-center xl:justify-between">
          <DateControls range={range} setRange={setRange} />
          <div className="flex flex-wrap items-center gap-[7px]">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-[40px] w-[185px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent>{currencyList.map((option) => <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isFetching} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-white px-[12px] text-[10.5px] font-semibold text-[#68717B] shadow-none">{isFetching ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <RefreshCw className="ml-[5px] h-[11px] w-[11px]" />}تحديث</Button>
            <Button type="button" onClick={() => exportCustomers()} className="h-[40px] rounded-[9px] bg-[#675CBA] px-[13px] text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]"><Download className="ml-[5px] h-[11px] w-[11px]" />تصدير العملاء</Button>
          </div>
        </div>
      </section>

      {error && <section className="rounded-[12px] border border-[#F0D7D4] bg-[#FFF6F5] px-[12px] py-[10px]"><p className="text-[10.5px] font-semibold text-[#B75F56]">تعذر تحميل بعض بيانات تحليل العملاء</p><p className="mt-[3px] text-[10px] text-[#C47770]">{error instanceof Error ? error.message : "حدث خطأ غير متوقع."}</p></section>}

      {isLoading ? (
        <div className="flex min-h-[430px] items-center justify-center"><div className="text-center"><div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div><p className="mt-3 text-[10.5px] font-medium text-[#8D949E]">جاري تجهيز تحليل العملاء...</p></div></div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-[9px] md:grid-cols-3 xl:grid-cols-6">{kpiCards.map((card) => <KpiCard key={card.title} {...card} />)}</section>

          <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
            <SectionHeader title="تقسيم العملاء RFM" description="اضغط على أي شريحة لعرض العملاء وتصديرهم للحملات" icon={Users} />
            <div className="grid grid-cols-1 gap-[8px] p-[11px] sm:grid-cols-2 xl:grid-cols-5">
              {segmentStats.map((segment) => (
                <button key={segment.key} type="button" onClick={() => setOpenSegment((current) => current === segment.key ? null : segment.key)} className={cn("rounded-[12px] border bg-[#FCFDFE] p-[12px] text-right transition-colors", openSegment === segment.key ? "border-[#BEB8E7] bg-[#F8F7FF]" : "border-[#E7EAF0] hover:border-[#D8DCE4] hover:bg-white")}>
                  <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-bold text-[#3E4650]">{segment.label}</p><p className="mt-[4px] text-[7.5px] leading-[1.6] text-[#9AA1AB]">{segment.description}</p></div><span className="mt-[2px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: segment.dot }} /></div>
                  <div className="mt-[12px] flex items-end justify-between gap-2"><p className="text-[22px] font-bold leading-none text-[#313842]">{segment.count.toLocaleString("en-US")}</p><p className="text-[8px] font-semibold text-[#8D949E]">{segment.percent.toFixed(1)}%</p></div>
                  <p className="mt-[7px] text-[8px] font-medium text-[#7D8590]">{fmtMoney(segment.revenue, currency)}</p>
                </button>
              ))}
            </div>
            {openSegment && (
              <div className="border-t border-[#EDF0F3] bg-[#FBFCFE] p-[11px]">
                <div className="mb-[9px] flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10.5px] font-bold text-[#3E4650]">{SEGMENTS.find((segment) => segment.key === openSegment)?.label}</p><p className="mt-[2px] text-[8px] text-[#9AA1AB]">{openList.length.toLocaleString("en-US")} عميل في هذه الشريحة</p></div><Button type="button" variant="outline" onClick={() => exportCustomers(openList, `segment-${openSegment}.csv`)} className="h-[32px] rounded-[8px] border-[#E1E5EA] bg-white px-[9px] text-[9px] font-semibold text-[#626A75] shadow-none"><Download className="ml-1 h-[10px] w-[10px]" />تصدير CSV</Button></div>
                <CustomerTable rows={openList.slice(0, 250)} currency={currency} />
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
            <DataSection title="العملاء حسب الدولة" description="توزيع العملاء وقيمة الإنفاق حسب الدولة" icon={MapPin}><SimpleTable headers={["الدولة", "العملاء", "الإيراد"]} rows={byCountry.map((row) => [row.key, row.customers.toLocaleString("en-US"), fmtMoney(row.revenue, currency)])} empty="لا توجد بيانات جغرافية." /></DataSection>
            <DataSection title="أفضل 10 مدن" description="المدن الأعلى حسب إنفاق العملاء" icon={MapPin}><SimpleTable headers={["المدينة", "العملاء", "الإيراد"]} rows={byCity.map((row) => [row.key, row.customers.toLocaleString("en-US"), fmtMoney(row.revenue, currency)])} empty="لا توجد بيانات للمدن." /></DataSection>
          </div>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,.65fr)]">
            <DataSection title="الاهتمام مقابل الشراء" description="المنتجات التي تُشاهد كثيرًا ولا تتحول إلى شراء" icon={TrendingUp}><SimpleTable headers={["المنتج", "المشاهدات", "المشتريات", "التحويل"]} rows={viewedVsPurchased.map((row) => [row.name, row.views.toLocaleString("en-US"), row.purchases.toLocaleString("en-US"), `${row.conversion.toFixed(1)}%`])} empty="لا توجد بيانات منتجات ضمن الفترة." /></DataSection>
            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white"><SectionHeader title="العربات المهجورة" description="جلسات أضافت للسلة ولم تكمل شراءً" icon={AlertTriangle} /><div className="grid gap-[8px] p-[11px]"><MiniStat label="أضافوا للسلة" value={abandoned.cartSessions} tone="indigo" /><MiniStat label="أكملوا الشراء" value={abandoned.purchases} tone="green" /><MiniStat label="هجرت السلة" value={abandoned.abandoned} tone="amber" /></div></section>
          </div>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
            <DataSection title="مصادر الحملات" description="أي مصدر يجلب جلسات وتحويلات أفضل" icon={TrendingUp}><SimpleTable headers={["المصدر", "الجلسات", "إضافة للسلة", "شراء", "التحويل"]} rows={trafficSources.map((row) => [row.source, row.sessions.toLocaleString("en-US"), row.cart.toLocaleString("en-US"), row.purchases.toLocaleString("en-US"), `${row.conversion.toFixed(1)}%`])} empty="لا توجد بيانات UTM خلال الفترة." /></DataSection>
            <DataSection title="الأجهزة" description="توزيع جلسات العملاء حسب نوع الجهاز" icon={Smartphone}><SimpleTable headers={["الجهاز", "الجلسات"]} rows={devices.map((row) => [row.device, row.sessions.toLocaleString("en-US")])} empty="لا توجد بيانات أجهزة خلال الفترة." /></DataSection>
          </div>

          <DataSection title="منتجات تُشترى معًا" description="فرص Cross-sell مبنية على المنتجات الموجودة في نفس الطلب" icon={ShoppingBag}><SimpleTable headers={["المنتج الأول", "المنتج الثاني", "طلبات مشتركة"]} rows={crossSell.map((pair) => [productNames.get(pair.a) || pair.a.slice(0, 8), productNames.get(pair.b) || pair.b.slice(0, 8), pair.count.toLocaleString("en-US")])} empty="لا توجد أزواج منتجات كافية خلال الفترة." /></DataSection>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: Tone }) {
  const style = toneStyles[tone];
  return <section className="rounded-[13px] border border-[#E5E9EF] bg-white p-[12px]"><div className="flex items-start justify-between gap-2"><div className={cn("flex h-[29px] w-[29px] items-center justify-center rounded-[9px]", style.soft)}><Icon className={cn("h-[13px] w-[13px]", style.text)} strokeWidth={1.8} /></div></div><p className="mt-[11px] text-[8px] font-semibold text-[#929AA4]">{title}</p><p className="mt-[5px] truncate text-[18px] font-bold leading-none text-[#303740]">{value}</p><p className="mt-[7px] min-h-[26px] text-[7.5px] leading-[1.7] text-[#A0A7B0]">{helper}</p></section>;
}

function SectionHeader({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <div className="flex items-center gap-[9px] border-b border-[#EDF0F3] px-[12px] py-[11px]"><div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[13px] w-[13px]" strokeWidth={1.8} /></div><div className="min-w-0"><h2 className="text-[10.5px] font-bold text-[#3D444E]">{title}</h2><p className="mt-[2px] text-[7.5px] text-[#9AA1AB]">{description}</p></div></div>;
}

function DataSection({ title, description, icon, children }: { title: string; description: string; icon: LucideIcon; children: ReactNode }) {
  return <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white"><SectionHeader title={title} description={description} icon={icon} />{children}</section>;
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (!rows.length) return <div className="flex min-h-[150px] items-center justify-center px-5 text-[9px] text-[#9BA2AC]">{empty}</div>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse"><thead><tr className="bg-[#FAFBFC]">{headers.map((header) => <th key={header} className="border-b border-[#EDF0F3] px-[12px] py-[9px] text-right text-[7.5px] font-bold text-[#969DA7]">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-[#F0F2F5] last:border-b-0">{row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`} className={cn("px-[12px] py-[10px] text-[8.5px] text-[#66707A]", cellIndex === 0 && "font-semibold text-[#414952]")}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function CustomerTable({ rows, currency }: { rows: CustomerRow[]; currency: string }) {
  if (!rows.length) return <div className="flex min-h-[140px] items-center justify-center text-[9px] text-[#9BA2AC]">لا يوجد عملاء في هذه الشريحة.</div>;
  return <div className="max-h-[330px] overflow-auto rounded-[11px] border border-[#E7EAF0] bg-white"><table className="w-full min-w-[760px] border-collapse"><thead className="sticky top-0 z-10 bg-[#FAFBFC]"><tr>{["العميل", "الهاتف", "المدينة", "الطلبات", "الإنفاق", "آخر طلب"].map((header) => <th key={header} className="border-b border-[#EDF0F3] px-[11px] py-[9px] text-right text-[7.5px] font-bold text-[#969DA7]">{header}</th>)}</tr></thead><tbody>{rows.map((customer) => <tr key={customer.key} className="border-b border-[#F0F2F5] last:border-b-0"><td className="px-[11px] py-[9px] text-[8.5px] font-semibold text-[#414952]">{customer.name}</td><td dir="ltr" className="px-[11px] py-[9px] text-left text-[8.5px] text-[#66707A]">{customer.phone}</td><td className="px-[11px] py-[9px] text-[8.5px] text-[#66707A]">{customer.city}</td><td className="px-[11px] py-[9px] text-[8.5px] text-[#66707A]">{customer.orders.toLocaleString("en-US")}</td><td className="px-[11px] py-[9px] text-[8.5px] font-semibold text-[#4D5560]">{fmtMoney(customer.spent, currency)}</td><td className="px-[11px] py-[9px] text-[8.5px] text-[#66707A]">{customer.lastOrder.slice(0, 10)}</td></tr>)}</tbody></table></div>;
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  const style = toneStyles[tone];
  return <div className="flex items-center justify-between rounded-[11px] border border-[#E8EBEF] bg-[#FBFCFE] px-[11px] py-[10px]"><p className="text-[8.5px] font-semibold text-[#747C86]">{label}</p><span className={cn("rounded-[8px] px-[9px] py-[5px] text-[11px] font-bold", style.soft, style.text)}>{value.toLocaleString("en-US")}</span></div>;
}

function DateControls({ range, setRange }: { range: { start: string; end: string }; setRange: (value: { start: string; end: string }) => void }) {
  const presets = [
    { label: "7 أيام", days: 7 },
    { label: "30 يوم", days: 30 },
    { label: "90 يوم", days: 90 },
  ];
  const applyPreset = (days: number) => {
    const end = new Date();
    setRange({ start: localDateValue(subDays(end, days - 1)), end: localDateValue(end) });
  };
  return <div className="flex flex-wrap items-center gap-[7px]"><div className="flex h-[40px] items-center gap-[6px] rounded-[9px] border border-[#E3E7EC] bg-[#F8FAFC] px-[9px]"><CalendarDays className="h-[11px] w-[11px] text-[#7C8590]" /><input type="date" value={range.start} onChange={(event) => setRange({ ...range, start: event.target.value })} className="w-[118px] bg-transparent text-[9px] font-medium text-[#5F6873] outline-none" /><span className="text-[8px] text-[#B0B6BE]">—</span><input type="date" value={range.end} onChange={(event) => setRange({ ...range, end: event.target.value })} className="w-[118px] bg-transparent text-[9px] font-medium text-[#5F6873] outline-none" /></div>{presets.map((preset) => <button key={preset.days} type="button" onClick={() => applyPreset(preset.days)} className="h-[34px] rounded-[8px] border border-[#E4E7EC] bg-white px-[9px] text-[8.5px] font-semibold text-[#747C86] transition-colors hover:bg-[#F8FAFC]">{preset.label}</button>)}</div>;
}
