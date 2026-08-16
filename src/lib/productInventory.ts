import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface InventorySkuRow {
  id: string;
  product_id: string;
  variant_key: string;
  label: string;
  color_name: string | null;
  color_hex: string | null;
  color_hex2: string | null;
  size: string | null;
  stock_quantity: number;
  is_default: boolean;
}

export interface InventoryVariantSize {
  size: string;
  stock?: number;
}

export interface InventoryColorVariant {
  name?: string;
  hex?: string;
  hex2?: string;
  sizes?: Array<string | InventoryVariantSize>;
  stock?: number;
}

export interface InventoryPayloadItem {
  variant_key: string;
  label: string;
  color_name: string | null;
  color_hex: string | null;
  color_hex2: string | null;
  size: string | null;
  stock_quantity: number;
  is_default: boolean;
}

const safeStock = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
};

const keyPart = (value: string) => encodeURIComponent(value.trim().toLowerCase());

export const buildInventoryPayload = (colorVariants: InventoryColorVariant[] = [], fallbackStock = 0, standaloneSizes: Array<string | InventoryVariantSize> = []): InventoryPayloadItem[] => {
  const payload: InventoryPayloadItem[] = [];

  colorVariants.forEach((variant, colorIndex) => {
    const colorName = String(variant.name || `خيار ${colorIndex + 1}`).trim();
    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];

    if (sizes.length > 0) {
      sizes.forEach((entry) => {
        const size = typeof entry === "string" ? entry.trim() : String(entry?.size || "").trim();
        if (!size) return;

        payload.push({
          variant_key: `color:${colorIndex + 1}:${keyPart(colorName)}:size:${keyPart(size)}`,
          label: `${colorName} / ${size}`,
          color_name: colorName,
          color_hex: variant.hex || null,
          color_hex2: variant.hex2 || null,
          size,
          stock_quantity: safeStock(typeof entry === "string" ? 0 : entry.stock),
          is_default: false,
        });
      });
      return;
    }

    payload.push({
      variant_key: `color:${colorIndex + 1}:${keyPart(colorName)}`,
      label: colorName,
      color_name: colorName,
      color_hex: variant.hex || null,
      color_hex2: variant.hex2 || null,
      size: null,
      stock_quantity: safeStock(variant.stock),
      is_default: false,
    });
  });

  if (colorVariants.length === 0 && standaloneSizes.length > 0) {
    standaloneSizes.forEach((entry) => {
      const size = typeof entry === "string" ? entry.trim() : String(entry?.size || "").trim();
      if (!size) return;

      payload.push({
        variant_key: `size:${keyPart(size)}`,
        label: `مقاس ${size}`,
        color_name: null,
        color_hex: null,
        color_hex2: null,
        size,
        stock_quantity: safeStock(typeof entry === "string" ? 0 : entry.stock),
        is_default: false,
      });
    });
  }

  if (payload.length === 0) {
    payload.push({
      variant_key: "default",
      label: "المخزون العام",
      color_name: null,
      color_hex: null,
      color_hex2: null,
      size: null,
      stock_quantity: safeStock(fallbackStock),
      is_default: true,
    });
  }

  return payload;
};

export const syncProductInventory = async (productId: string, colorVariants: InventoryColorVariant[] = [], fallbackStock = 0, standaloneSizes: Array<string | InventoryVariantSize> = []) => {
  let items = buildInventoryPayload(colorVariants, fallbackStock, standaloneSizes);

  // لو كان المنتج بلا ألوان لكن لديه مقاسات مستقلة أُنشئت من مركز المخزون،
  // لا نحولها بالخطأ إلى مخزون عام عند تعديل الاسم أو السعر من صفحة المنتج.
  if (colorVariants.length === 0 && standaloneSizes.length === 0) {
    const existing = await fetchProductInventory(productId).catch(() => [] as InventorySkuRow[]);
    const standaloneExisting = existing.filter((sku) => !sku.is_default && !sku.color_name && Boolean(sku.size));

    if (standaloneExisting.length > 0) {
      items = existing.map((sku) => ({
        variant_key: sku.variant_key,
        label: sku.label,
        color_name: sku.color_name,
        color_hex: sku.color_hex,
        color_hex2: sku.color_hex2,
        size: sku.size,
        stock_quantity: safeStock(sku.stock_quantity),
        is_default: sku.is_default,
      }));
    }
  }

  const { error } = await supabase.rpc("replace_product_inventory_skus", {
    p_product_id: productId,
    p_items: items as unknown as Json,
  });

  if (error) throw error;
  return items;
};

export const fetchProductInventory = async (productId: string): Promise<InventorySkuRow[]> => {
  const { data, error } = await supabase.from("inventory_skus").select("id,product_id,variant_key,label,color_name,color_hex,color_hex2,size,stock_quantity,is_default").eq("product_id", productId).order("is_default", { ascending: true }).order("label", { ascending: true });

  if (error) throw error;
  return (data || []) as InventorySkuRow[];
};

export const getInventoryStock = (skus: InventorySkuRow[], colorName?: string | null, size?: string | null) => {
  const color = String(colorName || "").trim().toLowerCase();
  const normalizedSize = String(size || "").trim().toLowerCase();

  if (color && normalizedSize) {
    const exact = skus.find((sku) => !sku.is_default && String(sku.color_name || "").trim().toLowerCase() === color && String(sku.size || "").trim().toLowerCase() === normalizedSize);
    if (exact) return safeStock(exact.stock_quantity);
  }

  if (!color && normalizedSize) {
    const exact = skus.find((sku) => !sku.is_default && !sku.color_name && String(sku.size || "").trim().toLowerCase() === normalizedSize);
    if (exact) return safeStock(exact.stock_quantity);
  }

  if (color) {
    const colorRows = skus.filter((sku) => !sku.is_default && String(sku.color_name || "").trim().toLowerCase() === color);
    if (colorRows.length > 0) return colorRows.reduce((sum, sku) => sum + safeStock(sku.stock_quantity), 0);
  }

  const defaultSku = skus.find((sku) => sku.is_default);
  if (defaultSku) return safeStock(defaultSku.stock_quantity);

  return skus.reduce((sum, sku) => sum + safeStock(sku.stock_quantity), 0);
};

export const getInventorySizes = (skus: InventorySkuRow[], colorName?: string | null) => {
  const color = String(colorName || "").trim().toLowerCase();

  const rows = skus.filter((sku) => {
    if (sku.is_default || !sku.size) return false;
    if (!color) return !sku.color_name;
    return String(sku.color_name || "").trim().toLowerCase() === color;
  });

  return Array.from(new Map(rows.map((sku) => [String(sku.size), safeStock(sku.stock_quantity)])).entries()).map(([size, stock]) => ({ size, stock }));
};
