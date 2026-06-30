import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, TrendingDown, ArrowDownRight, ArrowUpRight, BookOpen, Receipt, PiggyBank } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Line, LineChart } from "recharts";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const currency = "ر.ي";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Range = "7d" | "30d" | "12m";

export default function AdminFinanceDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<{ label: string; revenue: number; expenses: number; profit: number }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, profit: 0, refunds: 0 });
  const [txs, setTxs] = useState<any[]>([]);
  const options: { value: Range; label: string }[] = [
  { value: "7d", label: "7 أيام" },
  { value: "30d", label: "شهر" },
  { value: "12m", label: "سنة" },
];
  useEffect(() => { load(); }, [range]);

  async function load() {
    setLoading(true);
    const now = new Date();
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
    const start = new Date(now); start.setDate(now.getDate() - days);
    const monthMode = range === "12m";

    const [ordersRes, expensesRes, refundsRes, txRes] = await Promise.all([
      supabase.from("orders").select("total,created_at,status").gte("created_at", start.toISOString()).neq("status", "cancelled"),
      supabase.from("expenses").select("amount,expense_date,category_id"),
      supabase.from("refunds").select("amount,created_at"),
      supabase.from("financial_transactions").select("id,entry_date,description,reference,transaction_lines(debit,credit)").order("entry_date", { ascending: false }).limit(8),
    ]);

    const orders = (ordersRes.data || []) as any[];
    const expenses = ((expensesRes.data || []) as any[]).filter(e => new Date(e.expense_date) >= start);
    const refunds = ((refundsRes.data || []) as any[]).filter(r => new Date(r.created_at) >= start);

    const buckets: Record<string, { revenue: number; expenses: number }> = {};
    const keyOf = (d: Date) => monthMode ? d.toISOString().slice(0, 7) : d.toISOString().slice(0, 10);
    const steps = monthMode ? 12 : days;
    for (let i = steps - 1; i >= 0; i--) {
      const d = new Date(now);
      if (monthMode) d.setMonth(now.getMonth() - i); else d.setDate(now.getDate() - i);
      buckets[keyOf(d)] = { revenue: 0, expenses: 0 };
    }
    orders.forEach(o => { const k = keyOf(new Date(o.created_at)); if (buckets[k]) buckets[k].revenue += parseFloat(o.total) || 0; });
    expenses.forEach(e => { const k = keyOf(new Date(e.expense_date)); if (buckets[k]) buckets[k].expenses += parseFloat(e.amount) || 0; });

    const data = Object.entries(buckets).map(([label, v]) => ({
      label: monthMode ? label.slice(2) : label.slice(5),
      revenue: Math.round(v.revenue),
      expenses: Math.round(v.expenses),
      profit: Math.round(v.revenue - v.expenses),
    }));
    
    const sumRev = orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const sumExp = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const sumRef = refunds.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

    setSeries(data);
    setTotals({ revenue: sumRev, expenses: sumExp, profit: sumRev - sumExp - sumRef, refunds: sumRef });
    setTxs((txRes.data as any[]) || []);
    setLoading(false);
  }

  const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const kpis = [
    { label: "إجمالي الإيرادات", value: totals.revenue, icon: TrendingUp, tone: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "إجمالي المصروفات", value: totals.expenses, icon: TrendingDown, tone: "text-rose-600", bg: "bg-rose-50" },
    { label: "صافي الربح", value: totals.profit, icon: Wallet, tone: "text-violet-600", bg: "bg-violet-50" },
    { label: "المرتجعات", value: totals.refunds, icon: ArrowDownRight, tone: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">المالية</p>
          <h1 className="font-heading text-2xl md:text-3xl">لوحة التحليل المالي</h1>
          <p className="text-sm text-muted-foreground mt-1">إيرادات، مصروفات، تدفقات نقدية، وأرباح</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/70 backdrop-blur border rounded-2xl p-1 shadow-sm w-fit">
  
  {options.map((opt) => (
    <button
      key={opt.value}
      onClick={() => setRange(opt.value)}
      className="relative px-6 py-2 text-xs font-medium rounded-xl transition-colors"
    >
      {/* ACTIVE PILL */}
      {range === opt.value && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-xl"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* TEXT */}
      <span
        className={`relative z-10 transition-colors ${
          range === opt.value ? "text-white" : "text-gray-600"
        }`}
      >
        {opt.label}
      </span>
    </button>
  ))}
</div>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card
            key={k.label}
            className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group"
          >
            <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
            <div className="flex items-start justify-between">
              <div className="relative z-10 p-3 rounded-xl bg-white/70 backdrop-blur border"><k.icon className={cn("w-4.5 h-4.5", k.tone)} /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{k.label}</p>
            {loading ? (
  <Skeleton className="h-7 w-28 mt-3" />
) : (
  <div className="relative z-10 mt-2">
    <p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">
      {fmt(k.value)}
    </p>

    <p className="text-xs text-muted-foreground mt-1">
      {currency}
    </p>
  </div>
)}        </Card>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 ring-1 ring-black/5 border-0 shadow-none">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-heading text-base">الإيرادات مقابل المصروفات</h2>
              <p className="text-xs text-muted-foreground">هامش الربح: {margin.toFixed(1)}%</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="revenue" name="إيرادات" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="مصروفات" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 relative overflow-hidden border border-black/5 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base">التدفق النقدي</h2>
            <PiggyBank className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} />
                <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-0 ring-1 ring-black/5 border-0 shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-muted-foreground" /><h2 className="font-heading text-base">آخر القيود المحاسبية</h2></div>
            <Button asChild variant="ghost" size="sm"><Link to="/admin/ledger">دفتر اليومية</Link></Button>
          </div>
          <div className="divide-y divide-black/5">
            {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-4 w-2/3" /></div>)}
            {!loading && txs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد قيود بعد</p>}
            {!loading && txs.map(t => {
              const debit = (t.transaction_lines || []).reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0);
              return (
                <div key={t.id} className="px-5 py-3 flex items-center justify-between hover:bg-black/[0.02]">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground">{t.entry_date}{t.reference ? ` • ${t.reference}` : ""}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{fmt(debit)} {currency}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 relative overflow-hidden border border-black/5 shadow-sm hover:shadow-md transition">
          <h2 className="font-heading text-base mb-3">روابط سريعة</h2>
          <div className="space-y-2">
            {[
              { to: "/admin/ledger", label: "دفتر اليومية", icon: BookOpen },
              { to: "/admin/expenses", label: "المصروفات", icon: Receipt },
              { to: "/admin/refunds", label: "المرتجعات", icon: ArrowUpRight },
              { to: "/admin/payment-methods", label: "طرق الدفع والتسويات", icon: Wallet },
            ].map(l => (
              <Link key={l.to} to={l.to} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-black/[0.04] transition-colors">
                <span className="flex items-center gap-2 text-sm"><l.icon className="w-4 h-4 text-muted-foreground" />{l.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}