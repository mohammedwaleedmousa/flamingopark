import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import InvoiceEditor from "@/components/admin/InvoiceEditor";
import NewInvoiceCreator from "@/components/admin/NewInvoiceCreator";
import { CalendarDays, Check, CheckCircle2, CircleOff, ExternalLink, FileCheck2, FileClock, FileText, Filter, Loader2, Package, Pencil, Plus, Printer, ReceiptText, RotateCcw, Search, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoiceFile {
  name: string;
  created_at: string;
  orderNumber: string;
  size?: number | null;
}

interface SelectedAccessory {
  name: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: SelectedAccessory[];
}

type InvoiceReviewStatus = "unreviewed" | "pending" | "accepted" | "rejected" | "returned";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  country: string;
  created_at: string;
  status: string;
  invoice_url?: string | null;
  coupon_code?: string | null;
  discount_amount?: number | null;
  currency_code?: string | null;
  currency_mode?: string | null;
  exchange_rate_snapshot?: number | null;
  total_base?: number | null;
  invoice_review_status: InvoiceReviewStatus;
  invoice_reviewed_at?: string | null;
  invoice_reviewed_by?: string | null;
  invoice_review_note?: string | null;
  delivery_companies?: { name: string } | null;
}

type TabMode = "review" | "accepted" | "rejected" | "returned" | "all" | "files";
type OrderStatusFilter = "all" | "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
type InvoicePresenceFilter = "all" | "with_invoice" | "without_invoice";

const INVOICE_PAGE_SIZE = 1000;
const MAX_INVOICE_PAGES = 20;

const normalizeOrderStatus = (status?: string | null) => {
  const value = String(status || "pending").trim().toLowerCase();
  return value === "completed" ? "delivered" : value;
};

const AdminInvoicesPage = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabMode>("review");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("all");
  const [invoicePresenceFilter, setInvoicePresenceFilter] = useState<InvoicePresenceFilter>("all");

  const [deleteTarget, setDeleteTarget] = useState<InvoiceFile | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const [showNewInvoice, setShowNewInvoice] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectTargetIds, setRejectTargetIds] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [returnTargetIds, setReturnTargetIds] = useState<string[]>([]);
  const [returnNote, setReturnNote] = useState("");
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const switchTab = (tab: TabMode) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setOrderStatusFilter("all");
    setInvoicePresenceFilter("all");
  };

  const { data: orders = [], isLoading: isLoadingOrders, isFetching: isFetchingOrders } = useQuery({
    queryKey: ["admin-invoice-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,order_number,customer_name,customer_phone,customer_address,customer_notes,items,subtotal,delivery_fee,total,total_base,payment_method,country,created_at,status,invoice_url,coupon_code,discount_amount,currency_code,currency_mode,exchange_rate_snapshot,invoice_review_status,invoice_reviewed_at,invoice_reviewed_by,invoice_review_note,delivery_companies(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((order: any) => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : [],
        subtotal: Number(order.subtotal || 0),
        delivery_fee: Number(order.delivery_fee || 0),
        total: Number(order.total || 0),
        discount_amount: Number(order.discount_amount || 0),
        invoice_review_status: (order.invoice_review_status || "pending") as InvoiceReviewStatus,
      })) as Order[];
    },
    staleTime: 15_000,
  });

  const { data: invoices = [], isLoading: isLoadingInvoices, isFetching: isFetchingInvoices } = useQuery({
    queryKey: ["admin-invoice-files"],
    queryFn: async () => {
      const files: InvoiceFile[] = [];
      for (let page = 0; page < MAX_INVOICE_PAGES; page += 1) {
        const { data, error } = await supabase.storage.from("invoices").list("", {
          limit: INVOICE_PAGE_SIZE,
          offset: page * INVOICE_PAGE_SIZE,
          sortBy: { column: "created_at", order: "desc" },
        });
        if (error) throw error;
        const pageRows = (data || [])
          .filter((file) => file.name.toLowerCase().endsWith(".pdf"))
          .map((file) => ({
            name: file.name,
            created_at: file.created_at || new Date().toISOString(),
            orderNumber: extractOrderNumber(file.name),
            size: typeof file.metadata?.size === "number" ? file.metadata.size : null,
          }));
        files.push(...pageRows);
        if ((data || []).length < INVOICE_PAGE_SIZE) break;
      }
      return files;
    },
    staleTime: 20_000,
  });

  const invoiceOrderNumberSet = useMemo(() => new Set(invoices.map((invoice) => invoice.orderNumber).filter((value) => value && value !== "غير معروف")), [invoices]);
  const hasInvoice = (order: Order) => Boolean(order.invoice_url) || invoiceOrderNumberSet.has(order.order_number);

  const effectiveReviewStatus = (order: Order): InvoiceReviewStatus => {
    if (order.invoice_review_status === "accepted" || order.invoice_review_status === "rejected" || order.invoice_review_status === "returned" || order.invoice_review_status === "pending") return order.invoice_review_status;
    return "pending";
  };

  const stats = useMemo(() => {
    const withInvoice = orders.filter(hasInvoice);
    const reviewPending = orders.filter((order) => effectiveReviewStatus(order) === "pending").length;
    const accepted = orders.filter((order) => effectiveReviewStatus(order) === "accepted").length;
    const rejected = orders.filter((order) => effectiveReviewStatus(order) === "rejected").length;
    const returned = orders.filter((order) => effectiveReviewStatus(order) === "returned").length;
    const withoutInvoice = orders.filter((order) => !hasInvoice(order)).length;
    const today = toDateKey(new Date());
    const generatedToday = invoices.filter((invoice) => toDateKey(new Date(invoice.created_at)) === today).length;
    return { totalOrders: orders.length, withInvoice: withInvoice.length, reviewPending, accepted, rejected, returned, withoutInvoice, files: invoices.length, generatedToday };
  }, [orders, invoices, invoiceOrderNumberSet]);

  const baseFilteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return orders.filter((order) => {
      const searchable = `${order.order_number} ${order.customer_name} ${order.customer_phone}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesDate = !dateFilter || toDateKey(new Date(order.created_at)) === dateFilter;
      const matchesStatus = orderStatusFilter === "all" || normalizeOrderStatus(order.status) === orderStatusFilter;
      const invoiceExists = hasInvoice(order);
      const matchesInvoice = invoicePresenceFilter === "all" || (invoicePresenceFilter === "with_invoice" && invoiceExists) || (invoicePresenceFilter === "without_invoice" && !invoiceExists);
      return matchesSearch && matchesDate && matchesStatus && matchesInvoice;
    });
  }, [orders, searchQuery, dateFilter, orderStatusFilter, invoicePresenceFilter, invoiceOrderNumberSet]);

  const filteredOrders = useMemo(() => {
    if (activeTab === "review") return baseFilteredOrders.filter((order) => effectiveReviewStatus(order) === "pending");
    if (activeTab === "accepted") return baseFilteredOrders.filter((order) => effectiveReviewStatus(order) === "accepted");
    if (activeTab === "rejected") return baseFilteredOrders.filter((order) => effectiveReviewStatus(order) === "rejected");
    if (activeTab === "returned") return baseFilteredOrders.filter((order) => effectiveReviewStatus(order) === "returned");
    return baseFilteredOrders;
  }, [baseFilteredOrders, activeTab]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const searchable = `${invoice.orderNumber} ${invoice.name}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesDate = !dateFilter || toDateKey(new Date(invoice.created_at)) === dateFilter;
      return matchesSearch && matchesDate;
    });
  }, [invoices, searchQuery, dateFilter]);

  const hasFilters = Boolean(searchQuery.trim()) || Boolean(dateFilter) || orderStatusFilter !== "all" || invoicePresenceFilter !== "all";

  const updateReviewMutation = useMutation({
    mutationFn: async ({ ids, status, note }: { ids: string[]; status: InvoiceReviewStatus; note?: string | null }) => {
      if (ids.length === 0) return;
      const currentUser = await supabase.auth.getUser();
      const reviewed = status === "accepted" || status === "rejected" || status === "returned";
      const payload = {
        invoice_review_status: status,
        invoice_reviewed_at: reviewed ? new Date().toISOString() : null,
        invoice_reviewed_by: reviewed ? currentUser.data.user?.id || null : null,
        invoice_review_note: reviewed ? note?.trim() || null : null,
      };
      const { error } = await supabase.from("orders").update(payload).in("id", ids);
      if (error) throw error;
    },
    onSuccess: async (_data, variables) => {
      setSelectedIds([]);
      setRejectTargetIds([]);
      setRejectNote("");
      setRejectDialogOpen(false);
      setReturnTargetIds([]);
      setReturnNote("");
      setReturnDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-invoice-orders"] });
      if (variables.status === "accepted") {
        switchTab("accepted");
        toast({ title: variables.ids.length > 1 ? "تم قبول الفواتير" : "تم قبول الفاتورة", description: "تم نقلها إلى قسم الفواتير المقبولة." });
      } else if (variables.status === "rejected") {
        switchTab("rejected");
        toast({ title: variables.ids.length > 1 ? "تم رفض الفواتير" : "تم رفض الفاتورة", description: "تم نقلها إلى قسم الفواتير المرفوضة." });
      } else if (variables.status === "returned") {
        switchTab("returned");
        toast({ title: variables.ids.length > 1 ? "تم تسجيل الفواتير كمرتجعة" : "تم تسجيل الفاتورة كمرتجعة", description: "تم نقلها إلى قسم الفواتير المرتجعة." });
      } else if (variables.status === "pending") {
        switchTab("review");
        toast({ title: "تمت إعادة الفاتورة للمراجعة" });
      }
    },
    onError: (error: any) => toast({ title: "تعذر تحديث حالة الفاتورة", description: error?.message || "حدث خطأ أثناء التحديث.", variant: "destructive" }),
  });

  const validOrderIds = (ids: string[]) => ids.filter((id) => orders.some((order) => order.id === id));

  const acceptInvoices = (ids: string[]) => {
    const validIds = validOrderIds(ids);
    if (validIds.length === 0) return;
    updateReviewMutation.mutate({ ids: validIds, status: "accepted" });
  };

  const openRejectDialog = (ids: string[]) => {
    const validIds = validOrderIds(ids);
    if (validIds.length === 0) return;
    setRejectTargetIds(validIds);
    setRejectNote("");
    setRejectDialogOpen(true);
  };

  const openReturnDialog = (ids: string[]) => {
    const validIds = validOrderIds(ids);
    if (validIds.length === 0) return;
    setReturnTargetIds(validIds);
    setReturnNote("");
    setReturnDialogOpen(true);
  };

  const createInvoiceSignedUrl = async (fileName: string) => {
    const { data, error } = await supabase.storage.from("invoices").createSignedUrl(fileName, 300);
    if (error || !data?.signedUrl) throw error || new Error("تعذر إنشاء رابط آمن للفاتورة.");
    return data.signedUrl;
  };

  const openInvoiceFile = async (fileName: string) => {
    const fileWindow = window.open("", "_blank");
    try {
      if (!fileWindow) throw new Error("المتصفح منع فتح نافذة الفاتورة.");
      const signedUrl = await createInvoiceSignedUrl(fileName);
      fileWindow.opener = null;
      fileWindow.location.href = signedUrl;
    } catch (error: any) {
      fileWindow?.close();
      toast({ title: "تعذر فتح الفاتورة", description: error?.message || "حدث خطأ أثناء إنشاء الرابط.", variant: "destructive" });
    }
  };

  const printInvoiceFile = async (fileName: string) => {
    const printWindow = window.open("", "_blank");
    try {
      if (!printWindow) throw new Error("المتصفح منع فتح نافذة الطباعة.");
      const signedUrl = await createInvoiceSignedUrl(fileName);
      printWindow.location.href = signedUrl;
      printWindow.addEventListener("load", () => { try { printWindow.print(); } catch { /* Printing is optional if the browser blocks it. */ } });
    } catch (error: any) {
      printWindow?.close();
      toast({ title: "تعذر فتح الطباعة", description: error?.message || "حدث خطأ أثناء تجهيز الفاتورة.", variant: "destructive" });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (invoice: InvoiceFile) => {
      const { error: storageError } = await supabase.storage.from("invoices").remove([invoice.name]);
      if (storageError) throw storageError;
      const { error: unlinkError } = await supabase.from("orders").update({
        invoice_url: null,
        invoice_review_status: "pending",
        invoice_reviewed_at: null,
        invoice_reviewed_by: null,
        invoice_review_note: null,
      }).eq("invoice_url", invoice.name);
      if (unlinkError) throw new Error(`تم حذف الملف لكن تعذر إزالة رابطه من الطلب: ${unlinkError.message}`);
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-invoice-files"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-invoice-orders"] }),
      ]);
      toast({ title: "تم حذف ملف PDF", description: "بقيت الفاتورة في بانتظار المراجعة ويمكن تصنيفها بشكل مستقل عن ملف PDF." });
    },
    onError: (error: any) => toast({ title: "تعذر حذف الفاتورة", description: error?.message || "حدث خطأ أثناء الحذف.", variant: "destructive" }),
  });

  const currentSelectableIds = useMemo(() => filteredOrders.map((order) => order.id), [filteredOrders]);
  const allVisibleSelected = currentSelectableIds.length > 0 && currentSelectableIds.every((id) => selectedIds.includes(id));

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !currentSelectableIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...currentSelectableIds])));
  };

  const toggleSelected = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((rowId) => rowId !== id) : [...current, id]);

  const handleOpenInvoiceEditor = (order: Order) => { setSelectedOrder(order); setShowInvoiceEditor(true); };
  const handleCloseInvoiceEditor = () => { setShowInvoiceEditor(false); setSelectedOrder(null); };
  const handleDataUpdated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-invoice-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-invoice-files"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
    ]);
  };

  const handleNewInvoiceCreated = async (createdOrder: any) => {
    await handleDataUpdated();
    setShowNewInvoice(false);
    switchTab("review");
    if (!createdOrder?.id) return;
    const normalizedOrder: Order = {
      ...createdOrder,
      items: Array.isArray(createdOrder.items) ? createdOrder.items : [],
      subtotal: Number(createdOrder.subtotal || 0),
      delivery_fee: Number(createdOrder.delivery_fee || 0),
      total: Number(createdOrder.total || 0),
      discount_amount: Number(createdOrder.discount_amount || 0),
      invoice_review_status: (createdOrder.invoice_review_status || "pending") as InvoiceReviewStatus,
    };
    setSelectedOrder(normalizedOrder);
    setShowInvoiceEditor(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("");
    setOrderStatusFilter("all");
    setInvoicePresenceFilter("all");
  };

  if (isLoadingOrders && isLoadingInvoices) {
    return <div className="flex min-h-[430px] items-center justify-center"><div className="text-center"><div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div><p className="mt-3 text-[10px] font-medium text-[#969DA7]">جاري تحميل مركز الفواتير...</p></div></div>;
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="مركز إدارة الفواتير" description="إنشاء ومراجعة واعتماد ورفض وإرجاع وأرشفة فواتير الطلبات من مكان واحد" actions={[{ label: "فاتورة جديدة", icon: Plus, onClick: () => setShowNewInvoice(true), variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] xl:grid-cols-6">
        <InvoiceStatCard title="بانتظار المراجعة" value={stats.reviewPending.toLocaleString("en-US")} helper="فواتير تحتاج تصنيف" icon={FileClock} tone="amber" />
        <InvoiceStatCard title="الفواتير المقبولة" value={stats.accepted.toLocaleString("en-US")} helper="تم اعتمادها" icon={FileCheck2} tone="green" />
        <InvoiceStatCard title="الفواتير المرفوضة" value={stats.rejected.toLocaleString("en-US")} helper="تم رفضها" icon={CircleOff} tone="coral" />
        <InvoiceStatCard title="الفواتير المرتجعة" value={stats.returned.toLocaleString("en-US")} helper="تم تسجيلها كمرتجعة" icon={RotateCcw} tone="indigo" />
        <InvoiceStatCard title="طلبات بدون PDF" value={stats.withoutInvoice.toLocaleString("en-US")} helper="يمكن تصنيفها أيضًا" icon={ReceiptText} tone="indigo" />
        <InvoiceStatCard title="أرشيف PDF" value={stats.files.toLocaleString("en-US")} helper={`${stats.generatedToday} ملف أُنشئ اليوم`} icon={FileText} tone="blue" />
      </section>

      {stats.reviewPending > 0 && <section className="rounded-[12px] border border-[#EEDFC4] bg-[#FFF9EF] px-[12px] py-[10px]"><div className="flex items-start gap-[8px]"><ShieldCheck className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#B17C37]" /><div><p className="text-[10px] font-semibold text-[#9A7139]">{stats.reviewPending.toLocaleString("ar-EG")} فاتورة بانتظار قرار المراجعة</p><p className="mt-[3px] text-[9px] leading-5 text-[#8A7659]">التصنيف لا يحتاج PDF: اختر قبول أو رفض أو مرتجعة مباشرة.</p></div></div></section>}

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]"><div><h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2><p className="mt-[3px] text-[9px] text-[#9BA2AC]">بحث شامل برقم الطلب أو العميل أو الهاتف مع فلترة التاريخ والحالة</p></div>{hasFilters && <button type="button" onClick={clearFilters} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[9px] text-[9px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]"><X className="h-[10px] w-[10px]" />مسح الفلاتر</button>}</div>
        <div className="grid grid-cols-1 gap-[7px] p-[11px] xl:grid-cols-[minmax(0,1fr)_175px_175px_185px]">
          <div className="relative"><Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="رقم الطلب، اسم العميل أو رقم الهاتف..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></div>
          <div className="relative"><CalendarDays className="pointer-events-none absolute right-[11px] top-1/2 z-10 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" /><Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[33px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></div>
          <Select value={orderStatusFilter} onValueChange={(value) => setOrderStatusFilter(value as OrderStatusFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل حالات الطلب</SelectItem><SelectItem value="pending">قيد الانتظار</SelectItem><SelectItem value="confirmed">مؤكد</SelectItem><SelectItem value="processing">قيد التجهيز</SelectItem><SelectItem value="shipped">تم الشحن</SelectItem><SelectItem value="delivered">تم التوصيل</SelectItem><SelectItem value="cancelled">ملغي</SelectItem></SelectContent></Select>
          <Select value={invoicePresenceFilter} onValueChange={(value) => setInvoicePresenceFilter(value as InvoicePresenceFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الفواتير</SelectItem><SelectItem value="with_invoice">لديها PDF</SelectItem><SelectItem value="without_invoice">بدون PDF</SelectItem></SelectContent></Select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-2 gap-[4px] border-b border-[#E5E9EF] bg-[#FAFBFC] p-[5px] sm:grid-cols-6">
          <InvoiceTabButton active={activeTab === "review"} onClick={() => switchTab("review")} icon={FileClock} label="بانتظار المراجعة" count={stats.reviewPending} tone="amber" />
          <InvoiceTabButton active={activeTab === "accepted"} onClick={() => switchTab("accepted")} icon={CheckCircle2} label="المقبولة" count={stats.accepted} tone="green" />
          <InvoiceTabButton active={activeTab === "rejected"} onClick={() => switchTab("rejected")} icon={CircleOff} label="المرفوضة" count={stats.rejected} tone="coral" />
          <InvoiceTabButton active={activeTab === "returned"} onClick={() => switchTab("returned")} icon={RotateCcw} label="المرتجعة" count={stats.returned} tone="indigo" />
          <InvoiceTabButton active={activeTab === "all"} onClick={() => switchTab("all")} icon={ReceiptText} label="كل الطلبات" count={stats.totalOrders} tone="indigo" />
          <InvoiceTabButton active={activeTab === "files"} onClick={() => switchTab("files")} icon={FileText} label="أرشيف PDF" count={stats.files} tone="blue" />
        </div>

        {activeTab !== "files" && selectedIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-[8px] border-b border-[#E5E9EF] bg-[#FCFDFE] px-[11px] py-[8px]"><p className="text-[10px] font-semibold text-[#59616B]">تم تحديد {selectedIds.length.toLocaleString("ar-EG")} فاتورة</p><div className="flex flex-wrap gap-[6px]">{activeTab !== "accepted" && <Button type="button" onClick={() => acceptInvoices(selectedIds)} disabled={updateReviewMutation.isPending} className="h-[34px] rounded-[8px] bg-[#5E8A69] px-3 text-[10px] font-semibold text-white shadow-none hover:bg-[#52785C]"><ThumbsUp className="ml-[5px] h-[11px] w-[11px]" />قبول المحدد</Button>}{activeTab !== "rejected" && <Button type="button" variant="outline" onClick={() => openRejectDialog(selectedIds)} disabled={updateReviewMutation.isPending} className="h-[34px] rounded-[8px] border-[#F0D7D4] bg-white px-3 text-[10px] font-semibold text-[#B95C54] shadow-none"><ThumbsDown className="ml-[5px] h-[11px] w-[11px]" />رفض المحدد</Button>}{activeTab !== "returned" && <Button type="button" variant="outline" onClick={() => openReturnDialog(selectedIds)} disabled={updateReviewMutation.isPending} className="h-[34px] rounded-[8px] border-[#E2DEF3] bg-white px-3 text-[10px] font-semibold text-[#675CBA] shadow-none"><RotateCcw className="ml-[5px] h-[11px] w-[11px]" />تسجيل كمرتجعة</Button>}<Button type="button" variant="outline" onClick={() => setSelectedIds([])} className="h-[34px] rounded-[8px] border-[#E3E7EC] bg-white px-3 text-[10px] font-semibold text-[#707883] shadow-none">إلغاء التحديد</Button></div></div>}

        {activeTab === "files" ? <InvoiceFilesPanel invoices={filteredInvoices} loading={isLoadingInvoices} fetching={isFetchingInvoices} onOpen={(invoice) => void openInvoiceFile(invoice.name)} onPrint={(invoice) => void printInvoiceFile(invoice.name)} onDelete={setDeleteTarget} /> : <OrdersPanel orders={filteredOrders} loading={isLoadingOrders} fetching={isFetchingOrders} invoiceOrderNumberSet={invoiceOrderNumberSet} activeTab={activeTab} selectedIds={selectedIds} allVisibleSelected={allVisibleSelected} onToggleAll={toggleAllVisible} onToggleSelected={toggleSelected} onOpenEditor={handleOpenInvoiceEditor} onAccept={(order) => acceptInvoices([order.id])} onReject={(order) => openRejectDialog([order.id])} onReturn={(order) => openReturnDialog([order.id])} onReturnToReview={(order) => updateReviewMutation.mutate({ ids: [order.id], status: "pending" })} reviewBusy={updateReviewMutation.isPending} />}
      </section>

      <Dialog open={rejectDialogOpen} onOpenChange={(open) => { if (!open && !updateReviewMutation.isPending) setRejectDialogOpen(false); }}><DialogContent dir="rtl" className="max-w-[520px] rounded-[16px] border-[#E4E8ED] bg-[#F7F8FA] p-0"><DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4"><div className="flex items-center gap-[10px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#FFF0ED] text-[#C15F56]"><ThumbsDown className="h-[15px] w-[15px]" /></div><div><DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">رفض الفاتورة</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">اكتب سبب الرفض ليبقى محفوظًا مع الفاتورة.</DialogDescription></div></div></DialogHeader><div className="space-y-[10px] p-[12px]"><div><p className="mb-[6px] text-[10px] font-semibold text-[#68717B]">ملاحظة المراجعة</p><Textarea value={rejectNote} onChange={(event) => setRejectNote(event.target.value)} rows={5} placeholder="مثال: بيانات غير صحيحة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-white text-[10px] leading-6 shadow-none focus-visible:ring-0" /></div></div><div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3"><Button type="button" variant="outline" disabled={updateReviewMutation.isPending} onClick={() => setRejectDialogOpen(false)} className="h-[36px] rounded-[9px] border-[#E1E5EA] px-4 text-[10px] font-semibold text-[#707883] shadow-none">إلغاء</Button><Button type="button" disabled={updateReviewMutation.isPending} onClick={() => updateReviewMutation.mutate({ ids: rejectTargetIds, status: "rejected", note: rejectNote })} className="h-[36px] rounded-[9px] bg-[#C76161] px-5 text-[10px] font-semibold text-white shadow-none hover:bg-[#B65555]">تأكيد الرفض</Button></div></DialogContent></Dialog>

      <Dialog open={returnDialogOpen} onOpenChange={(open) => { if (!open && !updateReviewMutation.isPending) setReturnDialogOpen(false); }}><DialogContent dir="rtl" className="max-w-[520px] rounded-[16px] border-[#E4E8ED] bg-[#F7F8FA] p-0"><DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4"><div className="flex items-center gap-[10px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><RotateCcw className="h-[15px] w-[15px]" /></div><div><DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">تسجيل الفاتورة كمرتجعة</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">اكتب سبب الإرجاع ليبقى محفوظًا مع الفاتورة.</DialogDescription></div></div></DialogHeader><div className="space-y-[10px] p-[12px]"><div><p className="mb-[6px] text-[10px] font-semibold text-[#68717B]">سبب الإرجاع</p><Textarea value={returnNote} onChange={(event) => setReturnNote(event.target.value)} rows={5} placeholder="مثال: العميل أعاد الطلب..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-white text-[10px] leading-6 shadow-none focus-visible:ring-0" /></div></div><div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3"><Button type="button" variant="outline" disabled={updateReviewMutation.isPending} onClick={() => setReturnDialogOpen(false)} className="h-[36px] rounded-[9px] border-[#E1E5EA] px-4 text-[10px] font-semibold text-[#707883] shadow-none">إلغاء</Button><Button type="button" disabled={updateReviewMutation.isPending} onClick={() => updateReviewMutation.mutate({ ids: returnTargetIds, status: "returned", note: returnNote })} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[10px] font-semibold text-white shadow-none hover:bg-[#5A50A5]">تأكيد الإرجاع</Button></div></DialogContent></Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5"><AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف ملف PDF</AlertDialogTitle><AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">سيتم حذف ملف "{deleteTarget?.name || ""}" فقط، وستبقى الفاتورة قابلة للتصنيف.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10px] font-semibold text-white hover:bg-[#B65555]">حذف PDF</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

      <InvoiceEditor order={selectedOrder} open={showInvoiceEditor} onClose={handleCloseInvoiceEditor} onUpdate={() => void handleDataUpdated()} />
      <NewInvoiceCreator open={showNewInvoice} onClose={() => setShowNewInvoice(false)} onCreated={(createdOrder) => void handleNewInvoiceCreated(createdOrder)} />
    </div>
  );
};

const OrdersPanel = ({ orders, loading, fetching, invoiceOrderNumberSet, activeTab, selectedIds, allVisibleSelected, onToggleAll, onToggleSelected, onOpenEditor, onAccept, onReject, onReturn, onReturnToReview, reviewBusy }: { orders: Order[]; loading: boolean; fetching: boolean; invoiceOrderNumberSet: Set<string>; activeTab: TabMode; selectedIds: string[]; allVisibleSelected: boolean; onToggleAll: () => void; onToggleSelected: (id: string) => void; onOpenEditor: (order: Order) => void; onAccept: (order: Order) => void; onReject: (order: Order) => void; onReturn: (order: Order) => void; onReturnToReview: (order: Order) => void; reviewBusy: boolean }) => {
  if (loading) return <PanelLoading text="جاري تحميل الفواتير..." />;
  if (orders.length === 0) return <PanelEmpty icon={activeTab === "accepted" ? FileCheck2 : activeTab === "rejected" ? CircleOff : activeTab === "returned" ? RotateCcw : ReceiptText} title={activeTab === "accepted" ? "لا توجد فواتير مقبولة" : activeTab === "rejected" ? "لا توجد فواتير مرفوضة" : activeTab === "returned" ? "لا توجد فواتير مرتجعة" : activeTab === "review" ? "لا توجد فواتير بانتظار المراجعة" : "لا توجد طلبات"} description="لا توجد نتائج مطابقة للقسم والفلاتر الحالية." />;

  return <>
    <div className="hidden md:block"><div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]"><div><h2 className="text-[11px] font-semibold text-[#454C56]">{tabTitle(activeTab)}</h2><p className="mt-[3px] text-[9px] text-[#9CA3AC]">{orders.length.toLocaleString("ar-EG")} فاتورة/طلب ظاهر</p></div>{fetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}</div><div className="overflow-x-auto"><table className="w-full min-w-[1380px]"><thead><tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]"><th className="w-[44px] px-[10px] text-center"><Checkbox checked={allVisibleSelected} onCheckedChange={onToggleAll} /></th><th className="px-[12px] text-right">الطلب</th><th className="px-[12px] text-right">العميل</th><th className="px-[12px] text-right">المنتجات</th><th className="px-[12px] text-right">الإجمالي</th><th className="px-[12px] text-right">حالة الطلب</th><th className="px-[12px] text-right">PDF</th><th className="px-[12px] text-right">التصنيف</th><th className="px-[12px] text-right">التاريخ</th><th className="w-[260px] px-[12px] text-center">الإجراءات</th></tr></thead><tbody>{orders.map((order) => {
      const pdfExists = Boolean(order.invoice_url) || invoiceOrderNumberSet.has(order.order_number);
      const reviewStatus = effectiveStatusFromOrder(order);
      return <tr key={order.id} className="h-[76px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]"><td className="px-[10px] text-center"><Checkbox checked={selectedIds.includes(order.id)} onCheckedChange={() => onToggleSelected(order.id)} /></td><td className="px-[12px]"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#675CBA]">{order.order_number}</p><p className="mt-[3px] text-[9px] text-[#9AA2AC]">{paymentLabel(order.payment_method)}</p></td><td className="px-[12px]"><div className="flex min-w-[180px] items-center gap-[8px]"><div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><UserRound className="h-[13px] w-[13px]" /></div><div className="min-w-0"><p className="max-w-[180px] truncate text-[10.5px] font-semibold text-[#4A525C]">{order.customer_name}</p><p dir="ltr" className="mt-[2px] text-right text-[9px] text-[#9299A3]">{order.customer_phone}</p></div></div></td><td className="px-[12px]"><span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] bg-[#F2F4F7] px-[8px] text-[9px] font-semibold text-[#68717B]"><Package className="h-[9px] w-[9px]" />{order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} قطعة</span></td><td className="px-[12px]"><span className="text-[10px] font-semibold text-[#59616B]">{formatOrderMoney(order.total, order.currency_code)}</span></td><td className="px-[12px]"><OrderStatus status={order.status} /></td><td className="px-[12px]"><InvoicePresence available={pdfExists} /></td><td className="px-[12px]"><ReviewStatus status={reviewStatus} note={order.invoice_review_note} /></td><td className="px-[12px]"><span className="text-[9px] text-[#7E8690]">{formatDate(order.created_at)}</span></td><td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => onOpenEditor(order)} className="flex h-[31px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white px-[8px] text-[9px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />عرض</button>{reviewStatus !== "accepted" && <button type="button" disabled={reviewBusy} onClick={() => onAccept(order)} className="flex h-[31px] items-center justify-center gap-[5px] rounded-[8px] border border-[#D8E8DD] bg-white px-[8px] text-[9px] font-semibold text-[#568468]"><Check className="h-[10px] w-[10px]" />قبول</button>}{reviewStatus !== "rejected" && <button type="button" disabled={reviewBusy} onClick={() => onReject(order)} className="flex h-[31px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white px-[8px] text-[9px] font-semibold text-[#B95C54]"><X className="h-[10px] w-[10px]" />رفض</button>}{reviewStatus !== "returned" && <button type="button" disabled={reviewBusy} onClick={() => onReturn(order)} className="flex h-[31px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white px-[8px] text-[9px] font-semibold text-[#675CBA]"><RotateCcw className="h-[10px] w-[10px]" />مرتجعة</button>}{reviewStatus !== "pending" && <button type="button" disabled={reviewBusy} title="إعادة للمراجعة" onClick={() => onReturnToReview(order)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707883]"><RotateCcw className="h-[10px] w-[10px]" /></button>}</div></td></tr>;
    })}</tbody></table></div></div>

    <div className="space-y-[8px] p-[8px] md:hidden">{orders.map((order) => {
      const pdfExists = Boolean(order.invoice_url) || invoiceOrderNumberSet.has(order.order_number);
      const reviewStatus = effectiveStatusFromOrder(order);
      return <article key={order.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white"><div className="p-[11px]"><div className="flex items-start justify-between gap-[8px]"><div className="flex min-w-0 gap-[8px]"><Checkbox checked={selectedIds.includes(order.id)} onCheckedChange={() => onToggleSelected(order.id)} className="mt-[2px]" /><div className="min-w-0"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#675CBA]">{order.order_number}</p><h3 className="mt-[4px] truncate text-[11px] font-semibold text-[#3B424C]">{order.customer_name}</h3><p dir="ltr" className="mt-[2px] text-right text-[9px] text-[#9299A3]">{order.customer_phone}</p></div></div><ReviewStatus status={reviewStatus} note={order.invoice_review_note} /></div><div className="mt-[10px] grid grid-cols-2 gap-[6px]"><InfoBox label="الإجمالي" value={formatOrderMoney(order.total, order.currency_code)} /><InfoBox label="المنتجات" value={`${order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)} قطعة`} /></div><div className="mt-[8px] flex flex-wrap items-center gap-[6px]"><OrderStatus status={order.status} /><InvoicePresence available={pdfExists} /><span className="mr-auto text-[9px] text-[#9AA2AC]">{formatDate(order.created_at)}</span></div>{order.invoice_review_note && reviewStatus === "rejected" && <div className="mt-[8px] rounded-[8px] border border-[#F0D7D4] bg-[#FFF8F7] p-[8px] text-[9px] leading-5 text-[#A6635C]">سبب الرفض: {order.invoice_review_note}</div>}{order.invoice_review_note && reviewStatus === "returned" && <div className="mt-[8px] rounded-[8px] border border-[#E2DEF3] bg-[#F8F7FF] p-[8px] text-[9px] leading-5 text-[#675CBA]">سبب الإرجاع: {order.invoice_review_note}</div>}</div><div className="grid grid-cols-2 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]"><button type="button" onClick={() => onOpenEditor(order)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[9px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />عرض / تعديل</button>{reviewStatus !== "accepted" && <button type="button" disabled={reviewBusy} onClick={() => onAccept(order)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#D8E8DD] bg-white text-[9px] font-semibold text-[#568468]"><Check className="h-[10px] w-[10px]" />قبول</button>}{reviewStatus !== "rejected" && <button type="button" disabled={reviewBusy} onClick={() => onReject(order)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[9px] font-semibold text-[#B95C54]"><X className="h-[10px] w-[10px]" />رفض</button>}{reviewStatus !== "returned" && <button type="button" disabled={reviewBusy} onClick={() => onReturn(order)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[9px] font-semibold text-[#675CBA]"><RotateCcw className="h-[10px] w-[10px]" />مرتجعة</button>}{reviewStatus !== "pending" && <button type="button" disabled={reviewBusy} onClick={() => onReturnToReview(order)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white text-[9px] font-semibold text-[#707883]"><RotateCcw className="h-[10px] w-[10px]" />إعادة للمراجعة</button>}</div></article>;
    })}</div>
  </>;
};

const InvoiceFilesPanel = ({ invoices, loading, fetching, onOpen, onPrint, onDelete }: { invoices: InvoiceFile[]; loading: boolean; fetching: boolean; onOpen: (invoice: InvoiceFile) => void; onPrint: (invoice: InvoiceFile) => void; onDelete: (invoice: InvoiceFile) => void }) => {
  if (loading) return <PanelLoading text="جاري تحميل أرشيف الفواتير..." />;
  if (invoices.length === 0) return <PanelEmpty icon={FileText} title="لا توجد فواتير محفوظة" description="ملفات PDF التي تنشئها من محرر الفاتورة ستظهر هنا." />;
  return <><div className="hidden md:block"><div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]"><div><h2 className="text-[11px] font-semibold text-[#454C56]">أرشيف ملفات PDF</h2><p className="mt-[3px] text-[9px] text-[#9CA3AC]">روابط الملفات الآمنة تُنشأ عند الفتح أو الطباعة فقط</p></div>{fetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}</div><div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]"><th className="px-[12px] text-right">رقم الطلب</th><th className="px-[12px] text-right">اسم الملف</th><th className="px-[12px] text-right">الحجم</th><th className="px-[12px] text-right">تاريخ الإنشاء</th><th className="w-[145px] px-[12px] text-center">الإجراءات</th></tr></thead><tbody>{invoices.map((invoice) => <tr key={invoice.name} className="h-[68px] border-b border-[#F0F2F5] last:border-b-0"><td className="px-[12px]"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#5680CF]">{invoice.orderNumber}</p></td><td className="px-[12px]"><p dir="ltr" className="max-w-[340px] truncate text-right text-[9px] text-[#68717B]">{invoice.name}</p></td><td className="px-[12px]"><span className="text-[9px] text-[#7E8690]">{formatFileSize(invoice.size)}</span></td><td className="px-[12px]"><span className="text-[9px] text-[#7E8690]">{formatDateTime(invoice.created_at)}</span></td><td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => onOpen(invoice)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#DCE7F4] bg-white text-[#5680CF]"><ExternalLink className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => onPrint(invoice)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#68717B]"><Printer className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => onDelete(invoice)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[11px] w-[11px]" /></button></div></td></tr>)}</tbody></table></div></div><div className="space-y-[8px] p-[8px] md:hidden">{invoices.map((invoice) => <article key={invoice.name} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white"><div className="p-[11px]"><p dir="ltr" className="text-right font-mono text-[10px] font-semibold text-[#5680CF]">{invoice.orderNumber}</p><p dir="ltr" className="mt-[3px] truncate text-right text-[9px] text-[#858D97]">{invoice.name}</p><p className="mt-[4px] text-[9px] text-[#9AA2AC]">{formatDateTime(invoice.created_at)} · {formatFileSize(invoice.size)}</p></div><div className="grid grid-cols-3 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]"><button type="button" onClick={() => onOpen(invoice)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white text-[9px] font-semibold text-[#5680CF]">فتح</button><button type="button" onClick={() => onPrint(invoice)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white text-[9px] font-semibold text-[#68717B]">طباعة</button><button type="button" onClick={() => onDelete(invoice)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[9px] font-semibold text-[#C15F56]">حذف</button></div></article>)}</div></>;
};

const effectiveStatusFromOrder = (order: Order): InvoiceReviewStatus => {
  if (order.invoice_review_status === "accepted" || order.invoice_review_status === "rejected" || order.invoice_review_status === "returned" || order.invoice_review_status === "pending") return order.invoice_review_status;
  return "pending";
};

const tabTitle = (tab: TabMode) => tab === "review" ? "فواتير بانتظار المراجعة" : tab === "accepted" ? "الفواتير المقبولة" : tab === "rejected" ? "الفواتير المرفوضة" : tab === "returned" ? "الفواتير المرتجعة" : "كل الطلبات والفواتير";
const extractOrderNumber = (fileName: string) => { const cleaned = fileName.replace(/^invoice-/, "").replace(/\.pdf$/i, ""); const timestampMatch = cleaned.match(/^(.*)-(\d{10,})$/); return timestampMatch?.[1] || cleaned || "غير معروف"; };
const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatDate = (value: string) => { try { return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "—"; } };
const formatDateTime = (value: string) => { try { return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); } catch { return "—"; } };
const formatFileSize = (size?: number | null) => !size || size <= 0 ? "—" : size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
const currencySymbol = (code?: string | null) => { const normalized = String(code || "SAR").toUpperCase(); if (normalized === "SAR") return "ر.س"; if (normalized === "YER" || normalized.includes("YER")) return "ر.ي"; if (normalized === "USD") return "$"; if (normalized === "AED") return "د.إ"; return normalized; };
const formatOrderMoney = (value: number, code?: string | null) => `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currencySymbol(code)}`;
const paymentLabel = (method: string) => { const value = String(method || "").toLowerCase(); if (value === "cod") return "الدفع عند الاستلام"; if (value === "cash") return "نقدًا"; if (value === "card") return "بطاقة"; if (value === "transfer" || value === "bank_transfer") return "تحويل بنكي"; return method || "غير محدد"; };

const OrderStatus = ({ status }: { status: string }) => { const value = normalizeOrderStatus(status); const config: Record<string, { label: string; className: string }> = { pending: { label: "قيد الانتظار", className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]" }, confirmed: { label: "مؤكد", className: "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" }, processing: { label: "قيد التجهيز", className: "border-[#E2DEF3] bg-[#F6F4FF] text-[#675CBA]" }, shipped: { label: "تم الشحن", className: "border-[#D7E5EE] bg-[#F1F7FA] text-[#4F7C96]" }, delivered: { label: "تم التوصيل", className: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" }, cancelled: { label: "ملغي", className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]" } }; const current = config[value] || { label: status || "غير محدد", className: "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]" }; return <span className={cn("inline-flex h-[25px] items-center rounded-[7px] border px-[8px] text-[9px] font-semibold", current.className)}>{current.label}</span>; };
const InvoicePresence = ({ available }: { available: boolean }) => <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9px] font-semibold", available ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>{available ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}{available ? "PDF موجود" : "بدون PDF"}</span>;
const ReviewStatus = ({ status, note }: { status: InvoiceReviewStatus; note?: string | null }) => status === "accepted" ? <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[8px] text-[9px] font-semibold text-[#568468]"><CheckCircle2 className="h-[9px] w-[9px]" />مقبولة</span> : status === "rejected" ? <span title={note || "مرفوضة"} className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#F0D7D4] bg-[#FFF3F1] px-[8px] text-[9px] font-semibold text-[#C15F56]"><CircleOff className="h-[9px] w-[9px]" />مرفوضة</span> : status === "returned" ? <span title={note || "مرتجعة"} className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#E2DEF3] bg-[#F6F4FF] px-[8px] text-[9px] font-semibold text-[#675CBA]"><RotateCcw className="h-[9px] w-[9px]" />مرتجعة</span> : <span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[8px] text-[9px] font-semibold text-[#A9782F]"><FileClock className="h-[9px] w-[9px]" />بانتظار المراجعة</span>;
const InvoiceTabButton = ({ active, onClick, icon: Icon, label, count, tone }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; count: number; tone: "amber" | "green" | "coral" | "indigo" | "blue" }) => { const colors = { amber: active ? "bg-white text-[#A9782F]" : "text-[#858D97]", green: active ? "bg-white text-[#568468]" : "text-[#858D97]", coral: active ? "bg-white text-[#C15F56]" : "text-[#858D97]", indigo: active ? "bg-white text-[#675CBA]" : "text-[#858D97]", blue: active ? "bg-white text-[#5680CF]" : "text-[#858D97]" }[tone]; return <button type="button" onClick={onClick} className={cn("flex min-h-[40px] items-center justify-center gap-[5px] rounded-[9px] px-[7px] text-[9px] font-semibold transition-colors", colors, active && "shadow-[0_1px_4px_rgba(31,41,55,0.08)]")}><Icon className="h-[11px] w-[11px]" /><span className="truncate">{label}</span><span className="rounded-[6px] bg-[#F2F4F7] px-[5px] py-[2px] text-[8px] text-[#68717B]">{count}</span></button>; };
const InvoiceStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" | "amber" }) => { const style = { indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" }, green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" }, blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" }, coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" }, amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" } }[tone]; return <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[19px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] text-[9px] text-[#A0A6AF]">{helper}</p></article>; };
const InfoBox = ({ label, value }: { label: string; value: string }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[9px] text-[#9AA2AC]">{label}</p><p className="mt-[3px] text-[10px] font-semibold text-[#59616B]">{value}</p></div>;
const PanelLoading = ({ text }: { text: string }) => <div className="flex min-h-[320px] flex-col items-center justify-center gap-[8px]"><Loader2 className="h-[19px] w-[19px] animate-spin text-[#675CBA]" /><p className="text-[10px] text-[#9299A3]">{text}</p></div>;
const PanelEmpty = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><Icon className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11px] font-semibold text-[#535B65]">{title}</h3><p className="mt-[4px] text-[9px] text-[#9BA2AC]">{description}</p></div>;

export default AdminInvoicesPage;
