import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRevenueSummary, useOrdersSummary, useCustomersCount, useRevenueTimeseries, useProfitSummary, useRecentOrders, useLowStock } from "@/lib/analytics/hooks";
import {
  Package, ShoppingCart, Users, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, ArrowUpRight, Activity, Wallet, BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Plus,
  PackagePlus,
  UserPlus,
  Receipt,
} from "lucide-react";

interface Kpi {
  revenue: number; revenueDelta: number;
  profit: number; profitDelta: number;
  orders: number; ordersDelta: number;
  customers: number; customersDelta: number;
}

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const currency = "ر.ي";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<Kpi>({ revenue: 0, revenueDelta: 0, profit: 0, profitDelta: 0, orders: 0, ordersDelta: 0, customers: 0, customersDelta: 0 });
  const [chart, setChart] = useState<{ date: string; revenue: number; orders: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayStats, setTodayStats] = useState({
    revenue: 0,
    orders: 0,
    visitors: 0,
    conversion: 0,
  });

  // Use analytics hooks which respond to the global DateRange
  const rev = useRevenueSummary();
  const ord = useOrdersSummary();
  const cust = useCustomersCount();
  const ts = useRevenueTimeseries();
  const profit = useProfitSummary();
  const recentQ = useRecentOrders();
  const lowQ = useLowStock();

  useEffect(() => {
    // when queries update, map to local state used by template
    setLoading(rev.isLoading || ord.isLoading || cust.isLoading || profit.isLoading);

    const revenue = rev.data?.revenue ?? 0;
    const ordersCount = ord.data?.count ?? 0;
    const customersCount = cust.data?.customers ?? 0;
    const profitVal = profit.data?.profit ?? 0;

    setKpi({
      revenue,
      revenueDelta: 0,
      profit: profitVal,
      profitDelta: 0,
      orders: ordersCount,
      ordersDelta: 0,
      customers: customersCount,
      customersDelta: 0,
    });

    setChart((ts.data ?? []).map((r: any) => ({ date: (r?.date ? String(r.date).slice(5) : ""), revenue: Math.round(Number(r?.total) || 0), orders: 0 })));
    setRecent(recentQ.data ?? []);
    setLowStock(lowQ.data ?? []);
    setPendingCount((recentQ.data ?? []).filter((o: any) => o.status === "pending").length);
    setTodayStats({ revenue: 0, orders: 0, visitors: 0, conversion: 0 });
  }, [rev.data, ord.data, cust.data, ts.data, profit.data, recentQ.data, lowQ.data]);

  const kpis = [
    { label: "الإيرادات (30 يوم)", value: `${fmt(kpi.revenue)} ${currency}`, delta: kpi.revenueDelta, icon: DollarSign, tint: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "صافي الربح", value: `${fmt(kpi.profit)} ${currency}`, delta: kpi.profitDelta, icon: Wallet, tint: "text-violet-600", bg: "bg-violet-50" },
    { label: "الطلبات", value: fmt(kpi.orders), delta: kpi.ordersDelta, icon: ShoppingCart, tint: "text-blue-600", bg: "bg-blue-50" },
    { label: "عملاء جدد", value: fmt(kpi.customers), delta: kpi.customersDelta, icon: Users, tint: "text-amber-600", bg: "bg-amber-50" },
  ];

  const statusLabel: Record<string, string> = {
    pending: "قيد الانتظار", confirmed: "مؤكد", processing: "تجهيز",
    shipped: "شحن", delivered: "تم التوصيل", cancelled: "ملغي",
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
          <p className="text-sm text-muted-foreground mt-1">أداء آخر 30 يوم مقارنة بالـ 30 السابقة</p>
        </div>
        <div className="flex items-center gap-2">

  {/* Analytics Button */}
  <Button
    asChild
    size="sm"
    className="
      bg-gradient-to-r from-pink-500 to-rose-500
      hover:from-pink-500 hover:to-rose-600
      text-white shadow-lg
      transition-all duration-300
      hover:scale-[1.03]
      rounded-xl
      px-4
    "
  >
    <Link to="/admin/analytics">
      <BarChart3 className="w-4 h-4 ml-1" />
      التحليلات
    </Link>
  </Button>

  {/* Finance Button */}
  <Button
    asChild
    size="sm"
    className="
      bg-white
      border border-pink-200
      text-pink-500
      hover:bg-pink-50
      shadow-sm
      transition-all duration-300
      hover:scale-[1.03]
      rounded-xl
      px-4
    "
  >
    <Link to="/admin/finance">
      <Wallet className="w-4 h-4 ml-1" />
      المالية
    </Link>
  </Button>

</div>
      </header>
      {/* Today's Overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="p-5 bg-white border rounded-2xl shadow-sm hover:shadow-md transition">
          <p className="text-xs text-gray-500">
            مبيعات اليوم
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {fmt(todayStats.revenue)} {currency}
          </h2>

          <p className="text-xs mt-3 text-gray-500">
            +18% مقارنة بالأمس
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-xs text-muted-foreground">
            طلبات اليوم
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {todayStats.orders}
          </h2>

        <div className="mt-4 h-2 rounded-full bg-gray-100">
          <div className="h-full w-3/4 rounded-full bg-blue-500"></div>
        </div>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-xs text-muted-foreground">
            الزوار
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {todayStats.visitors}
          </h2>

          <p className="text-xs mt-3 text-green-600">
            ● Live
          </p>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <p className="text-xs text-muted-foreground">
            معدل التحويل
          </p>

          <h2 className="text-2xl font-semibold mt-2">
            {todayStats.conversion}%
          </h2>

          <div className="mt-4 h-2 rounded-full bg-gray-100">
            <div className="h-full w-2/3 rounded-full bg-emerald-500"></div>
          </div>
        </div>

      </section>
      {/* Quick Actions */}
      <section className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-base">
              الإجراءات السريعة
            </h2>

            <p className="text-xs text-muted-foreground">
              أكثر العمليات استخداماً
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <Link
            to="/admin/products/new"
            className="group rounded-2xl border p-5 hover:border-pink-500 hover:bg-pink-50 transition"
          >
            <PackagePlus className="w-8 h-8 text-pink-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">
              إضافة منتج
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              إنشاء منتج جديد
            </p>
          </Link>

          <Link
            to="/admin/orders"
            className="group rounded-2xl border p-5 hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <Receipt className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">
              الطلبات
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              مراجعة الطلبات
            </p>
          </Link>

          <Link
            to="/admin/customers"
            className="group rounded-2xl border p-5 hover:border-green-500 hover:bg-green-50 transition"
          >
            <UserPlus className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">
              العملاء
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              إدارة العملاء
            </p>
          </Link>

          <Link
            to="/admin/categories"
            className="group rounded-2xl border p-5 hover:border-violet-500 hover:bg-violet-50 transition"
          >
            <Plus className="w-8 h-8 text-violet-500 mb-3 group-hover:scale-110 transition" />

            <h3 className="font-medium">
              الأقسام
            </h3>

            <p className="text-xs text-muted-foreground mt-1">
              إدارة التصنيفات
            </p>
          </Link>

        </div>
      </section>
      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
            <div key={k.label} className="bg-white border rounded-2xl p-5 hover:shadow-md transition">            <div className="flex items-start justify-between">
              <div className={cn("p-2.5 rounded-xl", k.bg)}>
                <k.icon className={cn("w-4.5 h-4.5", k.tint)} />
              </div>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full",
                k.delta >= 0
                  ? "text-emerald-600 bg-emerald-50"
                  : "text-rose-600 bg-rose-50"
              )}>
                {k.delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(k.delta).toFixed(1)}%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              {loading
                ? <Skeleton className="h-7 w-28 mt-1.5" />
                : <p className="text-xl md:text-2xl font-heading text-foreground mt-1.5 tabular-nums">{k.value}</p>}
            </div>
          </div>
        ))}
      </section>

      {/* Alerts */}
      {(pendingCount > 0 || lowStock.length > 0) && (
        <section className="grid md:grid-cols-2 gap-3">
          {pendingCount > 0 && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4 flex items-center justify-between">
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
                  <p className="text-xs text-amber-700/80">آخر 30 يومًا</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="border-amber-300"><Link to="/admin/orders">عرض<ArrowUpRight className="w-3.5 h-3.5 mr-1" /></Link></Button>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-700" />
                  <p className="text-sm font-medium text-rose-900">مخزون منخفض</p>
                </div>
                <Button asChild size="sm" variant="ghost"><Link to="/admin/products" className="text-rose-700">إدارة</Link></Button>
              </div>
              <ul className="space-y-1">
                {lowStock.map(p => (
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
      <section className="bg-white rounded-2xl p-5 ring-1 ring-black/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-base">الإيرادات اليومية</h2>
            <p className="text-xs text-muted-foreground">آخر 30 يوم</p>
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
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", direction: "rtl" }} formatter={(v: any) => [`${fmt(Number(v))} ${currency}`, "إيراد"]} />
              <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent activity */}
      <section className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="font-heading text-base">آخر النشاطات</h2>
          <Button asChild variant="ghost" size="sm"><Link to="/admin/orders">عرض الكل</Link></Button>
        </div>
        <div className="divide-y divide-black/5">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-16" /></div>
          ))}
          {!loading && recent.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">لا يوجد نشاط حديث</p>}
          {!loading && recent.map((o, index) => (
  <div
    key={o.id}
    className="px-5 py-4 flex items-start justify-between hover:bg-black/[0.02] transition-colors relative"
  >

    {/* Timeline line */}
    {index !== recent.length - 1 && (
      <span className="absolute left-6 top-10 w-px h-full bg-gray-100" />
    )}

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
          <p className="text-sm font-medium truncate">
            {o.customer_name || "عميل"}
          </p>

          {/* Badge type */}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            طلب
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
          #{o.order_number}
        </p>
      </div>
    </div>

    {/* Right side */}
    <div className="text-left flex flex-col items-end gap-1">

      {/* status */}
      <span
        className={cn(
          "text-[10.5px] px-2 py-0.5 rounded-full ring-1",
          statusTone[o.status] || "bg-gray-50 text-gray-600 ring-gray-200"
        )}
      >
        {statusLabel[o.status] || o.status}
      </span>

      {/* amount */}
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {fmt(parseFloat(o.total) || 0)} {currency}
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