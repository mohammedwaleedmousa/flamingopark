import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import AdminLayoutBase from "@/components/admin/AdminLayoutBase";
import { supabase } from "@/integrations/supabase/client";
import { adminPath, normalizeAdminPathForLegacyRules } from "@/lib/adminRoutes";

type RoutePermission =
  | "products.view"
  | "products.edit"
  | "inventory.view"
  | "inventory.adjust"
  | "orders.view"
  | "orders.manage"
  | "customers.view"
  | "marketing.manage"
  | "finance.manage"
  | "reports.view"
  | "settings.manage"
  | "admin.permissions.manage";

type PermissionSnapshot = {
  userId: string;
  values: Map<string, boolean>;
  expiresAt: number;
};

const PERMISSION_CACHE_TTL_MS = 60_000;
let permissionSnapshot: PermissionSnapshot | null = null;
let permissionSnapshotPromise: Promise<PermissionSnapshot | null> | null = null;

const permissionForLocation = (pathname: string, search: string): RoutePermission | null => {
  pathname = normalizeAdminPathForLegacyRules(pathname);

  if (pathname === "/admin") {
    const workspace = new URLSearchParams(search).get("workspace");
    if (workspace === "team") return "admin.permissions.manage";
    if (workspace === "publishing") return "marketing.manage";
    if (workspace === "preparation") return "orders.view";
    return null;
  }

  if (pathname === "/admin/products") return "products.view";
  if (pathname.startsWith("/admin/products/") || pathname.startsWith("/admin/categories") || pathname.startsWith("/admin/brands") || pathname.startsWith("/admin/brand-category-map") || pathname.startsWith("/admin/catalog-") || pathname.startsWith("/admin/size-price-rules")) return "products.edit";
  if (pathname.startsWith("/admin/inventory-adjustments")) return "inventory.adjust";
  if (pathname.startsWith("/admin/orders")) return "orders.view";
  if (pathname.startsWith("/admin/delivery") || pathname.startsWith("/admin/reviews") || pathname.startsWith("/admin/product-questions")) return "orders.manage";
  if (pathname.startsWith("/admin/customers")) return "customers.view";

  if (
    pathname.startsWith("/admin/banners") ||
    pathname.startsWith("/admin/sections") ||
    pathname.startsWith("/admin/content") ||
    pathname.startsWith("/admin/brand-pages") ||
    pathname.startsWith("/admin/brand-sections") ||
    pathname.startsWith("/admin/brand-filters") ||
    pathname.startsWith("/admin/customer-experience") ||
    pathname.startsWith("/admin/campaigns") ||
    pathname.startsWith("/admin/offers") ||
    pathname.startsWith("/admin/coupons") ||
    pathname.startsWith("/admin/customer-notifications") ||
    pathname.startsWith("/admin/notification-deliveries")
  ) return "marketing.manage";

  if (
    pathname.startsWith("/admin/invoices") ||
    pathname.startsWith("/admin/payment-methods") ||
    pathname.startsWith("/admin/expenses") ||
    pathname.startsWith("/admin/ledger") ||
    pathname.startsWith("/admin/refunds") ||
    pathname.startsWith("/admin/currencies") ||
    pathname.startsWith("/admin/countries") ||
    pathname.startsWith("/admin/cod-regions")
  ) return "finance.manage";

  if (pathname.startsWith("/admin/reports") || pathname.startsWith("/admin/analytics") || pathname.startsWith("/admin/revenue") || pathname.startsWith("/admin/profit-report") || pathname.startsWith("/admin/finance") || pathname.startsWith("/admin/customer-intelligence")) return "reports.view";
  if (pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/audit-log")) return "settings.manage";
  return null;
};

const getCachedPermission = (permission: RoutePermission) => {
  if (!permissionSnapshot || permissionSnapshot.expiresAt <= Date.now()) return undefined;
  return permissionSnapshot.values.get(permission) !== false;
};

const loadPermissionSnapshot = async (): Promise<PermissionSnapshot | null> => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  if (permissionSnapshot?.userId === userId && permissionSnapshot.expiresAt > Date.now()) {
    return permissionSnapshot;
  }

  if (permissionSnapshotPromise) return permissionSnapshotPromise;

  permissionSnapshotPromise = (async () => {
    const { data, error } = await supabase
      .from("admin_user_permissions")
      .select("permission, granted")
      .eq("user_id", userId);

    if (error) throw error;

    const values = new Map<string, boolean>();
    (data ?? []).forEach((row) => values.set(String(row.permission), row.granted !== false));

    permissionSnapshot = {
      userId,
      values,
      expiresAt: Date.now() + PERMISSION_CACHE_TTL_MS,
    };

    return permissionSnapshot;
  })();

  try {
    return await permissionSnapshotPromise;
  } finally {
    permissionSnapshotPromise = null;
  }
};

const resolveAdminPermission = async (permission: RoutePermission) => {
  const snapshot = await loadPermissionSnapshot();
  if (!snapshot) return true;
  return snapshot.values.get(permission) !== false;
};

const prefetchPrimaryAdminRoutes = () => {
  void Promise.allSettled([
    import("@/pages/admin/AdminOrdersWithNotesPage"),
    import("@/pages/admin/AdminProductsPage"),
    import("@/pages/admin/AdminCustomersPage"),
    import("@/pages/admin/reports/ReportsOverviewPage"),
    import("@/pages/admin/reports/ReportsCustomersPage"),
  ]);
};

const adminInteractiveColorOverrides = `
  .admin-workspace .btn-unified {
    background: linear-gradient(135deg, #7368C7 0%, #6258B8 100%) !important;
    border-color: #6258B8 !important;
    color: #FFFFFF !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .admin-workspace .btn-unified:hover {
    background: linear-gradient(135deg, #675CBA 0%, #594FAB 100%) !important;
    border-color: #594FAB !important;
    color: #FFFFFF !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .admin-workspace .btn-unified[data-variant="outline"] {
    background: #FFFFFF !important;
    border-color: #DDE2E8 !important;
    color: #5F6874 !important;
  }

  .admin-workspace .btn-unified[data-variant="outline"]:hover {
    background: #F5F6FB !important;
    border-color: #CBCFE4 !important;
    color: #51489A !important;
  }

  .admin-workspace .btn-unified[data-variant="secondary"] {
    background: #F1EFFF !important;
    border-color: #DDD8F4 !important;
    color: #51489A !important;
  }

  .admin-workspace .btn-unified[data-variant="secondary"]:hover {
    background: #E8E4FF !important;
    border-color: #CEC7EF !important;
    color: #443B8C !important;
  }

  .admin-workspace .btn-unified[data-variant="ghost"] {
    background: transparent !important;
    border-color: transparent !important;
    color: #626A75 !important;
  }

  .admin-workspace .btn-unified[data-variant="ghost"]:hover {
    background: #F2F4F7 !important;
    border-color: #E3E7EC !important;
    color: #4D5560 !important;
  }

  .admin-workspace .btn-unified[data-variant="destructive"] {
    background: #C95F5F !important;
    border-color: #B95353 !important;
    color: #FFFFFF !important;
  }

  .admin-workspace .btn-unified[data-variant="destructive"]:hover {
    background: #B95353 !important;
    border-color: #A94A4A !important;
    color: #FFFFFF !important;
  }

  .admin-workspace button[class*="bg-[#C66A7F]"],
  .admin-workspace a[class*="bg-[#C66A7F]"],
  .admin-workspace [role="button"][class*="bg-[#C66A7F]"] {
    background-color: #675CBA !important;
    color: #FFFFFF !important;
  }

  .admin-workspace button[class*="bg-[#FFF0F1]"],
  .admin-workspace button [class*="bg-[#FFF0F1]"],
  .admin-workspace a[class*="bg-[#FFF0F1]"],
  .admin-workspace a [class*="bg-[#FFF0F1]"],
  .admin-workspace [role="button"][class*="bg-[#FFF0F1]"],
  .admin-workspace [role="button"] [class*="bg-[#FFF0F1]"],
  .admin-workspace button[class*="bg-[#FFF0F4]"],
  .admin-workspace button [class*="bg-[#FFF0F4]"],
  .admin-workspace button[class*="bg-[#FBDDE6]"],
  .admin-workspace button [class*="bg-[#FBDDE6]"],
  .admin-workspace button[class*="bg-[#FFF3F6]"],
  .admin-workspace button [class*="bg-[#FFF3F6]"],
  .admin-workspace button[class*="bg-[#FBE1E8]"],
  .admin-workspace button [class*="bg-[#FBE1E8]"],
  .admin-workspace button[class*="bg-[#FFF7F9]"],
  .admin-workspace button [class*="bg-[#FFF7F9]"],
  .admin-workspace a[class*="bg-[#FFF0F4]"],
  .admin-workspace a [class*="bg-[#FFF0F4]"],
  .admin-workspace a[class*="bg-[#FBDDE6]"],
  .admin-workspace a [class*="bg-[#FBDDE6]"],
  .admin-workspace [role="button"] [class*="bg-[#FFF0F4]"],
  .admin-workspace [role="button"] [class*="bg-[#FBDDE6]"] {
    background-color: #F1EFFF !important;
  }

  .admin-workspace button[class*="text-[#B96670]"],
  .admin-workspace button [class*="text-[#B96670]"],
  .admin-workspace a[class*="text-[#B96670]"],
  .admin-workspace a [class*="text-[#B96670]"],
  .admin-workspace [role="button"][class*="text-[#B96670]"],
  .admin-workspace [role="button"] [class*="text-[#B96670]"],
  .admin-workspace button[class*="text-[#C66E82]"],
  .admin-workspace button [class*="text-[#C66E82]"],
  .admin-workspace button[class*="text-[#B85D72]"],
  .admin-workspace button [class*="text-[#B85D72]"],
  .admin-workspace button[class*="text-[#C66A7F]"],
  .admin-workspace button [class*="text-[#C66A7F]"],
  .admin-workspace button[class*="text-[#B15B70]"],
  .admin-workspace button [class*="text-[#B15B70]"],
  .admin-workspace button[class*="text-[#BC6377]"],
  .admin-workspace button [class*="text-[#BC6377]"],
  .admin-workspace a[class*="text-[#C66E82]"],
  .admin-workspace a [class*="text-[#C66E82]"],
  .admin-workspace a[class*="text-[#B85D72]"],
  .admin-workspace a [class*="text-[#B85D72]"] {
    color: #675CBA !important;
  }

  .admin-workspace button[class*="border-[#EFD7DF]"],
  .admin-workspace a[class*="border-[#EFD7DF]"],
  .admin-workspace [role="button"][class*="border-[#EFD7DF]"] {
    border-color: #E4E0F8 !important;
  }

  .admin-workspace button[role="combobox"] {
    border-color: #DDE2E8 !important;
    background: #F8FAFC !important;
    color: #59634D !important;
    box-shadow: none !important;
  }

  .admin-workspace button[role="combobox"]:hover {
    border-color: #CBD3DC !important;
    background: #F3F5F8 !important;
  }

  .admin-workspace button[role="combobox"][data-state="open"] {
    border-color: #8D86C9 !important;
    background: #FFFFFF !important;
    box-shadow: 0 0 0 3px rgba(103, 92, 186, 0.10) !important;
  }

  [role="listbox"] {
    border: 1px solid #DDE2E8 !important;
    border-radius: 10px !important;
    background: #FFFFFF !important;
    padding: 4px !important;
    color: #4F5864 !important;
    box-shadow: 0 14px 30px rgba(52, 61, 75, 0.14) !important;
  }

  [role="option"] {
    min-height: 34px;
    border-radius: 8px !important;
    background: transparent !important;
    color: #535D68 !important;
    transition: background-color 120ms ease, color 120ms ease !important;
  }

  [role="option"][data-highlighted] {
    background: #F3F1FC !important;
    color: #51489A !important;
  }

  [role="option"][data-state="checked"] {
    background: #ECE9FB !important;
    color: #51489A !important;
    font-weight: 600 !important;
  }

  [role="option"][data-state="checked"][data-highlighted] {
    background: #E5E1F8 !important;
    color: #443B8C !important;
  }

  [role="option"] svg {
    color: #675CBA !important;
  }
`;

const AdminLayout = () => {
  const location = useLocation();
  const requiredPermission = useMemo(() => permissionForLocation(location.pathname, location.search), [location.pathname, location.search]);
  const cachedPermission = requiredPermission ? getCachedPermission(requiredPermission) : true;
  const [checking, setChecking] = useState(Boolean(requiredPermission) && cachedPermission === undefined);
  const [allowed, setAllowed] = useState(cachedPermission ?? true);

  useEffect(() => {
    const warmTimer = window.setTimeout(() => {
      void loadPermissionSnapshot().catch((error) => console.error("Admin permission warmup failed:", error));
      prefetchPrimaryAdminRoutes();
    }, 250);

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        permissionSnapshot = null;
        permissionSnapshotPromise = null;
      }
    });

    return () => {
      window.clearTimeout(warmTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!requiredPermission) {
        setAllowed(true);
        setChecking(false);
        return;
      }

      const cached = getCachedPermission(requiredPermission);
      if (cached !== undefined) {
        setAllowed(cached);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const granted = await resolveAdminPermission(requiredPermission);
        if (active) setAllowed(granted);
      } catch (error) {
        console.error("Admin route permission check failed:", error);
        if (active) setAllowed(true);
      } finally {
        if (active) setChecking(false);
      }
    };

    void check();
    return () => { active = false; };
  }, [requiredPermission]);

  if (checking) {
    return <div className="fixed inset-0 grid place-items-center bg-[#F6F8FA]" dir="rtl"><div className="text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#675CBA]" /><p className="mt-2 text-[8px] text-[#8E96A1]">جاري التحقق من صلاحية الصفحة...</p></div></div>;
  }

  if (!allowed && requiredPermission) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#F6F8FA] px-5" dir="rtl">
        <div className="w-full max-w-[420px] rounded-[18px] border border-[#E5E9EF] bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><LockKeyhole className="h-[19px] w-[19px]" /></div>
          <h1 className="mt-4 text-[13px] font-semibold text-[#404852]">لا تملك صلاحية فتح هذه الصفحة</h1>
          <p className="mt-2 text-[8px] leading-6 text-[#8E96A1]">الصلاحية المطلوبة: <span dir="ltr" className="font-mono">{requiredPermission}</span>. يمكن لمدير الصلاحيات إعادة تفعيلها من مساحة الفريق.</p>
          <Link to={adminPath()} className="mt-5 inline-flex h-[34px] items-center justify-center rounded-[9px] bg-[#675CBA] px-4 text-[8px] font-semibold text-white">العودة للوحة التحكم</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{adminInteractiveColorOverrides}</style>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex h-[3px] overflow-hidden">
        <span className="flex-1 bg-[#7163C1]" />
        <span className="flex-1 bg-[#5680CF]" />
        <span className="flex-1 bg-[#4C9687]" />
        <span className="flex-1 bg-[#C66A7F]" />
        <span className="flex-1 bg-[#C38838]" />
      </div>
      <AdminLayoutBase />
    </>
  );
};

export default AdminLayout;