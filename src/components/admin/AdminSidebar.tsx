import {
  LayoutDashboard, Package, ShoppingCart, Users, Image, Tag, Truck, Star,
  Settings, LogOut, Grid3X3, LayoutGrid, FileText, Receipt, MapPin,
  TrendingUp, Percent, Ticket, QrCode, UserCheck, PieChart,
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: 'نظرة عامة',
    items: [
      { title: 'لوحة التحكم', url: '/admin', icon: LayoutDashboard },
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
      { title: 'المستفيدين', url: '/admin/beneficiaries', icon: UserCheck },
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'تم تسجيل الخروج' });
    navigate('/admin/login');
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  const isActive = (url: string) => {
    if (url === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar
      className="border-l border-sidebar-border bg-sidebar"
      collapsible="icon"
      side="right"
    >
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-heading text-sm shadow-sm">
            EG
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-heading text-base text-sidebar-foreground tracking-wide">Flamingo</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-[0.18em]">Admin Panel</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 gap-1">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45 px-3">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.url);
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild className="h-auto p-0" tooltip={collapsed ? item.title : undefined}>
                        <NavLink
                          to={item.url}
                          end={item.url === '/admin'}
                          onClick={handleNavClick}
                          className={cn(
                            "relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          {active && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-l-full bg-primary" />
                          )}
                          <item.icon className={cn(
                            "w-[18px] h-[18px] shrink-0 transition-colors",
                            active ? "text-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground"
                          )} />
                          {!collapsed && (
                            <span className="flex-1 text-[13px]">{item.title}</span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
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

export default AdminSidebar;
