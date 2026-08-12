import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowUpLeft, Boxes, CalendarDays, CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Eye, Package, PackageCheck, PackagePlus, Receipt, ShoppingCart, TrendingDown, TrendingUp, Truck, UserPlus, Users, Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { getCustomersCount, getOrdersSummary, getProfitSummary, getRevenueSummary } from "@/lib/admin/service";
import { useCustomersCount, useLowStock, useOrdersSummary, useProfitSummary, useRecentOrders, useRevenueSummary, useRevenueTimeseries } from "@/lib/analytics/hooks";

/* =========================================================
   TYPES
========================================================= */

interface Kpi {
  revenue: number;
  revenueDelta: number;
  profit: number;
  profitDelta: number;
  orders: number;
  ordersDelta: number;
  customers: number;
  customersDelta: number;
}

type CurrencyMode = "SAR" | "YER_SOUTH" | "YER_NORTH";

type FunnelState = {
  visitors: number;
  addToCart: number;
  checkout: number;
  purchases: number;
};

type RegionRow = {
  region: string;
  orders: number;
  revenue: number;
};

type TodayStats = {
  revenue: number;
  orders: number;
  visitors: number;
  conversion: number;
  revenueDelta: number;
  ordersDelta: number;
  visitorsDelta: number;
  conversionDelta: number;
};

type StatusKey = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

type MetricCardProps = {
  title: string;
  value: string;
  delta?: number;
  suffix?: string;
  loading?: boolean;
};

/* =========================================================
   THEME
========================================================= */

const DASHBOARD_THEME = {
  page: "#F1F2EF",
  card: "#FBFBFA",
  border: "#E7E8E4",
  text: "#242724",
  muted: "#858985",
  subtle: "#A6AAA6",
  green: "#59C482",
  greenDark: "#3CA96B",
  greenSoft: "#DDF5E6",
  red: "#DA6C6C",
  redSoft: "#F8DFDF",
  grid: "#EBECE8",
};

/* =========================================================
   CURRENCY
========================================================= */

const CURRENCY_META: Record<CurrencyMode, { label: string; shortLabel: string; symbol: string }> = {
  SAR: { label: "الريال السعودي", shortLabel: "السعودي", symbol: "ر.س" },
  YER_SOUTH: { label: "الريال اليمني - جنوب", shortLabel: "جنوب اليمن", symbol: "ر.ي" },
  YER_NORTH: { label: "الريال اليمني - شمال", shortLabel: "شمال اليمن", symbol: "ر.ي" },
};

const SAR_RATE_BY_MODE: Record<CurrencyMode, number> = {
  SAR: 1,
  YER_SOUTH: 1 / 410,
  YER_NORTH: 1 / 140,
};

const modeOf = (row: any): CurrencyMode => {
  const mode = row?.currency_mode;

  if (mode === "SAR" || mode === "YER_SOUTH" || mode === "YER_NORTH") return mode;
  if (row?.country === "SA") return "SAR";

  return "YER_SOUTH";
};

const toSar = (amount: number, row: any) => {
  const mode = modeOf(row);
  return Number(amount || 0) * (SAR_RATE_BY_MODE[mode] ?? 1);
};

/* =========================================================
   HELPERS
========================================================= */

const fmt = (number: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(number || 0));

const compact = (number: number) => {
  const value = Number(number || 0);

  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;

  return fmt(value);
};

const toLocalYmd = (date: Date) => {
  const copy = new Date(date);
  const offsetMs = copy.getTimezoneOffset() * 60000;
  return new Date(copy.getTime() - offsetMs).toISOString().slice(0, 10);
};

const toDayStart = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toDayEnd = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const calcDelta = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;

  return ((current - previous) / Math.abs(previous)) * 100;
};

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

const countryLabel = (country?: string | null) => {
  const value = String(country || "").toUpperCase();

  const labels: Record<string, string> = {
    SA: "السعودية",
    YEMEN: "اليمن",
    YE: "اليمن",
    YER_SOUTH: "جنوب اليمن",
    YER_NORTH: "شمال اليمن",
    UAE: "الإمارات",
    AE: "الإمارات",
    KW: "الكويت",
    QA: "قطر",
    BH: "البحرين",
    OM: "عُمان",
  };

  return labels[value] || value || "غير محدد";
};

const safeDate = (value: any) => {
  if (!value) return "—";

  try {
    return format(new Date(value), "dd MMM · HH:mm", { locale: ar });
  } catch {
    return "—";
  }
};

const stockOf = (product: any) => {
  return Number(product?.stock_quantity ?? product?.stock ?? product?.quantity ?? product?.inventory_count ?? 0);
};

const productNameOf = (product: any) => {
  return product?.name_ar || product?.name || product?.title || "منتج بدون اسم";
};

const orderNameOf = (order: any) => {
  return order?.order_number || order?.number || `#${String(order?.id || "").slice(0, 8)}`;
};

const customerNameOf = (order: any) => {
  return order?.customer_name || order?.customers?.name || order?.customer?.name || order?.name || "عميل";
};

/* =========================================================
   ORDER STATUS
========================================================= */

const STATUS_META: Record<StatusKey, { label: string; icon: any; bg: string; text: string }> = {
  pending: { label: "قيد الانتظار", icon: Clock3, bg: "bg-[#FFF6E5]", text: "text-[#B77A20]" },
  confirmed: { label: "مؤكد", icon: CheckCircle2, bg: "bg-[#EEF5FF]", text: "text-[#5B7DA8]" },
  processing: { label: "قيد التجهيز", icon: Package, bg: "bg-[#F3F0FA]", text: "text-[#786797]" },
  shipped: { label: "تم الشحن", icon: Truck, bg: "bg-[#EEF6F8]", text: "text-[#527D87]" },
  delivered: { label: "تم التوصيل", icon: PackageCheck, bg: "bg-[#DDF5E6]", text: "text-[#3CA96B]" },
  cancelled: { label: "ملغي", icon: AlertTriangle, bg: "bg-[#F8DFDF]", text: "text-[#C76060]" },
};

const EMPTY_STATUS_COUNTS: Record<StatusKey, number> = {
  pending: 0,
  confirmed: 0,
  processing: 0,
  shipped: 0,
  delivered: 0,
  cancelled: 0,
};

/* =========================================================
   CHANGE BADGE
========================================================= */

const ChangeBadge = ({ value }: { value: number }) => {
  const positive = value >= 0;
  const clean = Math.abs(value);

  return (
    <span className={`inline-flex h-[20px] items-center gap-1 rounded-[6px] px-1.5 text-[9px] font-medium ${positive ? "bg-[#DDF5E6] text-[#3CA96B]" : "bg-[#F8DFDF] text-[#DA6C6C]"}`}>
      {positive ? <TrendingUp className="h-2.5 w-2.5" strokeWidth={1.8} /> : <TrendingDown className="h-2.5 w-2.5" strokeWidth={1.8} />}
      {clean.toFixed(clean >= 10 ? 0 : 1)}%
    </span>
  );
};

/* =========================================================
   KPI
========================================================= */

const MetricCard = ({ title, value, delta, suffix, loading }: MetricCardProps) => {
  return (
    <article className="flex min-h-[98px] flex-col justify-between rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] px-3.5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.015)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-normal text-[#858985]">{title}</span>
        {typeof delta === "number" ? <ChangeBadge value={delta} /> : null}
      </div>

      {loading ? (
        <div className="h-5 w-20 animate-pulse rounded-md bg-[#ECEDE9]" />
      ) : (
        <div className="flex items-end gap-1">
          <span dir="ltr" className="text-[20px] font-medium leading-none tracking-[-0.04em] text-[#242724]">{value}</span>
          {suffix ? <span className="mb-[1px] text-[8px] text-[#858985]">{suffix}</span> : null}
        </div>
      )}

      <div className="text-[8px] text-[#929692]">
        {typeof delta === "number" ? `${delta >= 0 ? "ارتفاع" : "انخفاض"} ${Math.abs(delta).toFixed(Math.abs(delta) >= 10 ? 0 : 1)}% عن الفترة السابقة` : "—"}
      </div>
    </article>
  );
};

/* =========================================================
   SMALL METRIC
========================================================= */

const MiniMetric = ({ title, value, delta, suffix }: { title: string; value: string; delta: number; suffix?: string }) => {
  return (
    <div className="rounded-[11px] border border-[#ECEDE9] bg-[#F8F9F7] p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[8px] text-[#929692]">{title}</span>
        <ChangeBadge value={delta} />
      </div>

      <div className="mt-4 flex items-end gap-1">
        <span dir="ltr" className="text-[17px] font-medium tracking-[-0.03em] text-[#292D29]">{value}</span>
        {suffix ? <span className="mb-[2px] text-[7px] text-[#969A96]">{suffix}</span> : null}
      </div>
    </div>
  );
};

/* =========================================================
   SESSIONS
========================================================= */

const SessionGauge = ({ sessions, previousSessions }: { sessions: number; previousSessions: number }) => {
  const percentage = sessions + previousSessions > 0 ? clampPct((sessions / (sessions + previousSessions)) * 100) : 0;
  const length = 188.5;
  const progressLength = (percentage / 100) * length;

  return (
    <section className="flex h-full min-h-[220px] flex-col rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5">
      <div>
        <h3 className="text-[11px] font-normal text-[#666B66]">الجلسات</h3>
        <p className="mt-1 text-[8px] text-[#A0A4A0]">الجلسات الفريدة خلال الفترة</p>
      </div>

      <div className="relative mt-2 flex flex-1 items-center justify-center">
        <svg viewBox="0 0 150 100" className="h-[112px] w-[175px] overflow-visible">
          <path d="M 15 85 A 60 60 0 0 1 135 85" fill="none" stroke="#E3E5E1" strokeWidth="5" strokeLinecap="round" />
          <path d="M 15 85 A 60 60 0 0 1 135 85" fill="none" stroke={DASHBOARD_THEME.green} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${progressLength} ${length}`} />
        </svg>

        <div className="absolute top-[51px] text-center">
          <div dir="ltr" className="text-[23px] font-medium tracking-[-0.04em] text-[#242724]">{fmt(sessions)}</div>
          <div className="mt-1 text-[8px] text-[#969A96]">جلسة فريدة</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#EFF0ED] pt-2.5 text-[8px]">
        <span className="text-[#969A96]">الفترة السابقة</span>
        <span dir="ltr" className="font-medium text-[#4E524E]">{fmt(previousSessions)}</span>
      </div>
    </section>
  );
};

/* =========================================================
   FUNNEL
========================================================= */

const FunnelStep = ({ label, value, percentage, height }: { label: string; value: number; percentage: number; height: number }) => {
  const bars = Array.from({ length: 8 });

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 flex h-[104px] items-end gap-[3px]">
        {bars.map((_, index) => {
          const decay = index * 3;
          const finalHeight = Math.max(18, height - decay);

          return <div key={index} className={`w-full max-w-[7px] rounded-[3px] ${index === 0 ? "bg-[#59C482]" : "bg-[#DDDFDB]"}`} style={{ height: `${finalHeight}px` }} />;
        })}
      </div>

      <div className="mb-1 text-[8px] font-medium text-[#4F534F]">{Math.round(percentage)}%</div>
      <div className="truncate text-[8px] text-[#999D99]">{label}</div>
      <div dir="ltr" className="mt-0.5 text-[9px] font-medium text-[#333633]">{fmt(value)}</div>
    </div>
  );
};

/* =========================================================
   DASHBOARD
========================================================= */

const AdminDashboard = () => {
  const { range } = useDateRange();

  const [previousKpi, setPreviousKpi] = useState({ revenue: 0, profit: 0, orders: 0, customers: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDelta, setPendingDelta] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [previousSessions, setPreviousSessions] = useState(0);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelState>({ visitors: 0, addToCart: 0, checkout: 0, purchases: 0 });
  const [statusCounts, setStatusCounts] = useState<Record<StatusKey, number>>(EMPTY_STATUS_COUNTS);
  const [todayStats, setTodayStats] = useState<TodayStats>({ revenue: 0, orders: 0, visitors: 0, conversion: 0, revenueDelta: 0, ordersDelta: 0, visitorsDelta: 0, conversionDelta: 0 });
  const [extraError, setExtraError] = useState("");

  const revenueQuery = useRevenueSummary();
  const ordersQuery = useOrdersSummary();
  const customersQuery = useCustomersCount();
  const profitQuery = useProfitSummary();
  const timeseriesQuery = useRevenueTimeseries();
  const recentOrdersQuery = useRecentOrders();
  const lowStockQuery = useLowStock();

  const loading = revenueQuery.isLoading || ordersQuery.isLoading || customersQuery.isLoading || profitQuery.isLoading;

  const recentOrders = Array.isArray(recentOrdersQuery.data) ? recentOrdersQuery.data : [];
  const lowStock = Array.isArray(lowStockQuery.data) ? lowStockQuery.data : [];

  const rangeText = useMemo(() => {
    const start = format(new Date(range.start), "dd MMM", { locale: ar });
    const end = format(new Date(range.end), "dd MMM yyyy", { locale: ar });

    return `${start} - ${end}`;
  }, [range.start, range.end]);

  const previousRange = useMemo(() => {
    const start = toDayStart(new Date(range.start));
    const end = toDayEnd(new Date(range.end));
    const span = Math.max(0, end.getTime() - start.getTime());

    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - span);

    return {
      start: toLocalYmd(previousStart),
      end: toLocalYmd(previousEnd),
    };
  }, [range.start, range.end]);

  const currentKpi = useMemo<Kpi>(() => {
    const revenue = Number(revenueQuery.data?.revenue ?? 0);
    const profit = Number(profitQuery.data?.profit ?? 0);
    const orders = Number(ordersQuery.data?.count ?? 0);
    const customers = Number(customersQuery.data?.customers ?? 0);

    return {
      revenue,
      revenueDelta: calcDelta(revenue, previousKpi.revenue),
      profit,
      profitDelta: calcDelta(profit, previousKpi.profit),
      orders,
      ordersDelta: calcDelta(orders, previousKpi.orders),
      customers,
      customersDelta: calcDelta(customers, previousKpi.customers),
    };
  }, [revenueQuery.data, profitQuery.data, ordersQuery.data, customersQuery.data, previousKpi]);

  const averageOrderValue = currentKpi.orders > 0 ? currentKpi.revenue / currentKpi.orders : 0;
  const previousAverageOrderValue = previousKpi.orders > 0 ? previousKpi.revenue / previousKpi.orders : 0;
  const averageOrderDelta = calcDelta(averageOrderValue, previousAverageOrderValue);

  const chartData = useMemo(() => {
    const source = timeseriesQuery.data ?? [];

    return source.map((row: any, index: number) => {
      const revenue = Math.round(Number(row?.total) || 0);
      const start = Math.max(0, index - 2);
      const window = source.slice(start, index + 1);
      const movingAverage = window.reduce((sum: number, item: any) => sum + (Number(item?.total) || 0), 0) / Math.max(window.length, 1);

      return {
        date: row?.date ? String(row.date).slice(5) : "",
        revenue,
        average: Math.round(movingAverage),
      };
    });
  }, [timeseriesQuery.data]);

  const revenueByCurrency = revenueQuery.data?.byCurrency || {
    SAR: { revenue: 0, orders: 0 },
    YER_SOUTH: { revenue: 0, orders: 0 },
    YER_NORTH: { revenue: 0, orders: 0 },
  };

  const revenueByCurrencyNative = revenueQuery.data?.byCurrencyNative || {
    SAR: { revenue: 0, orders: 0 },
    YER_SOUTH: { revenue: 0, orders: 0 },
    YER_NORTH: { revenue: 0, orders: 0 },
  };

  const currencyRows = useMemo(() => {
    const modes: CurrencyMode[] = ["SAR", "YER_SOUTH", "YER_NORTH"];
    const total = modes.reduce((sum, mode) => sum + Number(revenueByCurrency[mode]?.revenue || 0), 0);

    return modes.map((mode) => ({
      mode,
      label: CURRENCY_META[mode].shortLabel,
      symbol: CURRENCY_META[mode].symbol,
      nativeRevenue: Number(revenueByCurrencyNative[mode]?.revenue || 0),
      convertedRevenue: Number(revenueByCurrency[mode]?.revenue || 0),
      orders: Number(revenueByCurrency[mode]?.orders || 0),
      percentage: total > 0 ? (Number(revenueByCurrency[mode]?.revenue || 0) / total) * 100 : 0,
    }));
  }, [revenueByCurrency, revenueByCurrencyNative]);

  const issues = useMemo(() => {
    const result: string[] = [];

    if (revenueQuery.error) result.push("الإيرادات");
    if (ordersQuery.error) result.push("الطلبات");
    if (customersQuery.error) result.push("العملاء");
    if (profitQuery.error) result.push("الأرباح");
    if (timeseriesQuery.error) result.push("الرسم البياني");
    if (recentOrdersQuery.error) result.push("آخر الطلبات");
    if (lowStockQuery.error) result.push("المخزون");
    if (extraError) result.push(extraError);

    return result;
  }, [revenueQuery.error, ordersQuery.error, customersQuery.error, profitQuery.error, timeseriesQuery.error, recentOrdersQuery.error, lowStockQuery.error, extraError]);

  useEffect(() => {
    let active = true;

    const loadPrevious = async () => {
      try {
        const [revenue, orders, customers, profit] = await Promise.all([
          getRevenueSummary(previousRange.start, previousRange.end),
          getOrdersSummary(previousRange.start, previousRange.end),
          getCustomersCount(previousRange.start, previousRange.end),
          getProfitSummary(previousRange.start, previousRange.end),
        ]);

        if (!active) return;

        setPreviousKpi({
          revenue: Number(revenue.revenue || 0),
          orders: Number(orders.count || 0),
          customers: Number(customers.customers || 0),
          profit: Number(profit.profit || 0),
        });
      } catch (error) {
        console.error("Failed to load previous dashboard metrics", error);
      }
    };

    loadPrevious();

    return () => {
      active = false;
    };
  }, [previousRange.start, previousRange.end]);

  useEffect(() => {
    let active = true;

    const loadPending = async () => {
      const currentFrom = toDayStart(new Date(range.start)).toISOString();
      const currentTo = toDayEnd(new Date(range.end)).toISOString();
      const previousFrom = toDayStart(new Date(previousRange.start)).toISOString();
      const previousTo = toDayEnd(new Date(previousRange.end)).toISOString();

      const [currentResult, previousResult] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", currentFrom).lte("created_at", currentTo),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending").gte("created_at", previousFrom).lte("created_at", previousTo),
      ]);

      if (!active) return;

      const current = Number(currentResult.count ?? 0);
      const previous = Number(previousResult.count ?? 0);

      setPendingCount(current);
      setPendingDelta(calcDelta(current, previous));
    };

    loadPending();

    const interval = window.setInterval(loadPending, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [range.start, range.end, previousRange.start, previousRange.end]);

  useEffect(() => {
    let active = true;

    const loadToday = async () => {
      try {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const todayStart = toDayStart(now).toISOString();
        const todayEnd = toDayEnd(now).toISOString();
        const yesterdayStart = toDayStart(yesterday).toISOString();
        const yesterdayEnd = toDayEnd(yesterday).toISOString();

        const [todayOrdersResult, yesterdayOrdersResult, todayEventsResult, yesterdayEventsResult] = await Promise.all([
          supabase.from("orders").select("total,status,country,currency_mode").gte("created_at", todayStart).lte("created_at", todayEnd),
          supabase.from("orders").select("total,status,country,currency_mode").gte("created_at", yesterdayStart).lte("created_at", yesterdayEnd),
          supabase.from("analytics_events").select("session_id,event_type").gte("created_at", todayStart).lte("created_at", todayEnd),
          supabase.from("analytics_events").select("session_id,event_type").gte("created_at", yesterdayStart).lte("created_at", yesterdayEnd),
        ]);

        if (!active) return;

        const readOrders = (rows: any[]) => {
          const valid = rows.filter((order) => {
            const status = String(order?.status || "").toLowerCase();
            return status !== "cancelled" && status !== "canceled";
          });

          return {
            orders: valid.length,
            revenue: valid.reduce((sum, order) => sum + toSar(Number(order?.total || 0), order), 0),
          };
        };

        const readEvents = (rows: any[]) => {
          const sessionsSet = new Set<string>();
          const conversionSet = new Set<string>();

          rows.forEach((event) => {
            const sessionId = String(event?.session_id || "").trim();
            const type = String(event?.event_type || "").toLowerCase();

            if (!sessionId) return;

            sessionsSet.add(sessionId);

            if (["checkout", "purchase", "order_complete", "order_success"].includes(type)) {
              conversionSet.add(sessionId);
            }
          });

          const visitors = sessionsSet.size;
          const conversion = visitors > 0 ? (conversionSet.size / visitors) * 100 : 0;

          return {
            visitors,
            conversion,
          };
        };

        const todayOrders = readOrders(todayOrdersResult.error ? [] : todayOrdersResult.data ?? []);
        const yesterdayOrders = readOrders(yesterdayOrdersResult.error ? [] : yesterdayOrdersResult.data ?? []);
        const todayEvents = readEvents(todayEventsResult.error ? [] : todayEventsResult.data ?? []);
        const yesterdayEvents = readEvents(yesterdayEventsResult.error ? [] : yesterdayEventsResult.data ?? []);

        setTodayStats({
          revenue: todayOrders.revenue,
          orders: todayOrders.orders,
          visitors: todayEvents.visitors,
          conversion: todayEvents.conversion,
          revenueDelta: calcDelta(todayOrders.revenue, yesterdayOrders.revenue),
          ordersDelta: calcDelta(todayOrders.orders, yesterdayOrders.orders),
          visitorsDelta: calcDelta(todayEvents.visitors, yesterdayEvents.visitors),
          conversionDelta: calcDelta(todayEvents.conversion, yesterdayEvents.conversion),
        });
      } catch (error) {
        console.error("Failed to load today metrics", error);
      }
    };

    loadToday();

    const interval = window.setInterval(loadToday, 20000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadExtraDashboardData = async () => {
      try {
        const currentFrom = toDayStart(new Date(range.start)).toISOString();
        const currentTo = toDayEnd(new Date(range.end)).toISOString();
        const previousFrom = toDayStart(new Date(previousRange.start)).toISOString();
        const previousTo = toDayEnd(new Date(previousRange.end)).toISOString();

        const [eventsResult, previousEventsResult, ordersResult] = await Promise.all([
          supabase.from("analytics_events").select("session_id,event_type,created_at").gte("created_at", currentFrom).lte("created_at", currentTo),
          supabase.from("analytics_events").select("session_id,event_type,created_at").gte("created_at", previousFrom).lte("created_at", previousTo),
          supabase.from("orders").select("id,total,status,country,currency_mode,created_at").gte("created_at", currentFrom).lte("created_at", currentTo),
        ]);

        if (!active) return;

        const events = eventsResult.error ? [] : eventsResult.data ?? [];
        const previousEvents = previousEventsResult.error ? [] : previousEventsResult.data ?? [];
        const orders = ordersResult.error ? [] : ordersResult.data ?? [];

        const currentSessionSet = new Set<string>();
        const previousSessionSet = new Set<string>();

        events.forEach((event: any) => {
          const sessionId = String(event?.session_id || "").trim();
          if (sessionId) currentSessionSet.add(sessionId);
        });

        previousEvents.forEach((event: any) => {
          const sessionId = String(event?.session_id || "").trim();
          if (sessionId) previousSessionSet.add(sessionId);
        });

        setSessions(currentSessionSet.size);
        setPreviousSessions(previousSessionSet.size);

        const uniqueSessionsForTypes = (types: string[]) => {
          const result = new Set<string>();

          events.forEach((event: any) => {
            const type = String(event?.event_type || "").toLowerCase();
            const sessionId = String(event?.session_id || "").trim();

            if (sessionId && types.includes(type)) result.add(sessionId);
          });

          return result.size;
        };

        const productViews = uniqueSessionsForTypes(["product_view", "view_product", "view_item", "product_detail"]);
        const addToCart = uniqueSessionsForTypes(["add_to_cart", "cart_add", "add_cart"]);
        const checkout = uniqueSessionsForTypes(["checkout", "begin_checkout", "checkout_start"]);
        const purchaseSessions = uniqueSessionsForTypes(["purchase", "order_complete", "order_success", "completed_order"]);

        const validOrders = orders.filter((order: any) => {
          const status = String(order?.status || "").toLowerCase();
          return status !== "cancelled" && status !== "canceled";
        });

        setFunnel({
          visitors: Math.max(currentSessionSet.size, productViews),
          addToCart,
          checkout,
          purchases: Math.max(purchaseSessions, validOrders.length),
        });

        const nextStatusCounts: Record<StatusKey, number> = {
          pending: 0,
          confirmed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        };

        orders.forEach((order: any) => {
          let status = String(order?.status || "").toLowerCase();

          if (status === "canceled") status = "cancelled";

          if (status in nextStatusCounts) {
            nextStatusCounts[status as StatusKey] += 1;
          }
        });

        setStatusCounts(nextStatusCounts);

        const regionMap = new Map<string, { orders: number; revenue: number }>();

        validOrders.forEach((order: any) => {
          const region = countryLabel(order?.country);
          const current = regionMap.get(region) || { orders: 0, revenue: 0 };

          current.orders += 1;
          current.revenue += toSar(Number(order?.total || 0), order);

          regionMap.set(region, current);
        });

        setRegions(
          Array.from(regionMap.entries())
            .map(([region, values]) => ({ region, orders: values.orders, revenue: values.revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6),
        );

        if (eventsResult.error || previousEventsResult.error || ordersResult.error) {
          setExtraError("بعض البيانات الثانوية");
        } else {
          setExtraError("");
        }
      } catch (error) {
        console.error("Failed to load dashboard extras", error);

        if (active) setExtraError("بعض البيانات الثانوية");
      }
    };

    loadExtraDashboardData();

    const interval = window.setInterval(loadExtraDashboardData, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [range.start, range.end, previousRange.start, previousRange.end]);

  const funnelBase = Math.max(funnel.visitors, 1);

  const funnelSteps = [
    { label: "الزيارات", value: funnel.visitors, percentage: funnel.visitors > 0 ? 100 : 0, height: 102 },
    { label: "إضافة للسلة", value: funnel.addToCart, percentage: clampPct((funnel.addToCart / funnelBase) * 100), height: 72 },
    { label: "الدفع", value: funnel.checkout, percentage: clampPct((funnel.checkout / funnelBase) * 100), height: 48 },
    { label: "طلبات", value: funnel.purchases, percentage: clampPct((funnel.purchases / funnelBase) * 100), height: 34 },
  ];

  const conversionRate = funnel.visitors > 0 ? (funnel.purchases / funnel.visitors) * 100 : 0;

  const totalStatusOrders = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  return (
    <div dir="rtl" className="min-h-full w-full bg-[#F1F2EF] p-2.5 md:p-3">
      <div className="w-full space-y-2">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="flex min-h-[52px] items-center justify-between gap-3 px-0.5">
          <div>
            <h1 className="text-[19px] font-medium tracking-[-0.025em] text-[#292C29] md:text-[21px]">المؤشرات العامة</h1>
            <p className="mt-0.5 text-[8px] text-[#9A9E9A]">متابعة أداء Flamingo Park والمبيعات والعمليات</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="[&_button]:h-[34px] [&_button]:rounded-full [&_button]:border-[#EAEBE8] [&_button]:bg-[#FBFBFA] [&_button]:px-3 [&_button]:text-[9px] [&_button]:font-normal [&_button]:shadow-none">
              <DateRangePicker />
            </div>

            <button type="button" className="hidden h-[34px] items-center gap-2 rounded-full border border-[#EAEBE8] bg-[#FBFBFA] px-3 text-[9px] font-normal text-[#4D514D] sm:flex">
              <span>Flamingo Park</span>
              <ChevronDown className="h-3 w-3 text-[#8B8F8B]" strokeWidth={1.6} />
            </button>
          </div>
        </header>

        {/* =====================================================
            KPI
        ====================================================== */}

        <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard title="إجمالي الإيرادات" value={fmt(currentKpi.revenue)} suffix="ر.س" delta={currentKpi.revenueDelta} loading={loading} />
          <MetricCard title="صافي الربح" value={fmt(currentKpi.profit)} suffix="ر.س" delta={currentKpi.profitDelta} loading={loading} />
          <MetricCard title="الطلبات" value={fmt(currentKpi.orders)} delta={currentKpi.ordersDelta} loading={loading} />
          <MetricCard title="متوسط قيمة الطلب" value={fmt(averageOrderValue)} suffix="ر.س" delta={averageOrderDelta} loading={loading} />
          <MetricCard title="العملاء" value={fmt(currentKpi.customers)} delta={currentKpi.customersDelta} loading={loading} />
          <MetricCard title="طلبات معلقة" value={fmt(pendingCount)} delta={pendingDelta} loading={loading} />
        </section>

        {issues.length > 0 && (
          <div className="rounded-[10px] border border-[#EFE0C8] bg-[#FFF9ED] px-3 py-2 text-[8px] text-[#967545]">
            تم تحميل لوحة التحكم جزئيًا: {issues.join("، ")}
          </div>
        )}

        {/* =====================================================
            SALES + FUNNEL
        ====================================================== */}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <div className="min-h-[280px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-8">
            <div className="mb-1 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">المبيعات والأداء</h2>
                <p className="mt-1 text-[8px] text-[#9B9F9B]">الإيرادات مقارنة بالاتجاه العام للفترة</p>
              </div>

              <div className="flex gap-6">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#59C482]" />
                    <span className="text-[8px] text-[#868A86]">المبيعات</span>
                  </div>

                  <div className="mt-1 flex items-end gap-1.5">
                    <span dir="ltr" className="text-[20px] font-medium tracking-[-0.04em] text-[#242724]">{compact(currentKpi.revenue)}</span>
                    <span className="mb-[2px] text-[7px] text-[#898D89]">ر.س</span>
                    <ChangeBadge value={currentKpi.revenueDelta} />
                  </div>
                </div>

                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D9DCD7]" />
                    <span className="text-[8px] text-[#868A86]">صافي الربح</span>
                  </div>

                  <div className="mt-1 flex items-end gap-1.5">
                    <span dir="ltr" className="text-[20px] font-medium tracking-[-0.04em] text-[#242724]">{compact(currentKpi.profit)}</span>
                    <span className="mb-[2px] text-[7px] text-[#898D89]">ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[208px] w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 18, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueDashboardGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#59C482" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#59C482" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} stroke="#E9EAE7" strokeDasharray="3 3" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#929692", fontSize: 8 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#A0A4A0", fontSize: 8 }} tickFormatter={(value) => compact(Number(value))} />

                  <Tooltip cursor={{ stroke: "#D9DBD8", strokeDasharray: "3 3" }} contentStyle={{ background: "#FBFBFA", border: "1px solid #E6E8E4", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,.06)", fontSize: "9px" }} labelStyle={{ color: "#8C908C", marginBottom: "4px" }} formatter={(value, name) => [`${fmt(Number(value || 0))} ر.س`, name === "revenue" ? "المبيعات" : "المتوسط"]} />

                  <Area type="monotone" dataKey="average" stroke="#D8DBD6" strokeWidth={1.2} fill="transparent" dot={false} activeDot={false} />
                  <Area type="monotone" dataKey="revenue" stroke="#59C482" strokeWidth={1.8} fill="url(#revenueDashboardGradient)" dot={false} activeDot={{ r: 3.5, fill: "#59C482", stroke: "#FBFBFA", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-h-[280px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">مسار المبيعات</h2>
                <p className="mt-1 text-[8px] text-[#9B9F9B]">رحلة العميل حتى إتمام الطلب</p>
              </div>

              <div className="text-left">
                <div className="text-[8px] text-[#858985]">التحويل</div>

                <div className="mt-0.5 flex items-center gap-1.5">
                  <span dir="ltr" className="text-[21px] font-medium tracking-[-0.04em] text-[#242724]">{conversionRate.toFixed(1)}%</span>
                  <span className="rounded-[5px] bg-[#DDF5E6] px-1.5 py-0.5 text-[7px] font-medium text-[#3CA96B]">Live</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-end gap-2" dir="rtl">
              {funnelSteps.map((step) => <FunnelStep key={step.label} label={step.label} value={step.value} percentage={step.percentage} height={step.height} />)}
            </div>
          </div>
        </section>

        {/* =====================================================
            TODAY + SESSIONS + CURRENCY
        ====================================================== */}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <div className="min-h-[220px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-4">
            <div>
              <h2 className="text-[11px] font-normal text-[#666B66]">ملخص اليوم</h2>
              <p className="mt-1 text-[8px] text-[#A0A4A0]">مقارنة مباشرة مع يوم أمس</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniMetric title="إيرادات اليوم" value={compact(todayStats.revenue)} suffix="ر.س" delta={todayStats.revenueDelta} />
              <MiniMetric title="طلبات اليوم" value={fmt(todayStats.orders)} delta={todayStats.ordersDelta} />
              <MiniMetric title="الزوار اليوم" value={fmt(todayStats.visitors)} delta={todayStats.visitorsDelta} />
              <MiniMetric title="نسبة التحويل" value={`${todayStats.conversion.toFixed(1)}%`} delta={todayStats.conversionDelta} />
            </div>
          </div>

          <div className="xl:col-span-3">
            <SessionGauge sessions={sessions} previousSessions={previousSessions} />
          </div>

          <div className="min-h-[220px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">الإيرادات حسب العملة</h2>
                <p className="mt-1 text-[8px] text-[#A0A4A0]">توزيع المبيعات حسب عملة الطلب</p>
              </div>

              <CircleDollarSign className="h-4 w-4 text-[#98A095]" strokeWidth={1.5} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {currencyRows.map((row) => (
                <div key={row.mode}>
                  <div className="text-[8px] text-[#9A9E9A]">{row.label}</div>

                  <div className="mt-1 flex items-baseline gap-1">
                    <span dir="ltr" className="text-[11px] font-medium text-[#373A37]">{compact(row.nativeRevenue)}</span>
                    <span className="text-[7px] text-[#939793]">{row.symbol}</span>
                  </div>

                  <div className="mt-1 text-[7px] text-[#AAAFAA]">{fmt(row.orders)} طلب</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex h-[5px] w-full overflow-hidden rounded-full bg-[#ECEDE9]">
              {currencyRows.map((row, index) => <div key={row.mode} style={{ width: `${row.percentage}%`, backgroundColor: index === 0 ? "#D5B32B" : index === 1 ? "#62C980" : "#7EA9D3" }} />)}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {currencyRows.map((row, index) => (
                <div key={row.mode} className="flex min-w-0 items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: index === 0 ? "#D5B32B" : index === 1 ? "#62C980" : "#7EA9D3" }} />
                  <span className="truncate text-[7px] text-[#868A86]">{row.label}</span>
                  <span dir="ltr" className="mr-auto text-[7px] font-medium text-[#4C504C]">{row.percentage.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =====================================================
            ORDER STATUS + REGION + ALERTS
        ====================================================== */}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <div className="min-h-[228px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">حالة الطلبات</h2>
                <p className="mt-1 text-[8px] text-[#A0A4A0]">الطلبات حسب المرحلة الحالية</p>
              </div>

              <span dir="ltr" className="text-[16px] font-medium text-[#333733]">{fmt(totalStatusOrders)}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(Object.keys(STATUS_META) as StatusKey[]).map((key) => {
                const item = STATUS_META[key];
                const Icon = item.icon;

                return (
                  <div key={key} className="flex items-center gap-2 rounded-[10px] border border-[#ECEDE9] bg-[#F8F9F7] px-2.5 py-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${item.bg} ${item.text}`}>
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-[8px] text-[#888D88]">{item.label}</div>
                      <div dir="ltr" className="mt-0.5 text-[13px] font-medium text-[#3D413D]">{fmt(statusCounts[key])}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-h-[228px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-4">
            <div>
              <h2 className="text-[11px] font-normal text-[#666B66]">المبيعات حسب المنطقة</h2>
              <p className="mt-1 text-[8px] text-[#A0A4A0]">أفضل المناطق حسب صافي الإيرادات</p>
            </div>

            <div className="mt-4">
              <div className="grid grid-cols-[1.1fr_.55fr_1fr] border-b border-[#ECEDE9] pb-2 text-[7px] text-[#9A9E9A]">
                <span>المنطقة</span>
                <span>الطلبات</span>
                <span className="text-left">الإيراد</span>
              </div>

              {regions.length > 0 ? (
                regions.map((region) => (
                  <div key={region.region} className="grid grid-cols-[1.1fr_.55fr_1fr] items-center border-b border-[#F0F1EE] py-2 text-[8px] last:border-b-0">
                    <span className="truncate font-medium text-[#4A4E4A]">{region.region}</span>
                    <span dir="ltr" className="text-[#666A66]">{fmt(region.orders)}</span>
                    <span dir="ltr" className="text-left font-medium text-[#3C403C]">{compact(region.revenue)} <span className="text-[6px] font-normal text-[#999D99]">ر.س</span></span>
                  </div>
                ))
              ) : (
                <div className="flex h-[135px] items-center justify-center text-[8px] text-[#A1A5A1]">لا توجد مبيعات في الفترة المحددة</div>
              )}
            </div>
          </div>

          <div className="min-h-[228px] rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5 xl:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">تنبيهات الإدارة</h2>
                <p className="mt-1 text-[8px] text-[#A0A4A0]">أهم الأمور التي تحتاج متابعة</p>
              </div>

              <AlertTriangle className="h-4 w-4 text-[#AD8563]" strokeWidth={1.5} />
            </div>

            <div className="mt-4 space-y-2">
              <Link to="/admin/orders" className="flex items-center gap-3 rounded-[10px] border border-[#ECEDE9] bg-[#F8F9F7] px-3 py-2.5 transition hover:bg-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#FFF4DD] text-[#B47A2C]">
                  <Clock3 className="h-4 w-4" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[8px] text-[#858A85]">طلبات تنتظر المعالجة</div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#343834]">{fmt(pendingCount)} طلب</div>
                </div>

                <ArrowUpLeft className="h-3 w-3 text-[#A0A4A0]" />
              </Link>

              <Link to="/admin/inventory" className="flex items-center gap-3 rounded-[10px] border border-[#ECEDE9] bg-[#F8F9F7] px-3 py-2.5 transition hover:bg-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#FBE8E8] text-[#C46161]">
                  <Boxes className="h-4 w-4" strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-[8px] text-[#858A85]">منتجات منخفضة المخزون</div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#343834]">{fmt(lowStock.length)} منتج</div>
                </div>

                <ArrowUpLeft className="h-3 w-3 text-[#A0A4A0]" />
              </Link>
            </div>
          </div>
        </section>

        {/* =====================================================
            RECENT ORDERS + SIDEBAR CONTENT
        ====================================================== */}

        <section className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <div className="min-h-[300px] overflow-hidden rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] xl:col-span-8">
            <div className="flex items-center justify-between border-b border-[#ECEDE9] px-3.5 py-3">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">آخر الطلبات</h2>
                <p className="mt-1 text-[8px] text-[#A0A4A0]">أحدث الطلبات والنشاطات في المتجر</p>
              </div>

              <Link to="/admin/orders" className="flex items-center gap-1 text-[8px] text-[#667064] transition hover:text-[#3CA96B]">
                عرض الكل
                <ArrowUpLeft className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div className="grid grid-cols-[1fr_1.4fr_.8fr_.85fr_1fr_.45fr] items-center border-b border-[#ECEDE9] px-3.5 py-2 text-[7px] text-[#9A9E9A]">
                  <span>الطلب</span>
                  <span>العميل</span>
                  <span>القيمة</span>
                  <span>الحالة</span>
                  <span>التاريخ</span>
                  <span />
                </div>

                {recentOrders.length > 0 ? (
                  recentOrders.slice(0, 7).map((order: any) => {
                    let statusKey = String(order?.status || "pending").toLowerCase();

                    if (statusKey === "canceled") statusKey = "cancelled";

                    const safeStatus = statusKey in STATUS_META ? statusKey as StatusKey : "pending";
                    const meta = STATUS_META[safeStatus];

                    return (
                      <div key={order?.id || Math.random()} className="grid grid-cols-[1fr_1.4fr_.8fr_.85fr_1fr_.45fr] items-center border-b border-[#F0F1EE] px-3.5 py-2.5 text-[8px] last:border-b-0">
                        <span dir="ltr" className="text-right font-medium text-[#484C48]">{orderNameOf(order)}</span>
                        <span className="truncate text-[#606560]">{customerNameOf(order)}</span>
                        <span dir="ltr" className="text-right font-medium text-[#373B37]">{fmt(toSar(Number(order?.total || 0), order))} <span className="text-[6px] font-normal text-[#999D99]">ر.س</span></span>

                        <span>
                          <span className={`inline-flex rounded-[6px] px-2 py-1 text-[7px] ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        </span>

                        <span className="text-[#858A85]">{safeDate(order?.created_at)}</span>

                        <Link to={`/admin/orders/${order?.id}`} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#8F948F] transition hover:bg-[#EEF0EC] hover:text-[#4D554B]">
                          <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </Link>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-[8px] text-[#A1A5A1]">لا توجد طلبات حديثة</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2 xl:col-span-4">
            {/* QUICK ACTIONS */}

            <div className="rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5">
              <div>
                <h2 className="text-[11px] font-normal text-[#666B66]">إجراءات سريعة</h2>
                <p className="mt-1 text-[8px] text-[#A0A4A0]">الوصول السريع لأكثر المهام استخدامًا</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/admin/products/new" className="group flex min-h-[68px] flex-col justify-between rounded-[10px] border border-[#E9EBE7] bg-[#F8F9F7] p-2.5 transition hover:bg-white">
                  <PackagePlus className="h-4 w-4 text-[#687263]" strokeWidth={1.5} />
                  <span className="text-[8px] text-[#565B56]">إضافة منتج</span>
                </Link>

                <Link to="/admin/orders" className="group flex min-h-[68px] flex-col justify-between rounded-[10px] border border-[#E9EBE7] bg-[#F8F9F7] p-2.5 transition hover:bg-white">
                  <Receipt className="h-4 w-4 text-[#687263]" strokeWidth={1.5} />
                  <span className="text-[8px] text-[#565B56]">إدارة الطلبات</span>
                </Link>

                <Link to="/admin/customers" className="group flex min-h-[68px] flex-col justify-between rounded-[10px] border border-[#E9EBE7] bg-[#F8F9F7] p-2.5 transition hover:bg-white">
                  <UserPlus className="h-4 w-4 text-[#687263]" strokeWidth={1.5} />
                  <span className="text-[8px] text-[#565B56]">العملاء</span>
                </Link>

                <Link to="/admin/inventory" className="group flex min-h-[68px] flex-col justify-between rounded-[10px] border border-[#E9EBE7] bg-[#F8F9F7] p-2.5 transition hover:bg-white">
                  <Boxes className="h-4 w-4 text-[#687263]" strokeWidth={1.5} />
                  <span className="text-[8px] text-[#565B56]">المخزون</span>
                </Link>
              </div>
            </div>

            {/* LOW STOCK */}

            <div className="rounded-[14px] border border-[#E7E8E4] bg-[#FBFBFA] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[11px] font-normal text-[#666B66]">المخزون المنخفض</h2>
                  <p className="mt-1 text-[8px] text-[#A0A4A0]">منتجات تحتاج لإعادة التزويد</p>
                </div>

                <span className="rounded-[6px] bg-[#F8DFDF] px-2 py-1 text-[8px] font-medium text-[#C66060]">{fmt(lowStock.length)}</span>
              </div>

              <div className="mt-3 space-y-1">
                {lowStock.length > 0 ? (
                  lowStock.slice(0, 4).map((product: any) => (
                    <div key={product?.id || product?.sku || productNameOf(product)} className="flex items-center gap-2 rounded-[9px] px-2 py-2 transition hover:bg-[#F6F7F5]">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#F3F4F1] text-[#757D71]">
                        <Package className="h-4 w-4" strokeWidth={1.4} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[8px] font-medium text-[#4B504B]">{productNameOf(product)}</div>
                        <div className="mt-0.5 truncate text-[7px] text-[#9A9E9A]">{product?.sku ? `SKU: ${product.sku}` : "مخزون منخفض"}</div>
                      </div>

                      <div className="text-left">
                        <div dir="ltr" className="text-[11px] font-medium text-[#C66060]">{fmt(stockOf(product))}</div>
                        <div className="text-[6px] text-[#A0A4A0]">متبقي</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[100px] flex-col items-center justify-center gap-2 text-[8px] text-[#9CA19C]">
                    <CheckCircle2 className="h-5 w-5 text-[#59C482]" strokeWidth={1.5} />
                    المخزون بحالة جيدة
                  </div>
                )}
              </div>

              {lowStock.length > 4 ? (
                <Link to="/admin/inventory" className="mt-2 flex h-8 items-center justify-center rounded-[8px] border border-[#E8EAE6] text-[7px] text-[#697068] transition hover:bg-[#F6F7F5]">
                  عرض جميع المنتجات
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <div className="flex items-center justify-between px-1 py-1 text-[7px] text-[#A0A4A0]">
          <span>Flamingo Park Analytics</span>

          <span className="flex items-center gap-1">
            <CalendarDays className="h-2.5 w-2.5" strokeWidth={1.4} />
            {rangeText}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;