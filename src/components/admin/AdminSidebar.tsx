import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  FileText,
  Store,
  WalletCards,
  BarChart3,
  Percent,
  Settings,
  CircleHelp,
  LogOut,
  ChevronDown,
  Receipt,
  RotateCcw,
  CreditCard,
  BookOpen,
  PieChart,
  Brain,
  Tag,
  Grid3X3,
  Image,
  LayoutGrid,
  Bell,
  Megaphone,
} from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type CSSProperties, type ElementType } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthActions } from "@/hooks/useAuthActions";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: ElementType;
  badge?: number;
  exact?: boolean;
};

type NavSection = {
  id: string;
  title: string;
  icon: ElementType;
  items: NavItem[];
};

const primaryItems: NavItem[] = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "الطلبات", url: "/admin/orders", icon: ShoppingBag, badge: 46 },
  { title: "المنتجات", url: "/admin/products", icon: Package },
  { title: "العملاء", url: "/admin/customers", icon: Users },
  { title: "المحتوى", url: "/admin/content", icon: FileText },
];

const sections: NavSection[] = [
  {
    id: "store",
    title: "المتجر الإلكتروني",
    icon: Store,
    items: [
      { title: "الفئات", url: "/admin/categories", icon: Grid3X3 },
      { title: "الماركات", url: "/admin/brands", icon: Tag },
      { title: "البانرات", url: "/admin/banners", icon: Image },
      { title: "أقسام الصفحة الرئيسية", url: "/admin/sections", icon: LayoutGrid },
      { title: "إدارة الواجهة", url: "/admin/customer-experience", icon: Store },
    ],
  },
  {
    id: "finance",
    title: "المالية",
    icon: WalletCards,
    items: [
      { title: "الفواتير", url: "/admin/invoices", icon: Receipt },
      { title: "طرق الدفع", url: "/admin/payment-methods", icon: CreditCard },
      { title: "دفتر اليومية", url: "/admin/ledger", icon: BookOpen },
      { title: "المرتجعات", url: "/admin/refunds", icon: RotateCcw },
    ],
  },
  {
    id: "analytics",
    title: "التقارير والتحليلات",
    icon: BarChart3,
    items: [
      { title: "نظرة عامة", url: "/admin/reports", icon: BarChart3, exact: true },
      { title: "الأرباح والمالية", url: "/admin/reports/finance", icon: PieChart },
      { title: "تحليل العملاء", url: "/admin/reports/customers", icon: Brain },
    ],
  },
  {
    id: "marketing",
    title: "التسويق",
    icon: Megaphone,
    items: [
      { title: "الحملات", url: "/admin/campaigns", icon: Megaphone },
      { title: "الخصومات والقسائم", url: "/admin/discounts", icon: Percent },
      { title: "إشعارات العملاء", url: "/admin/customer-notifications", icon: Bell },
    ],
  },
];

const systemItems: NavItem[] = [
  { title: "الإعدادات", url: "/admin/settings", icon: Settings },
  { title: "المساعدة والدعم", url: "/admin/support", icon: CircleHelp },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, setOpenMobile } = useSidebar();
  const { logout } = useAuthActions();

  const collapsed = state === "collapsed";

  const [userEmail, setUserEmail] = useState("");

  const isActive = (item: NavItem) => {
    if (item.exact) return location.pathname === item.url;
    return location.pathname === item.url || location.pathname.startsWith(`${item.url}/`);
  };

  const isSectionActive = (section: NavSection) => section.items.some((item) => isActive(item));

  const getCurrentSection = () => sections.find((section) => isSectionActive(section))?.id ?? null;

  const [openSection, setOpenSection] = useState<string | null>(() => getCurrentSection());

  useEffect(() => {
    const section = getCurrentSection();

    if (section) {
      setOpenSection(section);
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

  const closeMobile = () => {
    setOpenMobile(false);
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
    <Sidebar side="right" collapsible="icon" style={{ "--sidebar-width": "268px", "--sidebar-width-icon": "68px" } as CSSProperties} className="h-[100dvh] border-l border-[#E3E7DF] bg-[#FAFBF8] font-admin text-[#20231F] shadow-none">
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#FAFBF8]">
        {/* HEADER */}

        <div className="flex h-[72px] shrink-0 items-center px-[11px]">
          <button type="button" onClick={() => navigate("/admin")} className={cn("flex w-full items-center rounded-[13px] transition-colors hover:bg-[#F1F4EE]", collapsed ? "h-[46px] justify-center" : "h-[52px] gap-[10px] px-[7px]")}>
            <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] border border-[#DEE4DA] bg-white">
              <img src="/icons/flamingo.jpeg" alt="Flamingo Park" className="h-[30px] w-[30px] object-contain" />
            </div>

            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex items-center gap-[7px]">
                    <h1 className="truncate text-[13.5px] font-bold leading-none tracking-[-0.2px] text-[#252923]">Flamingo</h1>
                    <span className="h-[5px] w-[5px] rounded-full bg-[#647057]" />
                  </div>

                  <p className="mt-[5px] text-[8px] font-medium leading-none tracking-[0.02em] text-[#92998D]">لوحة إدارة المتجر</p>
                </div>

                <span className="rounded-[6px] border border-[#DDE3D9] bg-[#F2F5EF] px-[6px] py-[3px] text-[7px] font-semibold text-[#687260]">ADMIN</span>
              </>
            )}
          </button>
        </div>

        {/* NAV */}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[8px] pb-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!collapsed && <SectionLabel>الرئيسية</SectionLabel>}

          <div className="space-y-[2px]">
            {primaryItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>

          {!collapsed && <SectionLabel>الإدارة</SectionLabel>}

          {collapsed && <Divider />}

          <div className="space-y-[3px]">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = isSectionActive(section);
              const open = openSection === section.id;

              return (
                <div key={section.id}>
                  <button type="button" title={collapsed ? section.title : undefined} onClick={() => setOpenSection((current) => current === section.id ? null : section.id)} className={cn("group relative flex h-[38px] w-full items-center rounded-[10px] transition-colors duration-150", collapsed ? "justify-center px-0" : "gap-[9px] px-[10px]", active ? "bg-[#EDF1E9] text-[#4C5644]" : "text-[#62685E] hover:bg-[#F0F3ED] hover:text-[#353B31]")}>
                    {active && <span className="absolute inset-y-[8px] left-0 w-[3px] rounded-r-full bg-[#647057]" />}

                    <span className={cn("flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] transition-colors", active ? "bg-[#E1E7DC] text-[#59634D]" : "text-[#82897E] group-hover:text-[#59634D]")}>
                      <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
                    </span>

                    {!collapsed && (
                      <>
                        <span className={cn("min-w-0 flex-1 truncate text-right text-[11.5px]", active ? "font-semibold" : "font-medium")}>{section.title}</span>

                        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.16 }} className="flex h-[18px] w-[18px] items-center justify-center">
                          <ChevronDown className="h-[11px] w-[11px] text-[#979D93]" strokeWidth={1.8} />
                        </motion.span>
                      </>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {!collapsed && open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ height: { duration: 0.18, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.12 } }} className="overflow-hidden">
                        <div className="mr-[20px] py-[4px] pr-[12px]">
                          <div className="space-y-[1px] border-r border-[#DDE3D9] pr-[9px]">
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

          {!collapsed && <SectionLabel>النظام</SectionLabel>}

          {collapsed && <Divider />}

          <div className="space-y-[2px]">
            {systemItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>
        </div>

        {/* ACCOUNT */}

        <div className="shrink-0 border-t border-[#E4E8E1] bg-[#FAFBF8] p-[8px]">
          {userEmail ? (
            <>
              <button type="button" onClick={() => navigate("/admin/settings")} className={cn("group flex w-full items-center rounded-[11px] transition-colors hover:bg-[#EFF2EC]", collapsed ? "h-[44px] justify-center" : "gap-[9px] px-[7px] py-[6px]")}>
                <div className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#E6EBE1] text-[11px] font-bold uppercase text-[#59634D]">
                  {userEmail.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-[1px] -left-[1px] h-[9px] w-[9px] rounded-full border-2 border-[#FAFBF8] bg-[#647057]" />
                </div>

                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-[10.5px] font-semibold leading-none text-[#30352D]">مدير المتجر</p>
                      <p dir="ltr" className="mt-[5px] truncate text-left text-[7.5px] leading-none text-[#969D92]">{userEmail}</p>
                    </div>

                    <Settings className="h-[12px] w-[12px] shrink-0 text-[#9DA49A] transition-colors group-hover:text-[#59634D]" strokeWidth={1.7} />
                  </>
                )}
              </button>

              <button type="button" onClick={handleLogout} className={cn("mt-[2px] flex h-[31px] w-full items-center rounded-[8px] text-[#858C81] transition-colors hover:bg-[#F3F5F1] hover:text-[#525A4B]", collapsed ? "justify-center" : "gap-[8px] px-[8px]")}>
                <LogOut className="h-[12px] w-[12px]" strokeWidth={1.7} />
                {!collapsed && <span className="text-[9.5px] font-medium">تسجيل الخروج</span>}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => navigate("/admin/login")} className="flex h-[38px] w-full items-center justify-center rounded-[9px] bg-[#59634D] text-[10px] font-semibold text-white transition-colors hover:bg-[#4C5643]">تسجيل الدخول</button>
          )}
        </div>
      </div>
    </Sidebar>
  );
};

const MainItem = ({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate: () => void }) => {
  const Icon = item.icon;

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} title={collapsed ? item.title : undefined} className={cn("group relative flex h-[38px] w-full items-center rounded-[10px] transition-colors duration-150", collapsed ? "justify-center px-0" : "gap-[9px] px-[10px]", active ? "bg-[#E9EEE5] text-[#40493A]" : "text-[#60665C] hover:bg-[#F0F3ED] hover:text-[#343A30]")}>
      {active && <span className="absolute inset-y-[8px] left-0 w-[3px] rounded-r-full bg-[#647057]" />}

      <span className={cn("flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px] transition-colors", active ? "bg-[#DCE4D7] text-[#59634D]" : "text-[#81887D] group-hover:text-[#59634D]")}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
      </span>

      {!collapsed && (
        <>
          <span className={cn("min-w-0 flex-1 truncate text-right text-[11.5px]", active ? "font-semibold" : "font-medium")}>{item.title}</span>

          {item.badge !== undefined && <span className={cn("flex min-w-[25px] items-center justify-center rounded-[7px] px-[6px] py-[3px] text-[8px] font-bold", active ? "bg-[#D6E0D0] text-[#59634D]" : "bg-[#ECEFE9] text-[#72796E]")}>{item.badge}</span>}
        </>
      )}
    </NavLink>
  );
};

const SubItem = ({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) => {
  const Icon = item.icon;

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} className={cn("group flex h-[29px] w-full items-center gap-[7px] rounded-[7px] px-[7px] transition-colors duration-150", active ? "bg-[#EFF3EC] text-[#4C5744]" : "text-[#858C81] hover:bg-[#F5F7F3] hover:text-[#59634D]")}>
      <Icon className={cn("h-[11px] w-[11px] shrink-0", active ? "text-[#647057]" : "text-[#A0A69C] group-hover:text-[#747D6B]")} strokeWidth={1.75} />

      <span className={cn("min-w-0 flex-1 truncate text-[10px]", active ? "font-semibold" : "font-medium")}>{item.title}</span>

      {active && <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-[#647057]" />}
    </NavLink>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mb-[5px] mt-[13px] flex items-center gap-[8px] px-[10px]">
      <span className="text-[7.5px] font-semibold tracking-[0.02em] text-[#A0A69D]">{children}</span>
      <span className="h-px flex-1 bg-[#E7EAE4]" />
    </div>
  );
};

const Divider = () => {
  return <div className="mx-[9px] my-[8px] h-px bg-[#E7EAE4]" />;
};

export default AdminSidebar;