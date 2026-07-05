import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">لوحة التحكم</p>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground mt-1">نظرة عامة على المتجر</h1>
          <p className="text-sm text-muted-foreground mt-1">الأداء حسب الفترة المختارة مقارنة بالفترة السابقة لنفس المدة</p>
          <p className="text-xs text-muted-foreground mt-1">الفترة الحالية: {rangeText}</p>
          <p className="text-xs text-muted-foreground mt-1">المجاميع العامة موحدة إلى ر.س مع استبعاد الطلبات الملغاة، وبطاقات العملات تعرض القيمة الأصلية مع المعادل بالريال السعودي.</p>
        </div>
        <div className="w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-pink-200/70 bg-gradient-to-r from-rose-50 via-pink-50 to-white px-2 py-1.5 shadow-sm">
            <div className="flex items-center gap-1.5 rounded-xl border border-pink-200/80 bg-white/85 px-1.5 py-1 backdrop-blur-sm">
              <CalendarDays className="w-3.5 h-3.5 text-pink-600" />
              <DateRangePicker />
            </div>

            <Button
              asChild
              size="sm"
              className="h-8 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md transition-all duration-300 hover:scale-[1.03] rounded-xl px-3.5 text-xs"
            >
              <Link to="/admin/analytics">
                <BarChart3 className="w-4 h-4 ml-1" />
                التحليلات
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="h-8 bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 shadow-sm transition-all duration-300 hover:scale-[1.03] rounded-xl px-3.5 text-xs"
            >
              <Link to="/admin/finance">
                <Wallet className="w-4 h-4 ml-1" />
                المالية
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {partialIssues.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">تم تحميل البيانات جزئيًا</p>
          <p className="text-xs mt-1">{partialIssues.join(" - ")}</p>
        </section>
      )}
      {/* Today's Overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
          <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
          <p className="text-xs text-gray-500">مبيعات اليوم</p>

          <h2 className="text-2xl font-semibold mt-2">
            {fmt(todayStats.revenue)} {currency}
          </h2>

          <p className={cn("text-xs mt-3", todayStats.revenueDelta >= 0 ? "text-emerald-600" : "text-rose-600")}> 
            {todayStats.revenueDelta >= 0 ? "+" : ""}{todayStats.revenueDelta.toFixed(1)}% مقارنة بالأمس
          </p>
        </div>

        <div className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
          <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
          <p className="text-xs text-muted-foreground">طلبات اليوم</p>

          <h2 className="text-2xl font-semibold mt-2">{todayStats.orders}</h2>

          <div className="mt-4 h-2 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${clampPct(Math.abs(todayStats.ordersDelta))}%` }}></div>
          </div>
          <p className={cn("text-xs mt-2", todayStats.ordersDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {todayStats.ordersDelta >= 0 ? "+" : ""}{todayStats.ordersDelta.toFixed(1)}% مقارنة بالأمس
          </p>
        </div>

        <div className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
          <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
          <p className="text-xs text-muted-foreground">الزوار</p>

          <h2 className="text-2xl font-semibold mt-2">{todayStats.visitors}</h2>

          <p className={cn("text-xs mt-3", todayStats.visitorsDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {todayStats.visitorsDelta >= 0 ? "+" : ""}{todayStats.visitorsDelta.toFixed(1)}% مقارنة بالأمس
          </p>
        </div>

        <div className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
          <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
          <p className="text-xs text-muted-foreground">معدل التحويل</p>

          <h2 className="text-2xl font-semibold mt-2">{todayStats.conversion}%</h2>

          <div className="mt-4 h-2 rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${clampPct(todayStats.conversion)}%` }}></div>
          </div>
          <p className={cn("text-xs mt-2", todayStats.conversionDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {todayStats.conversionDelta >= 0 ? "+" : ""}{todayStats.conversionDelta.toFixed(1)}% مقارنة بالأمس
          </p>
        </div>
      </section>

      {/* Multi-currency summary */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["SAR", "YER_SOUTH", "YER_NORTH"] as CurrencyMode[]).map((mode) => (
          <div key={mode} className="relative p-4 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
            <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
            <p className="text-xs text-muted-foreground">{CURRENCY_META[mode].label}</p>
            <p className="text-lg font-semibold mt-1">
              {fmt(revenueByCurrencyNative[mode].revenue)} {CURRENCY_META[mode].symbol}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{fmt(revenueByCurrencyNative[mode].orders)} طلب</p>
            <p className="text-xs text-violet-700 mt-1">
              ما يعادل: {fmt(revenueByCurrency[mode].revenue)} ر.س
            </p>
          </div>
        ))}
      </section>
      {/* Quick Actions */}
      <section className="bg-white rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 p-5 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-base">الإجراءات السريعة</h2>

            <p className="text-xs text-muted-foreground">أكثر العمليات استخداماً</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/admin/products/new"
            className="group rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-5 hover:border-pink-300 hover:bg-pink-50/80 transition"
          >
            <PackagePlus className="w-8 h-8 text-pink-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">إضافة منتج</h3>

            <p className="text-xs text-muted-foreground mt-1">إنشاء منتج جديد</p>
          </Link>

          <Link
            to="/admin/orders"
            className="group rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-5 hover:border-blue-300 hover:bg-blue-50/80 transition"
          >
            <Receipt className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">الطلبات</h3>

            <p className="text-xs text-muted-foreground mt-1">مراجعة الطلبات</p>
          </Link>

          <Link
            to="/admin/customers"
            className="group rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-5 hover:border-green-300 hover:bg-green-50/80 transition"
          >
            <UserPlus className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">العملاء</h3>

            <p className="text-xs text-muted-foreground mt-1">إدارة العملاء</p>
          </Link>

          <Link
            to="/admin/categories"
            className="group rounded-2xl border border-black/5 bg-white/80 backdrop-blur p-5 hover:border-violet-300 hover:bg-violet-50/80 transition"
          >
            <Plus className="w-8 h-8 text-violet-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">الأقسام</h3>

            <p className="text-xs text-muted-foreground mt-1">إدارة التصنيفات</p>
          </Link>
        </div>
      </section>
      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group bg-white">
            <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
            <div className="flex items-start justify-between">
              <div className={cn("p-2.5 rounded-xl", k.bg)}>
                <k.icon className={cn("w-4.5 h-4.5", k.tint)} />
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  k.delta >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50",
                )}
              >
                {k.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(k.delta).toFixed(1)}%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              {loading ? (
                <Skeleton className="h-7 w-28 mt-1.5" />
              ) : (
                <p className="text-xl md:text-2xl font-heading text-foreground mt-1.5 tabular-nums">{k.value}</p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Alerts */}
      {(pendingCount > 0 || lowStock.length > 0) && (
        <section className="grid md:grid-cols-2 gap-3">
          {pendingCount > 0 && (
            <div className="rounded-2xl bg-amber-50/90 ring-1 ring-amber-200 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>

                  {/* نقطة تنبيه (pulse) */}
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full" />
                </div>

                <div>
                  <p className="text-sm font-medium text-amber-900">{pendingCount} طلبات بانتظار المراجعة</p>
                  <p className="text-xs text-amber-700/80">{rangeText}</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-amber-300">
                <Link to="/admin/orders">
                  عرض
                  <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                </Link>
              </Button>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="rounded-2xl bg-rose-50/90 ring-1 ring-rose-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-700" />
                  <p className="text-sm font-medium text-rose-900">مخزون منخفض</p>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/admin/products" className="text-rose-700">
                    إدارة
                  </Link>
                </Button>
              </div>
              <ul className="space-y-1">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-xs text-rose-900/90">
                    <span className="truncate">{p.name_ar}</span>
                    <span className="tabular-nums">{p.stock} قطعة</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Revenue chart */}
      <section className="bg-white rounded-2xl p-5 border-0 shadow-sm hover:shadow-xl transition-all duration-300 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-base">الإيرادات اليومية</h2>
            <p className="text-xs text-muted-foreground">آخر {rangeDays} يوم</p>
          </div>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={40} />
              <YAxis yAxisId="orders" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={36} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", direction: "rtl" }}
                formatter={(v: any, name: any) => {
                  if (name === "طلبات") return [fmt(Number(v)), "طلبات"];
                  return [`${fmt(Number(v))} ${currency}`, "إيراد"];
                }}
              />
              <Area type="monotone" dataKey="revenue" name="إيراد" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#rev)" />
              <Area yAxisId="orders" type="monotone" dataKey="orders" name="طلبات" stroke="#0ea5e9" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.04] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="font-heading text-base">آخر النشاطات</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/orders">عرض الكل</Link>
          </Button>
        </div>
        <div className="divide-y divide-black/5">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          {!loading && recent.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">لا يوجد نشاط حديث</p>
          )}
          {!loading &&
            recent.map((o, index) => (
              <div
                key={o.id}
                className="px-5 py-4 flex items-start justify-between hover:bg-black/[0.02] transition-colors relative"
              >
                {/* Timeline line */}
                {index !== recent.length - 1 && <span className="absolute left-6 top-10 w-px h-full bg-gray-100" />}

                {/* Left side */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar / Icon */}
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 grid place-items-center text-sm font-bold text-rose-600 shadow-sm">
                      {(o.customer_name || "?").charAt(0)}
                    </div>

                    {/* status dot */}
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{o.customer_name || "عميل"}</p>

                      {/* Badge type */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">طلب</span>
                    </div>

                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">#{o.order_number}</p>
                  </div>
                </div>

                {/* Right side */}
                <div className="text-left flex flex-col items-end gap-1">
                  {/* status */}
                  <span
                    className={cn(
                      "text-[10.5px] px-2 py-0.5 rounded-full ring-1",
                      statusTone[o.status] || "bg-gray-50 text-gray-600 ring-gray-200",
                    )}
                  >
                    {statusLabel[o.status] || o.status}
                  </span>

                  {/* amount */}
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(toSar(parseFloat(o.total) || 0, o))} ر.س
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
