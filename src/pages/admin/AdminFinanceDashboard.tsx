import React, { useEffect, useRef, useState } from "react";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import {
  loadImportedEntries,
  saveImportedEntries,
  getOrdersRevenueEntries,
  getExpensesEntries,
  getFinancialTransactionsEntries,
  LedgerEntry,
} from "@/lib/analytics/finance";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";
import * as XLSX from "xlsx";
import { Wallet, TrendingUp, TrendingDown, BookOpen, Receipt, ArrowUpRight, PiggyBank, DownloadCloud, UploadCloud, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const currency = "ر.ي";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Range = "7d" | "30d" | "12m";

export default function AdminFinanceDashboard() {
  const { range } = useDateRange();

  // local imports persistence
  const [imports, setImports] = useState<LedgerEntry[]>(() => loadImportedEntries());
  const inputRef = useRef<HTMLInputElement | null>(null);

  // supabase-backed queries via analytics helpers
  const ordersQ = useQuery({ queryKey: ["finance_orders", range], queryFn: () => getOrdersRevenueEntries(range.start, range.end) });
  const expensesQ = useQuery({ queryKey: ["finance_expenses", range], queryFn: () => getExpensesEntries(range.start, range.end) });
  const txQ = useQuery({ queryKey: ["finance_tx", range], queryFn: () => getFinancialTransactionsEntries(range.start, range.end) });

  // combined ledger and totals
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  useEffect(() => {
    const merged: LedgerEntry[] = [ ...(ordersQ.data ?? []), ...(expensesQ.data ?? []), ...(txQ.data ?? []), ...imports ];
    merged.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setLedger(merged);
  }, [ordersQ.data, expensesQ.data, txQ.data, imports]);

  const totals = ledger.reduce((acc, e) => {
    if (e.amount > 0) acc.revenue += e.amount; else acc.expenses += Math.abs(e.amount);
    acc.net += e.amount;
    return acc;
  }, { revenue: 0, expenses: 0, net: 0 });

  // compact admin UI state (secondary view using supabase directly for other widgets)
  const [rangeMode, setRangeMode] = useState<Range>("30d");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ revenue: 0, expenses: 0, profit: 0, refunds: 0 });

  useEffect(() => { loadOverview(); }, [rangeMode, range.start, range.end]);

  async function loadOverview(){
    setLoadingOverview(true);
    const now = new Date();

    // Prefer explicit DateRange from the global picker when provided
    let startDate: Date;
    let endDate: Date;
    if (range && range.start && range.end) {
      startDate = new Date(range.start);
      endDate = new Date(range.end);
    } else {
      const days = rangeMode === "7d" ? 7 : rangeMode === "30d" ? 30 : 365;
      endDate = new Date(now);
      startDate = new Date(now);
      startDate.setDate(now.getDate() - days);
    }

    const daysSpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const monthMode = rangeMode === "12m" || daysSpan > 365;

    const [ordersRes, expensesRes, refundsRes, txRes] = await Promise.all([
      supabase.from("orders").select("total,created_at,status").gte("created_at", startDate.toISOString()).lte("created_at", new Date(endDate.getTime() + 24*60*60*1000 -1).toISOString()).neq("status", "cancelled"),
      supabase.from("expenses").select("amount,expense_date,category_id").gte("expense_date", startDate.toISOString()).lte("expense_date", new Date(endDate.getTime() + 24*60*60*1000 -1).toISOString()),
      supabase.from("refunds").select("amount,created_at").gte("created_at", startDate.toISOString()).lte("created_at", new Date(endDate.getTime() + 24*60*60*1000 -1).toISOString()),
      supabase.from("financial_transactions").select("id,entry_date,description,reference,transaction_lines(debit,credit)").order("entry_date", { ascending: false }).limit(8),
    ]);

    const orders = (ordersRes.data || []) as any[];
    const expenses = ((expensesRes.data || []) as any[]).filter(e => new Date(e.expense_date) >= start);
    const refunds = ((refundsRes.data || []) as any[]).filter(r => new Date(r.created_at) >= start);

    const buckets: Record<string, { revenue: number; expenses: number }> = {};
    const keyOf = (d: Date) => monthMode ? d.toISOString().slice(0,7) : d.toISOString().slice(0,10);
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
    setKpis({ revenue: sumRev, expenses: sumExp, profit: sumRev - sumExp - sumRef, refunds: sumRef });
    setLoadingOverview(false);
  }

  const margin = kpis.revenue > 0 ? (kpis.profit / kpis.revenue) * 100 : 0;

  const options: { value: Range; label: string }[] = [
    { value: "7d", label: "7 أيام" },
    { value: "30d", label: "شهر" },
    { value: "12m", label: "سنة" },
  ];

  function handleFile(ev: React.ChangeEvent<HTMLInputElement>){
    const f = ev.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      const parsed: LedgerEntry[] = [];
      for (const r of rows) {
        const date = r.date || r.Date || r.Datum;
        const desc = r.description || r.Description || r.desc || "";
        const type = (r.type || r.Type || r.TypeOf || "").toString().toLowerCase();
        const amount = Number(r.amount || r.Amount || r.Amt || 0);
        if (!date || !type || isNaN(amount)) continue;
        const entry: LedgerEntry = {
          id: `import-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          date: new Date(date).toISOString(),
          type: type === 'income' || type === 'in' ? 'income' : 'expense',
          category: 'import',
          amount: type === 'income' || type === 'in' ? amount : -Math.abs(amount),
          source: 'import',
          description: desc,
        };
        parsed.push(entry);
      }
      const all = [...imports, ...parsed];
      setImports(all);
      saveImportedEntries(all);
    };
    reader.readAsArrayBuffer(f);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Export helpers
  function exportSeriesToExcel() {
    if (!series || series.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(series.map(s => ({
      الفترة: s.label,
      إيرادات: s.revenue,
      مصروفات: s.expenses,
      ربح: s.profit,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ملخص");
    XLSX.writeFile(wb, `financial_summary_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportLedgerToExcel() {
    if (!ledger || ledger.length === 0) return;
    const rows = ledger.map(l => ({ التاريخ: new Date(l.date).toLocaleString(), الوصف: l.description, المصدر: l.source, المبلغ: l.amount }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "دفتر");
    XLSX.writeFile(wb, `ledger_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

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
              <button key={opt.value} onClick={() => setRangeMode(opt.value)} className="relative px-6 py-2 text-xs font-medium rounded-xl transition-colors">
                {rangeMode === opt.value && (
                  <motion.div layoutId="active-pill" className="absolute inset-0 bg-gradient-to-r from-pink-500 to-fuchsia-600 rounded-xl" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                )}
                <span className={`relative z-10 transition-colors ${rangeMode === opt.value ? "text-white" : "text-gray-600"}`}>{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <DateRangePicker />
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" aria-hidden />
            <Button size="sm" variant="default" onClick={() => inputRef.current?.click()} aria-label="استيراد Excel">
              <UploadCloud className="w-4 h-4 ml-2" />
              استيراد
            </Button>
            <Button size="sm" variant="outline" onClick={exportSeriesToExcel} aria-label="تصدير الملخص إلى Excel">
              <DownloadCloud className="w-4 h-4 ml-2" />
              تصدير الملخص
            </Button>
            <Button size="sm" variant="outline" onClick={exportLedgerToExcel} aria-label="تصدير الدفتر إلى Excel">
              <DownloadCloud className="w-4 h-4 ml-2" />
              تصدير الدفتر
            </Button>
            {imports.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{imports.length} مستورد</Badge>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm('مسح كل الاستيرادات؟')) { setImports([]); saveImportedEntries([]); } }} aria-label="مسح الاستيرادات">
                  <Trash2 className="w-4 h-4 ml-2" />
                  مسح
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الإيرادات", value: kpis.revenue, icon: TrendingUp, tone: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "إجمالي المصروفات", value: kpis.expenses, icon: TrendingDown, tone: "text-rose-600", bg: "bg-rose-50" },
          { label: "صافي الربح", value: kpis.profit, icon: Wallet, tone: "text-violet-600", bg: "bg-violet-50" },
          { label: "المرتجعات", value: kpis.refunds, icon: ArrowUpRight, tone: "text-amber-600", bg: "bg-amber-50" },
        ].map(k => (
          <Card key={k.label} className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
            <div className="flex items-start justify-between">
              <div className="relative z-10 p-3 rounded-xl bg-white/70 backdrop-blur border"><k.icon className={cn("w-4.5 h-4.5", k.tone)} /></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">{k.label}</p>
            {loadingOverview ? (
              <Skeleton className="h-7 w-28 mt-3" />
            ) : (
              <div className="relative z-10 mt-2">
                <p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">{fmt(k.value)}</p>
                <p className="text-xs text-muted-foreground mt-1">{currency}</p>
              </div>
            )}
          </Card>
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
            {loadingOverview && Array.from({ length: 4 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-4 w-2/3" /></div>)}
            {!loadingOverview && series.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</p>}
            {!loadingOverview && series.length > 0 && series.slice(0,8).map((s, idx) => (
              <div key={idx} className="px-5 py-3 flex items-center justify-between hover:bg-black/[0.02]">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">ملخص</p>
                </div>
                <span className="text-sm font-medium tabular-nums">{fmt(s.revenue)} {currency}</span>
              </div>
            ))}
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
