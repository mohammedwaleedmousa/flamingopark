import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Truck, Star,
  Settings, LogOut, Grid3X3, LayoutGrid, FileText, Receipt, MapPin,
  TrendingUp, Percent, Ticket, QrCode, PieChart, BarChart3, ShieldAlert,
  BookOpen, RotateCcw, Wallet, Boxes, LogIn,
    ChevronDown, Brain, Link2, ListChecks,
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthActions } from '@/hooks/useAuthActions';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: 'نظرة عامة',
    items: [
      { title: 'لوحة التحكم', url: '/admin', icon: LayoutDashboard },
      { title: 'التحليل المالي', url: '/admin/finance', icon: Wallet },
      { title: 'تحليل العملاء', url: '/admin/customer-intelligence', icon: Brain },
      { title: 'التقارير والتحليلات', url: '/admin/analytics', icon: BarChart3 },
      { title: 'الإيرادات', url: '/admin/revenue', icon: TrendingUp },
      { title: 'تقرير الأرباح', url: '/admin/profit-report', icon: PieChart },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { title: 'الطلبات', url: '/admin/orders', icon: ShoppingCart },
      { title: 'الفواتير', url: '/admin/invoices', icon: Receipt },
      { title: 'العملاء', url: '/admin/customers', icon: Users },
    ],
  },
  {
    label: 'المحاسبة المالية',
    items: [
      { title: 'دفتر اليومية', url: '/admin/ledger', icon: BookOpen },
      { title: 'المرتجعات', url: '/admin/refunds', icon: RotateCcw },
      { title: 'المصروفات', url: '/admin/expenses', icon: Receipt },
      { title: 'طرق الدفع والتسويات', url: '/admin/payment-methods', icon: Wallet },
      { title: 'تسوية المخزون', url: '/admin/inventory-adjustments', icon: Boxes },
    ],
  },
  {
    label: 'الكتالوج',
    items: [
      { title: 'دليل العمل السريع', url: '/admin/catalog-workflow', icon: ListChecks },
      { title: 'المنتجات', url: '/admin/products', icon: Package },
      { title: 'الفئات', url: '/admin/categories', icon: Grid3X3 },
      { title: 'الماركات', url: '/admin/brands', icon: Tag },
      { title: 'ربط ماركات-أقسام', url: '/admin/brand-category-map', icon: Link2 },
      { title: 'الأقسام', url: '/admin/sections', icon: LayoutGrid },
    ],
  },
  {
    label: 'التسويق',
    items: [
      { title: 'العروض', url: '/admin/offers', icon: Percent },
      { title: 'الكوبونات', url: '/admin/coupons', icon: Ticket },
      { title: 'البانرات', url: '/admin/banners', icon: Image },
      { title: 'التقييمات', url: '/admin/reviews', icon: Star },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { title: 'شركات التوصيل', url: '/admin/delivery', icon: Truck },
      { title: 'مناطق الدفع', url: '/admin/cod-regions', icon: MapPin },
      { title: 'المحتوى', url: '/admin/content', icon: FileText },
      { title: 'سجلّ التدقيق', url: '/admin/audit-log', icon: ShieldAlert },
      { title: 'الباركود', url: '/qr-code', icon: QrCode },
      { title: 'الإعدادات', url: '/admin/settings', icon: Settings },
    ],
  },
];

const AdminSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const [userEmail, setUserEmail] = useState<string>('');
  const { logout } = useAuthActions();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || '');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUserEmail(session?.user?.email || '');
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isActive = (url: string) =>
    url === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(url);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.label] = g.items.some((i) => isActive(i.url)) || true;
    return init;
  });

  const handleLogout = async () => {
    if (!window.confirm('هل تريد تسجيل الخروج من لوحة التحكم؟')) return;
    await logout({
      redirectTo: '/admin/login',
      successTitle: 'تم تسجيل الخروج بنجاح',
      onSuccess: () => setUserEmail(''),
    });
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const handleLogin = () => {
    navigate('/admin/login');
  };

  return (
    <Sidebar
 className="
    border-l-2 border-pink-400
    bg-white
    text-black
    [&_*]:text-black
    shadow-[20px_0_60px_-30px_rgba(0,0,0,0.25)]
    font-admin
  "      collapsible="icon"
      side="right"
    >
      <SidebarHeader className="px-4 py-6 border-b border-black/5 bg-white/40 backdrop-blur-xl flex justify-center items-center">
        <div className="flex items-center justify-center">
  <img
    src="/icons/flamingo.jpeg"
    alt="logo"
    className="w-20 h-20 object-contain transition-all duration-500 ease-in-out
    hover:scale-105"
  />
</div>
      </SidebarHeader>

      <SidebarContent className="py-3 gap-1 hide-scrollbar overflow-y-auto overflow-x-hidden overscroll-contain">
        {groups.map((group) => {
          const groupActive = group.items.some((i) => isActive(i.url));
          const isOpen = collapsed ? true : openGroups[group.label] ?? true;
          return (
            <SidebarGroup key={group.label} className="px-1 py-1 mb-2 rounded-xl bg-white/60 border border-black/5 shadow-[0_6px_20px_-18px_rgba(0,0,0,0.2)] backdrop-blur-md">
              {collapsed ? (
                <GroupItems group={group} isActive={isActive} onNav={handleNavClick} collapsed />
              ) : (
                <Collapsible
                  open={isOpen}
                  onOpenChange={(v) => setOpenGroups((p) => ({ ...p, [group.label]: v }))}
                >
                  <CollapsibleTrigger
  className="
    w-full flex items-center justify-between
    px-4 py-3
    bg-white/60
    hover:bg-white
    transition-all duration-300
    group
  "
>
  <span className="text-[11px] tracking-[0.3em] uppercase font-semibold text-black/60 group-hover:text-black">
    {group.label}
  </span>

  <ChevronDown
    className={cn(
      "w-4 h-4 text-black/40 transition-transform duration-300",
      isOpen && "rotate-180 text-pink-500"
    )}
  />
</CollapsibleTrigger>
                  <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out duration-200 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                    <GroupItems group={group} isActive={isActive} onNav={handleNavClick} collapsed={false} />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        {!collapsed && userEmail && (
          <div className="px-3 py-2 mb-2 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] uppercase tracking-[0.08em] text-black/40 mb-1">حساب الأدمن</p>
            <p className="text-[12px] font-medium text-black truncate" dir="ltr">{userEmail}</p>
          </div>
        )}
        {userEmail ? (
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
              "text-black/70 hover:text-white hover:bg-primary hover:shadow-md",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5" />
            {!collapsed && (
              <span className="text-[13px] font-medium">تسجيل الخروج</span>
            )}
          </button>
        ) : (
          <button
            onClick={handleLogin}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
              "text-black/70 hover:text-white hover:bg-primary hover:shadow-md",
              collapsed && "justify-center"
            )}
          >
            <LogIn className="w-5 h-5" />
            {!collapsed && (
              <span className="text-[13px] font-medium">تسجيل الدخول</span>
            )}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

const GroupItems = ({
  group,
  isActive,
  onNav,
  collapsed,
}: {
  group: { label: string; items: { title: string; url: string; icon: any }[] };
  isActive: (url: string) => boolean;
  onNav: () => void;
  collapsed: boolean;
}) => (
  <SidebarGroupContent>
    <SidebarMenu className="space-y-1 px-1">
      {group.items.map((item) => {
        const active = isActive(item.url);
        return (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild className="h-auto p-0" tooltip={collapsed ? item.title : undefined}>
              <NavLink
                to={item.url}
                end={item.url === '/admin'}
                onClick={onNav}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out",
                  "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",

                  active
                    ? "bg-white text-black font-medium shadow-[0_10px_30px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
                    : "text-black/80 hover:bg-white hover:text-black hover:shadow-[0_12px_35px_-15px_rgba(0,0,0,0.25)] hover:translate-y-[-3px] hover:scale-[1.02] active:scale-[0.98]"
                )}
                style={{ 
                  direction: "rtl",
                  transformStyle: "preserve-3d",
                  willChange: "transform",
                  color: "inherit"
                }}
              >
                {active && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-pink-500 shadow-md" />
                )}
                <item.icon
                  className={cn(
                    'shrink-0 w-5 h-5 transition-all duration-300 ease-out',
                    active
  ? "text-gold"
  : "text-black/70 group-hover:text-gold"
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 text-[13px] leading-none text-right text-black/80">
                    {item.title}
                  </span>
                )}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  </SidebarGroupContent>
);

export default AdminSidebar;
