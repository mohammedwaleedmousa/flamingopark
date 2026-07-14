import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TodayOverview from "@/components/admin/dashboard/TodayOverview";
import CurrencySummary from "@/components/admin/dashboard/CurrencySummary";
import QuickActions from "@/components/admin/dashboard/QuickActions";
import KpiCards from "@/components/admin/dashboard/KpiCards";
import DashboardHeader from "@/components/admin/dashboard/DashboardHeader";
import {
  useRevenueSummary,
  useOrdersSummary,
  useCustomersCount,
  useRevenueTimeseries,
  useProfitSummary,
  useRecentOrders,
  useLowStock,
} from "@/lib/analytics/hooks";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { getCustomersCount, getOrdersSummary, getProfitSummary, getRevenueSummary } from "@/lib/admin/service";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Wallet,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus, PackagePlus, UserPlus, Receipt } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import DashboardAlerts from "@/components/admin/dashboard/DashboardAlerts";
import RevenueChart from "@/components/admin/dashboard/RevenueChart";
import RecentActivity from "@/components/admin/dashboard/RecentActivity";

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

const CURRENCY_META: Record<CurrencyMode, { label: string; symbol: string }> = {
  SAR: { label: "ريال سعودي", symbol: "ر.س" },
  YER_SOUTH: { label: "ريال يمني (جنوب)", symbol: "ر.ي" },
  YER_NORTH: { label: "ريال يمني (شمال)", symbol: "ر.ي" },
};

const modeOf = (row: any): CurrencyMode => {
  const mode = row?.currency_mode;
  if (mode === "SAR" || mode === "YER_SOUTH" || mode === "YER_NORTH") return mode;
  if (row?.country === "SA") return "SAR";
  return "YER_SOUTH";
};

const SAR_RATE_BY_MODE: Record<CurrencyMode, number> = {
  SAR: 1,
  YER_SOUTH: 1 / 410,
  YER_NORTH: 1 / 140,
};

const toSar = (amount: number, row: any) => {
  const mode = modeOf(row);
  return Number(amount || 0) * (SAR_RATE_BY_MODE[mode] ?? 1);
};

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const currency = "ر.س";

const toLocalYmd = (d: Date) => {
  const copy = new Date(d);
  const offsetMs = copy.getTimezoneOffset() * 60000;
  return new Date(copy.getTime() - offsetMs).toISOString().slice(0, 10);
};

const toDayStart = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const toDayEnd = (d: Date) => {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const calcDelta = (current: number, previous: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const clampPct = (v: number) => Math.max(0, Math.min(100, v));

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<Kpi>({
    revenue: 0,
    revenueDelta: 0,
    profit: 0,
    profitDelta: 0,
    orders: 0,
    ordersDelta: 0,
    customers: 0,
    customersDelta: 0,
  });
  const [chart, setChart] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [ordersByDate, setOrdersByDate] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [prevKpi, setPrevKpi] = useState({ revenue: 0, profit: 0, orders: 0, customers: 0 });
  const [localErrors, setLocalErrors] = useState({
    today: "",
    pending: "",
    previousKpi: "",
    ordersSeries: "",
  });
  const [todayStats, setTodayStats] = useState({
    revenue: 0,
    orders: 0,
    visitors: 0,
    conversion: 0,
    revenueDelta: 0,
    ordersDelta: 0,
    visitorsDelta: 0,
    conversionDelta: 0,
  });
  const { range } = useDateRange();

  const rangeText = useMemo(() => {
    const start = format(new Date(range.start), "dd MMM yyyy", { locale: ar });
    const end = format(new Date(range.end), "dd MMM yyyy", { locale: ar });
    return `${start} - ${end}`;
  }, [range.start, range.end]);

  const rangeDays = useMemo(() => {
    const start = toDayStart(new Date(range.start)).getTime();
    const end = toDayEnd(new Date(range.end)).getTime();
    return Math.max(1, Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1);
  }, [range.start, range.end]);

  const previousRange = useMemo(() => {
    const start = toDayStart(new Date(range.start));
    const end = toDayEnd(new Date(range.end));
    const spanMs = Math.max(0, end.getTime() - start.getTime());
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return { start: toLocalYmd(prevStart), end: toLocalYmd(prevEnd) };
  }, [range.start, range.end]);

  const loadTodayStats = async () => {
    try {
      const now = new Date();
      const dayStart = toDayStart(now);
      const dayEnd = toDayEnd(now);
      const yStart = toDayStart(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const yEnd = toDayEnd(new Date(now.getTime() - 24 * 60 * 60 * 1000));

      const [ordersTodayRes, eventsTodayRes, ordersYesterdayRes, eventsYesterdayRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total,status,created_at,country,currency_mode")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString()),
        supabase
          .from("analytics_events")
          .select("session_id,event_type,created_at")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString()),
        supabase
          .from("orders")
          .select("total,status,created_at,country,currency_mode")
          .gte("created_at", yStart.toISOString())
          .lte("created_at", yEnd.toISOString()),
        supabase
          .from("analytics_events")
          .select("session_id,event_type,created_at")
          .gte("created_at", yStart.toISOString())
          .lte("created_at", yEnd.toISOString()),
      ]);

      const readOrders = (rows: any[]) => {
        const valid = rows.filter((o: any) => {
          const status = String(o?.status || "").toLowerCase();
          return status !== "cancelled" && status !== "canceled";
        });
        const revenue = valid.reduce((sum: number, o: any) => sum + toSar(Number(o?.total ?? 0), o), 0);
        return { revenue, orders: valid.length };
      };

      const readEvents = (rows: any[]) => {
        const visitorSessions = new Set<string>();
        const checkoutSessions = new Set<string>();
        for (const ev of rows) {
          const sid = String(ev?.session_id || "").trim();
          if (!sid) continue;
          visitorSessions.add(sid);
          const type = String(ev?.event_type || "").toLowerCase();
          if (type === "checkout" || type === "purchase") checkoutSessions.add(sid);
        }
        const visitors = visitorSessions.size;
        const conversion = visitors > 0 ? Number(((checkoutSessions.size / visitors) * 100).toFixed(1)) : 0;
        return { visitors, conversion };
      };

      const todayOrders = readOrders(ordersTodayRes.error ? [] : (ordersTodayRes.data ?? []));
      const yesterdayOrders = readOrders(ordersYesterdayRes.error ? [] : (ordersYesterdayRes.data ?? []));
      const todayEvents = readEvents(eventsTodayRes.error ? [] : (eventsTodayRes.data ?? []));
      const yesterdayEvents = readEvents(eventsYesterdayRes.error ? [] : (eventsYesterdayRes.data ?? []));

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
      setLocalErrors((prev) => ({ ...prev, today: "" }));
    } catch (error) {
      console.error("Failed to load today stats", error);
      setLocalErrors((prev) => ({ ...prev, today: "تعذر تحميل إحصائيات اليوم" }));
    }
  };

  // Use analytics hooks which respond to the global DateRange
  const rev = useRevenueSummary();
  const ord = useOrdersSummary();
  const cust = useCustomersCount();
  const ts = useRevenueTimeseries();
  const profit = useProfitSummary();
  const recentQ = useRecentOrders();
  const lowQ = useLowStock();

  const partialIssues = useMemo(() => {
    const issues: string[] = [];
    if (rev.error) issues.push("تعذر تحميل ملخص الإيرادات");
    if (ord.error) issues.push("تعذر تحميل ملخص الطلبات");
    if (cust.error) issues.push("تعذر تحميل العملاء");
    if (profit.error) issues.push("تعذر تحميل ملخص الأرباح");
    if (ts.error) issues.push("تعذر تحميل السلسلة الزمنية");
    if (recentQ.error) issues.push("تعذر تحميل آخر النشاطات");
    if (lowQ.error) issues.push("تعذر تحميل تنبيهات المخزون");
    if (localErrors.today) issues.push(localErrors.today);
    if (localErrors.pending) issues.push(localErrors.pending);
    if (localErrors.previousKpi) issues.push(localErrors.previousKpi);
    if (localErrors.ordersSeries) issues.push(localErrors.ordersSeries);
    return Array.from(new Set(issues));
  }, [rev.error, ord.error, cust.error, profit.error, ts.error, recentQ.error, lowQ.error, localErrors]);

  const revenueByCurrency = rev.data?.byCurrency || {
    SAR: { revenue: 0, orders: 0 },
    YER_SOUTH: { revenue: 0, orders: 0 },
    YER_NORTH: { revenue: 0, orders: 0 },
  };

  const revenueByCurrencyNative = rev.data?.byCurrencyNative || {
    SAR: { revenue: 0, orders: 0 },
    YER_SOUTH: { revenue: 0, orders: 0 },
    YER_NORTH: { revenue: 0, orders: 0 },
  };

  useEffect(() => {
    // when queries update, map to local state used by template
    setLoading(rev.isLoading || ord.isLoading || cust.isLoading || profit.isLoading);

    const revenue = rev.data?.revenue ?? 0;
    const ordersCount = ord.data?.count ?? 0;
    const customersCount = cust.data?.customers ?? 0;
    const profitVal = profit.data?.profit ?? 0;

    setKpi({
      revenue,
      revenueDelta: calcDelta(revenue, prevKpi.revenue),
      profit: profitVal,
      profitDelta: calcDelta(profitVal, prevKpi.profit),
      orders: ordersCount,
      ordersDelta: calcDelta(ordersCount, prevKpi.orders),
      customers: customersCount,
      customersDelta: calcDelta(customersCount, prevKpi.customers),
    });

    setChart(
      (ts.data ?? []).map((r: any) => ({
        date: r?.date ? String(r.date).slice(5) : "",
        revenue: Math.round(Number(r?.total) || 0),
        orders: ordersByDate[String(r?.date ?? "")] ?? 0,
      })),
    );
    setRecent(recentQ.data ?? []);
    setLowStock(lowQ.data ?? []);
  }, [rev.data, ord.data, cust.data, ts.data, profit.data, recentQ.data, lowQ.data, prevKpi, ordersByDate]);

  useEffect(() => {
    let active = true;

    const loadPreviousKpi = async () => {
      try {
        const [revPrev, ordPrev, custPrev, profitPrev] = await Promise.all([
          getRevenueSummary(previousRange.start, previousRange.end),
          getOrdersSummary(previousRange.start, previousRange.end),
          getCustomersCount(previousRange.start, previousRange.end),
          getProfitSummary(previousRange.start, previousRange.end),
        ]);

        if (!active) return;
        setPrevKpi({
          revenue: revPrev.revenue || 0,
          orders: ordPrev.count || 0,
          customers: custPrev.customers || 0,
          profit: profitPrev.profit || 0,
        });
        setLocalErrors((prev) => ({ ...prev, previousKpi: "" }));
      } catch (error) {
        console.error("Failed to load previous KPI range", error);
        setLocalErrors((prev) => ({ ...prev, previousKpi: "تعذر تحميل مقارنة الفترة السابقة" }));
      }
    };

    loadPreviousKpi();

    return () => {
      active = false;
    };
  }, [previousRange.start, previousRange.end]);

  useEffect(() => {
    let active = true;

    const loadPendingCount = async () => {
      const fromIso = toDayStart(new Date(range.start)).toISOString();
      const toIso = toDayEnd(new Date(range.end)).toISOString();

      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      if (!active) return;
      if (error) {
        console.error("Failed to load pending count", error);
        setLocalErrors((prev) => ({ ...prev, pending: "تعذر تحميل عدد الطلبات المعلقة" }));
        return;
      }
      setLocalErrors((prev) => ({ ...prev, pending: "" }));
      setPendingCount(count ?? 0);
    };

    loadPendingCount();
    const intervalId = window.setInterval(loadPendingCount, 30000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [range.start, range.end]);

  useEffect(() => {
    let active = true;

    const loadOrdersTimeseries = async () => {
      const fromIso = toDayStart(new Date(range.start)).toISOString();
      const toIso = toDayEnd(new Date(range.end)).toISOString();

      const { data, error } = await supabase
        .from("orders")
        .select("created_at,status")
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      if (!active) return;
      if (error) {
        console.error("Failed to load orders timeseries", error);
        setOrdersByDate({});
        setLocalErrors((prev) => ({ ...prev, ordersSeries: "تعذر تحميل السلسلة اليومية للطلبات" }));
        return;
      }

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const status = String((row as any)?.status || "").toLowerCase();
        if (status === "cancelled" || status === "canceled") continue;
        const key = String((row as any)?.created_at || "").slice(0, 10);
        if (!key) continue;
        counts[key] = (counts[key] ?? 0) + 1;
      }

      setOrdersByDate(counts);
      setLocalErrors((prev) => ({ ...prev, ordersSeries: "" }));
    };

    loadOrdersTimeseries();
    const intervalId = window.setInterval(loadOrdersTimeseries, 20000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [range.start, range.end]);

  useEffect(() => {
    let active = true;

    const refresh = async () => {
      if (!active) return;
      await loadTodayStats();
    };

    refresh();
    const intervalId = window.setInterval(refresh, 15000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const kpis = [
    {
      label: "الإيرادات (30 يوم)",
      value: `${fmt(kpi.revenue)} ${currency}`,
      delta: kpi.revenueDelta,
      icon: DollarSign,
      tint: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "صافي الربح",
      value: `${fmt(kpi.profit)} ${currency}`,
      delta: kpi.profitDelta,
      icon: Wallet,
      tint: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "الطلبات",
      value: fmt(kpi.orders),
      delta: kpi.ordersDelta,
      icon: ShoppingCart,
      tint: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "عملاء جدد",
      value: fmt(kpi.customers),
      delta: kpi.customersDelta,
      icon: Users,
      tint: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const statusLabel: Record<string, string> = {
    pending: "قيد الانتظار",
    confirmed: "مؤكد",
    processing: "تجهيز",
    shipped: "شحن",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };
  const statusTone: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 ring-amber-200",
    confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
    processing: "bg-violet-50 text-violet-700 ring-violet-200",
    shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[1600px] space-y-10 px-6 lg:px-10 pb-10 bg-slate-50 min-h-screen">
      <DashboardHeader
        rangeText={rangeText}
      />

      {partialIssues.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">تم تحميل البيانات جزئيًا</p>
          <p className="text-xs mt-1">{partialIssues.join(" - ")}</p>
        </section>
      )}
      {/* KPI */}
      <KpiCards
        kpis={kpis}
        loading={loading}
      />

      {/* Today's Overview */}
      <TodayOverview
        todayStats={todayStats}
        currency={currency}
        fmt={fmt}
        clampPct={clampPct}
      />

      {/* Multi-currency summary */}
      <CurrencySummary
        revenueByCurrencyNative={revenueByCurrencyNative}
        revenueByCurrency={revenueByCurrency}
        currencyMeta={CURRENCY_META}
        fmt={fmt}
      />

      {/* Quick Actions */}
      <QuickActions />
      
      {/* Alerts */}
      <DashboardAlerts
        pendingCount={pendingCount}
        lowStock={lowStock}
        rangeText={rangeText}
      />

      {/* Revenue chart */}
      <RevenueChart
        chart={chart}
        rangeDays={rangeDays}
        currency={currency}
        fmt={fmt}
      />

      {/* Recent activity */}
      <RecentActivity
        recent={recent}
        loading={loading}
        fmt={fmt}
        toSar={toSar}
        statusTone={statusTone}
        statusLabel={statusLabel}
      />
    </div>
  );
};

export default AdminDashboard;
