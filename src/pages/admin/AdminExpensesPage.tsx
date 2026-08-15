import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarDays, CircleDollarSign, ExternalLink, FileText, Loader2, Pencil, Plus, Receipt, Search, Tag, Trash2, TrendingDown, UploadCloud, Wallet, X, type LucideIcon } from "lucide-react";

interface Category {
  id: string;
  name: string;
  name_ar: string;
  account_id: string | null;
  chart_of_accounts?: { code: string; name_ar: string } | null;
}

interface Method {
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

interface Expense {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
  vendor: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  currency_mode: string;
  currency_code: string | null;
  amount_base: number | null;
  expense_categories: { id: string; name_ar: string; account_id: string | null } | null;
  payment_methods: { id: string; code: string; name_ar: string; type: string } | null;
}

type ExpenseForm = {
  expense_date: string;
  category_id: string;
  amount: string;
  description: string;
  vendor: string;
  payment_method_id: string;
  notes: string;
  currency_code: string;
  receipt_url: string;
};

type DateFilter = "all" | "this_month" | "last_30" | "this_year";
type SortMode = "newest" | "oldest" | "amount_high" | "amount_low";

const RECEIPT_BUCKET = "expense-receipts";
const MAX_RECEIPT_SIZE = 8 * 1024 * 1024;

const emptyForm = (): ExpenseForm => ({
  expense_date: new Date().toISOString().slice(0, 10),
  category_id: "none",
  amount: "",
  description: "",
  vendor: "",
  payment_method_id: "none",
  notes: "",
  currency_code: "SAR",
  receipt_url: "",
});

const AdminExpensesPage = () => {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [pendingReceiptPath, setPendingReceiptPath] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  /* =========================================================
     DATA
  ========================================================= */

  const { data: expenses = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expenses")
        .select("id,expense_date,amount,description,vendor,category_id,payment_method_id,receipt_url,notes,created_by,created_at,updated_at,currency_mode,currency_code,amount_base,expense_categories(id,name_ar,account_id),payment_methods(id,code,name_ar,type)")
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        amount: Number(row.amount || 0),
        amount_base: row.amount_base == null ? null : Number(row.amount_base),
      })) as Expense[];
    },
    staleTime: 20_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["active-expense-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expense_categories")
        .select("id,name,name_ar,account_id,chart_of_accounts(code,name_ar)")
        .eq("is_active", true)
        .order("name_ar");

      if (error) throw error;

      return (data || []) as Category[];
    },
    staleTime: 60_000,
  });

  const { data: methods = [] } = useQuery({
    queryKey: ["active-payment-methods-expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_methods")
        .select("id,code,name_ar,type")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      return (data || []) as Method[];
    },
    staleTime: 60_000,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["active-currencies-expenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("currencies")
        .select("code,name_ar,symbol,rate_to_base,is_base,sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      return (data || []).map((row: any) => ({ ...row, rate_to_base: Number(row.rate_to_base || 1), sort_order: Number(row.sort_order || 0) })) as CurrencyRow[];
    },
    staleTime: 60_000,
  });

  const baseCurrency = useMemo(() => currencies.find((row) => row.is_base) || currencies.find((row) => row.code === "SAR") || { code: "SAR", name_ar: "ريال سعودي", symbol: "ر.س", rate_to_base: 1, is_base: true, sort_order: 1 }, [currencies]);
  const currencyMap = useMemo(() => new Map(currencies.map((row) => [row.code, row])), [currencies]);

  const getExpenseCurrency = (expense: Expense) => currencyMap.get(expense.currency_code || expense.currency_mode || baseCurrency.code) || baseCurrency;

  const getExpenseBaseAmount = (expense: Expense) => {
    if (expense.amount_base != null && Number.isFinite(expense.amount_base)) return expense.amount_base;
    const currency = getExpenseCurrency(expense);
    return currency.rate_to_base > 0 ? expense.amount / currency.rate_to_base : expense.amount;
  };

  /* =========================================================
     FILTERS / STATS
  ========================================================= */

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const yearKey = now.toISOString().slice(0, 4);
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);

    const rows = expenses.filter((expense) => {
      const searchable = `${expense.description} ${expense.vendor || ""} ${expense.expense_categories?.name_ar || ""} ${expense.payment_methods?.name_ar || ""} ${expense.notes || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesCategory = categoryFilter === "all" || expense.category_id === categoryFilter;
      const matchesMethod = methodFilter === "all" || expense.payment_method_id === methodFilter;
      const effectiveCurrency = expense.currency_code || expense.currency_mode || baseCurrency.code;
      const matchesCurrency = currencyFilter === "all" || effectiveCurrency === currencyFilter;

      let matchesDate = true;
      if (dateFilter === "this_month") matchesDate = expense.expense_date.startsWith(monthKey);
      if (dateFilter === "this_year") matchesDate = expense.expense_date.startsWith(yearKey);
      if (dateFilter === "last_30") matchesDate = new Date(`${expense.expense_date}T00:00:00`).getTime() >= last30.getTime();

      return matchesSearch && matchesCategory && matchesMethod && matchesCurrency && matchesDate;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
      if (sortMode === "amount_high") return getExpenseBaseAmount(b) - getExpenseBaseAmount(a);
      if (sortMode === "amount_low") return getExpenseBaseAmount(a) - getExpenseBaseAmount(b);
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
    });
  }, [expenses, search, categoryFilter, methodFilter, currencyFilter, dateFilter, sortMode, currencyMap, baseCurrency]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const total = expenses.reduce((sum, expense) => sum + getExpenseBaseAmount(expense), 0);
    const thisMonth = expenses.filter((expense) => expense.expense_date.startsWith(monthKey)).reduce((sum, expense) => sum + getExpenseBaseAmount(expense), 0);
    const average = expenses.length > 0 ? total / expenses.length : 0;

    const categoryTotals = new Map<string, number>();
    expenses.forEach((expense) => {
      const key = expense.expense_categories?.name_ar || "غير مصنف";
      categoryTotals.set(key, (categoryTotals.get(key) || 0) + getExpenseBaseAmount(expense));
    });

    const topCategory = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0] || null;

    return { total, thisMonth, average, topCategory };
  }, [expenses, currencyMap, baseCurrency]);

  const hasFilters = Boolean(search.trim()) || categoryFilter !== "all" || methodFilter !== "all" || currencyFilter !== "all" || dateFilter !== "this_month" || sortMode !== "newest";

  /* =========================================================
     EDITOR
  ========================================================= */

  const openCreate = () => {
    setEditingExpense(null);
    setForm({ ...emptyForm(), currency_code: baseCurrency.code });
    setPendingReceiptPath(null);
    setDialogOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setPendingReceiptPath(null);
    setForm({
      expense_date: expense.expense_date,
      category_id: expense.category_id || "none",
      amount: String(expense.amount),
      description: expense.description,
      vendor: expense.vendor || "",
      payment_method_id: expense.payment_method_id || "none",
      notes: expense.notes || "",
      currency_code: expense.currency_code || expense.currency_mode || baseCurrency.code,
      receipt_url: expense.receipt_url || "",
    });
    setDialogOpen(true);
  };

  const cleanupPendingReceipt = async () => {
    if (!pendingReceiptPath) return;
    await supabase.storage.from(RECEIPT_BUCKET).remove([pendingReceiptPath]);
    setPendingReceiptPath(null);
  };

  const closeDialog = async () => {
    if (saveMutation.isPending || uploadingReceipt) return;
    await cleanupPendingReceipt();
    setDialogOpen(false);
    setEditingExpense(null);
    setForm(emptyForm());
  };

  const uploadReceipt = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const allowed = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!allowed) {
      toast({ title: "صيغة غير مدعومة", description: "ارفع صورة أو ملف PDF فقط.", variant: "destructive" });
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      toast({ title: "الملف كبير", description: "الحد الأقصى للإيصال 8 MB.", variant: "destructive" });
      return;
    }

    setUploadingReceipt(true);

    try {
      if (pendingReceiptPath) await supabase.storage.from(RECEIPT_BUCKET).remove([pendingReceiptPath]);

      const extension = file.name.split(".").pop()?.toLowerCase() || (file.type === "application/pdf" ? "pdf" : "jpg");
      const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `expenses/receipts/${token}.${extension}`;

      const { error: uploadError } = await supabase.storage.from(RECEIPT_BUCKET).upload(path, file, { contentType: file.type || undefined, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      setPendingReceiptPath(path);
      setForm((current) => ({ ...current, receipt_url: path }));
      toast({ title: "تم رفع الإيصال" });
    } catch (error: any) {
      toast({ title: "تعذر رفع الإيصال", description: error?.message || "حدث خطأ أثناء الرفع.", variant: "destructive" });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);
      if (!form.expense_date) throw new Error("تاريخ المصروف مطلوب.");
      if (!form.description.trim()) throw new Error("وصف المصروف مطلوب.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("أدخل مبلغًا أكبر من صفر.");

      const currency = currencyMap.get(form.currency_code) || baseCurrency;
      const amountBase = currency.rate_to_base > 0 ? amount / currency.rate_to_base : amount;
      const currentUser = await supabase.auth.getUser();

      const payload: any = {
        expense_date: form.expense_date,
        amount,
        description: form.description.trim(),
        vendor: form.vendor.trim() || null,
        category_id: form.category_id === "none" ? null : form.category_id,
        payment_method_id: form.payment_method_id === "none" ? null : form.payment_method_id,
        receipt_url: form.receipt_url || null,
        notes: form.notes.trim() || null,
        currency_mode: form.currency_code,
        currency_code: form.currency_code,
        amount_base: Number(amountBase.toFixed(4)),
      };

      if (editingExpense) {
        const { error } = await (supabase as any).from("expenses").update(payload).eq("id", editingExpense.id);
        if (error) throw error;
        return;
      }

      payload.created_by = currentUser.data.user?.id || null;
      const { error } = await (supabase as any).from("expenses").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      const oldReceiptUrl = editingExpense?.receipt_url || null;
      const newReceiptUrl = form.receipt_url || null;
      const committedPath = pendingReceiptPath;

      setPendingReceiptPath(null);
      setDialogOpen(false);
      setEditingExpense(null);
      setForm(emptyForm());

      await queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });

      if (committedPath && !newReceiptUrl) {
        void supabase.storage.from(RECEIPT_BUCKET).remove([committedPath]);
      }

      if (oldReceiptUrl && oldReceiptUrl !== newReceiptUrl) {
        const oldPath = extractUploadPath(oldReceiptUrl);
        if (oldPath) void supabase.storage.from(RECEIPT_BUCKET).remove([oldPath]);
      }

      toast({ title: editingExpense ? "تم تحديث المصروف" : "تم حفظ المصروف" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ المصروف", description: error?.message || "حدث خطأ أثناء الحفظ.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (expense: Expense) => {
      const { error } = await (supabase as any).from("expenses").delete().eq("id", expense.id);
      if (error) throw error;
    },
    onSuccess: async (_data, expense) => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });

      const receiptPath = extractUploadPath(expense.receipt_url || "");
      if (receiptPath) void supabase.storage.from(RECEIPT_BUCKET).remove([receiptPath]);

      toast({ title: "تم حذف المصروف" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف المصروف", description: error?.message || "حدث خطأ أثناء الحذف.", variant: "destructive" });
    },
  });

  const openReceipt = async (receiptRef: string) => {
    if (!receiptRef) return;

    if (/^https?:\/\//i.test(receiptRef)) {
      window.open(receiptRef, "_blank", "noopener,noreferrer");
      return;
    }

    const receiptWindow = window.open("", "_blank");

    try {
      if (!receiptWindow) throw new Error("المتصفح منع فتح الإيصال.");

      const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(receiptRef, 300);
      if (error || !data?.signedUrl) throw error || new Error("تعذر إنشاء رابط آمن للإيصال.");

      receiptWindow.opener = null;
      receiptWindow.location.href = data.signedUrl;
    } catch (error: any) {
      receiptWindow?.close();
      toast({ title: "تعذر فتح الإيصال", description: error?.message || "حدث خطأ أثناء فتح الإيصال.", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setMethodFilter("all");
    setCurrencyFilter("all");
    setDateFilter("this_month");
    setSortMode("newest");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل المصروفات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="المصروفات التشغيلية" description="تسجيل ومراجعة وتحليل مصروفات التشغيل مع العملات والتصنيفات وطرق الدفع والإيصالات" actions={[{ label: "مصروف جديد", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي المصروفات" value={formatBaseMoney(stats.total, baseCurrency.symbol)} helper={`${expenses.length.toLocaleString("ar-EG")} سجل مالي`} icon={TrendingDown} tone="coral" />
        <StatCard title="مصروفات هذا الشهر" value={formatBaseMoney(stats.thisMonth, baseCurrency.symbol)} helper={new Intl.DateTimeFormat("ar-YE", { month: "long", year: "numeric" }).format(new Date())} icon={CalendarDays} tone="amber" />
        <StatCard title="متوسط المصروف" value={formatBaseMoney(stats.average, baseCurrency.symbol)} helper="متوسط القيمة الأساسية للسجل" icon={CircleDollarSign} tone="indigo" />
        <StatCard title="أعلى تصنيف" value={stats.topCategory?.[0] || "—"} helper={stats.topCategory ? formatBaseMoney(stats.topCategory[1], baseCurrency.symbol) : "لا توجد بيانات"} icon={Tag} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11.5px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[10px] text-[#9BA2AC]">فلترة السجل حسب التصنيف وطريقة الدفع والعملة والفترة</p>
          </div>

          {hasFilters && <button type="button" onClick={clearFilters} className="flex h-[32px] items-center gap-[5px] rounded-[8px] px-[9px] text-[10px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]"><X className="h-[10px] w-[10px]" />مسح الفلاتر</button>}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_170px_155px_155px_170px]">
          <div className="relative lg:col-span-2 xl:col-span-1">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="الوصف، المورد، التصنيف أو الملاحظات..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="this_month">هذا الشهر</SelectItem><SelectItem value="last_30">آخر 30 يومًا</SelectItem><SelectItem value="this_year">هذا العام</SelectItem><SelectItem value="all">كل الفترات</SelectItem></SelectContent></Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue placeholder="التصنيف" /></SelectTrigger><SelectContent><SelectItem value="all">كل التصنيفات</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>)}</SelectContent></Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue placeholder="طريقة الدفع" /></SelectTrigger><SelectContent><SelectItem value="all">كل طرق الدفع</SelectItem>{methods.map((method) => <SelectItem key={method.id} value={method.id}>{method.name_ar}</SelectItem>)}</SelectContent></Select>
          <Select value={currencyFilter} onValueChange={setCurrencyFilter}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue placeholder="العملة" /></SelectTrigger><SelectContent><SelectItem value="all">كل العملات</SelectItem>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.name_ar}</SelectItem>)}</SelectContent></Select>
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">الأحدث أولًا</SelectItem><SelectItem value="oldest">الأقدم أولًا</SelectItem><SelectItem value="amount_high">الأعلى قيمة</SelectItem><SelectItem value="amount_low">الأقل قيمة</SelectItem></SelectContent></Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div><h2 className="text-[11.5px] font-semibold text-[#454C56]">سجل المصروفات</h2><p className="mt-[3px] text-[10px] text-[#9CA3AC]">{filteredExpenses.length.toLocaleString("ar-EG")} مصروف ظاهر من أصل {expenses.length.toLocaleString("ar-EG")}</p></div>
          {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        {filteredExpenses.length === 0 ? (
          <PanelEmpty />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1180px]">
                <thead><tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]"><th className="px-[12px] text-right">المصروف</th><th className="px-[12px] text-right">التصنيف</th><th className="px-[12px] text-right">المورد</th><th className="px-[12px] text-right">طريقة الدفع</th><th className="px-[12px] text-right">المبلغ</th><th className="px-[12px] text-right">القيمة الأساسية</th><th className="px-[12px] text-right">التاريخ</th><th className="px-[12px] text-right">الإيصال</th><th className="w-[100px] px-[12px] text-center">الإجراءات</th></tr></thead>
                <tbody>
                  {filteredExpenses.map((expense) => {
                    const currency = getExpenseCurrency(expense);
                    const baseAmount = getExpenseBaseAmount(expense);

                    return (
                      <tr key={expense.id} className="h-[74px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                        <td className="px-[12px]"><div className="flex min-w-[220px] items-center gap-[9px]"><div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[9px] bg-[#FFF0ED] text-[#D06A5E]"><Receipt className="h-[14px] w-[14px]" /></div><div className="min-w-0"><p className="max-w-[260px] truncate text-[11px] font-semibold text-[#444C56]">{expense.description}</p><p className="mt-[3px] max-w-[260px] truncate text-[9.5px] text-[#969DA7]">{expense.notes || "بدون ملاحظات"}</p></div></div></td>
                        <td className="px-[12px]"><span className="text-[10.5px] font-medium text-[#68717B]">{expense.expense_categories?.name_ar || "غير مصنف"}</span></td>
                        <td className="px-[12px]"><span className="max-w-[160px] truncate text-[10.5px] text-[#68717B]">{expense.vendor || "—"}</span></td>
                        <td className="px-[12px]"><span className="text-[10.5px] text-[#68717B]">{expense.payment_methods?.name_ar || "—"}</span></td>
                        <td className="px-[12px]"><div><p className="text-[11px] font-semibold text-[#C15F56]">{formatNativeMoney(expense.amount, currency.symbol)}</p><p className="mt-[2px] text-[9.5px] text-[#9AA1AB]">{currency.name_ar}</p></div></td>
                        <td className="px-[12px]"><span className="text-[10.5px] font-semibold text-[#59616B]">{formatBaseMoney(baseAmount, baseCurrency.symbol)}</span></td>
                        <td className="px-[12px]"><span className="text-[10.5px] text-[#7E8690]">{formatDate(expense.expense_date)}</span></td>
                        <td className="px-[12px]">{expense.receipt_url ? <button type="button" onClick={() => void openReceipt(expense.receipt_url!)} className="inline-flex h-[29px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[8px] text-[10px] font-semibold text-[#5679A4]"><ExternalLink className="h-[10px] w-[10px]" />عرض</button> : <span className="text-[10px] text-[#A0A6AF]">—</span>}</td>
                        <td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => openEdit(expense)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]" title="تعديل"><Pencil className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => setDeleteTarget(expense)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]" title="حذف"><Trash2 className="h-[11px] w-[11px]" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filteredExpenses.map((expense) => {
                const currency = getExpenseCurrency(expense);
                const baseAmount = getExpenseBaseAmount(expense);

                return (
                  <article key={expense.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                    <div className="p-[11px]">
                      <div className="flex items-start justify-between gap-[8px]"><div className="flex min-w-0 gap-[9px]"><div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#FFF0ED] text-[#D06A5E]"><Receipt className="h-[15px] w-[15px]" /></div><div className="min-w-0"><h3 className="line-clamp-2 text-[11.5px] font-semibold text-[#3B424C]">{expense.description}</h3><p className="mt-[3px] text-[10px] text-[#9299A3]">{formatDate(expense.expense_date)}</p></div></div><p className="shrink-0 text-[11px] font-semibold text-[#C15F56]">{formatNativeMoney(expense.amount, currency.symbol)}</p></div>

                      <div className="mt-[10px] grid grid-cols-2 gap-[6px]"><InfoBox label="التصنيف" value={expense.expense_categories?.name_ar || "غير مصنف"} /><InfoBox label="القيمة الأساسية" value={formatBaseMoney(baseAmount, baseCurrency.symbol)} /></div>
                      <div className="mt-[6px] grid grid-cols-2 gap-[6px]"><InfoBox label="المورد" value={expense.vendor || "—"} /><InfoBox label="طريقة الدفع" value={expense.payment_methods?.name_ar || "—"} /></div>

                      {expense.notes && <p className="mt-[8px] rounded-[8px] bg-[#F8FAFC] p-[8px] text-[10px] leading-5 text-[#7E8690]">{expense.notes}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                      {expense.receipt_url ? <button type="button" onClick={() => void openReceipt(expense.receipt_url!)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white text-[10px] font-semibold text-[#5679A4]"><ExternalLink className="h-[10px] w-[10px]" />الإيصال</button> : <div className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[10px] text-[#A0A6AF]">بدون إيصال</div>}
                      <button type="button" onClick={() => openEdit(expense)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                      <button type="button" onClick={() => setDeleteTarget(expense)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[10px] font-semibold text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" />حذف</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* EXPENSE EDITOR */}
      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) void closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[760px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#FFF0ED] text-[#D06A5E]">{editingExpense ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}</div><div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">سجّل المصروف بعملته الأصلية وسيتم حفظ القيمة الأساسية تلقائيًا للتقارير المالية.</DialogDescription></div></div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات المصروف" icon={Receipt}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><Field label="التاريخ" required><Input type="date" value={form.expense_date} onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field><Field label="التصنيف"><Select value={form.category_id} onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">بدون تصنيف</SelectItem>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>)}</SelectContent></Select></Field></div>
                <Field label="الوصف" required><Input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="مثال: إيجار معرض شهر أغسطس" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                <Field label="المورد / الجهة"><Input value={form.vendor} onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))} placeholder="اسم المورد أو الجهة - اختياري" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>

              <FormSection title="المبلغ والدفع" icon={Wallet}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><Field label="العملة" required><Select value={form.currency_code} onValueChange={(value) => setForm((current) => ({ ...current, currency_code: value }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.name_ar} — {currency.symbol}</SelectItem>)}</SelectContent></Select></Field><Field label="المبلغ" required><Input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field></div>
                <Field label="طريقة الدفع"><Select value={form.payment_method_id} onValueChange={(value) => setForm((current) => ({ ...current, payment_method_id: value }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">غير محددة</SelectItem>{methods.map((method) => <SelectItem key={method.id} value={method.id}>{method.name_ar}</SelectItem>)}</SelectContent></Select></Field>

                {form.amount && Number(form.amount) > 0 && (() => { const currency = currencyMap.get(form.currency_code) || baseCurrency; const base = currency.rate_to_base > 0 ? Number(form.amount) / currency.rate_to_base : Number(form.amount); return <div className="rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] p-[9px]"><div className="flex items-center justify-between gap-[10px]"><span className="text-[10px] text-[#8D949E]">القيمة الأساسية للتقارير</span><span className="text-[11px] font-semibold text-[#59616B]">{formatBaseMoney(base, baseCurrency.symbol)}</span></div>{currency.code !== baseCurrency.code && <p className="mt-[5px] text-[9.5px] text-[#9AA2AC]">1 {baseCurrency.symbol} = {currency.rate_to_base.toLocaleString("en-US")} {currency.symbol}</p>}</div>; })()}
              </FormSection>

              <FormSection title="الإيصال والملاحظات" icon={FileText}>
                <div className="rounded-[10px] border border-dashed border-[#D8DDE4] bg-[#FAFBFC] p-[10px]">
                  <div className="flex flex-col gap-[8px] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10.5px] font-semibold text-[#59616B]">إرفاق إيصال أو فاتورة شراء</p><p className="mt-[3px] text-[10px] text-[#9AA2AC]">صورة أو PDF حتى 8 MB</p></div><label className={cn("inline-flex h-[36px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white px-[10px] text-[10px] font-semibold text-[#5679A4]", uploadingReceipt && "pointer-events-none opacity-60")}>{uploadingReceipt ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <UploadCloud className="h-[11px] w-[11px]" />}{form.receipt_url ? "استبدال الإيصال" : "رفع إيصال"}<input type="file" accept="image/*,application/pdf" className="hidden" onChange={uploadReceipt} /></label></div>
                  {form.receipt_url && <div className="mt-[8px] flex items-center justify-between gap-[8px] rounded-[8px] border border-[#E3E7EC] bg-white p-[7px]"><button type="button" onClick={() => void openReceipt(form.receipt_url)} className="flex min-w-0 items-center gap-[6px] text-[10px] font-semibold text-[#5679A4]"><ExternalLink className="h-[10px] w-[10px] shrink-0" /><span className="truncate">فتح الإيصال الحالي</span></button><button type="button" onClick={() => { if (pendingReceiptPath) { void supabase.storage.from(RECEIPT_BUCKET).remove([pendingReceiptPath]); setPendingReceiptPath(null); } setForm((current) => ({ ...current, receipt_url: "" })); }} className="flex h-[28px] w-[28px] items-center justify-center rounded-[7px] text-[#C15F56] hover:bg-[#FFF0ED]"><X className="h-[10px] w-[10px]" /></button></div>}
                </div>
                <Field label="ملاحظات"><Textarea rows={4} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="تفاصيل إضافية، رقم مرجع، سبب المصروف..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3"><Button type="button" variant="outline" disabled={saveMutation.isPending || uploadingReceipt} onClick={() => void closeDialog()} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button><Button type="submit" disabled={saveMutation.isPending || uploadingReceipt} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : editingExpense ? <Pencil className="ml-[5px] h-[12px] w-[12px]" /> : <Plus className="ml-[5px] h-[12px] w-[12px]" />}{editingExpense ? "حفظ التعديلات" : "حفظ المصروف"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف المصروف</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف المصروف "{deleteTarget?.description || ""}" نهائيًا، وسيتم حذف الإيصال أيضًا إذا كان مرفوعًا داخل تخزين المتجر.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "coral" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
    amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const InfoBox = ({ label, value }: { label: string; value: string }) => {
  return <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[10px] text-[#9AA2AC]">{label}</p><p className="mt-[4px] truncate text-[10.5px] font-semibold text-[#59616B]">{value}</p></div>;
};

const PanelEmpty = () => {
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#FFF0ED] text-[#D06A5E]"><Receipt className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد مصروفات</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">غيّر البحث أو الفلاتر، أو أضف مصروفًا جديدًا.</p></div>;
};

const formatNativeMoney = (value: number, symbol: string) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;
const formatBaseMoney = (value: number, symbol: string) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value || "—";
  }
};

const extractUploadPath = (value: string) => {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;

  const privateMarker = `/storage/v1/object/sign/${RECEIPT_BUCKET}/`;
  const publicMarker = `/storage/v1/object/public/${RECEIPT_BUCKET}/`;
  const privateIndex = value.indexOf(privateMarker);
  const publicIndex = value.indexOf(publicMarker);

  if (privateIndex >= 0) return decodeURIComponent(value.slice(privateIndex + privateMarker.length).split("?")[0]);
  if (publicIndex >= 0) return decodeURIComponent(value.slice(publicIndex + publicMarker.length).split("?")[0]);

  return null;
};

export default AdminExpensesPage;