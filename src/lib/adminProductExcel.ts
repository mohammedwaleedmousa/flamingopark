import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { exportXlsx } from "@/lib/xlsxExport";
import { readXlsxObjects, type XlsxCellValue } from "@/lib/xlsxImport";
import { quickUpdateAdminProduct } from "@/lib/adminProductTools";
import { requireAdminPermission } from "@/lib/adminPermissionActions";

const BOOLEAN_VALUES = new Map<string, boolean>([
  ["true", true], ["false", false], ["1", true], ["0", false],
  ["yes", true], ["no", false], ["نعم", true], ["لا", false],
  ["active", true], ["inactive", false], ["نشط", true], ["غير نشط", false],
]);

const asText = (value: XlsxCellValue | undefined) => String(value ?? "").trim();
const asOptionalText = (value: XlsxCellValue | undefined) => {
  const result = asText(value);
  return result || null;
};
const asNumber = (value: XlsxCellValue | undefined) => {
  if (typeof value === "number") return value;
  const normalized = asText(value).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[,،]/g, ".");
  return normalized === "" ? Number.NaN : Number(normalized);
};
const asBoolean = (value: XlsxCellValue | undefined) => {
  if (typeof value === "boolean") return value;
  return BOOLEAN_VALUES.get(asText(value).toLowerCase());
};

const uuidSchema = z.string().uuid();
const productCreateSchema = z.object({
  name: z.string().min(1).optional(),
  name_ar: z.string().min(1).optional(),
  price: z.number().positive(),
  original_price: z.number().positive().nullable().optional(),
  discount: z.number().int().min(0).max(100).optional(),
  brand_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  audience: z.enum(["men", "women", "kids", "unisex"]).nullable().optional(),
}).refine((row) => Boolean(row.name || row.name_ar), "يلزم الاسم العربي أو الإنجليزي");

export type ProductExcelPreviewRow = {
  rowNumber: number;
  mode: "create" | "update" | "skip" | "error";
  productId: string | null;
  productName: string;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  errors: string[];
  payload: Record<string, unknown>;
};

export type InventoryExcelPreviewRow = {
  rowNumber: number;
  mode: "update" | "skip" | "error";
  skuId: string | null;
  label: string;
  before: number | null;
  after: number | null;
  errors: string[];
};

const productColumns = [
  { key: "id", header: "id", width: 38 },
  { key: "name_ar", header: "name_ar", width: 34 },
  { key: "name", header: "name", width: 34 },
  { key: "price", header: "price", width: 14 },
  { key: "is_active", header: "is_active", width: 14 },
  { key: "brand_id", header: "brand_id", width: 38 },
  { key: "brand", header: "brand", width: 24 },
  { key: "category_id", header: "category_id", width: 38 },
  { key: "category", header: "category", width: 24 },
  { key: "audience", header: "audience", width: 14 },
  { key: "original_price", header: "original_price", width: 16 },
  { key: "discount", header: "discount", width: 12 },
] as const;

const inventoryColumns = [
  { key: "sku_id", header: "sku_id", width: 38 },
  { key: "product_id", header: "product_id", width: 38 },
  { key: "product_name", header: "product_name", width: 34 },
  { key: "variant_key", header: "variant_key", width: 28 },
  { key: "label", header: "label", width: 26 },
  { key: "color_name", header: "color_name", width: 18 },
  { key: "size", header: "size", width: 12 },
  { key: "stock_quantity", header: "stock_quantity", width: 16 },
] as const;

export const exportProductUpdateWorkbook = async () => {
  const { data, error } = await (supabase as any)
    .from("products")
    .select("id,name_ar,name,price,is_active,brand_id,brand,category_id,category,audience,original_price,discount")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  exportXlsx({ filename: `flamingo-products-${new Date().toISOString().slice(0, 10)}`, sheetName: "Products", columns: [...productColumns], rows: data ?? [] });
};

export const exportInventoryWorkbook = async () => {
  const { data, error } = await (supabase as any)
    .from("inventory_skus")
    .select("id,product_id,variant_key,label,color_name,size,stock_quantity,products(name,name_ar)")
    .order("product_id")
    .order("variant_key");
  if (error) throw error;
  const rows = (data ?? []).map((row: any) => ({
    sku_id: row.id,
    product_id: row.product_id,
    product_name: row.products?.name_ar || row.products?.name || "",
    variant_key: row.variant_key,
    label: row.label,
    color_name: row.color_name,
    size: row.size,
    stock_quantity: row.stock_quantity,
  }));
  exportXlsx({ filename: `flamingo-inventory-skus-${new Date().toISOString().slice(0, 10)}`, sheetName: "Inventory", columns: [...inventoryColumns], rows });
};

export const previewProductWorkbook = async (file: File): Promise<ProductExcelPreviewRow[]> => {
  const rows = await readXlsxObjects(file);
  const ids = rows.map((row) => asText(row.id)).filter(Boolean);
  const { data: existing, error } = ids.length
    ? await (supabase as any).from("products").select("id,name,name_ar,price,is_active,brand_id,category_id,audience,original_price,discount").in("id", ids)
    : { data: [], error: null } as any;
  if (error) throw error;
  const existingById = new Map<string, any>((existing ?? []).map((row: any) => [row.id, row]));

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const id = asText(row.id);
    const before = id ? existingById.get(id) : null;
    const errors: string[] = [];

    if (id && !uuidSchema.safeParse(id).success) errors.push("id غير صالح");
    if (id && !before) errors.push("المنتج غير موجود لهذا id");

    if (!id) {
      const price = asNumber(row.price);
      const originalPriceRaw = asOptionalText(row.original_price);
      const discountRaw = asOptionalText(row.discount);
      const brandId = asOptionalText(row.brand_id);
      const categoryId = asOptionalText(row.category_id);
      const audienceRaw = asOptionalText(row.audience);
      const parsed = productCreateSchema.safeParse({
        name: asOptionalText(row.name) || undefined,
        name_ar: asOptionalText(row.name_ar) || undefined,
        price,
        original_price: originalPriceRaw ? asNumber(row.original_price) : null,
        discount: discountRaw ? asNumber(row.discount) : 0,
        brand_id: brandId,
        category_id: categoryId,
        audience: audienceRaw || null,
      });
      if (!parsed.success) errors.push(...parsed.error.issues.map((issue) => issue.message));
      return {
        rowNumber,
        mode: errors.length ? "error" : "create",
        productId: null,
        productName: asText(row.name_ar) || asText(row.name) || "منتج جديد",
        changes: [{ field: "create", before: null, after: "مسودة غير منشورة" }],
        errors,
        payload: parsed.success ? parsed.data : {},
      };
    }

    const patch: Record<string, unknown> = {};
    const changes: ProductExcelPreviewRow["changes"] = [];
    const maybeChange = (field: string, after: unknown) => {
      const previous = before?.[field] ?? null;
      if (after !== undefined && String(previous ?? "") !== String(after ?? "")) {
        patch[field] = after;
        changes.push({ field, before: previous, after });
      }
    };

    if (asOptionalText(row.price) !== null) {
      const value = asNumber(row.price);
      if (!Number.isFinite(value) || value <= 0) errors.push("السعر يجب أن يكون أكبر من صفر"); else maybeChange("price", value);
    }
    if (asOptionalText(row.is_active) !== null) {
      const value = asBoolean(row.is_active);
      if (value === undefined) errors.push("is_active يجب أن يكون true/false أو نعم/لا"); else maybeChange("is_active", value);
    }
    if (Object.prototype.hasOwnProperty.call(row, "brand_id") && asOptionalText(row.brand_id) !== null) {
      const value = asText(row.brand_id);
      if (!uuidSchema.safeParse(value).success) errors.push("brand_id غير صالح"); else maybeChange("brand_id", value);
    }
    if (Object.prototype.hasOwnProperty.call(row, "category_id") && asOptionalText(row.category_id) !== null) {
      const value = asText(row.category_id);
      if (!uuidSchema.safeParse(value).success) errors.push("category_id غير صالح"); else maybeChange("category_id", value);
    }

    return {
      rowNumber,
      mode: errors.length ? "error" : changes.length ? "update" : "skip",
      productId: id,
      productName: before?.name_ar || before?.name || id,
      changes,
      errors,
      payload: patch,
    };
  });
};

export const applyProductWorkbookPreview = async (preview: ProductExcelPreviewRow[]) => {
  if (preview.some((row) => row.mode === "error")) throw new Error("يوجد صفوف فيها أخطاء. أصلحها قبل التنفيذ.");
  const actionable = preview.filter((row) => row.mode === "create" || row.mode === "update");
  if (actionable.length === 0) return 0;

  await requireAdminPermission("products.bulk_update");
  await requireAdminPermission("products.edit");

  for (const row of actionable) {
    if (row.mode === "update" && row.productId) {
      await quickUpdateAdminProduct(row.productId, row.payload as any);
    } else if (row.mode === "create") {
      const { error } = await (supabase as any).rpc("admin_create_product_draft_from_excel", { p_row: row.payload });
      if (error) throw new Error(`فشل الصف ${row.rowNumber}: ${error.message}`);
    }
  }
  return actionable.length;
};

export const previewInventoryWorkbook = async (file: File): Promise<InventoryExcelPreviewRow[]> => {
  const rows = await readXlsxObjects(file);
  const ids = rows.map((row) => asText(row.sku_id)).filter(Boolean);
  const { data, error } = ids.length
    ? await (supabase as any).from("inventory_skus").select("id,label,size,color_name,stock_quantity").in("id", ids)
    : { data: [], error: null } as any;
  if (error) throw error;
  const byId = new Map<string, any>((data ?? []).map((row: any) => [row.id, row]));

  return rows.map((row, index) => {
    const rowNumber = index + 2;
    const skuId = asText(row.sku_id);
    const errors: string[] = [];
    if (!uuidSchema.safeParse(skuId).success) errors.push("sku_id غير صالح");
    const before = byId.get(skuId);
    if (skuId && !before) errors.push("SKU غير موجود");
    const stock = asNumber(row.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) errors.push("stock_quantity يجب أن يكون عددًا صحيحًا غير سالب");
    const current = before ? Number(before.stock_quantity ?? 0) : null;
    return {
      rowNumber,
      mode: errors.length ? "error" : current === stock ? "skip" : "update",
      skuId: skuId || null,
      label: before ? [before.color_name, before.size, before.label].filter(Boolean).join(" • ") : skuId || "SKU",
      before: current,
      after: Number.isFinite(stock) ? stock : null,
      errors,
    };
  });
};

export const applyInventoryWorkbookPreview = async (preview: InventoryExcelPreviewRow[]) => {
  if (preview.some((row) => row.mode === "error")) throw new Error("يوجد صفوف مخزون فيها أخطاء. أصلحها قبل التنفيذ.");
  const actionable = preview.filter((row) => row.mode === "update");
  if (actionable.length === 0) return 0;

  await requireAdminPermission("inventory.adjust");
  for (const row of actionable) {
    const { error } = await (supabase as any).rpc("admin_update_inventory_sku_from_excel", { p_sku_id: row.skuId, p_stock_quantity: row.after });
    if (error) throw new Error(`فشل الصف ${row.rowNumber}: ${error.message}`);
  }
  return actionable.length;
};