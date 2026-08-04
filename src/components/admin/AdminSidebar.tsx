import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Truck, Star,
  Settings, LogOut, Grid3X3, LayoutGrid, FileText, Receipt, MapPin,
  TrendingUp, Percent, Ticket, QrCode, PieChart, BarChart3, ShieldAlert,
  BookOpen, RotateCcw, Wallet, Boxes, LogIn,
  ChevronDown, Brain, Link2, ListChecks, Bell, Coins, Globe, MonitorCog, Route,
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

const groups: {
  label: string;
  items: { title: string; url: string; icon: any }[];
}[] = [
  {
    label: 'لوحة التحكم',
    items: [
      { title: 'لوحة التحكم', url: '/admin', icon: LayoutDashboard },
      { title: 'رحلة العميل', url: '/admin/storefront-map', icon: Route },
    ],
  },

  {
  label: 'الكتالوج والماركات',
  items: [
    { title: 'المنتجات', url: '/admin/products', icon: Package },
    { title: 'تجربة المنتج', url: '/admin/product-experience', icon: Star },
    { title: 'الفئات', url: '/admin/categories', icon: Grid3X3 },
    { title: 'الماركات', url: '/admin/brands', icon: Tag },
    { title: 'صفحات الماركات', url: '/admin/brand-pages', icon: LayoutGrid },
    { title: 'أقسام الماركات', url: '/admin/brand-sections', icon: Boxes },
    { title: 'فلاتر الماركات', url: '/admin/brand-filters', icon: ListChecks },
    { title: 'ربط الماركات بالأقسام', url: '/admin/brand-category-map', icon: Link2 },
  ],
},

  {
    label: 'المبيعات',
    items: [
      { title: 'الطلبات', url: '/admin/orders', icon: ShoppingCart },
      { title: 'العملاء', url: '/admin/customers', icon: Users },
      { title: 'الفواتير', url: '/admin/invoices', icon: Receipt },
      { title: 'المرتجعات', url: '/admin/refunds', icon: RotateCcw },
      { title: 'إشعارات العملاء', url: '/admin/customer-notifications', icon: Bell },
    ],
  },

  {
    label: 'المحتوى والظهور',
    items: [
      { title: 'البانرات الرئيسية', url: '/admin/banners', icon: Image },
      { title: 'الحملات والخدمات', url: '/admin/campaigns', icon: LayoutGrid },
      { title: 'أقسام الصفحة الرئيسية', url: '/admin/sections', icon: LayoutGrid },
      { title: 'محتوى الصفحات', url: '/admin/content', icon: FileText },
      { title: 'التقييمات', url: '/admin/reviews', icon: Star },
      { title: 'واجهة العميل', url: '/admin/customer-experience', icon: MonitorCog },
    ],
  },

  {
    label: 'التشغيل والمالية',
    items: [
      { title: 'شركات التوصيل', url: '/admin/delivery', icon: Truck },
      { title: 'مناطق الدفع', url: '/admin/cod-regions', icon: MapPin },
      { title: 'طرق الدفع', url: '/admin/payment-methods', icon: Wallet },
      { title: 'تسوية المخزون', url: '/admin/inventory-adjustments', icon: Boxes },
      { title: 'دفتر اليومية', url: '/admin/ledger', icon: BookOpen },
      { title: 'المصروفات', url: '/admin/expenses', icon: Receipt },
    ],
  },

  {
    label: 'التقارير والإعدادات',
    items: [
      { title: 'نظرة عامة', url: '/admin/reports', icon: BarChart3 },
      { title: 'الأرباح والمالية', url: '/admin/reports/finance', icon: PieChart },
      { title: 'تحليل العملاء', url: '/admin/reports/customers', icon: Brain },
      { title: 'العملات', url: '/admin/currencies', icon: Coins },
      { title: 'الدول', url: '/admin/countries', icon: Globe },
      { title: 'سجل التدقيق', url: '/admin/audit-log', icon: ShieldAlert },
      { title: 'سجل تسليم الإشعارات', url: '/admin/notification-deliveries', icon: Bell },
      { title: 'الإعدادات', url: '/admin/settings', icon: Settings },
      { title: 'الباركود', url: '/qr-code', icon: QrCode },
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
    for (const g of groups) init[g.label] = g.items.some((i) => isActive(i.url));
    if (!Object.values(init).some(Boolean)) init['لوحة التحكم'] = true;
    return init;
  });

  useEffect(() => {
    const activeGroup = groups.find((group) => group.items.some((item) => isActive(item.url)));
    if (activeGroup) {
      setOpenGroups((current) => ({ ...current, [activeGroup.label]: true }));
    }
  }, [location.pathname]);

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
 className="border-l border-border bg-background text-foreground shadow-[20px_0_60px_-38px_rgba(0,0,0,0.3)] font-admin" collapsible="icon"
      side="right"
    >
      <SidebarHeader className="flex items-center justify-center border-b border-border px-4 py-5">
        <div className="flex items-center justify-center">
  <img
    src="/icons/flamingo.jpeg"
    alt="logo"
    loading="lazy"
    className="h-16 w-16 object-contain"
  />
</div>
      </SidebarHeader>

      <SidebarContent className="hide-scrollbar gap-1 overflow-x-hidden overflow-y-auto py-3 overscroll-contain">
        {groups.map((group) => {
          const groupActive = group.items.some((i) => isActive(i.url));
          const isOpen = collapsed ? true : openGroups[group.label] ?? true;
          return (
            <SidebarGroup key={group.label} className="mb-1 px-2 py-1">
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
    px-3 py-2.5
    hover:bg-muted/70
    transition-colors
    group
  "
>
  <span className="text-[10px] tracking-[0.18em] font-semibold text-muted-foreground group-hover:text-foreground">
    {group.label}
  </span>

  <ChevronDown
    className={cn(
      "w-4 h-4 text-muted-foreground transition-transform duration-200",
      isOpen && "rotate-180 text-primary"
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
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",

                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
                )}
                style={{ 
                  direction: "rtl",
                  color: "inherit"
                }}
              >
                {active && (
                <span className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-primary" />
                )}
                <item.icon
                  className={cn(
                    'shrink-0 w-5 h-5 transition-all duration-300 ease-out',
                    active
  ? "text-primary"
  : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && (
                  <span className="flex-1 text-right text-[13px] leading-none">
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
