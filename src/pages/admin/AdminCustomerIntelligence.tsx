import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Sparkles, Activity, Search, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const currency = "ر.ي";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Segment = "VIP" | "متوسط" | "عادي";
interface Row {
  id: string;
  name: string;
  phone: string | null;
  region: string;
  orders: number;
  spent: number;
  aov: number;
  last: string | null;
  segment: Segment;
}

const FLAMINGO = {
  primary: "#FF4D8D",
  soft: "#FF7AAE",
  dark: "#C9184A",
  glow: "rgba(255, 77, 141, 0.10)",
};

const SEG_COLORS: Record<Segment, string> = {
  "VIP": "#8b5cf6",
  "متوسط": "#10b981",
  "عادي": "#94a3b8",
};

export default function AdminCustomerIntelligence() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const monthlyData = useMemo(() => {
  const now = new Date();

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentRevenue = 0;
  let prevRevenue = 0;

  let currentOrders = 0;
  let prevOrders = 0;

  rows.forEach((r) => {
    if (!r.last) return;

    const d = new Date(r.last);
    const month = d.getMonth();
    const year = d.getFullYear();

    const isCurrent = month === currentMonth && year === currentYear;
    const isPrev = month === prevMonth && year === prevYear;

    if (isCurrent) {
      currentRevenue += r.spent;
      currentOrders += r.orders;
    }

    if (isPrev) {
      prevRevenue += r.spent;
      prevOrders += r.orders;
    }
  });

  const revenueChange =
    prevRevenue === 0
      ? 100
      : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

  const orderChange =
    prevOrders === 0
      ? 100
      : ((currentOrders - prevOrders) / prevOrders) * 100;

  return {
    currentRevenue,
    prevRevenue,
    currentOrders,
    prevOrders,
    revenueChange,
    orderChange,
  };
}, [rows]);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name,customer_phone,customer_address,total,created_at,status")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(5000);

    const byPhone = new Map<string, Row>();
    const now = Date.now();
    (orders || []).forEach((o: any) => {
      const key = (o.customer_phone?.trim() || o.customer_name?.trim() || "unknown-" + Math.random());
      const region = (o.customer_address || "").split(/[,،]/)[0]?.trim() || "غير محدد";
      const total = Number(o.total ?? 0);
      const cur = byPhone.get(key);
      if (cur) {
        cur.orders += 1; cur.spent += total;
        if (!cur.last || new Date(o.created_at) > new Date(cur.last)) cur.last = o.created_at;
      } else {
        byPhone.set(key, {
          id: key, name: o.customer_name || "عميل", phone: o.customer_phone || null,
          region, orders: 1, spent: total, aov: 0, last: o.created_at, segment: "جديد",
        });
      }
    });

    const list: Row[] = Array.from(byPhone.values()).map(r => {
      r.aov = r.spent / Math.max(1, r.orders);
      const daysSince = r.last ? (now - new Date(r.last).getTime()) / 86400000 : 999;
      r.segment =
        r.spent >= 8000 || r.orders >= 6
          ? "VIP"
          : r.spent >= 2000 || r.orders >= 2
            ? "متوسط"
            : "عادي";
      return r;
    });
    list.sort((a, b) => b.spent - a.spent);
    setRows(list);
    setLoading(false);
  }

  const regions = useMemo(() => Array.from(new Set(rows.map(r => r.region))).sort(), [rows]);
  const regionData = useMemo(() => {
  const m = new Map<string, number>();

  rows.forEach((r) => {
    const region = (r.region || "غير محدد").trim();
    const current = m.get(region) || 0;

    m.set(region, current + (r.spent || 0));
  });

  return Array.from(m.entries())
    .map(([region, revenue]) => ({
      region,
      revenue: Math.round(revenue),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .filter((r) => r.revenue > 0) // 👈 مهم جداً
    .slice(0, 8);
}, [rows]);
  const filtered = rows.filter((r) => {
    if (seg !== "all" && r.segment !== seg) return false;

    if (region !== "all" && r.region !== region) return false;

    if (
      q &&
      !(r.name + " " + (r.phone || ""))
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false;

    const days =
      r.last
        ? (Date.now() - new Date(r.last).getTime()) / 86400000
        : 999;

    switch (quickFilter) {
      case "vip":
        return r.segment === "VIP";

      case "spender":
        return r.spent >= 10000;

      case "orders":
        return r.orders >= 5;

      case "new":
        return r.orders === 1;

      case "active":
        return days <= 30;

      case "inactive":
        return days > 90;

      case "top-region":
        return r.region === regionData[0]?.region;

      default:
        return true;
    }
  });
const aiInsight = useMemo(() => {
  const now = new Date();

  const currentMonth = now.getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  let currentRevenue = 0;
  let prevRevenue = 0;

  let currentVIP = 0;
  let prevVIP = 0;

  const regionGrowth: Record<string, { current: number; prev: number }> = {};

  rows.forEach((r) => {
    if (!r.last) return;

    const d = new Date(r.last);
    const m = d.getMonth();

    const region = r.region || "غير محدد";

    if (!regionGrowth[region]) {
      regionGrowth[region] = { current: 0, prev: 0 };
    }

    if (m === currentMonth) {
      currentRevenue += r.spent;
      if (r.segment === "VIP") currentVIP += r.spent;
      regionGrowth[region].current += r.spent;
    }

    if (m === prevMonth) {
      prevRevenue += r.spent;
      if (r.segment === "VIP") prevVIP += r.spent;
      regionGrowth[region].prev += r.spent;
    }
  });

  // أكثر منطقة سببت النمو
  const topRegion = Object.entries(regionGrowth)
    .map(([name, v]) => ({
      name,
      diff: v.current - v.prev,
    }))
    .sort((a, b) => b.diff - a.diff)[0];

  const revenueDiff = currentRevenue - prevRevenue;

  const reason =
    revenueDiff > 0
      ? "نمو إيجابي في الإيرادات هذا الشهر"
      : "انخفاض في الإيرادات مقارنة بالشهر السابق";

  const vipImpact =
    currentVIP > prevVIP
      ? "النمو مدفوع من عملاء VIP"
      : "VIP لم يكن المحرك الرئيسي للنمو";

  return {
    revenueDiff,
    topRegion: topRegion?.name || "غير محدد",
    reason,
    vipImpact,
  };
}, [rows]);
const aiEngine = useMemo(() => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

  let currentRevenue = 0;
  let prevRevenue = 0;

  let vipRevenue = 0;
  let regionMap: Record<string, number> = {};
  let inactiveRisk = 0;

  rows.forEach((r) => {
    if (!r.last) return;

    const d = new Date(r.last);
    const m = d.getMonth();

    const days =
      (Date.now() - new Date(r.last).getTime()) / 86400000;

    if (m === currentMonth) currentRevenue += r.spent;
    if (m === prevMonth) prevRevenue += r.spent;

    if (r.segment === "VIP") vipRevenue += r.spent;

    regionMap[r.region] = (regionMap[r.region] || 0) + r.spent;

    // ⚠️ risk: inactive customers
    if (days > 60) inactiveRisk += 1;
  });

  const growth =
    prevRevenue === 0
      ? 100
      : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

  const forecast = currentRevenue * (1 + growth / 100);

  const topRegion = Object.entries(regionMap).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const riskLevel =
    inactiveRisk > rows.length * 0.3
      ? "high"
      : inactiveRisk > rows.length * 0.15
      ? "medium"
      : "low";

  const action =
    growth > 10
      ? "استمر في استهداف VIP + نفس المناطق"
      : growth < 0
      ? "ركّز على إعادة تنشيط العملاء الخاملين"
      : "النمو مستقر، حسّن متوسط الطلب";

  return {
    currentRevenue,
    prevRevenue,
    growth,
    forecast,
    topRegion: topRegion?.[0],
    riskLevel,
    inactiveRisk,
    action,
  };
}, [rows]);
  const totals = useMemo(() => {
    const total = rows.length;
    const revenue = rows.reduce((s, r) => s + r.spent, 0);
    const vip = rows.filter(r => r.segment === "VIP").length;
    const aov = revenue / Math.max(1, rows.reduce((s, r) => s + r.orders, 0));
    return { total, revenue, vip, aov };
  }, [rows]);
  const segCounts = useMemo(() => {
  return {
    all: rows.length,
    VIP: rows.filter(r => r.segment === "VIP").length,
    متوسط: rows.filter(r => r.segment === "متوسط").length,
    عادي: rows.filter(r => r.segment === "عادي").length,
  };
}, [rows]);

  const segData = (["VIP", "متوسط", "عادي"] as Segment[]).map(s => ({
    name: s, value: rows.filter(r => r.segment === s).length,
  }));

  

  const kpis = [
    { label: "إجمالي العملاء", value: fmt(totals.total), icon: Users, bg: "bg-blue-50", tone: "text-blue-600" },
    { label: "عملاء VIP", value: fmt(totals.vip), icon: Crown, bg: "bg-violet-50", tone: "text-violet-600" },
    { label: "متوسط قيمة الطلب", value: `${fmt(totals.aov)} ${currency}`, icon: Activity, bg: "bg-amber-50", tone: "text-amber-600" },
    { label: "إجمالي الإنفاق", value: `${fmt(totals.revenue)} ${currency}`, icon: Sparkles, bg: "bg-emerald-50", tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <header className="relative">
        <div className="relative p-6 rounded-2xl border border-black/5 bg-white overflow-hidden">

          {/* background glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,77,141,0.14), transparent 60%)",
            }}
          />

          <div className="relative z-10 flex items-start justify-between gap-4">

            {/* left content */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Customer Intelligence
              </p>

              <h1 className="font-heading text-2xl md:text-3xl">
                تحليل سلوك العملاء
              </h1>

              <p className="text-sm text-muted-foreground mt-1">
                فهم عميق لسلوك الشراء + تقسيم العملاء حسب القيمة
              </p>

              {/* mini stats */}
              <div className="flex gap-4 mt-4 text-xs">
                <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  +12% نمو العملاء
                </div>

                <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                  {totals.total} عميل
                </div>

                <div className="px-3 py-1 rounded-full bg-violet-50 text-violet-600">
                  {totals.vip} VIP
                </div>
              </div>
            </div>

            {/* right action */}
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="px-4 py-2 rounded-xl text-sm border border-black/10 hover:bg-black/5 transition"
              >
                تحديث
              </button>

              <div className="px-4 py-2 rounded-xl text-sm bg-pink-500 text-white shadow-sm">
                تحليل مباشر
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {kpis.map((k) => (
    <Card
      key={k.label}
      className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
    >
      {/* Glow Background */}
      <div className={`absolute inset-0 opacity-40 ${k.bg}`} />

      {/* Content */}
      <div className="relative p-5 flex flex-col gap-3">

        {/* icon */}
        <div className={`w-10 h-10 rounded-xl grid place-items-center ${k.bg} shadow-sm`}>
          <k.icon className={`w-5 h-5 ${k.tone}`} />
        </div>

        {/* label */}
        <p className="text-xs text-muted-foreground">
          {k.label}
        </p>

        {/* value */}
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {k.value}
          </p>
        )}
      </div>
    </Card>
  ))}
</section>

<div className="grid lg:grid-cols-2 gap-4">

  {/* 📊 MONTH COMPARISON */}
  <Card className="p-6 rounded-2xl border border-black/5 bg-white shadow-sm space-y-5">

    <div className="flex justify-between items-center">
      <p className="text-xs text-muted-foreground">
        مقارنة شهرية
      </p>

      <span className="text-[10px] px-2 py-1 rounded-full bg-gray-900 text-white">
        Month vs Month
      </span>
    </div>

    {/* CURRENT */}
    <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
      <p className="text-xs text-muted-foreground">الشهر الحالي</p>
      <p className="text-2xl font-bold text-pink-600">
        {fmt(aiEngine.currentRevenue)} ر.ي
      </p>
    </div>

    {/* PREVIOUS */}
    <div className="p-4 rounded-xl bg-gray-50 border">
      <p className="text-xs text-muted-foreground">الشهر السابق</p>
      <p className="text-xl font-semibold text-gray-700">
        {fmt(aiEngine.lastRevenue)} ر.ي
      </p>
    </div>

    {/* GROWTH */}
    <div className="flex items-center justify-between pt-2 border-t">
      <span className="text-sm text-muted-foreground">
        معدل النمو
      </span>

      <span className={`font-bold ${
        aiEngine.growth >= 0 ? "text-green-600" : "text-red-500"
      }`}>
        {aiEngine.growth.toFixed(1)}%
      </span>
    </div>

  </Card>

  {/* 🧠 AI INSIGHT */}
  <Card className="relative p-6 rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">

    {/* glow */}
    <div
      className="absolute inset-0 opacity-40"
      style={{
        background:
          "radial-gradient(circle at top right, rgba(255,77,141,0.18), transparent 60%), radial-gradient(circle at bottom left, rgba(139,92,246,0.12), transparent 60%)",
      }}
    />

    <div className="relative space-y-5">

      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          ذكاء فلامنجو
        </p>

        <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500 text-white">
          AI
        </span>
      </div>

      {/* INSIGHT */}
      <h3 className="text-lg font-bold text-gray-800 leading-snug">
        {aiEngine.growth >= 0
          ? "النمو مستقر بسبب زيادة العملاء النشطين"
          : "انخفاض الأداء مرتبط بتراجع الطلبات المتكررة"}
      </h3>

      {/* KEY METRICS */}
      <div className="grid grid-cols-2 gap-3">

        <div className="p-3 rounded-xl bg-pink-50 border">
          <p className="text-[10px] text-muted-foreground">التوقع القادم</p>
          <p className="text-sm font-bold text-pink-600">
            {fmt(aiEngine.forecast)} ر.ي
          </p>
        </div>

        <div className="p-3 rounded-xl bg-violet-50 border">
          <p className="text-[10px] text-muted-foreground">المخاطر</p>
          <p className="text-sm font-bold">
            {aiEngine.riskLevel === "high"
              ? "مرتفع"
              : aiEngine.riskLevel === "medium"
              ? "متوسط"
              : "منخفض"}
          </p>
        </div>

      </div>

      {/* ACTION */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white">
        <p className="text-[10px] opacity-80">
          توصية ذكية
        </p>
        <p className="text-sm font-medium mt-1">
          {aiEngine.action}
        </p>
      </div>

    </div>

  </Card>

</div>
<Card className="relative p-6 rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">

  {/* background glow */}
  <div
    className="absolute inset-0 opacity-40"
    style={{
      background:
        "radial-gradient(circle at top right, rgba(255,77,141,0.16), transparent 60%), radial-gradient(circle at bottom left, rgba(139,92,246,0.10), transparent 60%)",
    }}
  />

  <div className="relative space-y-5">

    {/* HEADER */}
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground tracking-wide">
        ذكاء الأعمال فلامنجو
      </p>

      <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500 text-white shadow">
        مباشر
      </span>
    </div>

    {/* FORECAST (Main Metric) */}
    <div>
      <p className="text-xs text-muted-foreground">
        📈 التوقع القادم
      </p>

      <p className="text-2xl font-bold text-gray-800 mt-1">
        {fmt(aiEngine.forecast)} ر.ي
      </p>
    </div>

    {/* STATS GRID */}
    <div className="grid grid-cols-2 gap-3">

      {/* Growth */}
      <div className="p-3 rounded-xl bg-pink-50 border border-pink-100">
        <p className="text-[10px] text-muted-foreground">النمو</p>
        <p className={`text-sm font-bold ${
          aiEngine.growth >= 0 ? "text-pink-600" : "text-red-500"
        }`}>
          {aiEngine.growth.toFixed(1)}%
        </p>
      </div>

      {/* Risk */}
      <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
        <p className="text-[10px] text-muted-foreground">المخاطر</p>
        <p className={`text-sm font-bold ${
          aiEngine.riskLevel === "high"
            ? "text-red-500"
            : aiEngine.riskLevel === "medium"
            ? "text-orange-500"
            : "text-green-600"
        }`}>
          {aiEngine.riskLevel === "high"
            ? "مرتفع"
            : aiEngine.riskLevel === "medium"
            ? "متوسط"
            : "منخفض"}
        </p>
      </div>

    </div>

    {/* ACTION (Decision Block) */}
    <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md">

      <p className="text-[10px] opacity-80">
        🎯 توصية الذكاء الاصطناعي
      </p>

      <p className="text-sm font-medium mt-1 leading-relaxed">
        {aiEngine.action}
      </p>

    </div>

  </div>
</Card>




      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 ring-1 ring-black/5 border-0 shadow-none">
          <h2 className="font-heading text-base mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />الإيرادات حسب المنطقة</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis
  type="category"
  dataKey="region"
  width={100}
  tick={{ fontSize: 12, fill: "#64748b" }}
  tickLine={false}
  axisLine={false}
/>
                <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} formatter={(v: any) => [`${fmt(Number(v))} ${currency}`, "إيراد"]} />
                <Bar
  dataKey="revenue"
  radius={[10, 10, 10, 10]}
  fill="url(#barGradient)"
  barSize={18}
/>
<defs>
  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stopColor="#FF4D8D" />
    <stop offset="100%" stopColor="#8b5cf6" />
  </linearGradient>
</defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 ring-1 ring-black/5 border-0 shadow-none">
          <h2 className="font-heading text-base mb-3">تقسيم العملاء</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
  data={segData}
  dataKey="value"
  nameKey="name"
  innerRadius={60}
  outerRadius={90}
  paddingAngle={5}
  stroke="none"
>
                  {segData.map((s) => (
  <Cell
    key={s.name}
    fill={SEG_COLORS[s.name as Segment]}
  />
))}
                </Pie>
<Tooltip
  contentStyle={{
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    fontSize: 12
  }}
/>
                <Legend
  iconType="circle"
  wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="p-0 border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
        <div className="p-5 border-b border-black/5 bg-white space-y-4 sticky top-0 z-10 backdrop-blur">

  <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50 p-3 rounded-xl border border-black/5">

  {/* SEARCH */}
  <div className="flex-1 relative">
    <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <Input
      value={q}
      onChange={e => setQ(e.target.value)}
      placeholder="ابحث باسم العميل أو الرقم..."
      className="pr-10 h-10 bg-white rounded-lg border-black/10"
    />
  </div>

  {/* SEGMENT FILTER (Tabs صغيرة) */}
  <div className="flex bg-white border border-black/10 rounded-lg p-1 gap-1">
    {["all", "VIP", "متوسط", "عادي"].map((s) => (
      <button
        key={s}
        onClick={() => setSeg(s)}
        className={`px-3 py-1.5 text-xs rounded-md transition whitespace-nowrap
          ${seg === s
            ? "bg-pink-500 text-white shadow"
            : "text-gray-600 hover:bg-gray-100"
          }`}
      >
        {s === "all" ? "الكل" : s}
      </button>
    ))}
  </div>

  <div className="flex gap-2 overflow-x-auto pb-1">

  <button
    onClick={() => setRegion("all")}
    className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap
      ${region === "all"
        ? "bg-pink-500 text-white border-pink-500"
        : "bg-white text-gray-600"
      }
    `}
  >
    🌍 كل المناطق
  </button>

  {regions.map(r => (
    <button
      key={r}
      onClick={() => setRegion(r)}
      className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap
        ${region === r
          ? "bg-pink-500 text-white border-pink-500"
          : "bg-white text-gray-600"
        }
      `}
    >
      📍 {r}
    </button>
  ))}

</div>

  {/* RESET BUTTON */}
  <button
    onClick={() => {
      setSeg("all");
      setRegion("all");
      setQ("");
    }}
    className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-100 text-gray-600"
  >
    إعادة ضبط
  </button>

</div>

</div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.02] text-xs text-muted-foreground ">
              <tr>
                <th className="text-right p-3 font-medium">العميل</th>
                <th className="text-right p-3 font-medium">المنطقة</th>
                <th className="text-right p-3 font-medium">الطلبات</th>
                <th className="text-right p-3 font-medium">إجمالي الإنفاق</th>
                <th className="text-right p-3 font-medium">متوسط الطلب</th>
                <th className="text-right p-3 font-medium">آخر شراء</th>
                <th className="text-right p-3 font-medium">الشريحة</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr className="border-t border-black/5 hover:bg-pink-50/30 transition-all duration-150"><td colSpan={7} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد عملاء مطابقين</td></tr>
              )}
              {!loading && filtered.slice(0, 100).map(r => (
                <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl grid place-items-center text-sm font-semibold shadow-sm"
                        style={{
                          background: SEG_COLORS[r.segment] + "20",
                          color: SEG_COLORS[r.segment]
                        }}
                      >
                        {r.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{r.region}</td>
                  <td className="p-3 tabular-nums">{r.orders}</td>
                  <td className="p-3 tabular-nums font-medium">{fmt(r.spent)} {currency}</td>
                  <td className="p-3 tabular-nums">{fmt(r.aov)} {currency}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.last ? new Date(r.last).toLocaleDateString("ar-EG") : "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" style={{ borderColor: SEG_COLORS[r.segment] + "55", color: SEG_COLORS[r.segment], background: SEG_COLORS[r.segment] + "11" }}>{r.segment}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && <p className="p-3 text-xs text-center text-muted-foreground border-t border-black/5">يعرض أول 100 من {filtered.length} عميل</p>}
      </Card>
    </div>
  );
}