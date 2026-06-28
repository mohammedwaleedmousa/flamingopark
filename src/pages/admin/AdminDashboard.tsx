import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const now = new Date();
    const start30 = new Date(now); start30.setDate(now.getDate() - 30);
    const start60 = new Date(now); start60.setDate(now.getDate() - 60);

    const [ordersAll, customers30, customers60, products, recentOrders, low] = await Promise.all([
      supabase.from("orders").select("id,total,status,created_at,customer_name,order_number").gte("created_at", start60.toISOString()),
      supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", start30.toISOString()),
      supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", start60.toISOString()).lt("created_at", start30.toISOString()),
      supabase.from("products").select("cost_price,price,id"),
      supabase.from("orders").select("id,order_number,customer_name,total,status,created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("products").select("id,name_ar,stock,price").lte("stock", 5).order("stock", { ascending: true }).limit(5),
    ]);

    const orders = (ordersAll.data || []) as any[];
    const cur = orders.filter(o => new Date(o.created_at) >= start30);
    const prev = orders.filter(o => new Date(o.created_at) < start30);
    const sum = (a: any[]) => a.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const revenue = sum(cur);
    const revenuePrev = sum(prev);
    const profitRate = 0.28; // estimation when cost_price not tied to order_items
    const profit = revenue * profitRate;
    const profitPrev = revenuePrev * profitRate;
    const pct = (a: number, b: number) => (b > 0 ? ((a - b) / b) * 100 : a > 0 ? 100 : 0);

    // 30-day timeseries
    const buckets: Record<string, { revenue: number; orders: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 };
    }
    cur.forEach(o => {
      const k = new Date(o.created_at).toISOString().slice(0, 10);
      if (buckets[k]) { buckets[k].revenue += parseFloat(o.total) || 0; buckets[k].orders += 1; }
    });
    setChart(Object.entries(buckets).map(([date, v]) => ({ date: date.slice(5), revenue: Math.round(v.revenue), orders: v.orders })));

    setKpi({
      revenue, revenueDelta: pct(revenue, revenuePrev),
      profit, profitDelta: pct(profit, profitPrev),
      orders: cur.length, ordersDelta: pct(cur.length, prev.length),
      customers: customers30.count || 0,
      customersDelta: pct(customers30.count || 0, customers60.count || 0),
    });
    setRecent((recentOrders.data as any[]) || []);
    setLowStock((low.data as any[]) || []);
    setPendingCount(cur.filter(o => o.status === "pending").length);
    setLoading(false);
  }

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
          <Button asChild variant="outline" size="sm"><Link to="/admin/analytics"><BarChart3 className="w-4 h-4 ml-1" />التحليلات</Link></Button>
          <Button asChild size="sm"><Link to="/admin/finance"><Wallet className="w-4 h-4 ml-1" />المالية</Link></Button>
        </div>
      </header>

      {/* KPI grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="group relative bg-white rounded-2xl p-5 ring-1 ring-black/5 hover:ring-black/10 hover:shadow-[0_18px_50px_-25px_rgba(0,0,0,0.18)] transition-all">
            <div className="flex items-start justify-between">
              <div className={cn("p-2.5 rounded-xl", k.bg)}>
                <k.icon className={cn("w-4.5 h-4.5", k.tint)} />
              </div>
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-medium px-2 py-0.5 rounded-full ring-1",
                k.delta >= 0 ? "text-emerald-700 bg-emerald-50 ring-emerald-200" : "text-rose-700 bg-rose-50 ring-rose-200",
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
                <div className="p-2 rounded-lg bg-amber-100"><AlertTriangle className="w-4 h-4 text-amber-700" /></div>
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
          {!loading && recent.map(o => (
            <div key={o.id} className="px-5 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-100 to-blue-100 grid place-items-center text-[11px] font-medium text-violet-700">
                  {(o.customer_name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{o.customer_name || "عميل"}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{o.order_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn("text-[10.5px] px-2 py-0.5 rounded-full ring-1", statusTone[o.status] || "bg-gray-50 text-gray-600 ring-gray-200")}>{statusLabel[o.status] || o.status}</span>
                <span className="text-sm font-medium tabular-nums">{fmt(parseFloat(o.total) || 0)} {currency}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;