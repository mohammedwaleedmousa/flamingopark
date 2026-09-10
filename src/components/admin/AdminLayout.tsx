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
    pathname.startsWith("/admin/sales-agents") ||
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

  .admin-workspace .btn-unified[data-variant="destructive"] {
    background: #C85E5E !important;
    border-color: #C85E5E !important;
    color: #FFFFFF !important;
  }

  .admin-workspace .btn-unified[data-variant="destructive"]:hover {
    background: #B55252 !important;
    border-color: #B55252 !important;
    color: #FFFFFF !important;
  }

  .admin-workspace [role="switch"][data-state="checked"] {
    background: #675CBA !important;
  }
`;

const AdminLayout = () => {
  const location = useLocation();
  const permission = useMemo(() => permissionForLocation(location.pathname, location.search), [location.pathname, location.search]);
  const cachedPermission = permission ? getCachedPermission(permission) : true;
  const [accessState, setAccessState] = useState<"loading" | "allowed" | "denied">(() => cachedPermission === false ? "denied" : cachedPermission === true ? "allowed" : permission ? "loading" : "allowed");

  useEffect(() => {
    prefetchPrimaryAdminRoutes();
  }, []);

  useEffect(() => {
    if (!permission) {
      setAccessState("allowed");
      return;
    }

    const cached = getCachedPermission(permission);
    if (cached !== undefined) {
      setAccessState(cached ? "allowed" : "denied");
      return;
    }

    let active = true;
    setAccessState("loading");

    resolveAdminPermission(permission)
      .then((allowed) => {
        if (active) setAccessState(allowed ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setAccessState("allowed");
      });

    return () => {
      active = false;
    };
  }, [permission]);

  if (accessState === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F8FA]" dir="rtl">
        <div className="flex items-center gap-2 rounded-xl border border-[#E4E7EB] bg-white px-4 py-3 text-sm text-[#69727D] shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحقق من الصلاحيات...
        </div>
      </div>
    );
  }

  if (accessState === "denied") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F7F8FA] px-5" dir="rtl">
        <div className="w-full max-w-md rounded-[18px] border border-[#E3E7EC] bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#F2EFFF] text-[#675CBA]"><LockKeyhole className="h-5 w-5" /></div>
          <h1 className="mt-4 text-lg font-bold text-[#2D323A]">لا توجد صلاحية لهذه الصفحة</h1>
          <p className="mt-2 text-sm leading-6 text-[#7B838E]">يمكن لمدير الصلاحيات منحك الوصول المناسب من إدارة الفريق.</p>
          <Link to={adminPath()} className="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-[#675CBA] px-4 text-sm font-semibold text-white">العودة للوحة التحكم</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{adminInteractiveColorOverrides}</style>
      <AdminLayoutBase />
    </>
  );
};

export default AdminLayout;
