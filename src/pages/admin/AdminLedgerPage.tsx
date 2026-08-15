import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ArrowDownLeft, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, CircleOff, FileSearch, Filter, Landmark, Loader2, Plus, RefreshCcw, RotateCcw, Scale, Search, ShieldCheck, Trash2, WalletCards, X, type LucideIcon } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name_ar: string;
  type: string;
}

interface CurrencyRow {
  code: string;
  name_ar: string;
  symbol: string;
  rate_to_base: number;
  is_base: boolean;
  sort_order: number;
}

interface Line {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

interface TxLine {
  id?: string;
  debit: number;
  credit: number;
  account_id: string;
  description?: string | null;
  chart_of_accounts: {
    name_ar: string;
    code: string;
  } | null;
}

interface Tx {
  id: string;
  entry_date: string;
  reference: string | null;
  description: string;
  source_type: string | null;
  source_id: string | null;
  is_posted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  currency_code: string | null;
  amount_base: number | null;
  transaction_lines: TxLine[];
}

type DateFilter = "all" | "this_month" | "last_30" | "this_year";
type SourceFilter = "all" | "manual" | "journal_reversal" | "system";
type SortMode = "newest" | "oldest" | "amount_high" | "amount_low";

const newLine = (): Line => ({ account_id: "", debit: 0, credit: 0, description: "" });

const AdminLedgerPage = () => {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [currencyCode, setCurrencyCode] = useState("SAR");
  const [lines, setLines] = useState<Line[]>([newLine(), newLine()]);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [reversalTarget, setReversalTarget] = useState<Tx | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [reversalDate, setReversalDate] = useState(new Date().toISOString().slice(0, 10));

  /* =========================================================
     DATA
  ========================================================= */

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ["ledger-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("id,code,name_ar,type").eq("is_active", true).order("code");

      if (error) throw error;

      return (data || []) as Account[];
    },
    staleTime: 60_000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["ledger-currencies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("currencies").select("code,name_ar,symbol,rate_to_base,is_base,sort_order").eq("is_active", true).order("sort_order");

      if (error) throw error;

      return (data || []).map((row: any) => ({ ...row, rate_to_base: Number(row.rate_to_base || 1), sort_order: Number(row.sort_order || 0) })) as CurrencyRow[];
    },
    staleTime: 60_000,
  });

  const { data: txs = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-ledger-transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("financial_transactions")
        .select("id,entry_date,reference,description,source_type,source_id,is_posted,created_by,created_at,updated_at,currency_code,amount_base,transaction_lines(id,debit,credit,account_id,description,chart_of_accounts(name_ar,code))")
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      return (data || []).map((tx: any) => ({
        ...tx,
        amount_base: tx.amount_base == null ? null : Number(tx.amount_base),
        transaction_lines: Array.isArray(tx.transaction_lines) ? tx.transaction_lines.map((line: any) => ({ ...line, debit: Number(line.debit || 0), credit: Number(line.credit || 0) })) : [],
      })) as Tx[];
    },
    staleTime: 15_000,
  });

  const baseCurrency = useMemo(() => currencies.find((currency) => currency.is_base) || currencies.find((currency) => currency.code === "SAR") || { code: "SAR", name_ar: "ريال سعودي", symbol: "ر.س", rate_to_base: 1, is_base: true, sort_order: 1 }, [currencies]);
  const selectedCurrency = useMemo(() => currencies.find((currency) => currency.code === currencyCode) || baseCurrency, [currencies, currencyCode, baseCurrency]);

  /* =========================================================
     FORM TOTALS
  ========================================================= */

  const totalDebit = useMemo(() => lines.reduce((sum, line) => sum + Number(line.debit || 0), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((sum, line) => sum + Number(line.credit || 0), 0), [lines]);
  const difference = totalDebit - totalCredit;
  const balanced = totalDebit > 0 && Math.abs(difference) < 0.01;

  /* =========================================================
     DERIVED
  ========================================================= */

  const reversedOriginalIds = useMemo(() => new Set(txs.filter((tx) => tx.source_type === "journal_reversal" && tx.source_id).map((tx) => tx.source_id as string)), [txs]);

  const filteredTxs = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const yearKey = now.toISOString().slice(0, 4);
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);

    const rows = txs.filter((tx) => {
      const searchable = `${tx.description} ${tx.reference || ""} ${tx.source_type || ""} ${tx.transaction_lines.map((line) => `${line.chart_of_accounts?.code || ""} ${line.chart_of_accounts?.name_ar || ""}`).join(" ")}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      let matchesDate = true;
      if (dateFilter === "this_month") matchesDate = tx.entry_date.startsWith(monthKey);
      if (dateFilter === "this_year") matchesDate = tx.entry_date.startsWith(yearKey);
      if (dateFilter === "last_30") matchesDate = new Date(`${tx.entry_date}T00:00:00`).getTime() >= last30.getTime();

      const normalizedSource = tx.source_type || "system";
      const matchesSource = sourceFilter === "all" || (sourceFilter === "system" && normalizedSource !== "manual" && normalizedSource !== "journal_reversal") || normalizedSource === sourceFilter;
      const matchesAccount = accountFilter === "all" || tx.transaction_lines.some((line) => line.account_id === accountFilter);

      return matchesSearch && matchesDate && matchesSource && matchesAccount;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      if (sortMode === "amount_high") return transactionAmount(b) - transactionAmount(a);
      if (sortMode === "amount_low") return transactionAmount(a) - transactionAmount(b);
      return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
    });
  }, [txs, search, dateFilter, sourceFilter, accountFilter, sortMode]);

  const stats = useMemo(() => {
    const totalEntries = txs.length;
    const manual = txs.filter((tx) => tx.source_type === "manual").length;
    const reversals = txs.filter((tx) => tx.source_type === "journal_reversal").length;
    const posted = txs.filter((tx) => tx.is_posted).length;
    const thisMonthKey = new Date().toISOString().slice(0, 7);
    const thisMonthValue = txs.filter((tx) => tx.entry_date.startsWith(thisMonthKey)).reduce((sum, tx) => sum + Number(tx.amount_base ?? transactionAmount(tx)), 0);

    return {
      totalEntries,
      manual,
      reversals,
      posted,
      thisMonthValue,
    };
  }, [txs]);

  const hasFilters = Boolean(search.trim()) || dateFilter !== "this_month" || sourceFilter !== "all" || accountFilter !== "all" || sortMode !== "newest";

  /* =========================================================
     FORM HELPERS
  ========================================================= */

  const resetForm = () => {
    setEntryDate(new Date().toISOString().slice(0, 10));
    setReference("");
    setDescription("");
    setCurrencyCode(baseCurrency.code);
    setLines([newLine(), newLine()]);
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  const addLine = () => setLines((current) => [...current, newLine()]);

  const removeLine = (index: number) => {
    setLines((current) => {
      if (current.length <= 2) {
        toast({ title: "القيد يحتاج سطرين على الأقل", variant: "destructive" });
        return current;
      }

      return current.filter((_, lineIndex) => lineIndex !== index);
    });
  };

  /* =========================================================
     CREATE JOURNAL ENTRY
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!balanced) throw new Error("مجموع المدين يجب أن يساوي مجموع الدائن.");
      if (!description.trim()) throw new Error("وصف القيد مطلوب.");

      const validLines = lines.filter((line) => line.account_id && (Number(line.debit) > 0 || Number(line.credit) > 0));

      if (validLines.length < 2) throw new Error("يجب وجود سطرين صالحين على الأقل.");

      const duplicateDebitCredit = validLines.find((line) => Number(line.debit) > 0 && Number(line.credit) > 0);
      if (duplicateDebitCredit) throw new Error("كل سطر يجب أن يحتوي مدينًا أو دائنًا فقط.");

      const { data, error } = await (supabase as any).rpc("create_manual_journal_entry", {
        p_entry_date: entryDate,
        p_reference: reference.trim() || null,
        p_description: description.trim(),
        p_currency_code: currencyCode,
        p_lines: validLines.map((line) => ({
          account_id: line.account_id,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          description: line.description?.trim() || null,
        })),
      });

      if (error) throw error;

      return data as string;
    },
    onSuccess: async () => {
      setOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["admin-ledger-transactions"] });
      toast({ title: "تم ترحيل القيد", description: "تم حفظ القيد والسطور في عملية ذرّية واحدة." });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ القيد", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  /* =========================================================
     REVERSAL
  ========================================================= */

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!reversalTarget) throw new Error("لم يتم تحديد القيد.");
      if (!reversalDate) throw new Error("تاريخ قيد العكس مطلوب.");

      const { data, error } = await (supabase as any).rpc("reverse_journal_entry", {
        p_transaction_id: reversalTarget.id,
        p_entry_date: reversalDate,
        p_reason: reversalReason.trim() || "عكس القيد",
      });

      if (error) throw error;

      return data as string;
    },
    onSuccess: async () => {
      setReversalTarget(null);
      setReversalReason("");
      setReversalDate(new Date().toISOString().slice(0, 10));
      await queryClient.invalidateQueries({ queryKey: ["admin-ledger-transactions"] });
      toast({ title: "تم إنشاء قيد العكس", description: "بقي القيد الأصلي محفوظًا وتم تسجيل قيد معاكس له." });
    },
    onError: (error: any) => {
      toast({ title: "تعذر عكس القيد", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  const clearFilters = () => {
    setSearch("");
    setDateFilter("this_month");
    setSourceFilter("all");
    setAccountFilter("all");
    setSortMode("newest");
  };

  if (isLoading || accountsLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل دفتر اليومية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="دفتر اليومية" description="إدارة القيود المحاسبية المزدوجة مع الترحيل، البحث، التصفية، وقيد العكس" actions={[{ label: "قيد جديد", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي القيود" value={stats.totalEntries.toLocaleString("en-US")} helper={`${stats.posted.toLocaleString("ar-EG")} قيد مرحّل`} icon={BookOpen} tone="indigo" />
        <StatCard title="قيود يدوية" value={stats.manual.toLocaleString("en-US")} helper="أضيفت من دفتر اليومية" icon={WalletCards} tone="blue" />
        <StatCard title="قيود عكس" value={stats.reversals.toLocaleString("en-US")} helper="تحافظ على الأثر المحاسبي" icon={RotateCcw} tone="coral" />
        <StatCard title="حركة هذا الشهر" value={formatMoney(stats.thisMonthValue, baseCurrency.symbol)} helper="إجمالي الجانب المدين بالقيمة الأساسية" icon={Scale} tone="green" />
      </section>

      <section className="rounded-[12px] border border-[#DCE7F4] bg-[#F5F8FC] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <ShieldCheck className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#5680CF]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#607894]">حماية محاسبية مفعلة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#7B8FA5]">القيد اليدوي يُحفظ الآن مع سطوره كعملية واحدة، ولا يتم حذف القيد المرحّل من الصفحة؛ يتم إنشاء قيد عكس بدلاً من ذلك.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11.5px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[10px] text-[#9BA2AC]">ابحث بالمرجع والوصف والحساب، ثم فلتر الفترة والمصدر</p>
          </div>

          {hasFilters && <button type="button" onClick={clearFilters} className="flex h-[32px] items-center gap-[5px] rounded-[8px] px-[9px] text-[10px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]"><X className="h-[10px] w-[10px]" />مسح الفلاتر</button>}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] xl:grid-cols-[minmax(0,1fr)_165px_175px_220px_165px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="مرجع، وصف أو حساب..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">هذا الشهر</SelectItem>
              <SelectItem value="last_30">آخر 30 يومًا</SelectItem>
              <SelectItem value="this_year">هذا العام</SelectItem>
              <SelectItem value="all">كل الفترات</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={(value) => setSourceFilter(value as SourceFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المصادر</SelectItem>
              <SelectItem value="manual">قيد يدوي</SelectItem>
              <SelectItem value="journal_reversal">قيد عكس</SelectItem>
              <SelectItem value="system">قيود النظام</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue placeholder="الحساب" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحسابات</SelectItem>
              {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.code} — {account.name_ar}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث أولًا</SelectItem>
              <SelectItem value="oldest">الأقدم أولًا</SelectItem>
              <SelectItem value="amount_high">الأعلى قيمة</SelectItem>
              <SelectItem value="amount_low">الأقل قيمة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div><h2 className="text-[11.5px] font-semibold text-[#454C56]">القيود المحاسبية</h2><p className="mt-[3px] text-[10px] text-[#9CA3AC]">{filteredTxs.length.toLocaleString("ar-EG")} قيد ظاهر من أصل {txs.length.toLocaleString("ar-EG")}</p></div>
          {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        {filteredTxs.length === 0 ? (
          <PanelEmpty />
        ) : (
          <div className="divide-y divide-[#EEF1F4]">
            {filteredTxs.map((tx) => {
              const amount = transactionAmount(tx);
              const reversed = reversedOriginalIds.has(tx.id);
              const canReverse = tx.is_posted && tx.source_type !== "journal_reversal" && !reversed;

              return (
                <article key={tx.id} className="bg-white">
                  <div className="flex flex-col gap-[10px] p-[12px] lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-[9px]">
                      <div className={cn("flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px]", tx.source_type === "journal_reversal" ? "bg-[#FFF0ED] text-[#D06A5E]" : tx.source_type === "manual" ? "bg-[#F1EFFF] text-[#675CBA]" : "bg-[#EDF4FF] text-[#5680CF]")}>
                        {tx.source_type === "journal_reversal" ? <RotateCcw className="h-[14px] w-[14px]" /> : tx.source_type === "manual" ? <BookOpen className="h-[14px] w-[14px]" /> : <Landmark className="h-[14px] w-[14px]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-[6px]">
                          <h3 className="text-[11.5px] font-semibold text-[#3F4751]">{tx.description}</h3>
                          <SourceBadge source={tx.source_type} />
                          {reversed && <span className="inline-flex h-[24px] items-center gap-[4px] rounded-[7px] border border-[#F0D7D4] bg-[#FFF3F1] px-[7px] text-[9.5px] font-semibold text-[#C15F56]"><RotateCcw className="h-[9px] w-[9px]" />تم عكسه</span>}
                        </div>
                        <p className="mt-[4px] text-[10px] text-[#9299A3]">{formatDate(tx.entry_date)}{tx.reference ? ` · ${tx.reference}` : ""}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-[6px] lg:justify-end">
                      <div className="rounded-[9px] bg-[#F8FAFC] px-[10px] py-[7px]">
                        <p className="text-[9px] text-[#9AA2AC]">قيمة القيد</p>
                        <p className="mt-[3px] text-[11px] font-semibold text-[#59616B]">{formatMoney(amount, currencySymbolFor(tx.currency_code, currencies, baseCurrency.symbol))}</p>
                      </div>

                      {canReverse && <button type="button" onClick={() => { setReversalTarget(tx); setReversalReason(""); setReversalDate(new Date().toISOString().slice(0, 10)); }} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white px-[9px] text-[10px] font-semibold text-[#B95C54] hover:bg-[#FFF3F1]"><RotateCcw className="h-[10px] w-[10px]" />عكس القيد</button>}
                    </div>
                  </div>

                  <div className="overflow-x-auto border-t border-[#F0F2F5] bg-[#FAFBFC]">
                    <table className="w-full min-w-[760px]">
                      <thead><tr className="h-[36px] text-[10px] font-semibold text-[#8A929C]"><th className="px-[12px] text-right">الحساب</th><th className="px-[12px] text-right">الوصف</th><th className="px-[12px] text-left">مدين</th><th className="px-[12px] text-left">دائن</th></tr></thead>
                      <tbody>
                        {tx.transaction_lines.map((line, index) => (
                          <tr key={line.id || index} className="border-t border-[#EDF0F3] text-[10.5px] text-[#68717B]">
                            <td className="px-[12px] py-[8px]"><span className="font-semibold text-[#555D67]">{line.chart_of_accounts?.code || "—"} — {line.chart_of_accounts?.name_ar || "حساب غير معروف"}</span></td>
                            <td className="px-[12px] py-[8px]">{line.description || "—"}</td>
                            <td className="px-[12px] py-[8px] text-left">{line.debit > 0 ? <span className="inline-flex items-center gap-[4px] font-semibold text-[#568468]"><ArrowDownLeft className="h-[9px] w-[9px]" />{line.debit.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span> : "—"}</td>
                            <td className="px-[12px] py-[8px] text-left">{line.credit > 0 ? <span className="inline-flex items-center gap-[4px] font-semibold text-[#C15F56]"><ArrowUpRight className="h-[9px] w-[9px]" />{line.credit.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span> : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* CREATE JOURNAL ENTRY */}
      <Dialog open={open} onOpenChange={(next) => { if (!saveMutation.isPending) setOpen(next); }}>
        <DialogContent dir="rtl" className="max-h-[94vh] max-w-[980px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><BookOpen className="h-[15px] w-[15px]" /></div>
              <div>
                <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">إضافة قيد محاسبي</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">قيد مزدوج متوازن يُحفظ في قاعدة البيانات كعملية واحدة.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات القيد" icon={FileSearch}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3">
                  <Field label="التاريخ" required><Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  <Field label="المرجع"><Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="رقم فاتورة / سند..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  <Field label="العملة" required><Select value={currencyCode} onValueChange={setCurrencyCode}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.name_ar} — {currency.symbol}</SelectItem>)}</SelectContent></Select></Field>
                </div>

                <Field label="الوصف" required><Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="وصف واضح للغرض من القيد..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>

              <FormSection title="سطور القيد" icon={Scale}>
                <div className="flex items-center justify-between gap-[8px]">
                  <div><p className="text-[10.5px] font-semibold text-[#59616B]">{lines.length} سطر</p><p className="mt-[2px] text-[10px] text-[#9AA2AC]">كل سطر يحتوي مدينًا أو دائنًا فقط</p></div>
                  <Button type="button" variant="outline" onClick={addLine} className="h-[34px] rounded-[8px] border-[#E2DEF3] bg-white px-[10px] text-[10px] font-semibold text-[#675CBA] shadow-none"><Plus className="ml-[5px] h-[10px] w-[10px]" />إضافة سطر</Button>
                </div>

                <div className="space-y-[6px]">
                  {lines.map((line, index) => (
                    <div key={index} className="rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[8px]">
                      <div className="grid grid-cols-1 gap-[6px] xl:grid-cols-[minmax(0,1.5fr)_130px_130px_36px]">
                        <Select value={line.account_id} onValueChange={(value) => updateLine(index, { account_id: value })}>
                          <SelectTrigger className="h-[38px] rounded-[8px] border-[#E2E6EB] bg-white text-[10.5px] shadow-none focus:ring-0"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
                          <SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.code} — {account.name_ar}</SelectItem>)}</SelectContent>
                        </Select>

                        <Input type="number" min="0" step="0.01" placeholder="مدين" value={line.debit || ""} onChange={(event) => updateLine(index, { debit: Number(event.target.value) || 0, credit: 0 })} className="h-[38px] rounded-[8px] border-[#D8E8DD] bg-white text-[10.5px] shadow-none focus-visible:ring-0" />
                        <Input type="number" min="0" step="0.01" placeholder="دائن" value={line.credit || ""} onChange={(event) => updateLine(index, { credit: Number(event.target.value) || 0, debit: 0 })} className="h-[38px] rounded-[8px] border-[#F0D7D4] bg-white text-[10.5px] shadow-none focus-visible:ring-0" />
                        <button type="button" onClick={() => removeLine(index)} className="flex h-[38px] w-[36px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#C15F56] hover:bg-[#FFF3F1]"><Trash2 className="h-[11px] w-[11px]" /></button>
                      </div>

                      <Input value={line.description || ""} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="وصف السطر - اختياري" className="mt-[6px] h-[36px] rounded-[8px] border-[#E2E6EB] bg-white text-[10px] shadow-none focus-visible:ring-0" />
                    </div>
                  ))}
                </div>

                <div className={cn("grid grid-cols-1 gap-[6px] rounded-[11px] border p-[9px] sm:grid-cols-4", balanced ? "border-[#D8E8DD] bg-[#F4FAF6]" : "border-[#EEDFC4] bg-[#FFF9EF]")}>
                  <BalanceBox label="إجمالي المدين" value={formatMoney(totalDebit, selectedCurrency.symbol)} tone="green" />
                  <BalanceBox label="إجمالي الدائن" value={formatMoney(totalCredit, selectedCurrency.symbol)} tone="coral" />
                  <BalanceBox label="الفرق" value={formatMoney(Math.abs(difference), selectedCurrency.symbol)} tone={balanced ? "green" : "amber"} />
                  <div className="flex items-center justify-center rounded-[9px] bg-white p-[8px]"><div className="text-center">{balanced ? <CheckCircle2 className="mx-auto h-[16px] w-[16px] text-[#568468]" /> : <CircleOff className="mx-auto h-[16px] w-[16px] text-[#A9782F]" />}<p className={cn("mt-[4px] text-[10px] font-semibold", balanced ? "text-[#568468]" : "text-[#A9782F]")}>{balanced ? "القيد متوازن" : "غير متوازن"}</p></div></div>
                </div>
              </FormSection>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-[8px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <p className="hidden text-[10px] text-[#9AA2AC] sm:block">سيُرحّل القيد مباشرة بعد الحفظ.</p>
              <div className="flex gap-[7px]">
                <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => setOpen(false)} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
                <Button type="submit" disabled={!balanced || saveMutation.isPending} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB] disabled:opacity-50">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <BookOpen className="ml-[5px] h-[12px] w-[12px]" />}حفظ وترحيل القيد</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* REVERSAL DIALOG */}
      <Dialog open={Boolean(reversalTarget)} onOpenChange={(next) => { if (!next && !reverseMutation.isPending) setReversalTarget(null); }}>
        <DialogContent dir="rtl" className="max-w-[560px] rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#FFF0ED] text-[#C15F56]"><RotateCcw className="h-[15px] w-[15px]" /></div>
              <div>
                <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">عكس القيد</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">سيبقى القيد الأصلي محفوظًا وسيتم إنشاء قيد جديد بعكس المدين والدائن.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-[10px] p-[10px]">
            <div className="rounded-[10px] border border-[#E5E9EF] bg-white p-[10px]">
              <p className="text-[10px] text-[#9AA2AC]">القيد الأصلي</p>
              <p className="mt-[4px] text-[11px] font-semibold text-[#4A525C]">{reversalTarget?.description}</p>
              <p className="mt-[3px] text-[10px] text-[#9299A3]">{reversalTarget?.reference || "بدون مرجع"} · {reversalTarget ? formatDate(reversalTarget.entry_date) : ""}</p>
            </div>

            <Field label="تاريخ قيد العكس" required><Input type="date" value={reversalDate} onChange={(event) => setReversalDate(event.target.value)} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-white text-[11px] shadow-none focus-visible:ring-0" /></Field>
            <Field label="سبب العكس"><Textarea rows={4} value={reversalReason} onChange={(event) => setReversalReason(event.target.value)} placeholder="مثال: تم إدخال القيد بقيمة خاطئة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-white text-[11px] leading-6 shadow-none focus-visible:ring-0" /></Field>

            <div className="rounded-[10px] border border-[#F0D7D4] bg-[#FFF8F7] p-[9px] text-[10px] leading-5 text-[#A6635C]">لا يتم حذف السجل الأصلي لأن دفتر اليومية يجب أن يحافظ على الأثر المحاسبي. قيد العكس هو الإجراء الصحيح للقيود المرحّلة.</div>
          </div>

          <div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
            <Button type="button" variant="outline" disabled={reverseMutation.isPending} onClick={() => setReversalTarget(null)} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
            <Button type="button" disabled={reverseMutation.isPending} onClick={() => reverseMutation.mutate()} className="h-[38px] rounded-[9px] bg-[#C76161] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#B65555]">{reverseMutation.isPending && <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" />}إنشاء قيد العكس</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const transactionAmount = (tx: Tx) => {
  const debitTotal = tx.transaction_lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  return debitTotal;
};

const SourceBadge = ({ source }: { source: string | null }) => {
  if (source === "manual") return <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#E2DEF3] bg-[#F6F4FF] px-[7px] text-[9.5px] font-semibold text-[#675CBA]">يدوي</span>;
  if (source === "journal_reversal") return <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#F0D7D4] bg-[#FFF3F1] px-[7px] text-[9.5px] font-semibold text-[#C15F56]">عكس</span>;
  return <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[7px] text-[9.5px] font-semibold text-[#5679A4]">نظام</span>;
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "coral" | "green" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const BalanceBox = ({ label, value, tone }: { label: string; value: string; tone: "green" | "coral" | "amber" }) => {
  const valueClass = tone === "green" ? "text-[#568468]" : tone === "coral" ? "text-[#C15F56]" : "text-[#A9782F]";
  return <div className="rounded-[9px] bg-white p-[8px]"><p className="text-[10px] text-[#9AA2AC]">{label}</p><p className={cn("mt-[4px] truncate text-[11px] font-semibold", valueClass)}>{value}</p></div>;
};

const PanelEmpty = () => {
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><BookOpen className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد قيود</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">غيّر البحث أو الفلاتر، أو أضف قيدًا جديدًا.</p></div>;
};

const currencySymbolFor = (code: string | null, currencies: CurrencyRow[], fallback: string) => currencies.find((currency) => currency.code === code)?.symbol || fallback;

const formatMoney = (value: number, symbol: string) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value || "—";
  }
};

const translateDbError = (message?: string) => {
  const value = String(message || "");

  if (value.includes("Admin access required")) return "هذه العملية متاحة للمدير فقط.";
  if (value.includes("Journal entry is not balanced")) return "القيد غير متوازن.";
  if (value.includes("At least two journal lines")) return "القيد يحتاج سطرين على الأقل.";
  if (value.includes("Invalid or inactive currency")) return "العملة غير صحيحة أو غير نشطة.";
  if (value.includes("Invalid or inactive account")) return "أحد الحسابات غير صحيح أو غير نشط.";
  if (value.includes("Each line must contain debit or credit")) return "كل سطر يجب أن يحتوي مدينًا أو دائنًا فقط.";
  if (value.includes("already been reversed")) return "تم عكس هذا القيد مسبقًا.";
  if (value.includes("reversal entry cannot be reversed")) return "لا يمكن عكس قيد عكس من هذا الإجراء.";

  return value || "حدث خطأ غير متوقع.";
};

export default AdminLedgerPage;