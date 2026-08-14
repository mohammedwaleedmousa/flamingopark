import { useEffect, useMemo, useState, type LucideIcon } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle,
  ArrowUpLeft,
  Boxes,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Package,
  PackageCheck,
  PackagePlus,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";

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
type StatusKey = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
type Tone = "indigo" | "green" | "coral" | "blue" | "teal" | "amber" | "rose" | "cyan";

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

type MetricCardProps = {
  title: string;
  value: string;
  delta?: number;
  suffix?: string;
  loading?: boolean;
  icon: LucideIcon;
  tone: Tone;
};

/* =========================================================
   DESIGN
========================================================= */

const tones: Record<Tone, { icon: string; soft: string; text: string; line: string }> = {
  indigo: {
    icon: "bg-[#EEEBFF] text-[#675CBA]",
    soft: "bg-[#F8F6FF]",
    text: "text-[#675CBA]",
    line: "#675CBA",
  },
  green: {
    icon: "bg-[#EAF7EE] text-[#57906A]",
    soft: "bg-[#F5FAF6]",
    text: "text-[#57906A]",
    line: "#629067",
  },
  coral: {
    icon: "bg-[#FFF0ED] text-[#C9685D]",
    soft: "bg-[#FFF8F6]",
    text: "text-[#C9685D]",
    line: "#D06A5E",
  },
  blue: {
    icon: "bg-[#EDF4FF] text-[#567BC5]",
    soft: "bg-[#F6F9FF]",
    text: "text-[#567BC5]",
    line: "#5680CF",
  },
  teal: {
    icon: "bg-[#EAF8F4] text-[#478F80]",
    soft: "bg-[#F4FBF9]",
    text: "text-[#478F80]",
    line: "#4C9687",
  },
  amber: {
    icon: "bg-[#FFF5E5] text-[#B98031]",
    soft: "bg-[#FFFAF3]",
    text: "text-[#B98031]",
    line: "#C38838",
  },
  rose: {
    icon: "bg-[#FFF0F4] text-[#BC6377]",
    soft: "bg-[#FFF7F9]",
    text: "text-[#BC6377]",
    line: "#C66A7F",
  },
  cyan: {
    icon: "bg-[#EAF7FB] text-[#45899F]",
    soft: "bg-[#F5FAFC]",
    text: "text-[#45899F]",
    line: "#4A90A6",
  },
};

const CURRENCY_COLORS = ["#675CBA", "#4C9687", "#D09A48"];

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

const stockOf = (product: any) => Number(product?.stock_quantity ?? product?.stock ?? product?.quantity ?? product?.inventory_count ?? 0);

const productNameOf = (product: any) => product?.name_ar || product?.name || product?.title || "منتج بدون اسم";

const orderNameOf = (order: any) => order?.order_number || order?.number || `#${String(order?.id || "").slice(0, 8)}`;

const customerNameOf = (order: any) => order?.customer_name || order?.customers?.name || order?.customer?.name || order?.name || "عميل";

/* =========================================================
   STATUS
========================================================= */

const STATUS_META: Record<StatusKey, { label: string; icon: LucideIcon; bg: string; text: string; bar: string }> = {
  pending: { label: "قيد الانتظار", icon: Clock3, bg: "bg-[#FFF6E5]", text: "text-[#AF782B]", bar: "#C38838" },
  confirmed: { label: "مؤكد", icon: CheckCircle2, bg: "bg-[#EDF4FF]", text: "text-[#567BC5]", bar: "#5680CF" },
  processing: { label: "قيد التجهيز", icon: Package, bg: "bg-[#F2EFFF]", text: "text-[#675CBA]", bar: "#675CBA" },
  shipped: { label: "تم الشحن", icon: Truck, bg: "bg-[#EAF7FB]", text: "text-[#45899F]", bar: "#4A90A6" },
  delivered: { label: "تم التوصيل", icon: PackageCheck, bg: "bg-[#EAF7EE]", text: "text-[#57906A]", bar: "#629067" },
  cancelled: { label: "ملغي", icon: AlertTriangle, bg: "bg-[#FFF0F0]", text: "text-[#C76161]", bar: "#D06C6C" },
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
   UI
========================================================= */

const ChangeBadge = ({ value }: { value: number }) => {
  const positive = value >= 0;
  const clean = Math.abs(value);

  return (
    <span className={`inline-flex h-[22px] items-center gap-1 rounded-[7px] px-2 text-[8.5px] font-semibold ${positive ? "bg-[#EAF7EE] text-[#57906A]" : "bg-[#FFF0F0] text-[#C76161]"}`}>
      {positive ? <TrendingUp className="h-[10px] w-[10px]" strokeWidth={1.8} /> : <TrendingDown className="h-[10px] w-[10px]" strokeWidth={1.8} />}
      {clean.toFixed(clean >= 10 ? 0 : 1)}%
    </span>
  );
};

const MetricCard = ({ title, value, delta, suffix, loading, icon: Icon, tone }: MetricCardProps) => {
  const palette = tones[tone];

  return (
    <article className="group relative min-h-[126px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] transition-colors duration-150 hover:border-[#DCE1E8]">
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: palette.line }} />

      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] ${palette.icon}`}>
          <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} />
        </div>

        {typeof delta === "number" && <ChangeBadge value={delta} />}
      </div>

      <div className="mt-4">
        <p className="text-[9.5px] font-medium text-[#7F8792]">{title}</p>

        {loading ? (
          <div className="mt-[7px] h-[24px] w-[90px] animate-pulse rounded-[7px] bg-[#EEF1F4]" />
        ) : (
          <div className="mt-[6px] flex items-end gap-[5px]">
            <span dir="ltr" className="text-[23px] font-semibold leading-none tracking-[-0.045em] text-[#252A33]">{value}</span>
            {suffix && <span className="mb-[2px] text-[8px] font-medium text-[#959CA6]">{suffix}</span>}
          </div>
        )}
      </div>
    </article>
  );
};

const MiniMetric = ({ title, value, delta, suffix, icon: Icon, tone }: { title: string; value: string; delta: number; suffix?: string; icon: LucideIcon; tone: Tone }) => {
  const palette = tones[tone];

  return (
    <div className="rounded-[13px] border border-[#E8EBF0] bg-[#FAFBFC] p-[11px]">
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-[28px] w-[28px] items-center justify-center rounded-[9px] ${palette.icon}`}>
          <Icon className="h-[13px] w-[13px]" strokeWidth={1.7} />
        </div>

        <ChangeBadge value={delta} />
      </div>

      <p className="mt-3 text-[8.5px] font-medium text-[#8B929C]">{title}</p>

      <div className="mt-[5px] flex items-end gap-1">
        <span dir="ltr" className="text-[17px] font-semibold leading-none tracking-[-0.03em] text-[#303640]">{value}</span>
        {suffix && <span className="mb-[1px] text-[7px] text-[#989FA9]">{suffix}</span>}
      </div>
    </div>
  );
};

const CardHeader = ({ title, description, icon: Icon, tone = "indigo", action }: { title: string; description?: string; icon?: LucideIcon; tone?: Tone; action?: React.ReactNode }) => {
  const palette = tones[tone];

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-[9px]">
        {Icon && (
          <div className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[10px] ${palette.icon}`}>
            <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
          </div>
        )}

        <div className="min-w-0">
          <h2 className="text-[11.5px] font-semibold text-[#343A44]">{title}</h2>
          {description && <p className="mt-[3px] text-[7.5px] leading-4 text-[#9AA1AB]">{description}</p>}
        </div>
      </div>

      {action}
    </div>
  );
};

const SessionGauge = ({ sessions, previousSessions }: { sessions: number; previousSessions: number }) => {
  const percentage = sessions + previousSessions > 0 ? clampPct((sessions / (sessions + previousSessions)) * 100) : 0;
  const circumference = 2 * Math.PI * 48;
  const dash = (percentage / 100) * circumference;

  return (
    <section className="flex h-full min-h-[238px] flex-col rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
      <CardHeader title="الجلسات" description="الجلسات الفريدة خلال الفترة" icon={Users} tone="indigo" />

      <div className="relative flex flex-1 items-center justify-center py-3">
        <svg viewBox="0 0 120 120" className="h-[132px] w-[132px] -rotate-90">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#EFF1F5" strokeWidth="9" />
          <circle cx="60" cy="60" r="48" fill="none" stroke="#675CBA" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        </svg>

        <div className="absolute text-center">
          <div dir="ltr" className="text-[24px] font-semibold tracking-[-0.04em] text-[#2A303A]">{fmt(sessions)}</div>
          <div className="mt-1 text-[7.5px] font-medium text-[#9AA1AB]">جلسة فريدة</div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#EEF1F4] pt-[10px]">
        <span className="text-[7.5px] text-[#969DA7]">الفترة السابقة</span>
        <span dir="ltr" className="text-[9px] font-semibold text-[#59616C]">{fmt(previousSessions)}</span>
      </div>
    </section>
  );
};

const FunnelStep = ({ label, value, percentage, tone }: { label: string; value: number; percentage: number; tone: Tone }) => {
  const palette = tones[tone];

  return (
    <div className="rounded-[12px] border border-[#E8EBF0] bg-[#FAFBFC] p-[10px]">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[8px] font-medium text-[#8F96A0]">{label}</p>
          <p dir="ltr" className="mt-[4px] text-[16px] font-semibold leading-none text-[#343A44]">{fmt(value)}</p>
        </div>

        <span className={`text-[9px] font-semibold ${palette.text}`}>{Math.round(percentage)}%</span>
      </div>

      <div className="mt-3 h-[4px] overflow-hidden rounded-full bg-[#ECEFF3]">
        <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: palette.line }} />
      </div>
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
    { label: "الزيارات", value: funnel.visitors, percentage: funnel.visitors > 0 ? 100 : 0, tone: "indigo" as Tone },
    { label: "إضافة للسلة", value: funnel.addToCart, percentage: clampPct((funnel.addToCart / funnelBase) * 100), tone: "blue" as Tone },
    { label: "بدء الدفع", value: funnel.checkout, percentage: clampPct((funnel.checkout / funnelBase) * 100), tone: "amber" as Tone },
    { label: "طلبات مكتملة", value: funnel.purchases, percentage: clampPct((funnel.purchases / funnelBase) * 100), tone: "green" as Tone },
  ];

  const conversionRate = funnel.visitors > 0 ? (funnel.purchases / funnel.visitors) * 100 : 0;

  const totalStatusOrders = Object.values(statusCounts).reduce((sum, value) => sum + value, 0);

  return (
    <div dir="rtl" className="w-full space-y-4">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="flex flex-col gap-4 border-b border-[#E4E8ED] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-[7px] flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#675CBA]" />
            <span className="text-[7.5px] font-bold tracking-[0.07em] text-[#989FA9]">OVERVIEW</span>
          </div>

          <h1 className="text-[23px] font-bold leading-none tracking-[-0.5px] text-[#20252E] md:text-[25px]">المؤشرات العامة</h1>
          <p className="mt-[7px] text-[10px] font-medium text-[#8F97A2]">نظرة موحدة على المبيعات والعملاء والعمليات في Flamingo Park</p>

          <div className="mt-[8px] flex items-center gap-[5px] text-[7.5px] text-[#A0A7B0]">
            <CalendarDays className="h-[10px] w-[10px]" strokeWidth={1.7} />
            <span>{rangeText}</span>
          </div>
        </div>

        <div className="flex items-center gap-[7px]">
          <div className="[&_button]:!h-[38px] [&_button]:!rounded-[10px] [&_button]:!border-[#E2E6EB] [&_button]:!bg-white [&_button]:!px-3 [&_button]:!text-[9px] [&_button]:!font-medium [&_button]:!text-[#59616C] [&_button]:!shadow-none">
            <DateRangePicker />
          </div>

          <Link to="/admin/reports" className="hidden h-[38px] items-center gap-[7px] rounded-[10px] border border-[#E2E6EB] bg-white px-3 text-[9px] font-semibold text-[#5F6772] transition-colors hover:bg-[#F8FAFC] sm:flex">
            <BarChart3 className="h-[12px] w-[12px] text-[#675CBA]" strokeWidth={1.8} />
            التقارير
          </Link>
        </div>
      </header>

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] md:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="إجمالي الإيرادات" value={fmt(currentKpi.revenue)} suffix="ر.س" delta={currentKpi.revenueDelta} loading={loading} icon={Wallet} tone="indigo" />
        <MetricCard title="صافي الربح" value={fmt(currentKpi.profit)} suffix="ر.س" delta={currentKpi.profitDelta} loading={loading} icon={CircleDollarSign} tone="green" />
        <MetricCard title="الطلبات" value={fmt(currentKpi.orders)} delta={currentKpi.ordersDelta} loading={loading} icon={ShoppingCart} tone="coral" />
        <MetricCard title="متوسط الطلب" value={fmt(averageOrderValue)} suffix="ر.س" delta={averageOrderDelta} loading={loading} icon={Receipt} tone="blue" />
        <MetricCard title="العملاء" value={fmt(currentKpi.customers)} delta={currentKpi.customersDelta} loading={loading} icon={Users} tone="teal" />
        <MetricCard title="بانتظار المعالجة" value={fmt(pendingCount)} delta={pendingDelta} loading={loading} icon={Clock3} tone="amber" />
      </section>

      {issues.length > 0 && (
        <div className="flex items-center gap-[9px] rounded-[12px] border border-[#F0DFC4] bg-[#FFF9EF] px-3 py-[10px]">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] bg-[#FFF0D3] text-[#B47B2C]">
            <AlertTriangle className="h-[13px] w-[13px]" strokeWidth={1.7} />
          </div>

          <p className="text-[8.5px] font-medium text-[#8C7048]">تم تحميل بعض أجزاء لوحة التحكم جزئيًا: {issues.join("، ")}</p>
        </div>
      )}

      {/* =====================================================
          SALES + FUNNEL
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-12">
        <div className="min-h-[330px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-8">
          <CardHeader
            title="المبيعات والأداء"
            description="حركة الإيرادات خلال الفترة المحددة"
            icon={TrendingUp}
            tone="indigo"
            action={
              <div className="hidden items-center gap-5 sm:flex">
                <div>
                  <div className="flex items-center gap-[5px]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#675CBA]" />
                    <span className="text-[7.5px] text-[#939AA4]">الإيرادات</span>
                  </div>

                  <div className="mt-[5px] flex items-end gap-[5px]">
                    <span dir="ltr" className="text-[19px] font-semibold leading-none text-[#2C323C]">{compact(currentKpi.revenue)}</span>
                    <span className="text-[7px] text-[#999FA9]">ر.س</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-[5px]">
                    <span className="h-[6px] w-[6px] rounded-full bg-[#D8DDE5]" />
                    <span className="text-[7.5px] text-[#939AA4]">صافي الربح</span>
                  </div>

                  <div className="mt-[5px] flex items-end gap-[5px]">
                    <span dir="ltr" className="text-[19px] font-semibold leading-none text-[#2C323C]">{compact(currentKpi.profit)}</span>
                    <span className="text-[7px] text-[#999FA9]">ر.س</span>
                  </div>
                </div>
              </div>
            }
          />

          <div className="mt-4 h-[250px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueDashboardGradientV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#675CBA" stopOpacity={0.18} />
                    <stop offset="60%" stopColor="#675CBA" stopOpacity={0.04} />
                    <stop offset="100%" stopColor="#675CBA" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} stroke="#EDF0F4" strokeDasharray="3 4" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AD", fontSize: 8 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#A2A8B1", fontSize: 8 }} tickFormatter={(value) => compact(Number(value))} />

                <Tooltip cursor={{ stroke: "#D8DCE4", strokeDasharray: "3 3" }} contentStyle={{ background: "#FFFFFF", border: "1px solid #E4E8EE", borderRadius: "10px", boxShadow: "0 12px 30px rgba(31,39,55,0.08)", fontSize: "9px" }} labelStyle={{ color: "#89919C", marginBottom: "5px" }} formatter={(value, name) => [`${fmt(Number(value || 0))} ر.س`, name === "revenue" ? "الإيرادات" : "المتوسط"]} />

                <Area type="monotone" dataKey="average" stroke="#CDD3DC" strokeWidth={1.3} fill="transparent" dot={false} activeDot={false} />
                <Area type="monotone" dataKey="revenue" stroke="#675CBA" strokeWidth={2} fill="url(#revenueDashboardGradientV2)" dot={false} activeDot={{ r: 4, fill: "#675CBA", stroke: "#FFFFFF", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-h-[330px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-4">
          <CardHeader
            title="مسار المبيعات"
            description="رحلة العميل حتى إتمام الطلب"
            icon={ShoppingCart}
            tone="coral"
            action={
              <div className="text-left">
                <p className="text-[7.5px] text-[#9AA1AB]">التحويل</p>

                <div className="mt-[3px] flex items-center gap-[5px]">
                  <span dir="ltr" className="text-[19px] font-semibold leading-none text-[#2B313B]">{conversionRate.toFixed(1)}%</span>
                  <span className="rounded-[6px] bg-[#EAF7EE] px-[5px] py-[2px] text-[6.5px] font-semibold text-[#57906A]">مباشر</span>
                </div>
              </div>
            }
          />

          <div className="mt-5 grid grid-cols-1 gap-[8px] sm:grid-cols-2 xl:grid-cols-1">
            {funnelSteps.map((step) => <FunnelStep key={step.label} label={step.label} value={step.value} percentage={step.percentage} tone={step.tone} />)}
          </div>
        </div>
      </section>

      {/* =====================================================
          TODAY + SESSIONS + CURRENCY
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-12">
        <div className="min-h-[238px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-4">
          <CardHeader title="ملخص اليوم" description="أداء اليوم مقارنة بيوم أمس" icon={CalendarDays} tone="blue" />

          <div className="mt-4 grid grid-cols-2 gap-[8px]">
            <MiniMetric title="إيرادات اليوم" value={compact(todayStats.revenue)} suffix="ر.س" delta={todayStats.revenueDelta} icon={Wallet} tone="indigo" />
            <MiniMetric title="طلبات اليوم" value={fmt(todayStats.orders)} delta={todayStats.ordersDelta} icon={ShoppingCart} tone="coral" />
            <MiniMetric title="زوار اليوم" value={fmt(todayStats.visitors)} delta={todayStats.visitorsDelta} icon={Users} tone="teal" />
            <MiniMetric title="نسبة التحويل" value={`${todayStats.conversion.toFixed(1)}%`} delta={todayStats.conversionDelta} icon={TrendingUp} tone="green" />
          </div>
        </div>

        <div className="xl:col-span-3">
          <SessionGauge sessions={sessions} previousSessions={previousSessions} />
        </div>

        <div className="min-h-[238px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-5">
          <CardHeader title="الإيرادات حسب العملة" description="توزيع المبيعات حسب عملة الطلب" icon={CircleDollarSign} tone="green" />

          <div className="mt-5 grid grid-cols-3 gap-[8px]">
            {currencyRows.map((row, index) => (
              <div key={row.mode} className="rounded-[12px] border border-[#E9ECF1] bg-[#FAFBFC] p-[10px]">
                <div className="flex items-center gap-[5px]">
                  <span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: CURRENCY_COLORS[index] }} />
                  <span className="truncate text-[7.5px] font-medium text-[#8F96A0]">{row.label}</span>
                </div>

                <div className="mt-[9px] flex items-baseline gap-[4px]">
                  <span dir="ltr" className="text-[15px] font-semibold text-[#343A44]">{compact(row.nativeRevenue)}</span>
                  <span className="text-[6.5px] text-[#969DA7]">{row.symbol}</span>
                </div>

                <p className="mt-[3px] text-[7px] text-[#A0A6AF]">{fmt(row.orders)} طلب</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex h-[7px] w-full overflow-hidden rounded-full bg-[#EEF1F4]">
            {currencyRows.map((row, index) => <div key={row.mode} style={{ width: `${row.percentage}%`, backgroundColor: CURRENCY_COLORS[index] }} />)}
          </div>

          <div className="mt-4 space-y-[8px]">
            {currencyRows.map((row, index) => (
              <div key={row.mode} className="flex items-center gap-[7px]">
                <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: CURRENCY_COLORS[index] }} />
                <span className="text-[7.5px] text-[#828A95]">{row.label}</span>

                <div className="mr-auto flex items-center gap-3">
                  <span dir="ltr" className="text-[7.5px] font-semibold text-[#5D6570]">{row.percentage.toFixed(0)}%</span>
                  <span dir="ltr" className="w-[60px] text-left text-[7px] text-[#A0A6AF]">{compact(row.convertedRevenue)} ر.س</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================
          STATUS + REGION + ALERTS
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-12">
        <div className="min-h-[250px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-4">
          <CardHeader title="حالة الطلبات" description="توزيع الطلبات حسب المرحلة الحالية" icon={Package} tone="blue" action={<span dir="ltr" className="text-[17px] font-semibold text-[#343A44]">{fmt(totalStatusOrders)}</span>} />

          <div className="mt-4 grid grid-cols-2 gap-[7px]">
            {(Object.keys(STATUS_META) as StatusKey[]).map((key) => {
              const item = STATUS_META[key];
              const Icon = item.icon;

              return (
                <div key={key} className="relative overflow-hidden rounded-[12px] border border-[#E8EBF0] bg-[#FAFBFC] p-[9px]">
                  <span className="absolute inset-y-0 right-0 w-[2px]" style={{ backgroundColor: item.bar }} />

                  <div className="flex items-center gap-[8px]">
                    <div className={`flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[9px] ${item.bg} ${item.text}`}>
                      <Icon className="h-[13px] w-[13px]" strokeWidth={1.7} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[7.5px] text-[#8C939D]">{item.label}</p>
                      <p dir="ltr" className="mt-[2px] text-[13px] font-semibold text-[#3C424C]">{fmt(statusCounts[key])}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-[250px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-4">
          <CardHeader title="المبيعات حسب المنطقة" description="أفضل المناطق حسب صافي الإيرادات" icon={BarChart3} tone="cyan" />

          <div className="mt-4">
            {regions.length > 0 ? (
              <div className="space-y-[4px]">
                {regions.map((region, index) => (
                  <div key={region.region} className="flex items-center gap-[9px] rounded-[10px] px-[7px] py-[7px] transition-colors hover:bg-[#F8FAFC]">
                    <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[8px] bg-[#EFF6F9] text-[7.5px] font-semibold text-[#4A90A6]">{index + 1}</span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[8.5px] font-medium text-[#515964]">{region.region}</p>
                      <p className="mt-[2px] text-[6.5px] text-[#A0A6AF]">{fmt(region.orders)} طلب</p>
                    </div>

                    <div className="text-left">
                      <p dir="ltr" className="text-[9px] font-semibold text-[#3F4650]">{compact(region.revenue)}</p>
                      <p className="mt-[1px] text-[6px] text-[#A1A7B0]">ر.س</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[160px] flex-col items-center justify-center gap-[8px] text-center">
                <BarChart3 className="h-[21px] w-[21px] text-[#C4C9D0]" strokeWidth={1.5} />
                <p className="text-[8px] text-[#A0A6AF]">لا توجد مبيعات في الفترة المحددة</p>
              </div>
            )}
          </div>
        </div>

        <div className="min-h-[250px] rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-4">
          <CardHeader title="تحتاج انتباهك" description="أهم الأمور التي تستحق المتابعة" icon={AlertTriangle} tone="amber" />

          <div className="mt-4 space-y-[8px]">
            <Link to="/admin/orders" className="group flex items-center gap-[10px] rounded-[12px] border border-[#EFE5D4] bg-[#FFFAF3] p-[10px] transition-colors hover:border-[#E9D9BC]">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0D5] text-[#B47B2C]">
                <Clock3 className="h-[15px] w-[15px]" strokeWidth={1.7} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-medium text-[#85745A]">طلبات تنتظر المعالجة</p>
                <p className="mt-[3px] text-[13px] font-semibold text-[#393F48]">{fmt(pendingCount)} طلب</p>
              </div>

              <ArrowUpLeft className="h-[12px] w-[12px] text-[#AAA08F] transition-colors group-hover:text-[#B47B2C]" />
            </Link>

            <Link to="/admin/inventory-adjustments" className="group flex items-center gap-[10px] rounded-[12px] border border-[#F0DCDC] bg-[#FFF7F7] p-[10px] transition-colors hover:border-[#EACCCC]">
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#FFEAEA] text-[#C76161]">
                <Boxes className="h-[15px] w-[15px]" strokeWidth={1.7} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-medium text-[#8C6E6E]">منتجات منخفضة المخزون</p>
                <p className="mt-[3px] text-[13px] font-semibold text-[#393F48]">{fmt(lowStock.length)} منتج</p>
              </div>

              <ArrowUpLeft className="h-[12px] w-[12px] text-[#ADA0A0] transition-colors group-hover:text-[#C76161]" />
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================
          ORDERS + RIGHT COLUMN
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-12">
        <div className="min-h-[330px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-8">
          <div className="border-b border-[#EBEEF2] p-[14px]">
            <CardHeader
              title="آخر الطلبات"
              description="أحدث الطلبات المسجلة في المتجر"
              icon={Receipt}
              tone="coral"
              action={
                <Link to="/admin/orders" className="flex h-[30px] items-center gap-[5px] rounded-[8px] border border-[#E5E9EE] bg-white px-[9px] text-[7.5px] font-semibold text-[#727A85] transition-colors hover:bg-[#F8FAFC]">
                  عرض الكل
                  <ArrowUpLeft className="h-[10px] w-[10px]" />
                </Link>
              }
            />
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1fr_1.35fr_.8fr_.9fr_1fr_.4fr] items-center border-b border-[#EDF0F3] bg-[#FAFBFC] px-[14px] py-[9px] text-[7.5px] font-semibold text-[#969DA7]">
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
                    <div key={order?.id || orderNameOf(order)} className="grid grid-cols-[1fr_1.35fr_.8fr_.9fr_1fr_.4fr] items-center border-b border-[#F0F2F5] px-[14px] py-[11px] text-[8.5px] last:border-b-0 hover:bg-[#FCFDFE]">
                      <span dir="ltr" className="text-right font-semibold text-[#454C56]">{orderNameOf(order)}</span>
                      <span className="truncate text-[#666E79]">{customerNameOf(order)}</span>

                      <span dir="ltr" className="text-right font-semibold text-[#3C434D]">
                        {fmt(toSar(Number(order?.total || 0), order))}
                        <span className="mr-[3px] text-[6.5px] font-normal text-[#A0A6AF]">ر.س</span>
                      </span>

                      <span>
                        <span className={`inline-flex rounded-[7px] px-[7px] py-[4px] text-[7px] font-semibold ${meta.bg} ${meta.text}`}>{meta.label}</span>
                      </span>

                      <span className="text-[7.5px] text-[#8D949E]">{safeDate(order?.created_at)}</span>

                      <Link to="/admin/orders" className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] border border-[#E7EAEF] bg-white text-[#8B929C] transition-colors hover:border-[#DDE1E7] hover:bg-[#F7F9FB] hover:text-[#675CBA]">
                        <Eye className="h-[12px] w-[12px]" strokeWidth={1.7} />
                      </Link>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-[220px] flex-col items-center justify-center gap-[8px]">
                  <Receipt className="h-[22px] w-[22px] text-[#C6CBD2]" strokeWidth={1.5} />
                  <p className="text-[8px] text-[#A0A6AF]">لا توجد طلبات حديثة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-[10px] xl:col-span-4">
          {/* QUICK ACTIONS */}

          <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
            <CardHeader title="إجراءات سريعة" description="اختصارات لأكثر المهام استخدامًا" icon={PackagePlus} tone="blue" />

            <div className="mt-4 grid grid-cols-2 gap-[7px]">
              <QuickLink to="/admin/products/new" title="إضافة منتج" subtitle="منتج جديد" icon={PackagePlus} tone="blue" />
              <QuickLink to="/admin/orders" title="إدارة الطلبات" subtitle="متابعة الطلبات" icon={Receipt} tone="coral" />
              <QuickLink to="/admin/customers" title="العملاء" subtitle="قاعدة العملاء" icon={UserPlus} tone="teal" />
              <QuickLink to="/admin/inventory-adjustments" title="المخزون" subtitle="تعديلات المخزون" icon={Boxes} tone="amber" />
            </div>
          </div>

          {/* LOW STOCK */}

          <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
            <CardHeader
              title="المخزون المنخفض"
              description="منتجات تحتاج لإعادة التزويد"
              icon={Boxes}
              tone="rose"
              action={<span className="flex min-w-[25px] items-center justify-center rounded-[7px] bg-[#FFF0F0] px-[6px] py-[4px] text-[7.5px] font-semibold text-[#C76161]">{fmt(lowStock.length)}</span>}
            />

            <div className="mt-3 space-y-[2px]">
              {lowStock.length > 0 ? (
                lowStock.slice(0, 4).map((product: any) => (
                  <div key={product?.id || product?.sku || productNameOf(product)} className="flex items-center gap-[9px] rounded-[10px] px-[6px] py-[7px] transition-colors hover:bg-[#F8FAFC]">
                    <div className="flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[9px] bg-[#FFF0F4] text-[#BC6377]">
                      <Package className="h-[13px] w-[13px]" strokeWidth={1.6} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[8px] font-medium text-[#535B65]">{productNameOf(product)}</p>
                      <p className="mt-[2px] truncate text-[6.5px] text-[#9DA4AD]">{product?.sku ? `SKU: ${product.sku}` : "مخزون منخفض"}</p>
                    </div>

                    <div className="text-left">
                      <p dir="ltr" className="text-[10px] font-semibold text-[#C76161]">{fmt(stockOf(product))}</p>
                      <p className="text-[6px] text-[#A3A9B1]">متبقي</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-[112px] flex-col items-center justify-center gap-[8px]">
                  <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-[#EAF7EE] text-[#57906A]">
                    <CheckCircle2 className="h-[16px] w-[16px]" strokeWidth={1.7} />
                  </div>

                  <p className="text-[8px] font-medium text-[#7F8791]">المخزون بحالة جيدة</p>
                </div>
              )}
            </div>

            {lowStock.length > 4 && (
              <Link to="/admin/products" className="mt-3 flex h-[32px] items-center justify-center rounded-[9px] border border-[#E6E9EE] bg-[#FAFBFC] text-[7.5px] font-semibold text-[#727A84] transition-colors hover:bg-white">
                عرض جميع المنتجات
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="flex items-center justify-between border-t border-[#E7EAEF] px-[2px] pt-3 text-[6.5px] font-medium text-[#A2A8B1]">
        <span>Flamingo Park Analytics</span>

        <span className="flex items-center gap-[4px]">
          <CalendarDays className="h-[9px] w-[9px]" strokeWidth={1.5} />
          {rangeText}
        </span>
      </div>
    </div>
  );
};

/* =========================================================
   QUICK LINK
========================================================= */

const QuickLink = ({ to, title, subtitle, icon: Icon, tone }: { to: string; title: string; subtitle: string; icon: LucideIcon; tone: Tone }) => {
  const palette = tones[tone];

  return (
    <Link to={to} className="group flex min-h-[74px] flex-col justify-between rounded-[12px] border border-[#E8EBF0] bg-[#FAFBFC] p-[10px] transition-colors duration-150 hover:border-[#DDE2E8] hover:bg-white">
      <div className={`flex h-[28px] w-[28px] items-center justify-center rounded-[9px] ${palette.icon}`}>
        <Icon className="h-[13px] w-[13px]" strokeWidth={1.7} />
      </div>

      <div>
        <p className="text-[8.5px] font-semibold text-[#505862]">{title}</p>
        <p className="mt-[2px] text-[6.5px] text-[#9CA3AC]">{subtitle}</p>
      </div>
    </Link>
  );
};

export default AdminDashboard;