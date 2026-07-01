import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from './AdminSidebar';
import { Loader2, Menu } from 'lucide-react';
import Logo from '@/components/Logo';
import NotificationsDropdown from './NotificationsDropdown';
import { DateRangeProvider } from '@/lib/analytics/dateRange';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Local dev bypass: add ?dev=true to URL to skip auth checks when needed
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("dev") === "true") {
          setIsAdmin(true);
          setIsLoading(false);
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
      <div className="min-h-screen flex w-full bg-background font-admin" dir="rtl">
        <AdminSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 border-b border-border bg-card sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-foreground hover:text-primary hover:bg-muted p-2 rounded-lg transition-colors">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <div className="hidden sm:flex items-center gap-3">
                <Logo size="sm" />
                <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsDropdown />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-gradient-to-b from-gray-50 to-white">
            <Outlet />
          </main>
        </div>
      </div>
      </DateRangeProvider>
    </SidebarProvider>
  );
};

export default AdminLayout;
