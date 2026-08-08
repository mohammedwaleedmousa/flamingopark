import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { ChevronLeft, Loader2, Menu, Store } from 'lucide-react';
import Logo from '@/components/Logo';
import NotificationsDropdown from './NotificationsDropdown';
import ExcelToolbar from './ExcelToolbar';
import { resolveExcelTable } from '@/lib/admin/excelTables';
import { DateRangeProvider } from '@/lib/analytics/dateRange';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const excelConfig = resolveExcelTable(location.pathname);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      if (import.meta.env.DEV) {
        const params = new URLSearchParams(window.location.search);
        if (params.get("dev") === "true") {
          setIsAdmin(true);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/admin/login');
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        navigate('/admin/login');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/admin/login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-body">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    // Show loading briefly while redirecting
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-body">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DateRangeProvider>
      <div className="admin-workspace min-h-screen flex w-full bg-muted/30 font-admin" dir="rtl">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="rounded-md border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted hover:text-primary">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
                <Store className="h-4 w-4 text-primary" />
                <span>إدارة المتجر</span>
                {location.pathname !== "/admin" && <><ChevronLeft className="h-3.5 w-3.5" /><span className="max-w-48 truncate" dir="ltr">{location.pathname.replace("/admin/", "")}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {excelConfig && <ExcelToolbar config={excelConfig} />}
              <NotificationsDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      </DateRangeProvider>
    </SidebarProvider>
  );
};

export default AdminLayout;
