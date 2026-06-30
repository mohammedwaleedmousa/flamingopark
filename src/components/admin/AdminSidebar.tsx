import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Truck, Star,
  Settings, LogOut, Grid3X3, LayoutGrid, FileText, Receipt, MapPin,
  TrendingUp, Percent, Ticket, QrCode, PieChart, BarChart3, ShieldAlert,
  BookOpen, RotateCcw, Wallet, Boxes,
  ChevronDown,
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: 'نظرة عامة',
    items: [
      { title: 'لوحة التحكم', url: '/admin', icon: LayoutDashboard },
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
      { title: 'المنتجات', url: '/admin/products', icon: Package },
      { title: 'الفئات', url: '/admin/categories', icon: Grid3X3 },
      { title: 'الماركات', url: '/admin/brands', icon: Tag },
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
  const isActive = (url: string) =>
    url === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(url);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of groups) init[g.label] = g.items.some((i) => isActive(i.url)) || true;
    return init;
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'تم تسجيل الخروج' });
    navigate('/admin/login');
  };

  const handleNavClick = () => {
    setOpenMobile(false);
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
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-1.5 mb-0.5 rounded-md transition-colors',
                        'text-[10px] uppercase tracking-[0.25em] font-medium text-black/50 hover:text-black/80 transition-all',
                        groupActive && 'text-sidebar-foreground/70',
                      )}
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={cn(
                          'w-3.5 h-3.5 transition-transform duration-200',
                          !isOpen && 'rotate-[-90deg]',
                        )}
                      />
                    </button>
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
        <button
  onClick={handleLogout}
  className={cn(
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
    "text-black/60 hover:text-black hover:bg-black/5 hover:shadow-sm",
    collapsed && "justify-center"
  )}
>
  <LogOut className="w-5 h-5" />
  {!collapsed && (
    <span className="text-[13px] font-medium">
      تسجيل الخروج
    </span>
  )}
</button>
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
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 ease-out",
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
                <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-black via-black/60 to-transparent shadow-md" />
                )}
                <item.icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0 transition-all duration-300 ease-out',
                    active ? 'text-black drop-shadow-sm scale-105' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground',
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
