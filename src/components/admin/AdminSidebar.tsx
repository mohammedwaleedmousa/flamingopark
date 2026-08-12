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

const activeSpring = {
  type: "spring" as const,
  stiffness: 1050,
  damping: 70,
  mass: 0.28,
};

const fastEase = {
  duration: 0.11,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

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

  const currentSection = () => sections.find((section) => isSectionActive(section))?.id ?? null;

  const [openSection, setOpenSection] = useState<string | null>(() => currentSection());

  useEffect(() => {
    const current = currentSection();

    if (current) setOpenSection(current);
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
    <Sidebar side="right" collapsible="icon" style={{ "--sidebar-width": "258px", "--sidebar-width-icon": "66px" } as CSSProperties} className="h-[100dvh] !overflow-hidden border-l border-[#EEEEEC] bg-white font-admin text-[#242524] shadow-none">
      <div className="flex h-full min-h-0 w-full flex-col !overflow-hidden bg-white">
        <div className="flex h-[62px] shrink-0 items-center border-b border-[#F1F2F0] bg-white px-[12px]">
          <div className={cn("flex w-full items-center", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex min-w-0 items-center gap-[9px]">
              <motion.button type="button" onClick={() => navigate("/admin")} whileHover={{ scale: 1.035 }} whileTap={{ scale: 0.97 }} transition={activeSpring} className="flex h-[36px] w-[36px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#ECEEEC] bg-white">
                <img src="/icons/flamingo.jpeg" alt="Flamingo" className="h-[29px] w-[29px] object-contain" />
              </motion.button>

              {!collapsed && (
                <motion.div initial={{ opacity: 0, x: 3 }} animate={{ opacity: 1, x: 0 }} transition={fastEase} className="min-w-0">
                  <div className="flex items-center gap-[6px]">
                    <h1 className="truncate text-[15px] font-bold leading-none tracking-[-0.25px] text-[#181918]">Flamingo</h1>

                    <span className="relative flex h-[6px] w-[6px] items-center justify-center">
                      <motion.span animate={{ scale: [1, 1.7, 1], opacity: [0.16, 0, 0.16] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }} className="absolute h-[11px] w-[11px] rounded-full bg-[#5CC683]" />
                      <span className="relative h-[6px] w-[6px] rounded-full bg-[#5CC683]" />
                    </span>
                  </div>

                  <p className="mt-[5px] text-[9.5px] font-medium leading-none text-[#A0A29F]">إدارة متجر فلامنجو</p>
                </motion.div>
              )}
            </div>

            {!collapsed && (
              <div className="flex h-[27px] w-[27px] items-center justify-center rounded-full border border-[#EEEEEC]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#5CC683]" />
              </div>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 !overflow-hidden bg-white px-[9px] py-[7px]">
          <div className="space-y-[1px]">
            {primaryItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>

          <Divider />

          <div className="space-y-[1px]">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = isSectionActive(section);
              const open = openSection === section.id;

              return (
                <div key={section.id}>
                  <motion.button type="button" whileTap={{ scale: 0.992 }} transition={activeSpring} onClick={() => setOpenSection((current) => current === section.id ? null : section.id)} title={collapsed ? section.title : undefined} className={cn("group relative flex h-[36px] w-full items-center overflow-hidden rounded-[9px] outline-none transition-colors duration-100", collapsed ? "justify-center px-0" : "gap-[9px] px-[9px]", active ? "text-[#171817]" : "text-[#5B5D5B] hover:bg-[#FAFAF9] hover:text-[#242624]")}>
                    {active && <motion.span layoutId="admin-active-background" transition={activeSpring} className="absolute inset-0 rounded-[9px] bg-[#F6F8F6]" />}

                    <span className={cn("relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-all duration-100", active ? "text-[#242624]" : "text-[#797B79] group-hover:scale-[1.05] group-hover:text-[#3F413F]")}>
                      <Icon className="h-[15px] w-[15px] stroke-[1.75]" />
                    </span>

                    {!collapsed && (
                      <>
                        <span className={cn("relative z-[1] min-w-0 flex-1 truncate text-right text-[12.5px] leading-none", active ? "font-semibold" : "font-medium")}>{section.title}</span>

                        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={fastEase} className="relative z-[1] flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                          <ChevronDown className="h-[12px] w-[12px] text-[#9EA09D]" />
                        </motion.span>
                      </>
                    )}

                    {active && <ActiveIndicator layoutId="admin-active-indicator" />}
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {!collapsed && open && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ height: { duration: 0.11, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.07 } }} className="overflow-hidden">
                        <div className="mr-[26px] py-[2px]">
                          {section.items.map((item) => (
                            <SubItem key={item.url} item={item} active={isActive(item)} onNavigate={closeMobile} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <Divider />

          <div className="space-y-[1px]">
            {systemItems.map((item) => (
              <MainItem key={item.url} item={item} active={isActive(item)} collapsed={collapsed} onNavigate={closeMobile} />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-[#F1F2F0] bg-white p-[8px]">
          {userEmail ? (
            <div>
              <motion.button type="button" whileTap={{ scale: 0.99 }} transition={activeSpring} onClick={() => navigate("/admin/settings")} className={cn("group flex w-full items-center rounded-[9px] transition-colors duration-100 hover:bg-[#FAFAF9]", collapsed ? "h-[40px] justify-center" : "gap-[8px] px-[6px] py-[5px]")}>
                <div className="relative flex h-[33px] w-[33px] shrink-0 items-center justify-center rounded-full border border-[#ECEEEC] bg-white text-[11.5px] font-bold uppercase text-[#343634]">
                  {userEmail.charAt(0).toUpperCase()}
                  <span className="absolute bottom-0 left-0 h-[9px] w-[9px] rounded-full border-2 border-white bg-[#5CC683]" />
                </div>

                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 text-right">
                      <p className="truncate text-[11.5px] font-semibold leading-none text-[#272827]">مدير المتجر</p>
                      <p dir="ltr" className="mt-[4px] truncate text-left text-[8.5px] leading-none text-[#9A9C99]">{userEmail}</p>
                    </div>

                    <Settings className="h-[13px] w-[13px] shrink-0 text-[#A8AAA7] transition-all duration-150 group-hover:rotate-45 group-hover:text-[#666866]" />
                  </>
                )}
              </motion.button>

              <button type="button" onClick={handleLogout} className={cn("group mt-[1px] flex h-[29px] w-full items-center rounded-[7px] text-[#777977] transition-colors duration-100 hover:text-[#292A29]", collapsed ? "justify-center" : "gap-[8px] px-[8px]")}>
                <LogOut className="h-[13px] w-[13px] stroke-[1.7] transition-transform duration-100 group-hover:-translate-x-[1px]" />
                {!collapsed && <span className="text-[10.5px] font-medium">تسجيل الخروج</span>}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => navigate("/admin/login")} className="flex h-[36px] w-full items-center justify-center rounded-[8px] bg-[#5CC683] text-[11px] font-semibold text-white">تسجيل الدخول</button>
          )}
        </div>
      </div>
    </Sidebar>
  );
};

const MainItem = ({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate: () => void }) => {
  const Icon = item.icon;

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} title={collapsed ? item.title : undefined} className={cn("group relative flex h-[36px] w-full items-center overflow-hidden rounded-[9px] outline-none transition-colors duration-100", collapsed ? "justify-center px-0" : "gap-[9px] px-[9px]", active ? "text-[#171817]" : "text-[#5B5D5B] hover:bg-[#FAFAF9] hover:text-[#242624]")}>
      {active && <motion.span layoutId="admin-active-background" transition={activeSpring} className="absolute inset-0 rounded-[9px] bg-[#F6F8F6]" />}

      <span className={cn("relative z-[1] flex h-[22px] w-[22px] shrink-0 items-center justify-center transition-all duration-100", active ? "text-[#242624]" : "text-[#797B79] group-hover:scale-[1.05] group-hover:text-[#3F413F]")}>
        <Icon className="h-[15px] w-[15px] stroke-[1.75]" />
      </span>

      {!collapsed && (
        <>
          <span className={cn("relative z-[1] min-w-0 flex-1 truncate text-right text-[12.5px] leading-none", active ? "font-semibold" : "font-medium")}>{item.title}</span>

          {item.badge !== undefined && <span className="relative z-[1] flex min-w-[28px] items-center justify-center rounded-full bg-[#D1F7E1] px-[7px] py-[3px] text-[9.5px] font-bold leading-none text-[#299B5D]">{item.badge}</span>}
        </>
      )}

      {active && <ActiveIndicator layoutId="admin-active-indicator" />}
    </NavLink>
  );
};

const SubItem = ({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) => {
  const Icon = item.icon;

  return (
    <NavLink to={item.url} end={item.exact} onClick={onNavigate} className={cn("group relative flex h-[26px] w-full items-center gap-[7px] rounded-[6px] px-[7px] outline-none transition-colors duration-100", active ? "font-semibold text-[#242624]" : "font-medium text-[#858784] hover:text-[#3E403E]")}>
      <span className={cn("flex h-[17px] w-[17px] shrink-0 items-center justify-center transition-all duration-100", active ? "text-[#45AD70]" : "text-[#A3A5A2] group-hover:text-[#777977]")}>
        <Icon className="h-[11.5px] w-[11.5px] stroke-[1.75]" />
      </span>

      <span className="min-w-0 flex-1 truncate text-[11px]">{item.title}</span>

      {active && <ActiveIndicator layoutId="admin-sub-active-indicator" small />}
    </NavLink>
  );
};

const ActiveIndicator = ({ layoutId, small = false }: { layoutId: string; small?: boolean }) => {
  return (
    <span className="pointer-events-none absolute inset-y-0 left-[6px] z-[5] flex items-center justify-center">
      <motion.span layoutId={layoutId} transition={activeSpring} className={cn("block rounded-full bg-[#5CC683]", small ? "h-[12px] w-[2px]" : "h-[18px] w-[3px]")} />
    </span>
  );
};

const Divider = () => {
  return <div className="mx-[9px] my-[7px] h-px bg-[#F1F2F0]" />;
};

export default AdminSidebar;