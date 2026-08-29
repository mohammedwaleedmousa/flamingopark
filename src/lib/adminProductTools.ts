import { supabase } from "@/integrations/supabase/client";
import { requireAdminPermission } from "@/lib/adminPermissionActions";

export type ProductQuickPatch = Partial<{
  price: number;
  stock_quantity: number;
  in_stock: boolean;
  is_active: boolean;
  brand_id: string | null;
  category_id: string | null;
}>;

export type CatalogHealthIssue =
  | "missing_images"
  | "missing_brand"
  | "missing_category"
  | "invalid_price"
  | "missing_name"
  | "missing_name_ar"
  | "missing_slug"
  | "stock_flag_mismatch"
  | "invalid_brand_reference"
  | "invalid_category_reference";

export type CatalogHealthRow = {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  issues: CatalogHealthIssue[];
  issue_count: number;
  is_active: boolean;
  updated_at: string;
};

export type CatalogHealthSummary = {
  total_products: number;
  products_with_issues: number;
  missing_images: number;
  missing_brand: number;
  missing_category: number;
  invalid_price: number;
  stock_mismatch: number;
};

export const duplicateAdminProduct = async (productId: string) => {
  await requireAdminPermission("products.edit");
  const { data, error } = await (supabase as any).rpc("admin_duplicate_product", { p_product_id: productId });
  if (error) throw error;
  if (!data) throw new Error("لم يتم إنشاء نسخة المنتج");
  return String(data);
};

export const quickUpdateAdminProduct = async (productId: string, patch: ProductQuickPatch) => {
  if (Object.keys(patch).length === 0) return null;

  const inventoryFields = "stock_quantity" in patch || "in_stock" in patch;
  const productFields = Object.keys(patch).some((field) => !["stock_quantity", "in_stock"].includes(field));
  if (inventoryFields) await requireAdminPermission("inventory.adjust");
  if (productFields) await requireAdminPermission("products.edit");

  const { data, error } = await (supabase as any).rpc("admin_quick_update_product", {
    p_product_id: productId,
    p_patch: patch,
  });
  if (error) throw error;
  return data as Record<string, unknown> | null;
};

export const getCatalogHealth = async (limit = 250) => {
  const { data, error } = await (supabase as any).rpc("admin_catalog_health", { p_limit: Math.max(1, Math.min(2000, limit)) });
  if (error) throw error;
  return (data ?? []) as CatalogHealthRow[];
};

export const getCatalogHealthSummary = async () => {
  const { data, error } = await (supabase as any).rpc("admin_catalog_health_summary");
  if (error) throw error;
  return (data ?? {
    total_products: 0,
    products_with_issues: 0,
    missing_images: 0,
    missing_brand: 0,
    missing_category: 0,
    invalid_price: 0,
    stock_mismatch: 0,
  }) as CatalogHealthSummary;
};

export type ProductInventoryMode = "simple" | "sku";

export const getProductInventoryModes = async (productIds: string[]) => {
  const uniqueIds = Array.from(new Set(productIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, ProductInventoryMode>();

  const { data, error } = await (supabase as any)
    .from("inventory_skus")
    .select("product_id,is_default")
    .in("product_id", uniqueIds)
    .eq("is_default", false);
  if (error) throw error;

  const complex = new Set<string>((data ?? []).map((row: any) => String(row.product_id)));
  return new Map(uniqueIds.map((id) => [id, complex.has(id) ? "sku" : "simple"] as const));
};

export const CATALOG_ISSUE_LABELS: Record<CatalogHealthIssue, string> = {
  missing_images: "بدون صور",
  missing_brand: "بدون ماركة",
  missing_category: "بدون قسم",
  invalid_price: "سعر غير صالح",
  missing_name: "الاسم الإنجليزي ناقص",
  missing_name_ar: "الاسم العربي ناقص",
  missing_slug: "الرابط المختصر ناقص",
  stock_flag_mismatch: "حالة المخزون غير متطابقة",
  invalid_brand_reference: "مرجع الماركة غير صالح",
  invalid_category_reference: "مرجع القسم غير صالح",
};