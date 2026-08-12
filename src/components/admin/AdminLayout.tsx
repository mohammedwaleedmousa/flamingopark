import { useEffect, useState, type CSSProperties } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader2, Menu, Search, Sun, ChevronDown, UserRound } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

import AdminSidebar from "./AdminSidebar";
import NotificationsDropdown from "./NotificationsDropdown";

import { DateRangeProvider } from "@/lib/analytics/dateRange";

const ADMIN_THEME = {
  olive: "#5CC683",
  oliveDark: "#3BA666",
  oliveDeep: "#278A50",
  oliveSoft: "#D1F7E1",
  oliveSoft2: "#EDF9F2",
  oliveSoft3: "#F7FAF8",
  background: "#F2F3F2",
  surface: "#FFFFFF",
  surfaceWhite: "#FFFFFF",
  text: "#202220",
  textSecondary: "#606360",
  muted: "#969996",
  border: "#E8EAE8",
  borderStrong: "#D9DDD9",
  online: "#5CC683",
};

const adminThemeVariables = {
  "--background": "120 4% 95%",
  "--foreground": "120 3% 13%",
  "--card": "0 0% 100%",
  "--card-foreground": "120 3% 13%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "120 3% 13%",
  "--primary": "143 46% 57%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "140 36% 95%",
  "--secondary-foreground": "143 42% 36%",
  "--muted": "120 4% 96%",
  "--muted-foreground": "120 2% 58%",
  "--accent": "140 36% 95%",
  "--accent-foreground": "143 42% 36%",
  "--border": "120 4% 91%",
  "--input": "120 4% 91%",
  "--ring": "143 46% 57%",
  "--sidebar-background": "0 0% 100%",
  "--sidebar-foreground": "120 3% 14%",
  "--sidebar-primary": "143 46% 57%",
  "--sidebar-primary-foreground": "0 0% 100%",
  "--sidebar-accent": "140 36% 95%",
  "--sidebar-accent-foreground": "143 42% 36%",
  "--sidebar-border": "120 4% 92%",
  "--sidebar-ring": "143 46% 57%",
  "--admin-olive": ADMIN_THEME.olive,
  "--admin-olive-dark": ADMIN_THEME.oliveDark,
  "--admin-olive-deep": ADMIN_THEME.oliveDeep,
  "--admin-olive-soft": ADMIN_THEME.oliveSoft,
  "--admin-olive-soft-2": ADMIN_THEME.oliveSoft2,
  "--admin-olive-soft-3": ADMIN_THEME.oliveSoft3,
  "--admin-bg": ADMIN_THEME.background,
  "--admin-surface": ADMIN_THEME.surface,
  "--admin-white": ADMIN_THEME.surfaceWhite,
  "--admin-text": ADMIN_THEME.text,
  "--admin-text-secondary": ADMIN_THEME.textSecondary,
  "--admin-muted": ADMIN_THEME.muted,
  "--admin-border": ADMIN_THEME.border,
  "--admin-border-strong": ADMIN_THEME.borderStrong,
  "--admin-online": ADMIN_THEME.online,
} as CSSProperties;

const AdminLayout = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("مدير المتجر");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root?.style.overflow || "";

    const previousHtmlHeight = html.style.height;
    const previousBodyHeight = body.style.height;
    const previousRootHeight = root?.style.height || "";

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100%";
    body.style.height = "100%";

    if (root) {
      root.style.overflow = "hidden";
      root.style.height = "100%";
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      html.style.height = previousHtmlHeight;
      body.style.height = previousBodyHeight;

      if (root) {
        root.style.overflow = previousRootOverflow;
        root.style.height = previousRootHeight;
      }
    };
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;

      if (!user) return;

      setUserEmail(user.email || "");

      const name = user.user_metadata?.full_name || user.user_metadata?.name || "مدير المتجر";

      setUserName(name);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!user) {
        setUserEmail("");
        return;
      }

      setUserEmail(user.email || "");

      const name = user.user_metadata?.full_name || user.user_metadata?.name || "مدير المتجر";

      setUserName(name);
    });

    return () => {
      data.subscription.unsubscribe();
    };
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

      if (!roleData) {
        navigate("/admin/login");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={adminThemeVariables} className="fixed inset-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--admin-bg)] font-admin">
        <div className="text-center">
          <div className="mx-auto flex h-[54px] w-[54px] items-center justify-center rounded-[15px] border border-[var(--admin-border)] bg-white">
            <Loader2 className="h-[22px] w-[22px] animate-spin text-[#5CC683]" />
          </div>

          <p className="mt-3 text-[12px] font-medium text-[var(--admin-muted)]">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={adminThemeVariables} className="fixed inset-0 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[var(--admin-bg)] font-admin">
        <div className="text-center">
          <Loader2 className="mx-auto h-[23px] w-[23px] animate-spin text-[#5CC683]" />
          <p className="mt-3 text-[12px] font-medium text-[var(--admin-muted)]">جاري التحقق...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true} className="h-[100dvh] min-h-0 overflow-hidden">
      <DateRangeProvider>
        <div dir="rtl" style={adminThemeVariables} className="admin-workspace fixed inset-0 flex h-[100dvh] w-full overflow-hidden bg-[var(--admin-bg)] font-admin text-[var(--admin-text)]">
          <AdminSidebar />

          <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <header className="relative z-40 flex h-[62px] shrink-0 items-center border-b border-[var(--admin-border)] bg-white px-4 md:px-5">
              <div className="flex w-full items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <SidebarTrigger className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] shadow-none transition-all duration-100 hover:border-[var(--admin-border-strong)] hover:text-[#359E60]">
                    <Menu className="h-[16px] w-[16px] stroke-[1.8]" />
                  </SidebarTrigger>

                  <div className="relative hidden w-full max-w-[420px] md:block">
                    <Search className="pointer-events-none absolute right-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[var(--admin-muted)]" />

                    <input type="search" placeholder="ابحث عن منتج، طلب أو عميل..." className="h-[38px] w-full rounded-[9px] border border-[var(--admin-border)] bg-[#F8F9F8] pr-10 pl-[62px] text-[11.5px] font-medium text-[var(--admin-text)] outline-none transition-all duration-100 placeholder:text-[var(--admin-muted)] focus:border-[#5CC683] focus:bg-white focus:ring-[3px] focus:ring-[#5CC683]/10" />

                    <div className="pointer-events-none absolute left-2 top-1/2 flex h-[23px] -translate-y-1/2 items-center justify-center rounded-[6px] border border-[var(--admin-border)] bg-white px-2 text-[8.5px] font-semibold text-[var(--admin-muted)]">⌘ K</div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" aria-label="المظهر" className="hidden h-[36px] w-[36px] items-center justify-center rounded-[9px] border border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] transition-all duration-100 hover:border-[var(--admin-border-strong)] hover:text-[#359E60] sm:flex">
                    <Sun className="h-[15px] w-[15px] stroke-[1.7]" />
                  </button>

                  <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[9px] border border-[var(--admin-border)] bg-white text-[var(--admin-text-secondary)] transition-all duration-100 hover:border-[var(--admin-border-strong)] hover:text-[#359E60]">
                    <NotificationsDropdown />
                  </div>

                  <div className="mx-1 hidden h-[25px] w-px bg-[var(--admin-border)] md:block" />

                  <button type="button" onClick={() => navigate("/admin/settings")} className="group flex items-center gap-[8px] rounded-[9px] px-[4px] py-[2px] text-right transition-colors duration-100 hover:bg-[#F8F9F8]">
                    <div className="relative flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-[9px] border border-[var(--admin-border)] bg-white text-[11.5px] font-bold text-[var(--admin-text)]">
                      {userName ? userName.charAt(0).toUpperCase() : <UserRound className="h-[15px] w-[15px]" />}

                      <span className="absolute -bottom-[2px] -left-[2px] h-[9px] w-[9px] rounded-full border-2 border-white bg-[#5CC683]" />
                    </div>

                    <div className="hidden min-w-0 md:block">
                      <p className="max-w-[135px] truncate text-[11.5px] font-semibold leading-none text-[var(--admin-text)]">{userName}</p>
                      <p className="mt-[4px] max-w-[135px] truncate text-[9px] font-medium leading-none text-[var(--admin-muted)]">مدير النظام</p>
                    </div>

                    <ChevronDown className="hidden h-[12px] w-[12px] text-[var(--admin-muted)] transition-transform duration-100 group-hover:translate-y-[1px] md:block" />
                  </button>
                </div>
              </div>
            </header>

            <div className="shrink-0 border-b border-[var(--admin-border)] bg-white px-4 pb-2.5 md:hidden">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[var(--admin-muted)]" />

                <input type="search" placeholder="ابحث في لوحة التحكم..." className="h-[37px] w-full rounded-[9px] border border-[var(--admin-border)] bg-[#F8F9F8] pr-10 pl-3 text-[11px] font-medium text-[var(--admin-text)] outline-none placeholder:text-[var(--admin-muted)] focus:border-[#5CC683] focus:bg-white focus:ring-[3px] focus:ring-[#5CC683]/10" />
              </div>
            </div>

            <main className="min-h-0 flex-1 overflow-hidden bg-[var(--admin-bg)]">
              <div className="admin-page-scroll h-full w-full overflow-x-hidden overflow-y-auto overscroll-contain">
                <div className="mx-auto min-h-full w-full max-w-[1720px] px-4 py-4 md:px-5 md:py-5 xl:px-6">
                  <Outlet />
                </div>
              </div>
            </main>
          </div>
        </div>
      </DateRangeProvider>
    </SidebarProvider>
  );
};

export default AdminLayout;