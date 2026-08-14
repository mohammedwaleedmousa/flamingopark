import {
  Activity,
  BarChart3,
  BadgePercent,
  Bell,
  BookOpen,
  Boxes,
  Brain,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  Coins,
  Command,
  CreditCard,
  FileText,
  Globe2,
  Grid3X3,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPinCheck,
  Megaphone,
  Package,
  Palette,
  PanelsTopLeft,
  PieChart,
  Plus,
  Receipt,
  RotateCcw,
  ScrollText,
  Send,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  TicketPercent,
  Truck,
  Users,
  WalletCards,
  Workflow,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type CSSProperties, type ElementType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Tone = "indigo" | "coral" | "blue" | "teal" | "rose" | "amber" | "green" | "violet" | "cyan" | "slate";

type NavItem = {
  title: string;
  url: string;
  icon: ElementType;
  tone: Tone;
  exact?: boolean;
  counter?: "orders";
};

type NavSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: ElementType;
  tone: Tone;
  items: NavItem[];
};

const ACCORDION_TRANSITION = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const toneStyles: Record<Tone, { icon: string; activeIcon: string; active: string; line: string; badge: string; dot: string }> = {
  indigo: {
    icon: "bg-[#F1F0FF] text-[#7167C5]",
    activeIcon: "bg-[#E5E1FF] text-[#6257B7]",
    active: "border-[#E4E0F8] bg-[#F6F4FF] text-[#45406A]",
    line: "bg-[#7063C2]",
    badge: "bg-[#E7E3FF] text-[#6055B2]",
    dot: "bg-[#7063C2]",
  },
  coral: {
    icon: "bg-[#FFF0ED] text-[#D16F63]",
    activeIcon: "bg-[#FFE1DB] text-[#C15A50]",
    active: "border-[#F1D9D4] bg-[#FFF4F1] text-[#75483F]",
    line: "bg-[#D06A5E]",
    badge: "bg-[#FFE2DC] text-[#B6554B]",
    dot: "bg-[#D06A5E]",
  },
  blue: {
    icon: "bg-[#EDF4FF] text-[#5880CD]",
    activeIcon: "bg-[#DCE9FF] text-[#4B70BF]",
    active: "border-[#DBE5F4] bg-[#F1F6FF] text-[#40577E]",
    line: "bg-[#567DCC]",
    badge: "bg-[#DFEAFF] text-[#4A6EB8]",
    dot: "bg-[#567DCC]",
  },
  teal: {
    icon: "bg-[#EAF8F4] text-[#4E9988]",
    activeIcon: "bg-[#D6EFE8] text-[#408878]",
    active: "border-[#D6EAE5] bg-[#EFF9F6] text-[#3D695F]",
    line: "bg-[#4C9687]",
    badge: "bg-[#DCF1EB] text-[#3C7F71]",
    dot: "bg-[#4C9687]",
  },
  rose: {
    icon: "bg-[#FFF0F4] text-[#C66E82]",
    activeIcon: "bg-[#FBDDE6] text-[#B85D72]",
    active: "border-[#EFD7DF] bg-[#FFF3F6] text-[#754A56]",
    line: "bg-[#C66A7F]",
    badge: "bg-[#FBE1E8] text-[#B15B70]",
    dot: "bg-[#C66A7F]",
  },
  amber: {
    icon: "bg-[#FFF5E6] text-[#C1873A]",
    activeIcon: "bg-[#FCE9C6] text-[#B5782E]",
    active: "border-[#EFE0C4] bg-[#FFF8EB] text-[#715B3C]",
    line: "bg-[#C38838]",
    badge: "bg-[#FDEAC9] text-[#AA722C]",
    dot: "bg-[#C38838]",
  },
  green: {
    icon: "bg-[#ECF7EC] text-[#65946A]",
    activeIcon: "bg-[#DAEDDB] text-[#548259]",
    active: "border-[#D6E6D6] bg-[#F1F8F1] text-[#49644B]",
    line: "bg-[#629067]",
    badge: "bg-[#DBEDDC] text-[#507A55]",
    dot: "bg-[#629067]",
  },
  violet: {
    icon: "bg-[#F4ECFF] text-[#9165C5]",
    activeIcon: "bg-[#E7D8FA] text-[#8052B3]",
    active: "border-[#E4D8F2] bg-[#F7F1FF] text-[#604A77]",
    line: "bg-[#8F63C1]",
    badge: "bg-[#E9DBF9] text-[#7952AA]",
    dot: "bg-[#8F63C1]",
  },
  cyan: {
    icon: "bg-[#EAF7FB] text-[#4B92A8]",
    activeIcon: "bg-[#D7EDF5] text-[#3D8197]",
    active: "border-[#D5E7ED] bg-[#EFF9FC] text-[#436875]",
    line: "bg-[#4A90A6]",
    badge: "bg-[#DCEFF5] text-[#3C7A8E]",
    dot: "bg-[#4A90A6]",
  },
  slate: {
    icon: "bg-[#F0F2F4] text-[#727B84]",
    activeIcon: "bg-[#E4E8EB] text-[#606972]",
    active: "border-[#DFE3E6] bg-[#F3F5F6] text-[#505961]",
    line: "bg-[#727B83]",
    badge: "bg-[#E5E9EC] text-[#606970]",
    dot: "bg-[#727B83]",
  },
};

const primaryItems: NavItem[] = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, tone: "indigo", exact: true },
  { title: "الطلبات", url: "/admin/orders", icon: ShoppingBag, tone: "coral", counter: "orders" },
  { title: "المنتجات", url: "/admin/products", icon: Package, tone: "blue" },
  { title: "العملاء", url: "/admin/customers", icon: Users, tone: "teal" },
];

const sections: NavSection[] = [
  {
    id: "catalog",
    title: "الكتالوج والمخزون",
    subtitle: "المنتجات والتصنيفات",
    icon: Boxes,
    tone: "blue",
    items: [
      { title: "الفئات", url: "/admin/categories", icon: Grid3X3, tone: "blue" },
      { title: "الماركات", url: "/admin/brands", icon: Tag, tone: "blue" },
      { title: "ربط الماركات بالفئات", url: "/admin/brand-category-map", icon: Workflow, tone: "blue" },
      { title: "تعديلات المخزون", url: "/admin/inventory-adjustments", icon: Package, tone: "blue" },
    ],
  },
  {
    id: "storefront",
    title: "واجهة المتجر",
    subtitle: "المحتوى وتجربة العميل",
    icon: Palette,
    tone: "rose",
    items: [
      { title: "البانرات", url: "/admin/banners", icon: Image, tone: "rose" },
      { title: "أقسام الصفحة الرئيسية", url: "/admin/sections", icon: LayoutGrid, tone: "rose" },
      { title: "المحتوى", url: "/admin/content", icon: FileText, tone: "rose" },
      { title: "صفحات الماركات", url: "/admin/brand-pages", icon: Store, tone: "rose" },
      { title: "أقسام الماركات", url: "/admin/brand-sections", icon: LayoutGrid, tone: "rose" },
      { title: "فلاتر الماركات", url: "/admin/brand-filters", icon: SlidersHorizontal, tone: "rose" },
      { title: "تجربة العميل", url: "/admin/customer-experience", icon: Users, tone: "rose" },
      { title: "خريطة الواجهة", url: "/admin/storefront-map", icon: PanelsTopLeft, tone: "rose" },
    ],
  },
  {
    id: "operations",
    title: "العمليات والتوصيل",
    subtitle: "الشحن وخدمة الطلب",
    icon: Truck,
    tone: "amber",
    items: [
      { title: "إدارة التوصيل", url: "/admin/delivery", icon: Truck, tone: "amber" },
      { title: "مناطق الدفع عند الاستلام", url: "/admin/cod-regions", icon: MapPinCheck, tone: "amber" },
      { title: "التقييمات", url: "/admin/reviews", icon: Star, tone: "amber" },
    ],
  },
  {
    id: "finance",
    title: "المالية",
    subtitle: "الفواتير والحسابات",
    icon: WalletCards,
    tone: "green",
    items: [
      { title: "الفواتير", url: "/admin/invoices", icon: Receipt, tone: "green" },
      { title: "طرق الدفع", url: "/admin/payment-methods", icon: CreditCard, tone: "green" },
      { title: "المصروفات", url: "/admin/expenses", icon: CircleDollarSign, tone: "green" },
      { title: "دفتر اليومية", url: "/admin/ledger", icon: BookOpen, tone: "green" },
      { title: "المرتجعات", url: "/admin/refunds", icon: RotateCcw, tone: "green" },
      { title: "العملات", url: "/admin/currencies", icon: Coins, tone: "green" },
      { title: "الدول", url: "/admin/countries", icon: Globe2, tone: "green" },
    ],
  },
  {
    id: "marketing",
    title: "التسويق",
    subtitle: "الحملات والعروض",
    icon: Megaphone,
    tone: "violet",
    items: [
      { title: "الحملات", url: "/admin/campaigns", icon: Megaphone, tone: "violet" },
      { title: "العروض", url: "/admin/offers", icon: BadgePercent, tone: "violet" },
      { title: "القسائم", url: "/admin/coupons", icon: TicketPercent, tone: "violet" },
      { title: "إشعارات العملاء", url: "/admin/customer-notifications", icon: Bell, tone: "violet" },
      { title: "سجل إرسال الإشعارات", url: "/admin/notification-deliveries", icon: Send, tone: "violet" },
    ],
  },
  {
    id: "analytics",
    title: "التقارير والتحليلات",
    subtitle: "الأداء والبيانات",
    icon: BarChart3,
    tone: "cyan",
    items: [
      { title: "نظرة عامة", url: "/admin/reports", icon: BarChart3, tone: "cyan", exact: true },
      { title: "الأرباح والمالية", url: "/admin/reports/finance", icon: PieChart, tone: "cyan" },
      { title: "تحليل العملاء", url: "/admin/reports/customers", icon: Brain, tone: "cyan" },
    ],
  },
];

const systemItems: NavItem[] = [
  { title: "الإعدادات", url: "/admin/settings", icon: Settings, tone: "slate" },
  { title: "سجل النشاط", url: "/admin/audit-log", icon: ScrollText, tone: "slate" },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { state, setOpenMobile } = useSidebar();
  const { logout } = useAuthActions();

  const collapsed = state === "collapsed";

  const [userEmail, setUserEmail] = useState("");

  const { data: ordersCount = 0 } = useQuery({
    queryKey: ["admin-sidebar-orders-count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true });

      if (error) throw error;

      return count ?? 0;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.url;

    return location.pathname === item.url || location.pathname.startsWith(`${item.url}/`);
  };

  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => isActive(item));
  };

  const getCurrentSection = () => {
    return sections.find((section) => isSectionActive(section))?.id ?? null;
  };

  const [openSection, setOpenSection] = useState<string | null>(() => getCurrentSection());

  useEffect(() => {
    const current = getCurrentSection();

    if (current) {
      setOpenSection(current);
    }
  }, [location.pathname]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || "");
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const channel = supabase.channel("admin-sidebar-orders-count").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-orders-count"] });
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const closeMobile = () => {
    setOpenMobile(false);
  };

  const handleSectionClick = (section: NavSection) => {
    if (collapsed) {
      navigate(section.items[0].url);
      closeMobile();
      return;
    }

    setOpenSection((current) => current === section.id ? null : section.id);
  };

  const handleLogout = async () => {
    if (!window.confirm("هل تريد تسجيل الخروج من لوحة التحكم؟")) return;

    await logout({
      redirectTo: "/admin/login",
      successTitle: "تم تسجيل الخروج بنجاح",
      onSuccess: () => setUserEmail(""),
    });
  };

  return (
    <Sidebar side="right" collapsible="icon" style={{ "--sidebar-width": "288px", "--sidebar-width-icon": "70px" } as CSSProperties} className="h-[100dvh] border-l border-[#E8EBF0] bg-[#FBFCFD] font-admin text-[#252A32] shadow-none">
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#FBFCFD]">
        {/* COLOR BAR */}

        <div className="absolute inset-x-0 top-0 z-20 flex h-[3px] overflow-hidden">
          <span className="flex-1 bg-[#7163C1]" />
          <span className="flex-1 bg-[#5680CF]" />
          <span className="flex-1 bg-[#4C9687]" />
          <span className="flex-1 bg-[#C66A7F]" />
          <span className="flex-1 bg-[#C38838]" />
          <span className="flex-1 bg-[#8F63C1]" />
        </div>

        {/* HEADER */}

        <div className="shrink-0 px-[10px] pb-[7px] pt-[12px]">
          <button type="button" onClick={() => navigate("/admin")} className={cn("flex w-full items-center rounded-[16px] border border-[#E7EAF0] bg-white transition-colors duration-150 hover:border-[#DDE1E8] hover:bg-[#FDFDFE]", collapsed ? "h-[52px] justify-center" : "h-[62px] gap-[10px] px-[9px]")}>
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-[13px] border border-[#EEEAF2] bg-white">
              <img src="/icons/flamingo.jpeg" alt="Flamingo Park" className="h-[33px] w-[33px] object-contain" />
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center gap-[7px]">
                    <h1 className="truncate text-[13.5px] font-bold tracking-[-0.25px] text-[#20242C]">Flamingo Park</h1>
                    <span className="h-[6px] w-[6px] rounded-full bg-[#65A77C]" />
                  </div>

                  <div className="mt-[5px] flex items-center gap-[5px]">
                    <Activity className="h-[9px] w-[9px] text-[#9DA4AE]" strokeWidth={1.7} />
                    <span className="truncate text-[8px] font-medium text-[#9AA1AB]">Commerce Control Center</span>
                  </div>
                </div>

                <span className="rounded-[7px] border border-[#E5E1F3] bg-[#F7F5FF] px-[7px] py-[4px] text-[7px] font-bold tracking-[0.07em] text-[#7165AC]">ADMIN</span>
              </>
            )}
          </button>
        </div>

        {/* QUICK ACCESS */}

        {!collapsed && (
          <div className="mx-[10px] mb-[5px] flex gap-[5px]">
            <QuickAction icon={Plus} label="إضافة منتج" tone="blue" onClick={() => navigate("/admin/products/new")} />
            <QuickAction icon={ShoppingBag} label="الطلبات" tone="coral" onClick={() => navigate("/admin/orders")} />
            <QuickAction icon={BarChart3} label="التقارير" tone="cyan" onClick={() => navigate("/admin/reports")} />
          </div>
        )}

        {/* NAV */}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[8px] pb-[8px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!collapsed && <SectionLabel icon={Command}>الرئيسية</SectionLabel>}

          <div className="space-y-[2px]">
            {primaryItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} count={item.counter === "orders" ? ordersCount : undefined} onNavigate={closeMobile} />
            ))}
          </div>

          {!collapsed && <SectionLabel icon={Store}>إدارة المتجر</SectionLabel>}

          {collapsed && <Divider />}

          <div className="space-y-[2px]">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = isSectionActive(section);
              const open = openSection === section.id;
              const tone = toneStyles[section.tone];

              return (
                <div key={section.id}>
                  <button type="button" onClick={() => handleSectionClick(section)} title={collapsed ? section.title : undefined} className={cn("group relative flex w-full items-center rounded-[11px] border transition-colors duration-150", collapsed ? "h-[43px] justify-center border-transparent" : "min-h-[45px] gap-[8px] px-[7px] py-[4px]", active ? tone.active : "border-transparent text-[#626A75] hover:border-[#EDF0F3] hover:bg-white hover:text-[#313740]")}>
                    {active && <span className={cn("absolute right-0 top-1/2 h-[20px] w-[3px] -translate-y-1/2 rounded-l-full", tone.line)} />}

                    <span className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150", active ? tone.activeIcon : tone.icon)}>
                      <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} />
                    </span>

                    {!collapsed && (
                      <>
                        <div className="min-w-0 flex-1 text-right">
                          <p className={cn("truncate text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>{section.title}</p>
                          <p className="mt-[4px] truncate text-[7px] font-medium text-[#A0A6AF]">{section.subtitle}</p>
                        </div>

                        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={ACCORDION_TRANSITION} className="flex h-[20px] w-[20px] shrink-0 items-center justify-center text-[#9DA4AD]">
                          <ChevronDown className="h-[11px] w-[11px]" strokeWidth={1.8} />
                        </motion.span>
                      </>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {!collapsed && open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={ACCORDION_TRANSITION} className="overflow-hidden">
                        <div className="mr-[23px] py-[3px] pr-[10px]">
                          <div className="space-y-[1px] border-r border-[#E6E9EE] pr-[7px]">
                            {section.items.map((item) => (
                              <SubItem key={item.url} item={item} active={isActive(item)} onNavigate={closeMobile} />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {!collapsed && <SectionLabel icon={Settings}>النظام</SectionLabel>}

          {collapsed && <Divider />}

          <div className="space-y-[2px]">
            {systemItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>
        </div>

        {/* ACCOUNT */}

        <div className="shrink-0 border-t border-[#E9ECF0] bg-white/70 p-[8px]">
          {userEmail ? (
            <>
              <button type="button" onClick={() => navigate("/admin/settings")} className={cn("group flex w-full items-center rounded-[11px] transition-colors duration-150 hover:bg-white", collapsed ? "h-[43px] justify-center" : "gap-[8px] px-[6px] py-[5px]")}>
                <div className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#EEEAFB] text-[10.5px] font-bold uppercase text-[#665DA0]">
                  {userEmail.charAt(0).toUpperCase()}
                  <span className="absolute bottom-0 left-0 h-[8px] w-[8px] rounded-full border-2 border-white bg-[#65A77C]" />
                </div>

                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-[10px] font-semibold leading-none text-[#373C44]">مدير المتجر</p>
                      <p dir="ltr" className="mt-[4px] truncate text-left text-[7.5px] leading-none text-[#9BA2AB]">{userEmail}</p>
                    </div>

                    <ChevronLeft className="h-[12px] w-[12px] shrink-0 text-[#A0A7B0]" strokeWidth={1.8} />
                  </>
                )}
              </button>

              <button type="button" onClick={handleLogout} className={cn("mt-[1px] flex h-[29px] w-full items-center rounded-[8px] text-[#8A919B] transition-colors duration-150 hover:bg-[#FFF3F1] hover:text-[#C15F56]", collapsed ? "justify-center" : "gap-[7px] px-[8px]")}>
                <LogOut className="h-[11px] w-[11px]" strokeWidth={1.8} />
                {!collapsed && <span className="text-[9px] font-medium">تسجيل الخروج</span>}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => navigate("/admin/login")} className="flex h-[38px] w-full items-center justify-center rounded-[10px] bg-[#675CBA] text-[10px] font-semibold text-white transition-colors hover:bg-[#5B50AC]">تسجيل الدخول</button>
          )}
        </div>
      </div>
    </Sidebar>
  );
};

const MainItem = ({ item, active, collapsed, count, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; count?: number; onNavigate: () => void }) => {
  const Icon = item.icon;
  const tone = toneStyles[item.tone];

  const displayCount = count !== undefined ? (count > 999 ? "999+" : count.toLocaleString("en-US")) : null;

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} title={collapsed ? item.title : undefined} className={cn("group relative flex w-full items-center rounded-[11px] border transition-colors duration-150", collapsed ? "h-[43px] justify-center border-transparent" : "h-[43px] gap-[8px] px-[7px]", active ? tone.active : "border-transparent text-[#626A75] hover:border-[#EDF0F3] hover:bg-white hover:text-[#313740]")}>
      {active && <span className={cn("absolute right-0 top-1/2 h-[20px] w-[3px] -translate-y-1/2 rounded-l-full", tone.line)} />}

      <span className={cn("flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] transition-colors duration-150", active ? tone.activeIcon : tone.icon)}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
      </span>

      {!collapsed && (
        <>
          <span className={cn("min-w-0 flex-1 truncate text-right text-[11px]", active ? "font-semibold" : "font-medium")}>{item.title}</span>

          {displayCount !== null && <span className={cn("flex min-w-[26px] items-center justify-center rounded-full px-[7px] py-[3px] text-[8px] font-bold leading-none", tone.badge)}>{displayCount}</span>}
        </>
      )}

      {collapsed && count !== undefined && count > 0 && <span className={cn("absolute left-[7px] top-[7px] h-[6px] w-[6px] rounded-full ring-2 ring-[#FBFCFD]", tone.dot)} />}
    </NavLink>
  );
};

const SubItem = ({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) => {
  const Icon = item.icon;
  const tone = toneStyles[item.tone];

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} className={cn("group flex h-[29px] w-full items-center gap-[6px] rounded-[7px] px-[6px] transition-colors duration-150", active ? `${tone.active} font-semibold` : "font-medium text-[#858D97] hover:bg-white hover:text-[#4C5560]")}>
      <span className={cn("flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[6px]", active ? tone.activeIcon : "text-[#A1A7B0]")}>
        <Icon className="h-[10.5px] w-[10.5px]" strokeWidth={1.8} />
      </span>

      <span className="min-w-0 flex-1 truncate text-[9.5px]">{item.title}</span>

      {active && <span className={cn("h-[4px] w-[4px] shrink-0 rounded-full", tone.dot)} />}
    </NavLink>
  );
};

const QuickAction = ({ icon: Icon, label, tone, onClick }: { icon: ElementType; label: string; tone: Tone; onClick: () => void }) => {
  const style = toneStyles[tone];

  return (
    <button type="button" onClick={onClick} className="group flex h-[40px] min-w-0 flex-1 items-center justify-center gap-[5px] rounded-[10px] border border-[#E8EBEF] bg-white px-[6px] transition-colors duration-150 hover:border-[#DBE0E6] hover:bg-[#FDFDFE]">
      <span className={cn("flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]", style.icon)}>
        <Icon className="h-[10.5px] w-[10.5px]" strokeWidth={1.8} />
      </span>

      <span className="truncate text-[7.5px] font-semibold text-[#717984]">{label}</span>
    </button>
  );
};

const SectionLabel = ({ children, icon: Icon }: { children: React.ReactNode; icon: ElementType }) => {
  return (
    <div className="mb-[5px] mt-[11px] flex items-center gap-[6px] px-[8px]">
      <Icon className="h-[9px] w-[9px] text-[#A5ABB4]" strokeWidth={1.7} />
      <span className="shrink-0 text-[7px] font-bold tracking-[0.04em] text-[#A1A8B1]">{children}</span>
      <span className="h-px flex-1 bg-[#ECEFF2]" />
    </div>
  );
};

const Divider = () => {
  return <div className="mx-[10px] my-[7px] h-px bg-[#ECEFF2]" />;
};

export default AdminSidebar;