import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { CURRENCY_RATES } from "@/lib/currency";
import { toast } from "@/hooks/use-toast";

const currency = "ر.س";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Range = "7d" | "30d" | "12m";
type CurrencyMode = "SAR" | "YER_SOUTH" | "YER_NORTH";

type FinanceAlert = {
  id: string;
  level: "high" | "medium" | "low";
  title: string;
  details: string;
};

const currencyMeta: Record<CurrencyMode, { label: string; symbol: string }> = {
  SAR: { label: "الإيرادات - ريال سعودي", symbol: "ر.س" },
  YER_SOUTH: { label: "الإيرادات - ريال يمني (جنوب)", symbol: "ر.ي" },
  YER_NORTH: { label: "الإيرادات - ريال يمني (شمال)", symbol: "ر.ي" },
};

const resolveOrderMode = (order: { currency_mode?: string | null; country?: string | null }): CurrencyMode => {
  if (order.currency_mode === "SAR" || order.currency_mode === "YER_SOUTH" || order.currency_mode === "YER_NORTH") {
    return order.currency_mode;
  }
  if (order.country === "SA") return "SAR";
  return "YER_SOUTH";
};

const toSAR = (amount: number, mode: CurrencyMode) => {
  if (mode === "SAR") return amount;
  return amount / CURRENCY_RATES[mode].rate;
};

const resolveExpenseMode = (expense: { currency_mode?: string | null }): CurrencyMode => {
  if (expense.currency_mode === "SAR" || expense.currency_mode === "YER_SOUTH" || expense.currency_mode === "YER_NORTH") {
    return expense.currency_mode;
  }
  return "SAR";
};

const toDayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toDayEnd = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const asNum = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const isIncomeType = (type: string) => {
  const t = type.trim().toLowerCase();
  return ["income", "in", "revenue", "credit", "دخل", "ايراد", "إيراد"].includes(t);
};

const isExpenseType = (type: string) => {
  const t = type.trim().toLowerCase();
  return ["expense", "out", "cost", "debit", "مصروف", "نفقة", "expense"].includes(t);
};

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
  const rangeStartIso = useMemo(() => toDayStart(new Date(range.start)).toISOString(), [range.start]);
  const rangeEndIso = useMemo(() => toDayEnd(new Date(range.end)).toISOString(), [range.end]);

  const importsInRange = useMemo(() => {
    const startTs = new Date(rangeStartIso).getTime();
    const endTs = new Date(rangeEndIso).getTime();
    return imports.filter((e) => {
      const ts = new Date(e.date).getTime();
      return ts >= startTs && ts <= endTs;
    });
  }, [imports, rangeStartIso, rangeEndIso]);

  const ledger = useMemo(() => {
    const merged: LedgerEntry[] = [
      ...(ordersQ.data ?? []),
      ...(expensesQ.data ?? []),
      ...(txQ.data ?? []),
      ...importsInRange,
    ];
    merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return merged;
  }, [ordersQ.data, expensesQ.data, txQ.data, importsInRange]);

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
  const [revenueByCurrency, setRevenueByCurrency] = useState<Record<CurrencyMode, number>>({
    SAR: 0,
    YER_SOUTH: 0,
    YER_NORTH: 0,
  });
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const consolidatedRevenueSAR = useMemo(() => {
    const sar = revenueByCurrency.SAR;
    const southToSar = revenueByCurrency.YER_SOUTH / CURRENCY_RATES.YER_SOUTH.rate;
    const northToSar = revenueByCurrency.YER_NORTH / CURRENCY_RATES.YER_NORTH.rate;
    return sar + southToSar + northToSar;
  }, [revenueByCurrency]);

  useEffect(() => {
    loadOverview();

    const intervalId = window.setInterval(() => {
      loadOverview();
    }, 15000);

    const onFocus = () => {
      loadOverview();
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [rangeMode, range.start, range.end]);

  async function loadOverview(){
    setLoadingOverview(true);
    setOverviewError(null);
    const now = new Date();

    // Prefer explicit DateRange from the global picker when provided
    let startDate: Date;
    let endDate: Date;
    if (range && range.start && range.end) {
      startDate = toDayStart(new Date(range.start));
      endDate = toDayEnd(new Date(range.end));
    } else {
      const days = rangeMode === "7d" ? 7 : rangeMode === "30d" ? 30 : 365;
      endDate = toDayEnd(new Date(now));
      startDate = toDayStart(new Date(now));
      startDate.setDate(now.getDate() - days);
    }

    const daysSpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const monthMode = rangeMode === "12m" || daysSpan > 365;

    try {
      const expensesQueryWithMode = supabase
        .from("expenses")
        .select("amount,expense_date,category_id,currency_mode")
        .gte("expense_date", startDate.toISOString())
        .lte("expense_date", new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString());

      const [ordersRes, expensesRes, refundsRes, txRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total,created_at,status,currency_mode,country")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString())
          .not("status", "in", "(cancelled,canceled)"),
        expensesQueryWithMode,
        supabase
          .from("refunds")
          .select("amount,created_at,order_id,orders(currency_mode,country)")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString()),
        supabase
          .from("financial_transactions")
          .select("id,entry_date,description,reference,transaction_lines(debit,credit)")
          .gte("entry_date", startDate.toISOString())
          .lte("entry_date", endDate.toISOString())
          .order("entry_date", { ascending: false })
          .limit(8),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (txRes.error) throw txRes.error;

      let expensesData = (expensesRes.data || []) as any[];
      if (expensesRes.error && String(expensesRes.error.message || "").toLowerCase().includes("currency_mode")) {
        const fallbackRes = await supabase
          .from("expenses")
          .select("amount,expense_date,category_id")
          .gte("expense_date", startDate.toISOString())
          .lte("expense_date", new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString());
        if (fallbackRes.error) throw fallbackRes.error;
        expensesData = ((fallbackRes.data || []) as any[]).map((e) => ({ ...e, currency_mode: "SAR" }));
      } else if (expensesRes.error) {
        throw expensesRes.error;
      }

      let refundsData = (refundsRes.data || []) as any[];
      if (refundsRes.error) {
        const fallbackRefunds = await supabase
          .from("refunds")
          .select("amount,created_at")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString());
        if (fallbackRefunds.error) throw fallbackRefunds.error;
        refundsData = fallbackRefunds.data || [];
      }

      const orders = (ordersRes.data || []) as any[];
      const expenses = expensesData.filter((e) => new Date(e.expense_date) >= startDate);
      const refunds = refundsData.filter((r) => new Date(r.created_at) >= startDate);

      const importedEntries = importsInRange.filter((entry) => entry.source === "import");

      const buckets: Record<string, { revenue: number; expenses: number }> = {};
      const keyOf = (d: Date) => monthMode ? d.toISOString().slice(0,7) : d.toISOString().slice(0,10);
      const steps = monthMode
        ? Math.max(1, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1)
        : daysSpan;
      for (let i = steps - 1; i >= 0; i--) {
        const d = new Date(startDate);
        if (monthMode) d.setMonth(startDate.getMonth() + (steps - 1 - i)); else d.setDate(startDate.getDate() + (steps - 1 - i));
        buckets[keyOf(d)] = { revenue: 0, expenses: 0 };
      }

      orders.forEach((o) => {
        const k = keyOf(new Date(o.created_at));
        if (!buckets[k]) return;
        const mode = resolveOrderMode(o);
        buckets[k].revenue += toSAR(parseFloat(o.total) || 0, mode);
      });
      expenses.forEach((e) => {
        const k = keyOf(new Date(e.expense_date));
        if (!buckets[k]) return;
        buckets[k].expenses += toSAR(parseFloat(e.amount) || 0, resolveExpenseMode(e));
      });
      refunds.forEach((r) => {
        const k = keyOf(new Date(r.created_at));
        if (!buckets[k]) return;
        const linked = Array.isArray((r as any).orders) ? (r as any).orders[0] : (r as any).orders;
        const mode = resolveOrderMode({
          currency_mode: linked?.currency_mode ?? null,
          country: linked?.country ?? null,
        });
        buckets[k].expenses += toSAR(parseFloat(r.amount) || 0, mode);
      });
      importedEntries.forEach((entry) => {
        const k = keyOf(new Date(entry.date));
        if (!buckets[k]) return;
        if (entry.amount >= 0) buckets[k].revenue += entry.amount;
        else buckets[k].expenses += Math.abs(entry.amount);
      });

      const data = Object.entries(buckets).map(([label, v]) => ({
        label: monthMode ? label.slice(2) : label.slice(5),
        revenue: Math.round(v.revenue),
        expenses: Math.round(v.expenses),
        profit: Math.round(v.revenue - v.expenses),
      }));

      const importedRevenue = importedEntries.reduce((s, e) => s + (e.amount > 0 ? e.amount : 0), 0);
      const importedExpenses = importedEntries.reduce((s, e) => s + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);

      const groupedRevenue: Record<CurrencyMode, number> = {
        SAR: 0,
        YER_SOUTH: 0,
        YER_NORTH: 0,
      };
      orders.forEach((order) => {
        const mode = resolveOrderMode(order);
        groupedRevenue[mode] += parseFloat(order.total) || 0;
      });

      const sumRev = orders.reduce((s, o) => s + toSAR(parseFloat(o.total) || 0, resolveOrderMode(o)), 0) + importedRevenue;
      const sumExp = expenses.reduce((s, e) => s + toSAR(parseFloat(e.amount) || 0, resolveExpenseMode(e)), 0) + importedExpenses;
      const sumRef = refunds.reduce((s, r) => {
        const linked = Array.isArray((r as any).orders) ? (r as any).orders[0] : (r as any).orders;
        const mode = resolveOrderMode({
          currency_mode: linked?.currency_mode ?? null,
          country: linked?.country ?? null,
        });
        return s + toSAR(parseFloat(r.amount) || 0, mode);
      }, 0);

      setSeries(data);
      setKpis({ revenue: sumRev, expenses: sumExp + sumRef, profit: sumRev - sumExp - sumRef, refunds: sumRef });
      setRevenueByCurrency(groupedRevenue);
    } catch (error) {
      console.error("Finance overview load failed", error);
      setOverviewError("تعذر تحميل بعض بيانات التحليل المالي. تم عرض البيانات المتاحة.");
      toast({
        title: "تنبيه",
        description: "تعذر تحميل بعض بيانات التحليل المالي، تم إظهار البيانات المتاحة.",
      });
    } finally {
      setLoadingOverview(false);
    }
  }

  const margin = kpis.revenue > 0 ? (kpis.profit / kpis.revenue) * 100 : 0;

  const financeAlerts = useMemo<FinanceAlert[]>(() => {
    const alerts: FinanceAlert[] = [];
    const points = series ?? [];
    const last = points[points.length - 1];
    const prev = points[points.length - 2];

    if (kpis.revenue > 0) {
      const refundRate = (kpis.refunds / kpis.revenue) * 100;
      if (refundRate >= 15) {
        alerts.push({
          id: "refund-rate-high",
          level: "high",
          title: "معدل مرتجعات مرتفع",
          details: `المرتجعات تمثل ${refundRate.toFixed(1)}% من الإيرادات خلال الفترة الحالية.`,
        });
      } else if (refundRate >= 8) {
        alerts.push({
          id: "refund-rate-medium",
          level: "medium",
          title: "معدل مرتجعات يحتاج متابعة",
          details: `المرتجعات عند ${refundRate.toFixed(1)}% من الإيرادات.`,
        });
      }
    }

    if (last && prev && prev.expenses > 0) {
      const expenseJump = ((last.expenses - prev.expenses) / prev.expenses) * 100;
      if (expenseJump >= 35) {
        alerts.push({
          id: "expenses-jump",
          level: "high",
          title: "قفزة كبيرة في المصروفات",
          details: `المصروفات ارتفعت ${expenseJump.toFixed(1)}% مقارنة بالفترة السابقة.`,
        });
      } else if (expenseJump >= 20) {
        alerts.push({
          id: "expenses-rise",
          level: "medium",
          title: "ارتفاع ملحوظ في المصروفات",
          details: `المصروفات ارتفعت ${expenseJump.toFixed(1)}% عن الفترة السابقة.`,
        });
      }
    }

    const negativeStreak = [...points]
      .reverse()
      .reduce((streak, point) => (streak >= 0 && point.profit < 0 ? streak + 1 : point.profit < 0 ? 1 : -1), 0);

    if (negativeStreak >= 3) {
      alerts.push({
        id: "negative-streak",
        level: "high",
        title: "خسائر متتالية",
        details: `هناك ${negativeStreak} فترات متتالية بصافي ربح سلبي.`,
      });
    }

    if (margin < 5 && kpis.revenue > 0) {
      alerts.push({
        id: "low-margin",
        level: "medium",
        title: "هامش ربح منخفض",
        details: `هامش الربح الحالي ${margin.toFixed(1)}% وهو أقل من الحد الآمن.`,
      });
    }

    if (ledger.length > 0) {
      const largeOutflows = ledger
        .filter((entry) => entry.amount < 0)
        .map((entry) => Math.abs(entry.amount))
        .sort((a, b) => b - a)
        .slice(0, 3);
      const avgOutflow = largeOutflows.length ? largeOutflows.reduce((s, n) => s + n, 0) / largeOutflows.length : 0;
      if (avgOutflow > 0 && Math.abs(totals.net) > avgOutflow * 2) {
        alerts.push({
          id: "net-volatility",
          level: "low",
          title: "تذبذب في صافي التدفق",
          details: "صافي الفترة متذبذب مقارنة بأكبر الحركات الخارجة، راجع القيود الكبيرة.",
        });
      }
    }

    return alerts.slice(0, 4);
  }, [kpis.revenue, kpis.refunds, kpis.profit, margin, series, ledger, totals.net]);

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
        const type = (r.type || r.Type || r.TypeOf || "").toString();
        const amount = asNum(r.amount || r.Amount || r.Amt || r.value || r.Value || 0);
        if (!date || isNaN(amount)) continue;

        const typedIncome = isIncomeType(type);
        const typedExpense = isExpenseType(type);
        const fallbackIncome = !typedIncome && !typedExpense && amount >= 0;
        const isIncome = typedIncome || fallbackIncome;

        const signedAmount = isIncome ? Math.abs(amount) : -Math.abs(amount);
        const entry: LedgerEntry = {
          id: `import-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          date: new Date(date).toISOString(),
          type: isIncome ? 'income' : 'expense',
          category: 'import',
          amount: signedAmount,
          source: 'import',
          description: desc,
        };
        parsed.push(entry);
      }

      const seen = new Set(imports.map((x) => `${new Date(x.date).toISOString()}|${x.amount}|${x.description ?? ""}|${x.source ?? ""}`));
      const uniqueParsed = parsed.filter((x) => {
        const sig = `${new Date(x.date).toISOString()}|${x.amount}|${x.description ?? ""}|${x.source ?? ""}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });

      const all = [...imports, ...uniqueParsed];
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

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
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

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(["SAR", "YER_SOUTH", "YER_NORTH"] as const).map((mode) => (
          <Card key={mode} className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
            <p className="text-xs text-muted-foreground mt-1">{currencyMeta[mode].label}</p>
            {loadingOverview ? (
              <Skeleton className="h-7 w-28 mt-3" />
            ) : (
              <div className="relative z-10 mt-2">
                <p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">{fmt(revenueByCurrency[mode])}</p>
                <p className="text-xs text-muted-foreground mt-1">{currencyMeta[mode].symbol}</p>
              </div>
            )}
          </Card>
        ))}

        <Card className="relative p-5 rounded-2xl border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
          <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-violet-500 via-pink-500 to-orange-400" />
          <p className="text-xs text-muted-foreground mt-1">الإجمالي الموحّد (محول إلى ريال سعودي)</p>
          {loadingOverview ? (
            <Skeleton className="h-7 w-28 mt-3" />
          ) : (
            <div className="relative z-10 mt-2">
              <p className="text-2xl md:text-3xl font-semibold tracking-tight tabular-nums text-foreground">{fmt(consolidatedRevenueSAR)}</p>
              <p className="text-xs text-muted-foreground mt-1">ر.س</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                الأسعار المستخدمة: 1 ر.س = {CURRENCY_RATES.YER_SOUTH.rate} ر.ي (جنوب) و {CURRENCY_RATES.YER_NORTH.rate} ر.ي (شمال)
              </p>
            </div>
          )}
        </Card>
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

          <div className="mt-4 pt-4 border-t border-black/5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">تنبيهات ذكية</h3>
              <Badge variant="outline">{financeAlerts.length}</Badge>
            </div>
            {financeAlerts.length === 0 && (
              <p className="text-xs text-muted-foreground">لا توجد تنبيهات حرجة حالياً.</p>
            )}
            {financeAlerts.map((alert) => (
              <div key={alert.id} className="rounded-lg border border-black/5 p-2.5 bg-white/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium truncate">{alert.title}</p>
                  <Badge variant={alert.level === "high" ? "destructive" : "secondary"}>
                    {alert.level === "high" ? "مرتفع" : alert.level === "medium" ? "متوسط" : "منخفض"}
                  </Badge>
                </div>

                {overviewError && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {overviewError}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{alert.details}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
