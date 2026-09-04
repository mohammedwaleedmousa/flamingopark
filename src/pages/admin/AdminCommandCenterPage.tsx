import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileSearch,
  Heart,
  Loader2,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  UserRound,
  Users,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getCatalogHealthSummary, type CatalogHealthSummary } from "@/lib/adminProductTools";
import {
  getAdminPreferences,
  hasAdminPermission,
  listPendingApprovalRequests,
  listWhatsAppTemplates,
  renderWhatsAppTemplate,
  resolveApprovalRequest,
  saveAdminPreferences,
  type ApprovalRequest,
  type WhatsAppTemplate,
} from "@/lib/adminProductivity";

type CommandTab = "today" | "search" | "whatsapp" | "shortcuts" | "approvals" | "preparation";

type OpsOrder = {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  country: string;
  status: string;
  created_at: string;
  items: unknown;
};

type SearchResults = {
  products: Array<{ id: string; name: string; name_ar: string | null; slug: string | null; price: number | null; is_active: boolean | null }>;
  orders: Array<{ id: string; order_number: string; customer_name: string; customer_phone: string; status: string; total: number | null }>;
  customers: Array<{ id: string; name: string; phone: string; country: string | null; region: string | null }>;
  brands: Array<{ id: string; name: string; slug: string | null }>;
};

type WhatsAppTarget = {
  key: string;
  type: "order" | "customer";
  id: string;
  name: string;
  phone: string;
  country: string | null;
  orderNumber?: string;
  status?: string;
};

const EMPTY_HEALTH: CatalogHealthSummary = {
  total_products: 0,
  products_with_issues: 0,
  missing_images: 0,
  missing_brand: 0,
  missing_category: 0,
  invalid_price: 0,
  stock_mismatch: 0,
};

const EMPTY_SEARCH: SearchResults = { products: [], orders: [], customers: [], brands: [] };

const TABS: Array<{ id: CommandTab; label: string; helper: string; icon: LucideIcon }> = [
  { id: "today", label: "اليوم", helper: "المهام والتنبيهات", icon: BellRing },
  { id: "search", label: "البحث الشامل", helper: "كل بيانات الأدمن", icon: FileSearch },
  { id: "whatsapp", label: "واتساب", helper: "قوالب جاهزة", icon: MessageCircle },
  { id: "shortcuts", label: "اختصاراتي", helper: "المفضلة والإجراءات", icon: Star },
  { id: "approvals", label: "الموافقات", helper: "مراجعة آمنة", icon: ShieldCheck },
  { id: "preparation", label: "التجهيز", helper: "Picking / Packing", icon: Boxes },
];

const FAVORITE_ROUTES = [
  { route: "/admin/orders", label: "الطلبات", helper: "إدارة الطلبات" },
  { route: "/admin/products", label: "المنتجات", helper: "الكتالوج" },
  { route: "/admin/customers", label: "العملاء", helper: "ملفات العملاء" },
  { route: "/admin/catalog-health", label: "صحة الكتالوج", helper: "الفحص والأدوات" },
  { route: "/admin/invoices", label: "الفواتير", helper: "المراجعة المالية" },
  { route: "/admin/refunds", label: "المرتجعات", helper: "الإرجاع والاسترداد" },
  { route: "/admin/campaigns", label: "الحملات", helper: "التسويق" },
  { route: "/admin/reports", label: "التقارير", helper: "نظرة عامة" },
  { route: "/admin/order-preparation", label: "قائمة التجهيز", helper: "Picking / Packing" },
];

const QUICK_ACTIONS = [
  { id: "orders", label: "فتح الطلبات", route: "/admin/orders", icon: ShoppingBag },
  { id: "new_product", label: "إضافة منتج", route: "/admin/products/new", icon: Package },
  { id: "prepare", label: "قائمة التجهيز", route: "/admin/order-preparation", icon: Boxes },
  { id: "catalog", label: "فحص الكتالوج", route: "/admin/catalog-health", icon: ClipboardCheck },
  { id: "notifications", label: "إشعار عميل", route: "/admin/customer-notifications", icon: BellRing },
  { id: "campaigns", label: "الحملات", route: "/admin/campaigns", icon: Sparkles },
  { id: "refunds", label: "المرتجعات", route: "/admin/refunds", icon: RefreshCw },
  { id: "reports", label: "التقارير", route: "/admin/reports", icon: FileSearch },
];

const statusLabel = (status: string) => ({
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  canceled: "ملغي",
}[String(status || "").toLowerCase()] || status || "غير محدد");

const ageHours = (createdAt: string) => Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 3_600_000));

const waitLabel = (createdAt: string) => {
  const hours = ageHours(createdAt);
  if (hours < 1) return "أقل من ساعة";
  if (hours < 24) return `${hours} ساعة`;
  return `${Math.floor(hours / 24)} يوم`;
};

const orderItemsCount = (order: OpsOrder) => {
  if (!Array.isArray(order.items)) return 0;
  return order.items.reduce((sum: number, item: any) => sum + Math.max(1, Number(item?.quantity || 1)), 0);
};

const nextOrderAction = (order: OpsOrder) => {
  const status = String(order.status || "").toLowerCase();
  if (status === "pending" && ageHours(order.created_at) >= 24) return { label: "تأكيد عاجل", tone: "rose" as const };
  if (status === "pending") return { label: "تأكيد الطلب", tone: "amber" as const };
  if (status === "confirmed") return { label: "بدء التجهيز", tone: "blue" as const };
  if (status === "processing") return { label: "إكمال التجهيز", tone: "violet" as const };
  return { label: "مراجعة الطلب", tone: "gray" as const };
};

const normalizeWhatsAppPhone = (phoneValue: string, country?: string | null) => {
  let phone = String(phoneValue || "").replace(/\D/g, "");
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("967") || phone.startsWith("966")) return phone;
  if (phone.startsWith("0")) phone = phone.slice(1);
  return String(country || "").toUpperCase() === "SA" ? `966${phone}` : `967${phone}`;
};

const AdminCommandCenterPage = () => {
  const [activeTab, setActiveTab] = useState<CommandTab>("today");
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [activeOrders, setActiveOrders] = useState<OpsOrder[]>([]);
  const [customerOrderCounts, setCustomerOrderCounts] = useState<Record<string, number>>({});
  const [health, setHealth] = useState<CatalogHealthSummary>(EMPTY_HEALTH);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [canReviewApprovals, setCanReviewApprovals] = useState(true);
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);

  const [globalQuery, setGlobalQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>(EMPTY_SEARCH);

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [waTargets, setWaTargets] = useState<WhatsAppTarget[]>([]);
  const [waTargetsLoading, setWaTargetsLoading] = useState(false);
  const [waQuery, setWaQuery] = useState("");
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [favoriteRoutes, setFavoriteRoutes] = useState<string[]>([]);
  const [quickActionIds, setQuickActionIds] = useState<string[]>([]);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const client = supabase as any;
      const [activeResult, historyResult, nextHealth, nextApprovals, reviewAllowed] = await Promise.all([
        client
          .from("orders")
          .select("id,order_number,customer_id,customer_name,customer_phone,country,status,created_at,items")
          .in("status", ["pending", "confirmed", "processing"])
          .order("created_at", { ascending: true })
          .limit(250),
        client.from("orders").select("customer_phone").order("created_at", { ascending: false }).limit(1000),
        getCatalogHealthSummary(),
        listPendingApprovalRequests(),
        hasAdminPermission("admin.approvals.review"),
      ]);

      if (activeResult.error) throw activeResult.error;
      if (historyResult.error) throw historyResult.error;

      const counts: Record<string, number> = {};
      for (const row of historyResult.data ?? []) {
        const phone = String(row.customer_phone || "").replace(/\D/g, "");
        if (phone) counts[phone] = (counts[phone] || 0) + 1;
      }

      setActiveOrders((activeResult.data ?? []) as OpsOrder[]);
      setCustomerOrderCounts(counts);
      setHealth(nextHealth);
      setApprovals(nextApprovals);
      setCanReviewApprovals(reviewAllowed);
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحديث مركز الأدمن", description: "بعض المؤشرات لم يتم تحميلها.", variant: "destructive" });
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

  useEffect(() => {
    let active = true;
    const loadPreferencesAndTemplates = async () => {
      try {
        const [prefs, nextTemplates] = await Promise.all([getAdminPreferences(), listWhatsAppTemplates()]);
        if (!active) return;
        setFavoriteRoutes(prefs.favoriteRoutes);
        setQuickActionIds(prefs.quickActions);
        setTemplates(nextTemplates.filter((item) => item.is_active));
        const firstTemplate = nextTemplates.find((item) => item.is_active);
        if (firstTemplate) setSelectedTemplateId((current) => current || firstTemplate.id);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setPreferencesLoading(false);
      }
    };
    void loadPreferencesAndTemplates();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (activeTab !== "whatsapp" || waTargets.length > 0 || waTargetsLoading) return;
    setWaTargetsLoading(true);
    const loadTargets = async () => {
      const client = supabase as any;
      try {
        const [ordersResult, customersResult] = await Promise.all([
          client.from("orders").select("id,order_number,customer_name,customer_phone,country,status").order("created_at", { ascending: false }).limit(150),
          client.from("customers").select("id,name,phone,country").order("updated_at", { ascending: false }).limit(150),
        ]);
        if (ordersResult.error) throw ordersResult.error;
        if (customersResult.error) throw customersResult.error;

        const orderTargets: WhatsAppTarget[] = (ordersResult.data ?? []).map((order: any) => ({
          key: `order:${order.id}`,
          type: "order",
          id: String(order.id),
          name: String(order.customer_name || "عميل"),
          phone: String(order.customer_phone || ""),
          country: order.country ?? null,
          orderNumber: String(order.order_number || ""),
          status: String(order.status || ""),
        }));
        const customerTargets: WhatsAppTarget[] = (customersResult.data ?? []).map((customer: any) => ({
          key: `customer:${customer.id}`,
          type: "customer",
          id: String(customer.id),
          name: String(customer.name || "عميل"),
          phone: String(customer.phone || ""),
          country: customer.country ?? null,
        }));
        setWaTargets([...orderTargets, ...customerTargets]);
      } catch (error) {
        console.error(error);
        toast({ title: "تعذر تحميل جهات واتساب", variant: "destructive" });
      } finally {
        setWaTargetsLoading(false);
      }
    };
    void loadTargets();
  }, [activeTab, waTargets.length, waTargetsLoading]);

  useEffect(() => {
    const q = globalQuery.trim();
    if (q.length < 2) {
      setSearchResults(EMPTY_SEARCH);
      setSearching(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      const safe = q.replace(/[,%()]/g, " ").trim();
      if (safe.length < 2) return;
      setSearching(true);
      const client = supabase as any;
      try {
        const [productsResult, ordersResult, customersResult, brandsResult] = await Promise.all([
          client.from("products").select("id,name,name_ar,slug,price,is_active").or(`name.ilike.%${safe}%,name_ar.ilike.%${safe}%,slug.ilike.%${safe}%`).limit(8),
          client.from("orders").select("id,order_number,customer_name,customer_phone,status,total").or(`order_number.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`).limit(8),
          client.from("customers").select("id,name,phone,country,region").or(`name.ilike.%${safe}%,phone.ilike.%${safe}%`).limit(8),
          client.from("brands").select("id,name,slug").or(`name.ilike.%${safe}%,slug.ilike.%${safe}%`).limit(8),
        ]);

        setSearchResults({
          products: productsResult.error ? [] : productsResult.data ?? [],
          orders: ordersResult.error ? [] : ordersResult.data ?? [],
          customers: customersResult.error ? [] : customersResult.data ?? [],
          brands: brandsResult.error ? [] : brandsResult.data ?? [],
        });
      } catch (error) {
        console.error(error);
        setSearchResults(EMPTY_SEARCH);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [globalQuery]);

  const oldPending = useMemo(() => activeOrders.filter((order) => order.status === "pending" && ageHours(order.created_at) >= 24), [activeOrders]);
  const readyForPreparation = useMemo(() => activeOrders.filter((order) => ["confirmed", "processing"].includes(order.status)), [activeOrders]);
  const activePieces = useMemo(() => activeOrders.reduce((sum, order) => sum + orderItemsCount(order), 0), [activeOrders]);

  const dailyTasks = useMemo(() => [
    { label: "طلبات تنتظر أكثر من 24 ساعة", value: oldPending.length, helper: "تحتاج تأكيد أو متابعة", route: "/admin/orders", tone: "rose" as const },
    { label: "طلبات جاهزة للتجهيز", value: readyForPreparation.length, helper: `${activePieces} قطعة ضمن الطلبات النشطة`, route: "/admin/order-preparation", tone: "blue" as const },
    { label: "مشكلات الكتالوج", value: health.products_with_issues, helper: "منتجات تحتاج مراجعة", route: "/admin/catalog-health", tone: "amber" as const },
    { label: "موافقات معلقة", value: approvals.length, helper: "تحتاج قرار إداري", route: null, tone: "violet" as const },
  ], [activePieces, approvals.length, health.products_with_issues, oldPending.length, readyForPreparation.length]);

  const effectiveQuickActions = useMemo(() => {
    const selected = QUICK_ACTIONS.filter((item) => quickActionIds.includes(item.id));
    return selected.length > 0 ? selected : QUICK_ACTIONS.slice(0, 4);
  }, [quickActionIds]);

  const visibleWaTargets = useMemo(() => {
    const q = waQuery.trim().toLowerCase();
    if (!q) return waTargets.slice(0, 40);
    return waTargets.filter((target) => [target.name, target.phone, target.orderNumber, target.status]
      .some((value) => String(value || "").toLowerCase().includes(q))).slice(0, 40);
  }, [waQuery, waTargets]);

  const selectedTarget = waTargets.find((target) => target.key === selectedTargetKey) || null;
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) || null;
  const renderedMessage = useMemo(() => {
    if (!selectedTemplate) return "";
    return renderWhatsAppTemplate(selectedTemplate.body, {
      name: selectedTarget?.name || "",
      order_number: selectedTarget?.orderNumber || "",
      status: selectedTarget?.status ? statusLabel(selectedTarget.status) : "",
      phone: selectedTarget?.phone || "",
    });
  }, [selectedTarget, selectedTemplate]);

  const persistPreferences = async (nextFavorites: string[], nextQuickActions: string[]) => {
    const previousFavorites = favoriteRoutes;
    const previousQuickActions = quickActionIds;
    setFavoriteRoutes(nextFavorites);
    setQuickActionIds(nextQuickActions);
    setPreferencesSaving(true);
    try {
      await saveAdminPreferences({ favoriteRoutes: nextFavorites, quickActions: nextQuickActions });
    } catch (error) {
      console.error(error);
      setFavoriteRoutes(previousFavorites);
      setQuickActionIds(previousQuickActions);
      toast({ title: "تعذر حفظ الاختصارات", variant: "destructive" });
    } finally {
      setPreferencesSaving(false);
    }
  };

  const toggleFavorite = (route: string) => {
    const next = favoriteRoutes.includes(route) ? favoriteRoutes.filter((item) => item !== route) : [...favoriteRoutes, route].slice(-8);
    void persistPreferences(next, quickActionIds);
  };

  const toggleQuickAction = (id: string) => {
    const next = quickActionIds.includes(id) ? quickActionIds.filter((item) => item !== id) : [...quickActionIds, id].slice(-6);
    void persistPreferences(favoriteRoutes, next);
  };

  const handleApproval = async (request: ApprovalRequest, status: "approved" | "rejected") => {
    setApprovalBusyId(request.id);
    try {
      await resolveApprovalRequest(request.id, status, approvalNotes[request.id]);
      setApprovals((current) => current.filter((item) => item.id !== request.id));
      toast({ title: status === "approved" ? "تمت الموافقة" : "تم رفض الطلب" });
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحديث الموافقة", variant: "destructive" });
    } finally {
      setApprovalBusyId(null);
    }
  };

  const openWhatsApp = () => {
    if (!selectedTarget || !renderedMessage) return;
    const phone = normalizeWhatsAppPhone(selectedTarget.phone, selectedTarget.country);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(renderedMessage)}`, "_blank", "noopener,noreferrer");
  };

  const copyWhatsApp = async () => {
    if (!renderedMessage) return;
    try {
      await navigator.clipboard.writeText(renderedMessage);
      toast({ title: "تم نسخ الرسالة" });
    } catch {
      toast({ title: "تعذر نسخ الرسالة", variant: "destructive" });
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="إنتاجية الأدمن"
        title="مركز الأدمن"
        description="المهام اليومية، البحث، واتساب، الاختصارات، الموافقات والتجهيز من مكان واحد."
        actions={[
          { label: "قائمة التجهيز", icon: Boxes, href: "/admin/order-preparation" },
          { label: "الطلبات", icon: ShoppingBag, href: "/admin/orders" },
        ]}
      />

      <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[8px]">
        <div className="flex flex-wrap gap-[6px]">
          {effectiveQuickActions.map(({ id, label, route, icon: Icon }) => (
            <Button key={id} asChild variant="outline" size="sm" className="h-[32px] rounded-[9px] border-[#E3E7EC] bg-[#FBFCFD] px-[9px] text-[7.5px] font-semibold text-[#69717C] shadow-none hover:bg-[#F3F1FF] hover:text-[#675CBA]">
              <Link to={route}><Icon className="ml-[5px] h-[11px] w-[11px]" />{label}</Link>
            </Button>
          ))}
          {preferencesLoading || preferencesSaving ? <span className="flex items-center gap-1 px-2 text-[7px] text-[#9AA2AC]"><Loader2 className="h-3 w-3 animate-spin" />حفظ التفضيلات</span> : null}
        </div>
      </section>

      <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[6px]">
        <div className="grid gap-[6px] sm:grid-cols-2 xl:grid-cols-6">
          {TABS.map(({ id, label, helper, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} type="button" onClick={() => setActiveTab(id)} className={cn("flex min-h-[56px] items-center gap-[9px] rounded-[12px] px-[10px] text-right transition-colors", active ? "bg-[#F3F1FF] text-[#5D52AE]" : "text-[#6E7681] hover:bg-[#F8F9FA]")}>
                <span className={cn("flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[9px]", active ? "bg-white text-[#675CBA]" : "bg-[#F5F7F9] text-[#8E96A1]")}><Icon className="h-[13px] w-[13px]" /></span>
                <span className="min-w-0"><span className="block text-[9px] font-semibold">{label}</span><span className="mt-[2px] block truncate text-[6.5px] text-[#9BA2AC]">{helper}</span></span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "today" && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => void loadOverview()} disabled={loadingOverview} className="h-[32px] rounded-[9px] border-[#E3E7EC] text-[8px] shadow-none">{loadingOverview ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <RefreshCw className="ml-1 h-3 w-3" />}تحديث</Button></div>

          <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
            {dailyTasks.map((task) => <TaskCard key={task.label} {...task} onOpenApprovals={() => setActiveTab("approvals")} />)}
          </section>

          <section className="grid gap-[10px] xl:grid-cols-12">
            <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-8">
              <SectionHeader icon={Zap} title="الإجراء التالي للطلبات" helper="الأقدم أولًا مع توصية عملية لكل طلب" />
              {loadingOverview ? <LoadingBlock /> : activeOrders.length === 0 ? <EmptyBlock title="لا توجد طلبات نشطة" /> : (
                <div className="divide-y divide-[#EDF0F3]">
                  {activeOrders.slice(0, 10).map((order) => {
                    const action = nextOrderAction(order);
                    const normalizedPhone = String(order.customer_phone || "").replace(/\D/g, "");
                    const returningCount = customerOrderCounts[normalizedPhone] || 0;
                    return (
                      <div key={order.id} className="flex flex-col gap-[8px] px-[13px] py-[10px] sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-[6px]"><strong dir="ltr" className="text-[9px] text-[#444C56]">#{order.order_number}</strong><span className="text-[7px] text-[#9098A3]">{order.customer_name}</span>{returningCount > 1 ? <span className="rounded-full border border-[#DCE8DF] bg-[#F0F8F2] px-[6px] py-[3px] text-[6px] font-semibold text-[#568468]">عميل عائد · {returningCount} طلبات</span> : null}</div>
                          <div className="mt-[5px] flex flex-wrap gap-[8px] text-[6.5px] text-[#999FA8]"><span>{statusLabel(order.status)}</span><span>الانتظار: {waitLabel(order.created_at)}</span><span>{orderItemsCount(order)} قطعة</span></div>
                        </div>
                        <div className="flex shrink-0 items-center gap-[6px]"><ActionBadge tone={action.tone}>{action.label}</ActionBadge><Button asChild variant="outline" size="sm" className="h-[29px] rounded-[8px] border-[#E2E5EA] px-[8px] text-[7px] shadow-none"><Link to="/admin/orders">فتح</Link></Button></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-[10px] xl:col-span-4">
              <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
                <SectionHeader icon={AlertTriangle} title="تنبيهات تشغيلية" helper="أهم الأشياء التي تحتاج انتباه" />
                <div className="space-y-[7px] p-[10px]">
                  <AlertRow danger={oldPending.length > 0} title="طلبات متأخرة" value={oldPending.length} />
                  <AlertRow danger={health.missing_images > 0} title="منتجات بدون صور" value={health.missing_images} />
                  <AlertRow danger={health.stock_mismatch > 0} title="تعارض حالة المخزون" value={health.stock_mismatch} />
                  <AlertRow danger={approvals.length > 0} title="موافقات معلقة" value={approvals.length} />
                </div>
              </section>

              <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
                <SectionHeader icon={Heart} title="مفضلاتك" helper="روابطك المحفوظة" />
                <div className="flex flex-wrap gap-[6px] p-[10px]">
                  {favoriteRoutes.length === 0 ? <p className="text-[7.5px] text-[#969EA8]">أضف الصفحات من تبويب «اختصاراتي».</p> : favoriteRoutes.map((route) => {
                    const option = FAVORITE_ROUTES.find((item) => item.route === route);
                    return option ? <Button key={route} asChild variant="outline" size="sm" className="h-[29px] rounded-[8px] border-[#E2E5EA] px-[8px] text-[7px] shadow-none"><Link to={route}><Star className="ml-1 h-3 w-3 fill-current text-[#C79B43]" />{option.label}</Link></Button> : null;
                  })}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {activeTab === "search" && (
        <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
          <SectionHeader icon={Search} title="البحث الشامل" helper="منتجات، طلبات، عملاء وماركات في بحث واحد" />
          <div className="p-[12px]">
            <div className="relative">
              <Search className="absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#9AA2AC]" />
              <Input autoFocus value={globalQuery} onChange={(event) => setGlobalQuery(event.target.value)} placeholder="اكتب اسم منتج، رقم طلب، عميل، هاتف أو ماركة..." className="h-[42px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[36px] text-[10px] shadow-none focus-visible:ring-0" />
              {searching ? <Loader2 className="absolute left-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 animate-spin text-[#675CBA]" /> : null}
            </div>

            {globalQuery.trim().length < 2 ? <div className="grid min-h-[220px] place-items-center text-center"><div><FileSearch className="mx-auto h-6 w-6 text-[#A0A7B0]" /><p className="mt-2 text-[9px] font-semibold text-[#5B636E]">اكتب حرفين على الأقل</p><p className="mt-1 text-[7px] text-[#969EA8]">ستظهر النتائج مقسمة حسب نوع البيانات.</p></div></div> : (
              <div className="mt-[12px] grid gap-[10px] lg:grid-cols-2">
                <SearchGroup title="المنتجات" icon={Package} count={searchResults.products.length}>{searchResults.products.map((item) => <SearchResultRow key={item.id} title={item.name_ar || item.name} helper={`${item.name || ""}${item.price != null ? ` • ${Number(item.price).toLocaleString("en-US")}` : ""}`} href={`/admin/products/${item.id}`} />)}</SearchGroup>
                <SearchGroup title="الطلبات" icon={ShoppingBag} count={searchResults.orders.length}>{searchResults.orders.map((item) => <SearchResultRow key={item.id} title={`#${item.order_number} — ${item.customer_name}`} helper={`${item.customer_phone} • ${statusLabel(item.status)}`} href="/admin/orders" />)}</SearchGroup>
                <SearchGroup title="العملاء" icon={Users} count={searchResults.customers.length}>{searchResults.customers.map((item) => <SearchResultRow key={item.id} title={item.name} helper={`${item.phone}${item.region ? ` • ${item.region}` : ""}`} href={`/admin/customers/${item.id}`} />)}</SearchGroup>
                <SearchGroup title="الماركات" icon={Sparkles} count={searchResults.brands.length}>{searchResults.brands.map((item) => <SearchResultRow key={item.id} title={item.name} helper={item.slug || "ماركة"} href="/admin/brands" />)}</SearchGroup>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "whatsapp" && (
        <section className="grid gap-[10px] xl:grid-cols-12">
          <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-5">
            <SectionHeader icon={UserRound} title="اختر العميل أو الطلب" helper="آخر العملاء والطلبات مع بحث سريع" />
            <div className="p-[10px]">
              <div className="relative"><Search className="absolute right-[10px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#9AA2AC]" /><Input value={waQuery} onChange={(event) => setWaQuery(event.target.value)} placeholder="الاسم، الهاتف أو رقم الطلب" className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[31px] text-[8.5px] shadow-none focus-visible:ring-0" /></div>
              {waTargetsLoading ? <LoadingBlock /> : <div className="mt-[8px] max-h-[520px] space-y-[5px] overflow-y-auto">{visibleWaTargets.map((target) => <button key={target.key} type="button" onClick={() => setSelectedTargetKey(target.key)} className={cn("flex w-full items-center justify-between gap-3 rounded-[10px] border px-[9px] py-[8px] text-right", selectedTargetKey === target.key ? "border-[#CFC8F2] bg-[#F5F2FF]" : "border-[#E8EBEF] bg-[#FBFCFD] hover:bg-[#F7F9FB]")}><div className="min-w-0"><p className="truncate text-[8.5px] font-semibold text-[#4B535E]">{target.name}</p><p className="mt-[2px] truncate text-[7px] text-[#9199A4]">{target.phone}{target.orderNumber ? ` • #${target.orderNumber}` : ""}</p></div><span className="shrink-0 rounded-full bg-white px-[6px] py-[3px] text-[6px] text-[#808894]">{target.type === "order" ? "طلب" : "عميل"}</span></button>)}</div>}
            </div>
          </div>

          <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-7">
            <SectionHeader icon={MessageCircle} title="قالب الرسالة" helper="تعبئة تلقائية لاسم العميل ورقم الطلب" />
            <div className="space-y-[10px] p-[12px]">
              <div className="grid gap-[7px] sm:grid-cols-2">{templates.map((template) => <button key={template.id} type="button" onClick={() => setSelectedTemplateId(template.id)} className={cn("rounded-[10px] border p-[10px] text-right", selectedTemplateId === template.id ? "border-[#CFC8F2] bg-[#F5F2FF]" : "border-[#E6E9EE] bg-[#FBFCFD]")}><p className="text-[8.5px] font-semibold text-[#4B535E]">{template.name}</p><p className="mt-[3px] line-clamp-2 text-[6.5px] leading-4 text-[#959DA7]">{template.body}</p></button>)}</div>

              <div className="rounded-[11px] border border-[#E5E9EF] bg-[#F8FAFC] p-[10px]">
                <p className="text-[7px] font-semibold text-[#858E99]">معاينة الرسالة</p>
                <Textarea readOnly value={renderedMessage} placeholder="اختر قالبًا وسيظهر النص هنا." className="mt-[7px] min-h-[120px] resize-none rounded-[9px] border-[#E2E6EB] bg-white text-[9px] leading-6 shadow-none focus-visible:ring-0" />
              </div>

              <div className="flex flex-wrap justify-end gap-[7px]"><Button variant="outline" onClick={() => void copyWhatsApp()} disabled={!renderedMessage} className="h-[34px] rounded-[9px] border-[#E2E5EA] px-[10px] text-[8px] shadow-none">نسخ الرسالة</Button><Button onClick={openWhatsApp} disabled={!selectedTarget || !renderedMessage} className="h-[34px] rounded-[9px] bg-[#57906A] px-[11px] text-[8px] text-white hover:bg-[#4D825E]"><MessageCircle className="ml-[5px] h-[12px] w-[12px]" />فتح واتساب</Button></div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "shortcuts" && (
        <div className="grid gap-[10px] xl:grid-cols-2">
          <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
            <SectionHeader icon={Heart} title="الصفحات المفضلة" helper="حتى 8 صفحات تظهر في مركزك" />
            <div className="divide-y divide-[#EDF0F3]">{FAVORITE_ROUTES.map((item) => <button key={item.route} type="button" onClick={() => toggleFavorite(item.route)} disabled={preferencesSaving} className="flex w-full items-center justify-between gap-3 px-[12px] py-[10px] text-right hover:bg-[#FCFDFE]"><div><p className="text-[8.5px] font-semibold text-[#4D555F]">{item.label}</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">{item.helper}</p></div><Star className={cn("h-[14px] w-[14px]", favoriteRoutes.includes(item.route) ? "fill-[#D2A34A] text-[#D2A34A]" : "text-[#B2B8C0]")} /></button>)}</div>
          </section>

          <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
            <SectionHeader icon={Zap} title="الإجراءات السريعة" helper="حتى 6 إجراءات تظهر أعلى مركز الأدمن" />
            <div className="divide-y divide-[#EDF0F3]">{QUICK_ACTIONS.map(({ id, label, route, icon: Icon }) => <button key={id} type="button" onClick={() => toggleQuickAction(id)} disabled={preferencesSaving} className="flex w-full items-center justify-between gap-3 px-[12px] py-[10px] text-right hover:bg-[#FCFDFE]"><div className="flex items-center gap-[8px]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[8px] bg-[#F3F1FF] text-[#675CBA]"><Icon className="h-[12px] w-[12px]" /></span><div><p className="text-[8.5px] font-semibold text-[#4D555F]">{label}</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">{route}</p></div></div><span className={cn("h-[16px] w-[29px] rounded-full p-[2px] transition-colors", quickActionIds.includes(id) ? "bg-[#675CBA]" : "bg-[#DDE1E6]")}><span className={cn("block h-[12px] w-[12px] rounded-full bg-white transition-transform", quickActionIds.includes(id) && "translate-x-[-13px]")} /></span></button>)}</div>
          </section>
        </div>
      )}

      {activeTab === "approvals" && (
        <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
          <SectionHeader icon={ShieldCheck} title="طلبات الموافقة" helper="مراجعة التغييرات عالية التأثير قبل اعتمادها" />
          {!canReviewApprovals ? <div className="grid min-h-[220px] place-items-center px-4 text-center"><div><ShieldCheck className="mx-auto h-6 w-6 text-[#A0A7B0]" /><p className="mt-2 text-[9px] font-semibold text-[#5B636E]">ليس لديك صلاحية مراجعة الموافقات</p></div></div> : approvals.length === 0 ? <EmptyBlock title="لا توجد موافقات معلقة" /> : (
            <div className="divide-y divide-[#EDF0F3]">{approvals.map((request) => <div key={request.id} className="p-[12px]"><div className="flex flex-col gap-[8px] lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-[6px]"><strong className="text-[9px] text-[#4A525C]">{request.request_type}</strong><span className="rounded-full bg-[#FFF6E7] px-[6px] py-[3px] text-[6px] font-semibold text-[#A9782F]">معلق</span></div><p className="mt-[4px] text-[7px] text-[#969EA8]">{request.entity_type || "عام"}{request.entity_id ? ` • ${request.entity_id}` : ""} • {new Date(request.requested_at).toLocaleString("ar-EG")}</p><p className="mt-[6px] max-w-[720px] truncate rounded-[8px] bg-[#F8FAFC] px-[8px] py-[6px] text-[6.5px] text-[#828A95]">{JSON.stringify(request.payload || {})}</p></div><div className="flex w-full gap-[6px] lg:w-auto"><Input value={approvalNotes[request.id] || ""} onChange={(event) => setApprovalNotes((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="ملاحظة المراجعة" className="h-[32px] min-w-0 flex-1 rounded-[8px] border-[#E2E5EA] text-[7.5px] shadow-none focus-visible:ring-0 lg:w-[190px]" /><Button variant="outline" size="sm" disabled={approvalBusyId === request.id} onClick={() => void handleApproval(request, "rejected")} className="h-[32px] rounded-[8px] border-[#F0DADA] bg-[#FFF8F8] px-[8px] text-[7px] text-[#B86161] shadow-none"><XCircle className="ml-1 h-3 w-3" />رفض</Button><Button size="sm" disabled={approvalBusyId === request.id} onClick={() => void handleApproval(request, "approved")} className="h-[32px] rounded-[8px] bg-[#57906A] px-[8px] text-[7px] text-white hover:bg-[#4D825E]">{approvalBusyId === request.id ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <CheckCircle2 className="ml-1 h-3 w-3" />}موافقة</Button></div></div></div>)}</div>
          )}
        </section>
      )}

      {activeTab === "preparation" && (
        <section className="grid gap-[10px] xl:grid-cols-12">
          <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:col-span-7">
            <SectionHeader icon={Boxes} title="قائمة التجهيز اليومية" helper="الطلبات النشطة مرتبة من الأقدم" />
            {loadingOverview ? <LoadingBlock /> : activeOrders.length === 0 ? <EmptyBlock title="لا توجد طلبات للتجهيز" /> : <div className="divide-y divide-[#EDF0F3]">{activeOrders.slice(0, 12).map((order) => <div key={order.id} className="flex items-center justify-between gap-3 px-[12px] py-[9px]"><div><p dir="ltr" className="text-right text-[8.5px] font-semibold text-[#4B535E]">#{order.order_number}</p><p className="mt-[3px] text-[7px] text-[#969EA8]">{order.customer_name} • {orderItemsCount(order)} قطعة • {waitLabel(order.created_at)}</p></div><ActionBadge tone={nextOrderAction(order).tone}>{statusLabel(order.status)}</ActionBadge></div>)}</div>}
          </div>
          <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] xl:col-span-5">
            <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><Boxes className="h-[16px] w-[16px]" /></div>
            <h3 className="mt-[12px] text-[12px] font-semibold text-[#414953]">ورقة Picking / Packing</h3>
            <p className="mt-[6px] text-[8px] leading-6 text-[#8E96A1]">افتح القائمة الكاملة لتصفية الطلبات حسب الدولة والحالة، ثم اطبع ورقة تجهيز تحتوي القطع والمقاسات والألوان وخانات الالتقاط والمراجعة والتعبئة.</p>
            <div className="mt-[12px] grid grid-cols-2 gap-[7px]"><MiniStat label="الطلبات النشطة" value={activeOrders.length} /><MiniStat label="إجمالي القطع" value={activePieces} /></div>
            <Button asChild className="mt-[12px] h-[36px] w-full rounded-[9px] bg-[#675CBA] text-[8px] text-white hover:bg-[#5D52AE]"><Link to="/admin/order-preparation"><Boxes className="ml-[5px] h-[12px] w-[12px]" />فتح قائمة التجهيز والطباعة</Link></Button>
          </div>
        </section>
      )}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, helper }: { icon: LucideIcon; title: string; helper: string }) => (
  <div className="flex items-center gap-[8px] border-b border-[#EDF0F3] px-[12px] py-[10px]"><span className="flex h-[29px] w-[29px] items-center justify-center rounded-[8px] bg-[#F3F1FF] text-[#675CBA]"><Icon className="h-[12px] w-[12px]" /></span><div><p className="text-[9px] font-semibold text-[#4A525C]">{title}</p><p className="mt-[2px] text-[6.5px] text-[#969EA8]">{helper}</p></div></div>
);

const TaskCard = ({ label, value, helper, route, tone, onOpenApprovals }: { label: string; value: number; helper: string; route: string | null; tone: "rose" | "blue" | "amber" | "violet"; onOpenApprovals: () => void }) => {
  const classes = { rose: "bg-[#FFF0F1] text-[#B96670]", blue: "bg-[#EEF5FF] text-[#557CA9]", amber: "bg-[#FFF6E7] text-[#B57A23]", violet: "bg-[#F2F0FF] text-[#675CBA]" }[tone];
  const content = <><div className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[9px]", classes)}><AlertTriangle className="h-[13px] w-[13px]" /></div><div className="mt-[9px]"><p className="text-[7.5px] font-semibold text-[#7A828D]">{label}</p><p className="mt-[4px] text-[20px] font-bold leading-none text-[#343B44]">{value.toLocaleString("ar-EG")}</p><p className="mt-[6px] text-[6.5px] text-[#A0A7B0]">{helper}</p></div></>;
  if (route) return <Link to={route} className="rounded-[15px] border border-[#E5E9EF] bg-white p-[12px] transition hover:border-[#D8DCE4] hover:shadow-sm">{content}</Link>;
  return <button type="button" onClick={onOpenApprovals} className="rounded-[15px] border border-[#E5E9EF] bg-white p-[12px] text-right transition hover:border-[#D8DCE4] hover:shadow-sm">{content}</button>;
};

const ActionBadge = ({ tone, children }: { tone: "rose" | "amber" | "blue" | "violet" | "gray"; children: React.ReactNode }) => {
  const classes = { rose: "bg-[#FFF0F1] text-[#B96670]", amber: "bg-[#FFF6E7] text-[#A9782F]", blue: "bg-[#EEF5FF] text-[#557CA9]", violet: "bg-[#F2F0FF] text-[#675CBA]", gray: "bg-[#F3F4F6] text-[#747C86]" }[tone];
  return <span className={cn("rounded-full px-[7px] py-[4px] text-[6.5px] font-semibold", classes)}>{children}</span>;
};

const AlertRow = ({ danger, title, value }: { danger: boolean; title: string; value: number }) => <div className="flex items-center justify-between rounded-[10px] border border-[#E8EBEF] bg-[#FBFCFD] px-[9px] py-[8px]"><div className="flex items-center gap-[7px]"><span className={cn("h-[7px] w-[7px] rounded-full", danger ? "bg-[#D06A5E]" : "bg-[#7BA183]")} /><span className="text-[7.5px] font-medium text-[#626A75]">{title}</span></div><strong className={cn("text-[9px]", danger ? "text-[#B76161]" : "text-[#568468]")}>{value.toLocaleString("ar-EG")}</strong></div>;

const LoadingBlock = () => <div className="grid min-h-[160px] place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#675CBA]" /></div>;
const EmptyBlock = ({ title }: { title: string }) => <div className="grid min-h-[160px] place-items-center px-4 text-center"><div><CheckCircle2 className="mx-auto h-5 w-5 text-[#7BA183]" /><p className="mt-2 text-[8.5px] font-semibold text-[#59616B]">{title}</p></div></div>;

const SearchGroup = ({ title, icon: Icon, count, children }: { title: string; icon: LucideIcon; count: number; children: React.ReactNode }) => <section className="overflow-hidden rounded-[12px] border border-[#E6E9EE] bg-[#FBFCFD]"><div className="flex items-center justify-between border-b border-[#E9ECF0] px-[10px] py-[8px]"><div className="flex items-center gap-[6px]"><Icon className="h-[12px] w-[12px] text-[#675CBA]" /><span className="text-[8px] font-semibold text-[#555D68]">{title}</span></div><span className="text-[7px] text-[#969EA8]">{count}</span></div><div className="divide-y divide-[#E9ECF0]">{count === 0 ? <div className="px-[10px] py-[18px] text-center text-[7px] text-[#9AA2AC]">لا توجد نتائج</div> : children}</div></section>;

const SearchResultRow = ({ title, helper, href }: { title: string; helper: string; href: string }) => <Link to={href} className="block px-[10px] py-[8px] transition hover:bg-white"><p className="truncate text-[8.5px] font-semibold text-[#4D555F]">{title}</p><p className="mt-[2px] truncate text-[6.5px] text-[#969EA8]">{helper}</p></Link>;

const MiniStat = ({ label, value }: { label: string; value: number }) => <div className="rounded-[10px] bg-[#F8FAFC] p-[10px]"><p className="text-[6.5px] text-[#969EA8]">{label}</p><p className="mt-[4px] text-[15px] font-bold text-[#404852]">{value.toLocaleString("ar-EG")}</p></div>;

export default AdminCommandCenterPage;
