import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Banknote, CheckCircle2, CircleOff, Clock3, FileSearch, Loader2, Package, Plus, RefreshCcw, Search, ShieldCheck, ShoppingBag, Trash2, UserRound, WalletCards, X, type LucideIcon } from "lucide-react";

interface CurrencyRow {
  code: string;
  name_ar: string;
  symbol: string;
  rate_to_base: number;
  is_base: boolean;
  sort_order: number;
}

interface OrderItem {
  product_id?: string;
  product_name?: string;
  name?: string;
  product_image?: string;
  image?: string;
  quantity?: number;
  price?: number;
  selected_size?: string | null;
  selected_color?: string | null;
}

interface OrderSearchRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  total: number;
  items: OrderItem[];
  currency_code: string | null;
  currency_mode: string | null;
}

interface RefundItem extends OrderItem {
  refund_quantity: number;
}

interface Refund {
  id: string;
  refund_number: string;
  order_id: string | null;
  order_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  amount: number;
  amount_base: number | null;
  currency_code: string | null;
  reason: string;
  items: RefundItem[];
  refund_method: string;
  refund_type: string | null;
  status: string;
  notes: string | null;
  admin_notes: string | null;
  processed_at: string | null;
  processed_by: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  orders?: {
    id: string;
    order_number: string;
    items: OrderItem[];
    total: number;
    currency_code: string | null;
    currency_mode: string | null;
  } | null;
}

type RefundStatus = "pending" | "reviewing" | "approved" | "rejected" | "processing" | "completed" | "cancelled";
type RefundMethod = "cash" | "bank" | "store_credit" | "original_method";
type RefundType = "full" | "partial";
type ActiveTab = "all" | RefundStatus;
type DateFilter = "all" | "this_month" | "last_30";
type SortMode = "newest" | "oldest" | "amount_high" | "amount_low";

interface RefundForm {
  order_id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  amount: string;
  reason: string;
  refund_method: RefundMethod;
  notes: string;
  currency_code: string;
  refund_type: RefundType;
  items: RefundItem[];
}

const emptyForm = (): RefundForm => ({
  order_id: "",
  order_number: "",
  customer_id: "",
  customer_name: "",
  customer_phone: "",
  amount: "",
  reason: "",
  refund_method: "original_method",
  notes: "",
  currency_code: "SAR",
  refund_type: "full",
  items: [],
});

const STATUS_CONFIG: Record<RefundStatus, { label: string; className: string; icon: LucideIcon }> = {
  pending: { label: "قيد المراجعة", className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]", icon: Clock3 },
  reviewing: { label: "جاري الفحص", className: "border-[#E2DEF3] bg-[#F6F4FF] text-[#675CBA]", icon: FileSearch },
  approved: { label: "تمت الموافقة", className: "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]", icon: CheckCircle2 },
  processing: { label: "جاري التحويل", className: "border-[#E2DEF3] bg-[#F6F4FF] text-[#675CBA]", icon: ArrowRightLeft },
  completed: { label: "مكتمل", className: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]", icon: CheckCircle2 },
  rejected: { label: "مرفوض", className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]", icon: CircleOff },
  cancelled: { label: "ملغي", className: "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]", icon: CircleOff },
};

const AdminRefundsPage = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("this_month");
  const [methodFilter, setMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RefundForm>(emptyForm());
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderSearchRow | null>(null);

  const [statusTarget, setStatusTarget] = useState<Refund | null>(null);
  const [nextStatus, setNextStatus] = useState<RefundStatus | null>(null);
  const [statusNote, setStatusNote] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Refund | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /* =========================================================
     DATA
  ========================================================= */

  const { data: currencies = [] } = useQuery({
    queryKey: ["refund-currencies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("currencies").select("code,name_ar,symbol,rate_to_base,is_base,sort_order").eq("is_active", true).order("sort_order");

      if (error) throw error;

      return (data || []).map((row: any) => ({ ...row, rate_to_base: Number(row.rate_to_base || 1), sort_order: Number(row.sort_order || 0) })) as CurrencyRow[];
    },
    staleTime: 60_000,
  });

  const { data: refunds = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-refunds"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("refunds")
        .select("id,refund_number,order_id,order_number,customer_id,customer_name,customer_phone,amount,amount_base,currency_code,reason,items,refund_method,refund_type,status,notes,admin_notes,processed_at,processed_by,approved_by,created_by,created_at,updated_at,orders(id,order_number,items,total,currency_code,currency_mode)")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      return (data || []).map((refund: any) => ({
        ...refund,
        amount: Number(refund.amount || 0),
        amount_base: refund.amount_base == null ? null : Number(refund.amount_base),
        items: Array.isArray(refund.items) ? refund.items : [],
      })) as Refund[];
    },
    staleTime: 15_000,
  });

  const orderQuery = useQuery({
    queryKey: ["refund-order-search", orderSearch],
    enabled: dialogOpen && orderSearch.trim().length >= 2,
    queryFn: async () => {
      const query = orderSearch.trim().replace(/[%_,()]/g, " ");

      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,order_number,customer_id,customer_name,customer_phone,total,items,currency_code,currency_mode")
        .or(`order_number.ilike.%${query}%,customer_name.ilike.%${query}%,customer_phone.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      return (data || []).map((order: any) => ({
        ...order,
        total: Number(order.total || 0),
        items: Array.isArray(order.items) ? order.items : [],
      })) as OrderSearchRow[];
    },
    staleTime: 10_000,
  });

  const baseCurrency = useMemo(() => currencies.find((row) => row.is_base) || currencies.find((row) => row.code === "SAR") || { code: "SAR", name_ar: "ريال سعودي", symbol: "ر.س", rate_to_base: 1, is_base: true, sort_order: 1 }, [currencies]);
  const currencyMap = useMemo(() => new Map(currencies.map((row) => [row.code, row])), [currencies]);

  const getRefundCurrency = (refund: Refund) => currencyMap.get(refund.currency_code || baseCurrency.code) || baseCurrency;
  const getRefundBase = (refund: Refund) => refund.amount_base != null ? refund.amount_base : refund.amount / Math.max(getRefundCurrency(refund).rate_to_base, 1);

  /* =========================================================
     FILTERS
  ========================================================= */

  const filteredRefunds = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);

    const rows = refunds.filter((refund) => {
      const searchable = `${refund.refund_number} ${refund.order_number || ""} ${refund.customer_name || ""} ${refund.customer_phone || ""} ${refund.reason}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesTab = activeTab === "all" || refund.status === activeTab;
      const matchesMethod = methodFilter === "all" || refund.refund_method === methodFilter;
      const matchesType = typeFilter === "all" || refund.refund_type === typeFilter;

      let matchesDate = true;
      if (dateFilter === "this_month") matchesDate = refund.created_at.slice(0, 7) === monthKey;
      if (dateFilter === "last_30") matchesDate = new Date(refund.created_at).getTime() >= last30.getTime();

      return matchesSearch && matchesTab && matchesMethod && matchesType && matchesDate;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === "amount_high") return getRefundBase(b) - getRefundBase(a);
      if (sortMode === "amount_low") return getRefundBase(a) - getRefundBase(b);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [refunds, search, activeTab, methodFilter, typeFilter, dateFilter, sortMode, currencyMap, baseCurrency]);

  const stats = useMemo(() => {
    const pending = refunds.filter((refund) => ["pending", "reviewing"].includes(refund.status));
    const approved = refunds.filter((refund) => ["approved", "processing"].includes(refund.status));
    const completed = refunds.filter((refund) => refund.status === "completed");

    return {
      total: refunds.length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, refund) => sum + getRefundBase(refund), 0),
      approvedAmount: approved.reduce((sum, refund) => sum + getRefundBase(refund), 0),
      completedAmount: completed.reduce((sum, refund) => sum + getRefundBase(refund), 0),
    };
  }, [refunds, currencyMap, baseCurrency]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: refunds.length };
    Object.keys(STATUS_CONFIG).forEach((status) => {
      counts[status] = refunds.filter((refund) => refund.status === status).length;
    });
    return counts;
  }, [refunds]);

  const hasFilters = Boolean(search.trim()) || dateFilter !== "this_month" || methodFilter !== "all" || typeFilter !== "all" || sortMode !== "newest";

  /* =========================================================
     CREATE REFUND
  ========================================================= */

  const openCreate = () => {
    setForm({ ...emptyForm(), currency_code: baseCurrency.code });
    setSelectedOrder(null);
    setOrderSearch("");
    setDialogOpen(true);
  };

  const closeCreate = () => {
    if (createMutation.isPending) return;
    setDialogOpen(false);
    setForm(emptyForm());
    setSelectedOrder(null);
    setOrderSearch("");
  };

  const chooseOrder = (order: OrderSearchRow) => {
    const currencyCode = order.currency_code || order.currency_mode || baseCurrency.code;
    const normalizedItems: RefundItem[] = order.items.map((item) => ({
      ...item,
      refund_quantity: Math.max(0, Number(item.quantity || 1)),
    }));

    setSelectedOrder(order);
    setOrderSearch(order.order_number);
    setForm((current) => ({
      ...current,
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id || "",
      customer_name: order.customer_name || "",
      customer_phone: order.customer_phone || "",
      amount: String(order.total),
      currency_code: currencyCode,
      refund_type: "full",
      items: normalizedItems,
    }));
  };

  const toggleRefundItem = (index: number, checked: boolean) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, refund_quantity: checked ? Math.max(1, Number(item.quantity || 1)) : 0 } : item),
    }));
  };

  const updateRefundQuantity = (index: number, quantity: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const max = Math.max(1, Number(item.quantity || 1));
        return { ...item, refund_quantity: Math.max(0, Math.min(max, quantity)) };
      }),
    }));
  };

  const selectedRefundItems = useMemo(() => form.items.filter((item) => Number(item.refund_quantity || 0) > 0), [form.items]);

  const suggestedPartialAmount = useMemo(() => selectedRefundItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.refund_quantity || 0), 0), [selectedRefundItems]);

  const applyRefundType = (type: RefundType) => {
    if (!selectedOrder) {
      setForm((current) => ({ ...current, refund_type: type }));
      return;
    }

    if (type === "full") {
      setForm((current) => ({
        ...current,
        refund_type: "full",
        amount: String(selectedOrder.total),
        items: current.items.map((item) => ({ ...item, refund_quantity: Math.max(1, Number(item.quantity || 1)) })),
      }));
      return;
    }

    setForm((current) => ({ ...current, refund_type: "partial", amount: String(suggestedPartialAmount || 0) }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const amount = Number(form.amount);

      if (!form.reason.trim()) throw new Error("سبب الاسترجاع مطلوب.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("مبلغ الاسترجاع يجب أن يكون أكبر من صفر.");
      if (form.refund_type === "partial" && selectedOrder && selectedRefundItems.length === 0) throw new Error("اختر منتجًا واحدًا على الأقل للمرتجع الجزئي.");

      const itemsPayload = selectedOrder
        ? selectedRefundItems.map((item) => ({
            product_id: item.product_id || null,
            product_name: item.product_name || item.name || "منتج",
            product_image: item.product_image || item.image || "",
            quantity: Number(item.refund_quantity || 0),
            price: Number(item.price || 0),
            selected_size: item.selected_size || null,
            selected_color: item.selected_color || null,
          }))
        : [];

      const { error } = await (supabase as any).rpc("create_refund_request", {
        p_order_id: form.order_id || null,
        p_order_number: form.order_number || null,
        p_customer_id: form.customer_id || null,
        p_customer_name: form.customer_name || null,
        p_customer_phone: form.customer_phone || null,
        p_amount: amount,
        p_reason: form.reason.trim(),
        p_refund_method: form.refund_method,
        p_notes: form.notes.trim() || null,
        p_items: itemsPayload,
        p_currency_code: form.currency_code,
        p_refund_type: form.refund_type,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setSelectedOrder(null);
      setOrderSearch("");
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      toast({ title: "تم إنشاء طلب الاسترجاع", description: "تمت إضافته إلى قسم قيد المراجعة." });
    },
    onError: (error: any) => {
      toast({ title: "تعذر إنشاء المرتجع", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  /* =========================================================
     STATUS WORKFLOW
  ========================================================= */

  const openStatusAction = (refund: Refund, status: RefundStatus) => {
    setStatusTarget(refund);
    setNextStatus(status);
    setStatusNote("");
  };

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!statusTarget || !nextStatus) throw new Error("لم يتم تحديد الإجراء.");

      const { error } = await (supabase as any).rpc("update_refund_status", {
        p_refund_id: statusTarget.id,
        p_status: nextStatus,
        p_admin_note: statusNote.trim() || null,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      const label = nextStatus ? STATUS_CONFIG[nextStatus].label : "تم التحديث";
      setStatusTarget(null);
      setNextStatus(null);
      setStatusNote("");
      await queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      toast({ title: "تم تحديث المرتجع", description: `الحالة الجديدة: ${label}` });
    },
    onError: (error: any) => {
      toast({ title: "تعذر تحديث المرتجع", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (refund: Refund) => {
      const { error } = await (supabase as any).rpc("delete_refund_safe", { p_refund_id: refund.id });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      toast({ title: "تم حذف المرتجع" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف المرتجع", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        const { error } = await (supabase as any).rpc("delete_refund_safe", { p_refund_id: id });
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      const count = selectedIds.length;
      setSelectedIds([]);
      await queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
      toast({ title: `تم حذف ${count.toLocaleString("ar-EG")} مرتجع` });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف بعض المرتجعات", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  /* =========================================================
     SELECTION
  ========================================================= */

  const deletableVisibleIds = filteredRefunds.filter((refund) => ["pending", "reviewing", "rejected", "cancelled"].includes(refund.status)).map((refund) => refund.id);
  const allVisibleSelected = deletableVisibleIds.length > 0 && deletableVisibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !deletableVisibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...deletableVisibleIds])));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]);
  };

  const clearFilters = () => {
    setSearch("");
    setDateFilter("this_month");
    setMethodFilter("all");
    setTypeFilter("all");
    setSortMode("newest");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل المرتجعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="المرتجعات والاسترجاع" description="إدارة دورة استرجاع الأموال من المراجعة حتى التحويل والاكتمال" actions={[{ label: "مرتجع جديد", icon: Plus, onClick: openCreate, variant: "primary" }, ...(selectedIds.length > 0 ? [{ label: `حذف ${selectedIds.length}`, icon: Trash2, onClick: () => deleteSelectedMutation.mutate(), variant: "destructive" as const }] : [])]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي المرتجعات" value={stats.total.toLocaleString("en-US")} helper={`${stats.pendingCount} تحتاج متابعة`} icon={RefreshCcw} tone="indigo" />
        <StatCard title="قيد المراجعة" value={formatMoney(stats.pendingAmount, baseCurrency.symbol)} helper="قيمة الطلبات المعلقة" icon={Clock3} tone="amber" />
        <StatCard title="معتمدة / قيد التحويل" value={formatMoney(stats.approvedAmount, baseCurrency.symbol)} helper="تمت الموافقة عليها" icon={ArrowRightLeft} tone="blue" />
        <StatCard title="مكتملة" value={formatMoney(stats.completedAmount, baseCurrency.symbol)} helper="تم إنهاء الاسترجاع" icon={CheckCircle2} tone="green" />
      </section>

      <section className="rounded-[12px] border border-[#DCE7F4] bg-[#F5F8FC] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <ShieldCheck className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#5680CF]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#607894]">حماية دورة الاسترجاع مفعلة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#7B8FA5]">يتم منع استرجاع مبلغ يتجاوز المتبقي من قيمة الطلب، وتُقفل عمليات الحذف بعد اعتماد أو معالجة المرتجع.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-2 gap-[4px] border-b border-[#E5E9EF] bg-[#FAFBFC] p-[5px] sm:grid-cols-4 xl:grid-cols-8">
          <RefundTab active={activeTab === "all"} onClick={() => setActiveTab("all")} label="الكل" count={tabCounts.all || 0} />
          {(["pending", "reviewing", "approved", "processing", "completed", "rejected", "cancelled"] as RefundStatus[]).map((status) => <RefundTab key={status} active={activeTab === status} onClick={() => setActiveTab(status)} label={STATUS_CONFIG[status].label} count={tabCounts[status] || 0} />)}
        </div>

        <div className="border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div className="grid grid-cols-1 gap-[7px] xl:grid-cols-[minmax(0,1fr)_160px_175px_150px_170px]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="رقم المرتجع، الطلب، العميل، الهاتف أو السبب..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
            </div>

            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as DateFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="this_month">هذا الشهر</SelectItem><SelectItem value="last_30">آخر 30 يومًا</SelectItem><SelectItem value="all">كل الفترات</SelectItem></SelectContent></Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل طرق الاسترجاع</SelectItem><SelectItem value="original_method">نفس طريقة الدفع</SelectItem><SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank">تحويل بنكي</SelectItem><SelectItem value="store_credit">رصيد متجر</SelectItem></SelectContent></Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كامل وجزئي</SelectItem><SelectItem value="full">مرتجع كامل</SelectItem><SelectItem value="partial">مرتجع جزئي</SelectItem></SelectContent></Select>
            <div className="flex gap-[6px]"><Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}><SelectTrigger className="h-[40px] min-w-0 flex-1 rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">الأحدث</SelectItem><SelectItem value="oldest">الأقدم</SelectItem><SelectItem value="amount_high">الأعلى قيمة</SelectItem><SelectItem value="amount_low">الأقل قيمة</SelectItem></SelectContent></Select>{hasFilters && <button type="button" onClick={clearFilters} className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[9px] border border-[#E3E7EC] bg-white text-[#7E8690]"><X className="h-[11px] w-[11px]" /></button>}</div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-[8px] border-b border-[#EDF0F3] bg-[#FCFDFE] px-[12px] py-[8px]">
            <p className="text-[10.5px] font-semibold text-[#59616B]">تم تحديد {selectedIds.length.toLocaleString("ar-EG")} مرتجع قابل للحذف</p>
            <Button type="button" variant="outline" onClick={() => setSelectedIds([])} className="h-[34px] rounded-[8px] border-[#E3E7EC] bg-white px-3 text-[10px] font-semibold text-[#707883] shadow-none">إلغاء التحديد</Button>
          </div>
        )}

        {filteredRefunds.length === 0 ? (
          <PanelEmpty />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1300px]">
                  <thead><tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]"><th className="w-[44px] px-[10px] text-center"><Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} /></th><th className="px-[12px] text-right">المرتجع</th><th className="px-[12px] text-right">العميل / الطلب</th><th className="px-[12px] text-right">النوع</th><th className="px-[12px] text-right">المبلغ</th><th className="px-[12px] text-right">طريقة الاسترجاع</th><th className="px-[12px] text-right">الحالة</th><th className="px-[12px] text-right">التاريخ</th><th className="w-[260px] px-[12px] text-center">الإجراءات</th></tr></thead>
                  <tbody>
                    {filteredRefunds.map((refund) => {
                      const currency = getRefundCurrency(refund);
                      const deletable = ["pending", "reviewing", "rejected", "cancelled"].includes(refund.status);

                      return (
                        <tr key={refund.id} className="h-[78px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                          <td className="px-[10px] text-center"><Checkbox checked={selectedIds.includes(refund.id)} disabled={!deletable} onCheckedChange={() => toggleOne(refund.id)} /></td>
                          <td className="px-[12px]"><div><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#675CBA]">{refund.refund_number}</p><p className="mt-[4px] max-w-[230px] truncate text-[10.5px] font-semibold text-[#4A525C]">{refund.reason}</p></div></td>
                          <td className="px-[12px]"><div className="min-w-[170px]"><p className="text-[10.5px] font-semibold text-[#59616B]">{refund.customer_name || "—"}</p><p className="mt-[3px] text-[9.5px] text-[#9299A3]">{refund.order_number ? `#${refund.order_number}` : "بدون طلب مرتبط"}{refund.customer_phone ? ` · ${refund.customer_phone}` : ""}</p></div></td>
                          <td className="px-[12px]"><span className="inline-flex h-[26px] items-center rounded-[7px] border border-[#E3E7EC] bg-[#F8FAFC] px-[8px] text-[10px] font-semibold text-[#68717B]">{refund.refund_type === "partial" ? "جزئي" : "كامل"}</span></td>
                          <td className="px-[12px]"><div><p className="text-[11px] font-semibold text-[#C15F56]">{formatMoney(refund.amount, currency.symbol)}</p>{refund.currency_code !== baseCurrency.code && <p className="mt-[2px] text-[9.5px] text-[#9AA1AB]">{formatMoney(getRefundBase(refund), baseCurrency.symbol)}</p>}</div></td>
                          <td className="px-[12px]"><span className="text-[10.5px] text-[#68717B]">{refundMethodLabel(refund.refund_method)}</span></td>
                          <td className="px-[12px]"><StatusBadge status={refund.status as RefundStatus} /></td>
                          <td className="px-[12px]"><span className="text-[10.5px] text-[#7E8690]">{formatDate(refund.created_at)}</span></td>
                          <td className="px-[12px]"><RefundActions refund={refund} onStatus={openStatusAction} onDelete={setDeleteTarget} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filteredRefunds.map((refund) => {
                const currency = getRefundCurrency(refund);
                const deletable = ["pending", "reviewing", "rejected", "cancelled"].includes(refund.status);

                return (
                  <article key={refund.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                    <div className="p-[11px]">
                      <div className="flex items-start justify-between gap-[8px]">
                        <div className="flex min-w-0 gap-[8px]">
                          <Checkbox checked={selectedIds.includes(refund.id)} disabled={!deletable} onCheckedChange={() => toggleOne(refund.id)} className="mt-[2px]" />
                          <div className="min-w-0"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#675CBA]">{refund.refund_number}</p><h3 className="mt-[4px] line-clamp-2 text-[11px] font-semibold text-[#3B424C]">{refund.reason}</h3><p className="mt-[3px] text-[10px] text-[#9299A3]">{refund.customer_name || "—"}{refund.order_number ? ` · #${refund.order_number}` : ""}</p></div>
                        </div>
                        <StatusBadge status={refund.status as RefundStatus} />
                      </div>

                      <div className="mt-[10px] grid grid-cols-2 gap-[6px]"><InfoBox label="المبلغ" value={formatMoney(refund.amount, currency.symbol)} /><InfoBox label="النوع" value={refund.refund_type === "partial" ? "مرتجع جزئي" : "مرتجع كامل"} /></div>
                      <div className="mt-[6px] grid grid-cols-2 gap-[6px]"><InfoBox label="الطريقة" value={refundMethodLabel(refund.refund_method)} /><InfoBox label="التاريخ" value={formatDate(refund.created_at)} /></div>

                      {refund.items.length > 0 && <RefundItems items={refund.items} currencySymbol={currency.symbol} />}
                      {refund.admin_notes && <div className="mt-[8px] rounded-[8px] border border-[#E6E9EE] bg-[#FAFBFC] p-[8px]"><p className="text-[9.5px] font-semibold text-[#68717B]">ملاحظة الإدارة</p><p className="mt-[3px] text-[10px] leading-5 text-[#858D97]">{refund.admin_notes}</p></div>}
                    </div>

                    <div className="border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]"><RefundActions refund={refund} onStatus={openStatusAction} onDelete={setDeleteTarget} mobile /></div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* CREATE REFUND */}
      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) closeCreate(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[94vh] max-w-[900px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><RefreshCcw className="h-[15px] w-[15px]" /></div>
              <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">إضافة مرتجع جديد</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">اربط المرتجع بطلب أو أنشئ مرتجعًا يدويًا، مع دعم المرتجع الكامل والجزئي.</DialogDescription></div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); createMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="الطلب والعميل" icon={FileSearch}>
                <div className="relative">
                  <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
                  <Input value={orderSearch} onChange={(event) => { setOrderSearch(event.target.value); if (selectedOrder && event.target.value !== selectedOrder.order_number) setSelectedOrder(null); }} placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  {orderQuery.isFetching && <Loader2 className="absolute left-[12px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 animate-spin text-[#675CBA]" />}
                </div>

                {!selectedOrder && orderQuery.data && orderQuery.data.length > 0 && (
                  <div className="max-h-[240px] space-y-[5px] overflow-y-auto rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[6px]">
                    {orderQuery.data.map((order) => <button key={order.id} type="button" onClick={() => chooseOrder(order)} className="flex w-full items-center justify-between gap-[10px] rounded-[9px] border border-[#E6E9EE] bg-white p-[9px] text-right hover:border-[#CBC5E7] hover:bg-[#F9F8FF]"><div className="min-w-0"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#675CBA]">{order.order_number}</p><p className="mt-[3px] truncate text-[10.5px] font-semibold text-[#555D67]">{order.customer_name}</p><p className="mt-[2px] text-[9.5px] text-[#9BA2AC]">{order.customer_phone}</p></div><span className="text-[10.5px] font-semibold text-[#59616B]">{order.total.toLocaleString("en-US")}</span></button>)}
                  </div>
                )}

                {selectedOrder && (
                  <div className="rounded-[10px] border border-[#DCE7F4] bg-[#F5F8FC] p-[10px]">
                    <div className="flex items-start justify-between gap-[8px]"><div><p className="font-mono text-[10px] font-semibold text-[#675CBA]">{selectedOrder.order_number}</p><p className="mt-[4px] text-[11px] font-semibold text-[#4A525C]">{selectedOrder.customer_name}</p><p className="mt-[2px] text-[10px] text-[#9299A3]">{selectedOrder.customer_phone}</p></div><button type="button" onClick={() => { setSelectedOrder(null); setOrderSearch(""); setForm(emptyForm()); }} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-white text-[#7E8690]"><X className="h-[10px] w-[10px]" /></button></div>
                  </div>
                )}

                {!selectedOrder && (
                  <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                    <Field label="اسم العميل"><Input value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} placeholder="اسم العميل" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                    <Field label="رقم الهاتف"><Input value={form.customer_phone} onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))} placeholder="رقم الهاتف" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                  </div>
                )}
              </FormSection>

              <FormSection title="نوع المرتجع والمنتجات" icon={ShoppingBag}>
                <div className="grid grid-cols-2 gap-[6px]">
                  <button type="button" onClick={() => applyRefundType("full")} className={cn("h-[40px] rounded-[9px] border text-[10.5px] font-semibold", form.refund_type === "full" ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E7EC] bg-white text-[#68717B]")}>مرتجع كامل</button>
                  <button type="button" onClick={() => applyRefundType("partial")} className={cn("h-[40px] rounded-[9px] border text-[10.5px] font-semibold", form.refund_type === "partial" ? "border-[#E2DEF3] bg-[#F6F4FF] text-[#675CBA]" : "border-[#E3E7EC] bg-white text-[#68717B]")}>مرتجع جزئي</button>
                </div>

                {selectedOrder && form.items.length > 0 && (
                  <div className="space-y-[6px]">
                    {form.items.map((item, index) => {
                      const checked = Number(item.refund_quantity || 0) > 0;
                      const maxQty = Math.max(1, Number(item.quantity || 1));

                      return (
                        <div key={`${item.product_id || index}-${index}`} className="flex items-center gap-[8px] rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[8px]">
                          <Checkbox checked={checked} onCheckedChange={(value) => toggleRefundItem(index, Boolean(value))} />
                          <div className="flex h-[42px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white">{item.product_image || item.image ? <img src={item.product_image || item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[12px] w-[12px] text-[#A0A6AF]" />}</div>
                          <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{item.product_name || item.name || "منتج"}</p><p className="mt-[2px] text-[9.5px] text-[#9BA2AC]">المتاح في الطلب: {maxQty} · السعر: {Number(item.price || 0).toLocaleString("en-US")}</p></div>
                          {form.refund_type === "partial" && checked && <Input type="number" min={1} max={maxQty} value={item.refund_quantity || 1} onChange={(event) => updateRefundQuantity(index, Number.parseInt(event.target.value, 10) || 1)} className="h-[36px] w-[76px] rounded-[8px] border-[#E2E6EB] bg-white text-[10px] shadow-none focus-visible:ring-0" />}
                        </div>
                      );
                    })}

                    {form.refund_type === "partial" && <div className="flex items-center justify-between rounded-[9px] bg-[#F8FAFC] p-[8px]"><span className="text-[10px] text-[#858D97]">القيمة المقترحة للمنتجات المحددة</span><button type="button" onClick={() => setForm((current) => ({ ...current, amount: String(suggestedPartialAmount) }))} className="text-[10.5px] font-semibold text-[#675CBA]">{suggestedPartialAmount.toLocaleString("en-US")} — استخدام القيمة</button></div>}
                  </div>
                )}
              </FormSection>

              <FormSection title="بيانات الاسترجاع" icon={WalletCards}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3">
                  <Field label="العملة" required><Select value={form.currency_code} onValueChange={(value) => setForm((current) => ({ ...current, currency_code: value }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent>{currencies.map((currency) => <SelectItem key={currency.code} value={currency.code}>{currency.name_ar} — {currency.symbol}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="المبلغ" required><Input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                  <Field label="طريقة الاسترجاع"><Select value={form.refund_method} onValueChange={(value) => setForm((current) => ({ ...current, refund_method: value as RefundMethod }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="original_method">نفس طريقة الدفع</SelectItem><SelectItem value="cash">نقدي</SelectItem><SelectItem value="bank">تحويل بنكي</SelectItem><SelectItem value="store_credit">رصيد متجر</SelectItem></SelectContent></Select></Field>
                </div>

                <Field label="سبب الاسترجاع" required><Textarea rows={3} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="وضح سبب المرتجع بشكل واضح..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                <Field label="ملاحظات"><Textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات إضافية..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={createMutation.isPending} onClick={closeCreate} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={createMutation.isPending} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{createMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Plus className="ml-[5px] h-[12px] w-[12px]" />}إنشاء المرتجع</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* STATUS ACTION */}
      <Dialog open={Boolean(statusTarget && nextStatus)} onOpenChange={(next) => { if (!next && !statusMutation.isPending) { setStatusTarget(null); setNextStatus(null); } }}>
        <DialogContent dir="rtl" className="max-w-[540px] rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{nextStatus && (() => { const Icon = STATUS_CONFIG[nextStatus].icon; return <Icon className="h-[15px] w-[15px]" />; })()}</div>
              <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">تحديث حالة المرتجع</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">{statusTarget?.refund_number} ← {nextStatus ? STATUS_CONFIG[nextStatus].label : ""}</DialogDescription></div>
            </div>
          </DialogHeader>

          <div className="space-y-[10px] p-[10px]">
            <div className="rounded-[10px] border border-[#E5E9EF] bg-white p-[10px]"><p className="text-[10px] text-[#9AA2AC]">السبب</p><p className="mt-[4px] text-[11px] font-semibold text-[#4A525C]">{statusTarget?.reason}</p></div>
            <Field label={nextStatus === "rejected" ? "سبب الرفض / ملاحظة الإدارة" : "ملاحظة الإدارة"}><Textarea rows={4} value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="اختياري..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-white text-[11px] leading-6 shadow-none focus-visible:ring-0" /></Field>
          </div>

          <div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
            <Button type="button" variant="outline" disabled={statusMutation.isPending} onClick={() => { setStatusTarget(null); setNextStatus(null); }} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
            <Button type="button" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate()} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{statusMutation.isPending && <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" />}تأكيد التحديث</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف المرتجع</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف {deleteTarget?.refund_number || ""} إذا لم يكن قد دخل مرحلة الاعتماد أو المعالجة. المرتجعات المالية المعتمدة لا يمكن حذفها.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const RefundActions = ({ refund, onStatus, onDelete, mobile = false }: { refund: Refund; onStatus: (refund: Refund, status: RefundStatus) => void; onDelete: (refund: Refund) => void; mobile?: boolean }) => {
  const actions: Array<{ label: string; status?: RefundStatus; destructive?: boolean }> = [];

  if (refund.status === "pending") actions.push({ label: "بدء المراجعة", status: "reviewing" }, { label: "موافقة", status: "approved" }, { label: "رفض", status: "rejected", destructive: true });
  if (refund.status === "reviewing") actions.push({ label: "موافقة", status: "approved" }, { label: "رفض", status: "rejected", destructive: true }, { label: "إرجاع للمعلق", status: "pending" });
  if (refund.status === "approved") actions.push({ label: "بدء التحويل", status: "processing" }, { label: "إعادة للفحص", status: "reviewing" });
  if (refund.status === "processing") actions.push({ label: "تأكيد الاكتمال", status: "completed" }, { label: "إرجاع للمعتمد", status: "approved" });
  if (refund.status === "rejected" || refund.status === "cancelled") actions.push({ label: "إعادة للمراجعة", status: "reviewing" });

  const deletable = ["pending", "reviewing", "rejected", "cancelled"].includes(refund.status);

  return (
    <div className={cn("flex flex-wrap items-center gap-[4px]", mobile ? "justify-stretch" : "justify-center")}>
      {actions.map((action) => <button key={`${refund.id}-${action.status}`} type="button" onClick={() => action.status && onStatus(refund, action.status)} className={cn("flex h-[32px] items-center justify-center rounded-[8px] border bg-white px-[8px] text-[9.5px] font-semibold", mobile && "flex-1", action.destructive ? "border-[#F0D7D4] text-[#C15F56] hover:bg-[#FFF3F1]" : "border-[#E2DEF3] text-[#675CBA] hover:bg-[#F6F4FF]")}>{action.label}</button>)}
      {deletable && <button type="button" onClick={() => onDelete(refund)} className={cn("flex h-[32px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white px-[8px] text-[9.5px] font-semibold text-[#C15F56] hover:bg-[#FFF3F1]", mobile && "flex-1")}><Trash2 className="ml-[4px] h-[9px] w-[9px]" />حذف</button>}
    </div>
  );
};

const RefundItems = ({ items, currencySymbol }: { items: RefundItem[]; currencySymbol: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-[8px] rounded-[9px] border border-[#E6E9EE] bg-[#FAFBFC]">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex h-[36px] w-full items-center justify-between px-[9px] text-[10px] font-semibold text-[#68717B]"><span>منتجات المرتجع ({items.length})</span><span>{open ? "إخفاء" : "عرض"}</span></button>
      {open && <div className="space-y-[5px] border-t border-[#E7EAEF] p-[7px]">{items.map((item, index) => <div key={`${item.product_id || index}-${index}`} className="flex items-center gap-[7px] rounded-[8px] bg-white p-[7px]"><div className="flex h-[38px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F3F5F7]">{item.product_image || item.image ? <img src={item.product_image || item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[10px] w-[10px] text-[#A0A6AF]" />}</div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-semibold text-[#555D67]">{item.product_name || item.name || "منتج"}</p><p className="mt-[2px] text-[9px] text-[#9AA2AC]">الكمية: {Number(item.quantity || item.refund_quantity || 1)}</p></div><span className="text-[10px] font-semibold text-[#59616B]">{formatMoney(Number(item.price || 0) * Number(item.quantity || item.refund_quantity || 1), currencySymbol)}</span></div>)}</div>}
    </div>
  );
};

const StatusBadge = ({ status }: { status: RefundStatus }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9.5px] font-semibold", config.className)}><Icon className="h-[9px] w-[9px]" />{config.label}</span>;
};

const RefundTab = ({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) => {
  return <button type="button" onClick={onClick} className={cn("flex min-h-[40px] items-center justify-center gap-[5px] rounded-[9px] px-[6px] text-[9.5px] font-semibold transition-colors", active ? "bg-white text-[#675CBA] shadow-[0_1px_4px_rgba(31,41,55,0.08)]" : "text-[#7E8690] hover:bg-white/70")}><span className="truncate">{label}</span><span className="rounded-[6px] bg-[#F1EFFF] px-[5px] py-[2px] text-[9px] text-[#675CBA]">{count}</span></button>;
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "green" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
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
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><RefreshCcw className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد مرتجعات</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">غيّر الفلاتر أو أضف طلب استرجاع جديد.</p></div>;
};

const refundMethodLabel = (method: string) => {
  if (method === "cash") return "نقدي";
  if (method === "bank") return "تحويل بنكي";
  if (method === "store_credit") return "رصيد متجر";
  if (method === "original_method") return "نفس طريقة الدفع";
  return method || "غير محدد";
};

const formatMoney = (value: number, symbol: string) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const translateDbError = (message?: string) => {
  const value = String(message || "");

  if (value.includes("Admin access required")) return "هذه العملية متاحة للمدير فقط.";
  if (value.includes("Refund exceeds remaining refundable order amount")) return "مبلغ الاسترجاع يتجاوز القيمة المتبقية القابلة للاسترجاع من الطلب.";
  if (value.includes("Refund amount must be greater than zero")) return "مبلغ الاسترجاع يجب أن يكون أكبر من صفر.";
  if (value.includes("Refund reason is required")) return "سبب الاسترجاع مطلوب.";
  if (value.includes("Invalid or inactive currency")) return "العملة غير صحيحة أو غير نشطة.";
  if (value.includes("Order not found")) return "الطلب المرتبط غير موجود.";
  if (value.includes("Invalid refund transition")) return "لا يمكن الانتقال مباشرة إلى هذه الحالة من الحالة الحالية.";
  if (value.includes("Completed refund is final")) return "المرتجع المكتمل نهائي ولا يمكن تغيير حالته.";
  if (value.includes("Approved or processed refunds cannot be deleted")) return "لا يمكن حذف مرتجع تم اعتماده أو بدء معالجته.";
  if (value.includes("Refund not found")) return "المرتجع غير موجود.";

  return value || "حدث خطأ غير متوقع.";
};

export default AdminRefundsPage;