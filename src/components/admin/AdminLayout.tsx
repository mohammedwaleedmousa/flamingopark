import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import AdminLayoutBase from "@/components/admin/AdminLayoutBase";
import { supabase } from "@/integrations/supabase/client";
import { hasAdminPermission } from "@/lib/adminProductivity";

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

const permissionForLocation = (pathname: string, search: string): RoutePermission | null => {
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

const adminInteractiveColorOverrides = `
  .admin-workspace button[class*="bg-[#C66A7F]"],
  .admin-workspace a[class*="bg-[#C66A7F]"],
  .admin-workspace [role="button"][class*="bg-[#C66A7F]"] {
    background-color: #675CBA !important;
    color: #FFFFFF !important;
  }

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
`;

const AdminLayout = () => {
  const location = useLocation();
  const requiredPermission = useMemo(() => permissionForLocation(location.pathname, location.search), [location.pathname, location.search]);
  const [checking, setChecking] = useState(Boolean(requiredPermission));
  const [allowed, setAllowed] = useState(true);

  useEffect(() => {
    let active = true;

    const check = async () => {
      if (!requiredPermission) {
        setAllowed(true);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const { data } = await supabase.auth.getUser();
        if (!data.user) {
          if (active) setAllowed(true);
          return;
        }
        const granted = await hasAdminPermission(requiredPermission);
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
          <Link to="/admin" className="mt-5 inline-flex h-[34px] items-center justify-center rounded-[9px] bg-[#675CBA] px-4 text-[8px] font-semibold text-white">العودة للوحة التحكم</Link>
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