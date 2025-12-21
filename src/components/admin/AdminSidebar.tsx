import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Image, 
  Tag, 
  Truck, 
  Star, 
  Settings,
  LogOut,
  ChevronRight,
  Grid3X3,
  LayoutGrid,
  FileText,
  Receipt,
  MapPin,
  TrendingUp,
  Percent,
  Ticket
} from 'lucide-react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'الرئيسية', url: '/admin', icon: LayoutDashboard },
  { title: 'المنتجات', url: '/admin/products', icon: Package },
  { title: 'الطلبات', url: '/admin/orders', icon: ShoppingCart },
  { title: 'الفواتير', url: '/admin/invoices', icon: Receipt },
  { title: 'الإيرادات', url: '/admin/revenue', icon: TrendingUp },
  { title: 'العملاء', url: '/admin/customers', icon: Users },
  { title: 'العروض', url: '/admin/offers', icon: Percent },
  { title: 'الكوبونات', url: '/admin/coupons', icon: Ticket },
  { title: 'البانرات', url: '/admin/banners', icon: Image },
  { title: 'الفئات', url: '/admin/categories', icon: Grid3X3 },
  { title: 'الماركات', url: '/admin/brands', icon: Tag },
  { title: 'شركات التوصيل', url: '/admin/delivery', icon: Truck },
  { title: 'مناطق الدفع عند الاستلام', url: '/admin/cod-regions', icon: MapPin },
  { title: 'التقييمات', url: '/admin/reviews', icon: Star },
  { title: 'الأقسام', url: '/admin/sections', icon: LayoutGrid },
  { title: 'المحتوى', url: '/admin/content', icon: FileText },
  { title: 'الإعدادات', url: '/admin/settings', icon: Settings },
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
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-center">
          <h1 className={cn(
            "logo-ermgold transition-all duration-300",
            collapsed ? "text-sm" : "text-xl"
          )}>
            {collapsed ? "EG" : "ERMGOLD"}
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        end={item.url === '/admin'}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group",
                          active
                            ? "bg-gradient-to-l from-primary/20 to-primary/5 text-primary border-r-2 border-primary"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className={cn(
                          "w-5 h-5 shrink-0 transition-colors",
                          active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary"
                        )} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 font-medium text-sm">{item.title}</span>
                            {active && <ChevronRight className="w-4 h-4 text-primary" />}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
