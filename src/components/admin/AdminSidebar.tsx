import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Truck, Star,
  Settings, LogOut, Grid3X3, LayoutGrid, FileText, Receipt, MapPin,
  TrendingUp, Percent, Ticket, QrCode, UserCheck, PieChart, BarChart3, ShieldAlert,
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
      className="border-l border-sidebar-border bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95"
      collapsible="icon"
      side="right"
    >
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border/60">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 flex items-center justify-center text-primary-foreground font-heading text-base shadow-md shadow-primary/20 ring-1 ring-primary/30">
            <span className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
            F
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-heading text-base text-sidebar-foreground tracking-[0.18em]">FLAMINGO</p>
              <p className="text-[10px] text-sidebar-foreground/55 uppercase tracking-[0.22em] mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 gap-1 scrollbar-thin">
        {groups.map((group) => {
          const groupActive = group.items.some((i) => isActive(i.url));
          const isOpen = collapsed ? true : openGroups[group.label] ?? true;
          return (
            <SidebarGroup key={group.label} className="px-1">
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
                        'text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 hover:text-sidebar-foreground',
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
                  <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
                    <GroupItems group={group} isActive={isActive} onNav={handleNavClick} collapsed={false} />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/60">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full gap-3 text-sidebar-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </Button>
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
    <SidebarMenu className="space-y-0.5 px-1">
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
                  'relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group',
                  active
                    ? 'bg-primary/12 text-primary font-medium shadow-[0_1px_0_0_hsl(var(--primary)/0.15)_inset]'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                )}
              >
                {active && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-l-full bg-gradient-to-b from-primary to-primary/60" />
                )}
                <item.icon
                  className={cn(
                    'w-[18px] h-[18px] shrink-0 transition-all duration-200',
                    active ? 'text-primary scale-105' : 'text-sidebar-foreground/55 group-hover:text-sidebar-foreground',
                  )}
                />
                {!collapsed && <span className="flex-1 text-[13px]">{item.title}</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  </SidebarGroupContent>
);

export default AdminSidebar;
