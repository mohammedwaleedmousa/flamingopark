import { useEffect, useMemo, useState, type LucideIcon, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useCurrency } from "@/lib/currency";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, History, Layers3, Loader2, Minus, Package, PackagePlus, Pencil, Plus, RefreshCw, RotateCcw, Save, Search, SlidersHorizontal, Trash2, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAdminProductCostMap } from "@/lib/admin/productCosts";

type VariantSizeEntry = string | { size?: string; stock?: number };

interface ColorVariant {
  name?: string;
  hex?: string;
  hex2?: string;
  sizes?: VariantSizeEntry[];
  stock?: number;
  size_stock?: Record<string, number>;
  images?: string[];
}

interface Product {
  id: string;
  name: string;
  name_ar: string;
  brand: string | null;
  cost_price: number | null;
  price: number;
  stock_quantity: number;
  in_stock: boolean | null;
  is_active: boolean | null;
  images: string[] | null;
  color_variants: ColorVariant[] | null;
  has_sizes: boolean | null;
  sizes: string[] | null;
  has_quality_variants: boolean | null;
}

interface InventorySku {
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

interface Adjustment {
  id: string;
  product_name: string | null;
  variant_label: string | null;
  adjustment_type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  product_quantity_before: number | null;
  product_quantity_after: number | null;
  reason: string;
  reference: string | null;
  created_at: string;
}

interface InventorySummary {
  total_products: number;
  active_products: number;
  total_units: number;
  inventory_value: number;
  low_stock: number;
  out_of_stock: number;
  sku_tracked: number;
}

interface EditableSku {
  variant_key: string;
  label: string;
  color_name: string;
  color_hex: string;
  color_hex2: string;
  size: string;
  stock_quantity: number;
  is_default: boolean;
}

type AdjustmentType = "increase" | "decrease" | "recount" | "damage";
type StockFilter = "all" | "available" | "low" | "out" | "inactive";
type ViewMode = "inventory" | "history";

const PRODUCT_PAGE_SIZE = 30;
const HISTORY_PAGE_SIZE = 40;

const TYPES: Record<AdjustmentType, { label: string; description: string; icon: LucideIcon; badge: string; iconStyle: string }> = {
  increase: { label: "زيادة", description: "إضافة كمية جديدة", icon: TrendingUp, badge: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]", iconStyle: "bg-[#EAF7EE] text-[#629067]" },
  decrease: { label: "نقص", description: "إنقاص من الرصيد", icon: TrendingDown, badge: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]", iconStyle: "bg-[#FFF5E5] text-[#C38838]" },
  recount: { label: "جرد", description: "تعيين العدد الفعلي", icon: ClipboardCheck, badge: "border-[#DCE7F5] bg-[#F1F6FC] text-[#5679A4]", iconStyle: "bg-[#EDF4FF] text-[#5680CF]" },
  damage: { label: "تالف", description: "إخراج قطع تالفة", icon: AlertTriangle, badge: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]", iconStyle: "bg-[#FFF0ED] text-[#D06A5E]" },
};

const safeInt = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
};

const slugPart = (value: string) => encodeURIComponent(value.trim().toLowerCase());

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const getVariantSizeEntries = (variant: ColorVariant) => {
  const result: Array<{ size: string; stock: number }> = [];
  const raw = Array.isArray(variant.sizes) ? variant.sizes : [];

  raw.forEach((entry) => {
    if (typeof entry === "string") {
      const size = entry.trim();
      if (!size) return;
      result.push({ size, stock: safeInt(variant.size_stock?.[size]) });
      return;
    }

    const size = String(entry?.size || "").trim();
    if (!size) return;
    result.push({ size, stock: safeInt(entry?.stock ?? variant.size_stock?.[size]) });
  });

  return result;
};

const makeSkuLabel = (sku: Pick<EditableSku, "color_name" | "size" | "is_default">) => {
  if (sku.is_default) return "المخزون غير الموزع";
  if (sku.color_name && sku.size) return `${sku.color_name} / ${sku.size}`;
  if (sku.color_name) return `${sku.color_name} / غير موزع`;
  if (sku.size) return `مقاس ${sku.size}`;
  return "المخزون العام";
};

const AdminInventoryAdjustmentsPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [view, setView] = useState<ViewMode>("inventory");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [filter, setFilter] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);

  const [historySearchInput, setHistorySearchInput] = useState("");
  const historySearch = useDebounce(historySearchInput, 300);
  const [historyType, setHistoryType] = useState<"all" | AdjustmentType>("all");
  const [historyPage, setHistoryPage] = useState(1);

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeSkuId, setActiveSkuId] = useState("");
  const [adjustmentForm, setAdjustmentForm] = useState({ adjustment_type: "increase" as AdjustmentType, quantity: "", reason: "", reference: "", notes: "" });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorProduct, setEditorProduct] = useState<Product | null>(null);
  const [editableSkus, setEditableSkus] = useState<EditableSku[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newSizeColor, setNewSizeColor] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  useEffect(() => setPage(1), [search, filter]);
  useEffect(() => setHistoryPage(1), [historySearch, historyType]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["inventory-summary-rpc"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_inventory_summary");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return {
        total_products: Number(row?.total_products || 0),
        active_products: Number(row?.active_products || 0),
        total_units: Number(row?.total_units || 0),
        inventory_value: Number(row?.inventory_value || 0),
        low_stock: Number(row?.low_stock || 0),
        out_of_stock: Number(row?.out_of_stock || 0),
        sku_tracked: Number(row?.sku_tracked || 0),
      } as InventorySummary;
    },
    staleTime: 20_000,
  });

  const { data: productResult, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ["inventory-products", page, search, filter],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,name_ar,brand,price,stock_quantity,in_stock,is_active,images,color_variants,has_sizes,sizes,has_quality_variants", { count: "exact" });

      if (search.trim()) {
        const safe = search.trim().replace(/[,%()]/g, " ");
        query = query.or(`name_ar.ilike.%${safe}%,name.ilike.%${safe}%,brand.ilike.%${safe}%`);
      }

      if (filter === "available") query = query.eq("is_active", true).gt("stock_quantity", 3);
      if (filter === "low") query = query.eq("is_active", true).gt("stock_quantity", 0).lte("stock_quantity", 3);
      if (filter === "out") query = query.eq("is_active", true).eq("stock_quantity", 0);
      if (filter === "inactive") query = query.eq("is_active", false);

      const from = (page - 1) * PRODUCT_PAGE_SIZE;
      const { data, count, error } = await query.order("stock_quantity", { ascending: true }).order("name_ar", { ascending: true }).range(from, from + PRODUCT_PAGE_SIZE - 1);
      if (error) throw error;

      const rows = (data || []) as Omit<Product, "cost_price">[];
      const costs = await fetchAdminProductCostMap(rows.map((product) => product.id));

      return { rows: rows.map((product) => ({ ...product, cost_price: costs.get(product.id) ?? null })), total: count || 0 };
    },
    staleTime: 15_000,
  });

  const products = productResult?.rows || [];
  const productsTotal = productResult?.total || 0;
  const productIds = useMemo(() => products.map((product) => product.id), [products]);

  const { data: pageSkus = [] } = useQuery({
    queryKey: ["inventory-page-skus", productIds],
    enabled: productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_skus").select("id,product_id,variant_key,label,color_name,color_hex,color_hex2,size,stock_quantity,is_default").in("product_id", productIds).order("is_default", { ascending: true }).order("label", { ascending: true });
      if (error) throw error;
      return (data || []) as InventorySku[];
    },
  });

  const skusByProduct = useMemo(() => {
    const map: Record<string, InventorySku[]> = {};
    pageSkus.forEach((sku) => {
      if (!map[sku.product_id]) map[sku.product_id] = [];
      map[sku.product_id].push(sku);
    });
    return map;
  }, [pageSkus]);

  const { data: adjustmentSkus = [], isFetching: adjustmentSkusFetching } = useQuery({
    queryKey: ["inventory-product-skus", activeProduct?.id || "none"],
    enabled: Boolean(activeProduct?.id && adjustmentOpen),
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_skus").select("id,product_id,variant_key,label,color_name,color_hex,color_hex2,size,stock_quantity,is_default").eq("product_id", activeProduct!.id).order("is_default", { ascending: true }).order("label", { ascending: true });
      if (error) throw error;
      return (data || []) as InventorySku[];
    },
  });

  const { data: editorSkus = [], isFetching: editorSkusFetching } = useQuery({
    queryKey: ["inventory-product-skus", editorProduct?.id || "none"],
    enabled: Boolean(editorProduct?.id && editorOpen),
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_skus").select("id,product_id,variant_key,label,color_name,color_hex,color_hex2,size,stock_quantity,is_default").eq("product_id", editorProduct!.id).order("is_default", { ascending: true }).order("label", { ascending: true });
      if (error) throw error;
      return (data || []) as InventorySku[];
    },
  });

  const { data: historyResult, isLoading: historyLoading, isFetching: historyFetching } = useQuery({
    queryKey: ["inventory-adjustments", historyPage, historySearch, historyType],
    queryFn: async () => {
      let query = supabase.from("inventory_adjustments").select("*", { count: "exact" });

      if (historyType !== "all") query = query.eq("adjustment_type", historyType);

      if (historySearch.trim()) {
        const safe = historySearch.trim().replace(/[,%()]/g, " ");
        query = query.or(`product_name.ilike.%${safe}%,variant_label.ilike.%${safe}%,reason.ilike.%${safe}%,reference.ilike.%${safe}%`);
      }

      const from = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, from + HISTORY_PAGE_SIZE - 1);
      if (error) throw error;

      return { rows: (data || []) as Adjustment[], total: count || 0 };
    },
    staleTime: 10_000,
  });

  const adjustments = historyResult?.rows || [];
  const historyTotal = historyResult?.total || 0;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory-summary-rpc"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-products"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-page-skus"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-product-skus"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
      queryClient.invalidateQueries({ queryKey: ["product"] }),
    ]);
  };

  const openAdjustment = (product: Product, sku?: InventorySku) => {
    setEditorOpen(false);
    setEditorProduct(null);
    setEditableSkus([]);
    setActiveProduct(product);
    setActiveSkuId(sku?.id || "");
    setAdjustmentForm({ adjustment_type: "increase", quantity: "", reason: "", reference: "", notes: "" });
    setAdjustmentOpen(true);
  };

  const activeSku = adjustmentSkus.find((sku) => sku.id === activeSkuId) || null;
  const currentQty = activeSku ? safeInt(activeSku.stock_quantity) : safeInt(activeProduct?.stock_quantity);
  const enteredQty = safeInt(adjustmentForm.quantity);

  const afterQty = useMemo(() => {
    if (!adjustmentForm.quantity) return currentQty;
    if (adjustmentForm.adjustment_type === "increase") return currentQty + enteredQty;
    if (adjustmentForm.adjustment_type === "recount") return enteredQty;
    return Math.max(0, currentQty - enteredQty);
  }, [adjustmentForm.quantity, adjustmentForm.adjustment_type, currentQty, enteredQty]);

  const invalidDecrease = ["decrease", "damage"].includes(adjustmentForm.adjustment_type) && enteredQty > currentQty;

  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!activeProduct) throw new Error("المنتج غير محدد.");

      const quantity = Number(adjustmentForm.quantity);
      if (!Number.isInteger(quantity)) throw new Error("الكمية يجب أن تكون رقمًا صحيحًا.");
      if (adjustmentForm.adjustment_type === "recount" ? quantity < 0 : quantity <= 0) throw new Error("أدخل كمية صحيحة.");
      if (!adjustmentForm.reason.trim()) throw new Error("سبب التسوية مطلوب.");
      if (invalidDecrease) throw new Error(`المتاح ${currentQty} فقط.`);

      const distributedSkus = adjustmentSkus.filter((sku) => !sku.is_default);
      if (distributedSkus.length > 1 && !activeSkuId && !adjustmentSkus.some((sku) => sku.is_default)) throw new Error("اختر اللون أو المقاس الذي تريد تعديل مخزونه.");

      const { error } = await supabase.rpc("apply_inventory_adjustment", {
        p_product_id: activeProduct.id,
        p_adjustment_type: adjustmentForm.adjustment_type,
        p_quantity: quantity,
        p_reason: adjustmentForm.reason.trim(),
        p_reference: adjustmentForm.reference.trim() || null,
        p_notes: adjustmentForm.notes.trim() || null,
        p_inventory_sku_id: activeSkuId || null,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "تم تحديث المخزون", description: "تم تحديث الرصيد وتسجيل الحركة بنجاح." });
      setAdjustmentOpen(false);
      setActiveProduct(null);
      setActiveSkuId("");
      await refresh();
    },
    onError: (error) => toast({ title: "تعذر تحديث المخزون", description: error instanceof Error ? error.message : "حدث خطأ.", variant: "destructive" }),
  });

  const buildEditableSkus = (product: Product, existing: InventorySku[]) => {
    const existingMap = new Map<string, InventorySku>();

    existing.forEach((sku) => {
      const signature = `${String(sku.color_name || "").trim().toLowerCase()}||${String(sku.size || "").trim().toLowerCase()}||${sku.is_default ? "default" : "variant"}`;
      existingMap.set(signature, sku);
    });

    const result: EditableSku[] = [];
    const seenSignatures = new Set<string>();
    const variants = Array.isArray(product.color_variants) ? product.color_variants : [];
    const globalSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
    const defaultSku = existing.find((sku) => sku.is_default);

    if (defaultSku && safeInt(defaultSku.stock_quantity) > 0) {
      result.push({ variant_key: defaultSku.variant_key, label: defaultSku.label || "المخزون غير الموزع", color_name: "", color_hex: "", color_hex2: "", size: "", stock_quantity: safeInt(defaultSku.stock_quantity), is_default: true });
      seenSignatures.add("||||default");
    }

    variants.forEach((variant, variantIndex) => {
      const color = String(variant.name || `خيار ${variantIndex + 1}`).trim();
      const sizeEntries = getVariantSizeEntries(variant);
      const fallbackSizes = sizeEntries.length > 0 ? sizeEntries : product.has_sizes ? globalSizes.map((size) => ({ size: String(size), stock: safeInt(variant.size_stock?.[String(size)]) })) : [];

      if (fallbackSizes.length > 0) {
        fallbackSizes.forEach((entry) => {
          const size = String(entry.size).trim();
          if (!size) return;
          const signature = `${color.toLowerCase()}||${size.toLowerCase()}||variant`;
          const current = existingMap.get(signature);

          result.push({
            variant_key: current?.variant_key || `color:${variantIndex + 1}:${slugPart(color)}:size:${slugPart(size)}`,
            label: `${color} / ${size}`,
            color_name: color,
            color_hex: String(variant.hex || ""),
            color_hex2: String(variant.hex2 || ""),
            size,
            stock_quantity: safeInt(current?.stock_quantity ?? entry.stock),
            is_default: false,
          });

          seenSignatures.add(signature);
        });
      } else {
        const signature = `${color.toLowerCase()}||||variant`;
        const current = existingMap.get(signature);

        result.push({
          variant_key: current?.variant_key || `color:${variantIndex + 1}:${slugPart(color)}`,
          label: `${color} / غير موزع`,
          color_name: color,
          color_hex: String(variant.hex || ""),
          color_hex2: String(variant.hex2 || ""),
          size: "",
          stock_quantity: safeInt(current?.stock_quantity ?? variant.stock),
          is_default: false,
        });

        seenSignatures.add(signature);
      }
    });

    if (variants.length === 0 && product.has_sizes && globalSizes.length > 0) {
      globalSizes.forEach((sizeValue) => {
        const size = String(sizeValue).trim();
        if (!size) return;
        const signature = `||${size.toLowerCase()}||variant`;
        const current = existingMap.get(signature);

        result.push({
          variant_key: current?.variant_key || `size:${slugPart(size)}`,
          label: `مقاس ${size}`,
          color_name: "",
          color_hex: "",
          color_hex2: "",
          size,
          stock_quantity: safeInt(current?.stock_quantity),
          is_default: false,
        });

        seenSignatures.add(signature);
      });
    }

    existing.filter((sku) => !sku.is_default).forEach((sku) => {
      const signature = `${String(sku.color_name || "").trim().toLowerCase()}||${String(sku.size || "").trim().toLowerCase()}||variant`;
      if (seenSignatures.has(signature)) return;

      result.push({
        variant_key: sku.variant_key,
        label: sku.label,
        color_name: sku.color_name || "",
        color_hex: sku.color_hex || "",
        color_hex2: sku.color_hex2 || "",
        size: sku.size || "",
        stock_quantity: safeInt(sku.stock_quantity),
        is_default: false,
      });

      seenSignatures.add(signature);
    });

    if (result.length === 0) {
      const current = defaultSku || existing[0];
      result.push({ variant_key: current?.variant_key || "default", label: "المخزون العام", color_name: "", color_hex: "", color_hex2: "", size: "", stock_quantity: safeInt(current?.stock_quantity ?? product.stock_quantity), is_default: true });
    }

    return result;
  };

  const openEditor = (product: Product) => {
    setAdjustmentOpen(false);
    setActiveProduct(null);
    setActiveSkuId("");
    setEditorProduct(product);
    setEditableSkus([]);
    setNewSize("");
    setNewSizeColor("");
    setEditorOpen(true);
  };

  useEffect(() => {
    if (!editorOpen || !editorProduct || editorSkusFetching) return;
    setEditableSkus(buildEditableSkus(editorProduct, editorSkus));
    const colors = Array.from(new Set((editorProduct.color_variants || []).map((variant) => String(variant.name || "").trim()).filter(Boolean)));
    setNewSizeColor((current) => current || colors[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen, editorProduct?.id, editorSkusFetching, editorSkus]);

  const editorColors = useMemo(() => {
    const fromProduct = (editorProduct?.color_variants || []).map((variant) => String(variant.name || "").trim()).filter(Boolean);
    const fromSkus = editableSkus.map((sku) => sku.color_name.trim()).filter(Boolean);
    return Array.from(new Set([...fromProduct, ...fromSkus]));
  }, [editorProduct, editableSkus]);

  const editorTotal = useMemo(() => editableSkus.reduce((sum, sku) => sum + safeInt(sku.stock_quantity), 0), [editableSkus]);

  const updateEditableSku = (index: number, patch: Partial<EditableSku>) => {
    setEditableSkus((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      return { ...next, label: makeSkuLabel(next) };
    }));
  };

  const addSizeRows = (allColors: boolean) => {
    const size = newSize.trim();
    if (!size) {
      toast({ title: "أدخل المقاس أولًا", variant: "destructive" });
      return;
    }

    const colors = editorColors.length > 0 ? (allColors ? editorColors : [newSizeColor || editorColors[0]]) : [""];
    const rows: EditableSku[] = [];

    colors.forEach((color, index) => {
      const duplicate = editableSkus.some((sku) => !sku.is_default && sku.color_name.trim().toLowerCase() === color.trim().toLowerCase() && sku.size.trim().toLowerCase() === size.toLowerCase());
      if (duplicate) return;

      const sourceVariant = (editorProduct?.color_variants || []).find((variant) => String(variant.name || "").trim().toLowerCase() === color.trim().toLowerCase());
      const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;

      const row: EditableSku = {
        variant_key: `manual:${slugPart(color || "none")}:size:${slugPart(size)}:${randomPart}`,
        label: color ? `${color} / ${size}` : `مقاس ${size}`,
        color_name: color,
        color_hex: String(sourceVariant?.hex || ""),
        color_hex2: String(sourceVariant?.hex2 || ""),
        size,
        stock_quantity: 0,
        is_default: false,
      };

      rows.push(row);
    });

    if (rows.length === 0) {
      toast({ title: "المقاس موجود بالفعل", description: "لم تتم إضافة صف مكرر." });
      return;
    }

    setEditableSkus((current) => [...current, ...rows]);
    setNewSize("");
    toast({ title: rows.length > 1 ? "تمت إضافة المقاس لكل الألوان" : "تمت إضافة المقاس", description: "حدد الكمية ثم اضغط حفظ توزيع المخزون." });
  };

  const removeEditableSku = (index: number) => {
    const sku = editableSkus[index];
    if (!sku) return;

    if (sku.is_default && safeInt(sku.stock_quantity) > 0) {
      toast({ title: "لا يمكن حذف المخزون غير الموزع", description: "اجعل كميته 0 أو وزعها على المقاسات أولًا.", variant: "destructive" });
      return;
    }

    setEditableSkus((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const saveEditorMutation = useMutation({
    mutationFn: async () => {
      if (!editorProduct) throw new Error("المنتج غير محدد.");
      if (editableSkus.length === 0) throw new Error("يجب أن يبقى للمنتج صف مخزون واحد على الأقل.");

      const signatures = new Set<string>();
      for (const sku of editableSkus) {
        const signature = `${sku.color_name.trim().toLowerCase()}||${sku.size.trim().toLowerCase()}||${sku.is_default ? "default" : "variant"}`;
        if (signatures.has(signature)) throw new Error(`يوجد مقاس مكرر: ${sku.label}`);
        signatures.add(signature);
      }

      const payload = editableSkus.map((sku) => ({
        variant_key: sku.variant_key,
        label: makeSkuLabel(sku),
        color_name: sku.color_name || null,
        color_hex: sku.color_hex || null,
        color_hex2: sku.color_hex2 || null,
        size: sku.size.trim() || null,
        stock_quantity: safeInt(sku.stock_quantity),
        is_default: sku.is_default,
      }));

      const { error } = await supabase.rpc("replace_product_inventory_skus", { p_product_id: editorProduct.id, p_items: payload });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "تم حفظ المقاسات والمخزون", description: `إجمالي المنتج أصبح ${editorTotal} قطعة، وتمت مزامنة صفحة المنتج.` });
      setEditorOpen(false);
      setEditorProduct(null);
      setEditableSkus([]);
      setNewSize("");
      setNewSizeColor("");
      await refresh();
    },
    onError: (error) => toast({ title: "تعذر حفظ التوزيع", description: error instanceof Error ? error.message : "حدث خطأ.", variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.rpc("delete_product_from_inventory", { p_product_id: productId });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast({ title: "تم حذف المنتج" });
      setDeleteTarget(null);
      await refresh();
    },
    onError: (error) => toast({ title: "تعذر حذف المنتج", description: error instanceof Error ? error.message : "حدث خطأ أثناء الحذف.", variant: "destructive" }),
  });

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المخزون" title="مركز إدارة المخزون" description="اضغط على أي منتج لفتح المقاسات والكميات وتعديلها مباشرة" actions={[{ label: "تحديث البيانات", icon: RefreshCw, onClick: () => void refresh(), variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي الوحدات" value={(summary?.total_units || 0).toLocaleString("en-US")} helper={`${summary?.active_products || 0} منتج نشط`} icon={Boxes} tone="indigo" loading={summaryLoading} />
        <StatCard title="قيمة المخزون" value={format(summary?.inventory_value || 0)} helper="بحسب سعر التكلفة" icon={Wallet} tone="green" loading={summaryLoading} />
        <StatCard title="مخزون منخفض" value={(summary?.low_stock || 0).toLocaleString("en-US")} helper="من 1 إلى 3 قطع" icon={AlertTriangle} tone="amber" loading={summaryLoading} />
        <StatCard title="موزع على خيارات" value={(summary?.sku_tracked || 0).toLocaleString("en-US")} helper={`${summary?.out_of_stock || 0} منتج نفد`} icon={Layers3} tone="blue" loading={summaryLoading} />
      </section>

      <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[6px]">
        <div className="flex gap-[5px]">
          <TabButton active={view === "inventory"} icon={Boxes} label="المنتجات والمخزون" onClick={() => setView("inventory")} />
          <TabButton active={view === "history"} icon={History} label="سجل الحركات" onClick={() => setView("history")} />
        </div>
      </section>

      {view === "inventory" ? (
        <>
          <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
            <div className="grid grid-cols-1 gap-[7px] lg:grid-cols-[minmax(0,1fr)_190px]">
              <SearchBox value={searchInput} onChange={setSearchInput} placeholder="ابحث باسم المنتج أو الماركة..." />
              <Select value={filter} onValueChange={(value) => setFilter(value as StockFilter)}>
                <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المنتجات</SelectItem>
                  <SelectItem value="available">متوفر أكثر من 3</SelectItem>
                  <SelectItem value="low">مخزون منخفض</SelectItem>
                  <SelectItem value="out">نفد المخزون</SelectItem>
                  <SelectItem value="inactive">منتجات معطلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
            <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
              <div>
                <h2 className="text-[11px] font-semibold text-[#454C56]">المخزون الحالي</h2>
                <p className="mt-[3px] text-[8px] text-[#9CA3AC]">اضغط على صف المنتج لفتح المقاسات والكميات مباشرة</p>
              </div>
              {productsFetching && <Loader2 className="h-[13px] w-[13px] animate-spin text-[#8E959F]" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9px] font-semibold text-[#858D97]">
                    <th className="px-[12px] text-right">المنتج</th>
                    <th className="px-[12px] text-right">المخزون</th>
                    <th className="px-[12px] text-right">الحالة</th>
                    <th className="px-[12px] text-right">الخيارات</th>
                    <th className="px-[12px] text-right">التكلفة</th>
                    <th className="px-[12px] text-right">قيمة المخزون</th>
                    <th className="px-[12px] text-center">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {productsLoading ? (
                    <tr><td colSpan={7} className="h-[260px] text-center"><Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" /></td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState /></td></tr>
                  ) : products.map((product) => {
                    const skus = skusByProduct[product.id] || [];
                    const distributed = skus.filter((sku) => !sku.is_default);

                    return (
                      <tr key={product.id} role="button" tabIndex={0} onClick={() => openEditor(product)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openEditor(product); }} className="h-[68px] cursor-pointer border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#F8F7FF] focus:bg-[#F8F7FF] focus:outline-none">
                        <td className="px-[12px]"><div className="flex min-w-[230px] items-center gap-[9px]"><ProductImage product={product} /><div className="min-w-0"><div className="flex items-center gap-[5px]"><p className="max-w-[220px] truncate text-[10px] font-semibold text-[#414953]">{product.name_ar}</p>{product.is_active === false && <span className="rounded-[5px] bg-[#F1F2F4] px-[5px] py-[2px] text-[5.5px] font-semibold text-[#868D96]">معطل</span>}</div><p className="mt-[3px] truncate text-[7px] text-[#9AA2AC]">{product.brand || product.name}</p></div></div></td>
                        <td className="px-[12px]"><div className="flex items-center gap-[5px]"><span className="text-[18px] font-semibold text-[#343B45]">{safeInt(product.stock_quantity)}</span><span className="text-[7px] text-[#9AA1AB]">قطعة</span></div></td>
                        <td className="px-[12px]"><StockBadge stock={safeInt(product.stock_quantity)} /></td>
                        <td className="px-[12px]">{distributed.length ? <div><span className="inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[7px] text-[6.5px] font-semibold text-[#5679A4]"><Layers3 className="h-[8px] w-[8px]" />{distributed.length} خيار</span><p className="mt-[4px] max-w-[210px] truncate text-[6px] text-[#9FA6AF]">{distributed.slice(0, 4).map((sku) => `${sku.label}: ${sku.stock_quantity}`).join(" • ")}</p></div> : <span className="text-[7px] text-[#9AA1AB]">مخزون عام</span>}</td>
                        <td className="px-[12px]"><span className="text-[9px] font-semibold text-[#59616B]">{format(Number(product.cost_price || 0))}</span></td>
                        <td className="px-[12px]"><span className="text-[9px] font-semibold text-[#59616B]">{format(safeInt(product.stock_quantity) * Number(product.cost_price || 0))}</span></td>
                        <td className="px-[12px]"><div className="flex justify-center gap-[4px]"><ActionButton label="تسوية" icon={Plus} tone="green" onClick={() => openAdjustment(product)} /><ActionButton label="المقاسات" icon={SlidersHorizontal} tone="indigo" onClick={() => openEditor(product)} /><IconAction title="تعديل المنتج" icon={Pencil} onClick={() => navigate(`/admin/products/${product.id}`)} /><IconAction title="حذف المنتج" icon={Trash2} destructive onClick={() => setDeleteTarget(product)} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-[#EAEDF1] px-[10px]"><AdminPagination page={page} pageSize={PRODUCT_PAGE_SIZE} total={productsTotal} onPageChange={setPage} /></div>
          </section>

          <section className="space-y-[8px] md:hidden">
            {productsLoading ? <LoadingCard /> : products.length === 0 ? <EmptyState /> : products.map((product) => {
              const distributed = (skusByProduct[product.id] || []).filter((sku) => !sku.is_default);
              return (
                <article key={product.id} role="button" tabIndex={0} onClick={() => openEditor(product)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openEditor(product); }} className="cursor-pointer overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white transition-colors hover:bg-[#FCFBFF]">
                  <div className="p-[11px]">
                    <div className="flex gap-[9px]"><ProductImage product={product} large /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-[6px]"><div className="min-w-0"><div className="flex items-center gap-[5px]"><h3 className="truncate text-[11px] font-semibold text-[#3F4751]">{product.name_ar}</h3>{product.is_active === false && <span className="rounded-[5px] bg-[#F1F2F4] px-[5px] py-[2px] text-[5.5px] font-semibold text-[#868D96]">معطل</span>}</div><p className="mt-[3px] truncate text-[7px] text-[#9299A3]">{product.brand || product.name}</p></div><StockBadge stock={safeInt(product.stock_quantity)} /></div><p className="mt-[8px] text-[20px] font-semibold text-[#343B45]">{safeInt(product.stock_quantity)} <span className="text-[7px] font-normal text-[#9AA1AB]">قطعة</span></p>{distributed.length > 0 && <p className="mt-[5px] truncate text-[6.5px] text-[#7F8893]">{distributed.slice(0, 4).map((sku) => `${sku.label}: ${sku.stock_quantity}`).join(" • ")}</p>}<p className="mt-[6px] text-[6.5px] font-medium text-[#675CBA]">اضغط لإدارة المقاسات والكميات</p></div></div>
                  </div>
                  <div className="grid grid-cols-3 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]"><ActionButton label="تسوية" icon={Plus} tone="green" onClick={() => openAdjustment(product)} full /><ActionButton label="المقاسات" icon={SlidersHorizontal} tone="indigo" onClick={() => openEditor(product)} full /><ActionButton label="تعديل" icon={Pencil} tone="indigo" onClick={() => navigate(`/admin/products/${product.id}`)} full /></div>
                </article>
              );
            })}
            <div className="rounded-[13px] border border-[#E5E9EF] bg-white px-[8px]"><AdminPagination page={page} pageSize={PRODUCT_PAGE_SIZE} total={productsTotal} onPageChange={setPage} /></div>
          </section>
        </>
      ) : (
        <>
          <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
            <div className="grid grid-cols-1 gap-[7px] lg:grid-cols-[minmax(0,1fr)_190px]">
              <SearchBox value={historySearchInput} onChange={setHistorySearchInput} placeholder="بحث بالمنتج، الخيار، السبب أو المرجع..." />
              <Select value={historyType} onValueChange={(value) => setHistoryType(value as "all" | AdjustmentType)}>
                <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">كل الحركات</SelectItem><SelectItem value="increase">زيادة</SelectItem><SelectItem value="decrease">نقص</SelectItem><SelectItem value="recount">جرد</SelectItem><SelectItem value="damage">تالف</SelectItem></SelectContent>
              </Select>
            </div>
          </section>

          <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
            <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]"><div><h2 className="text-[11px] font-semibold text-[#454C56]">سجل حركات المخزون</h2><p className="mt-[3px] text-[8px] text-[#9CA3AC]">كل زيادة أو نقص أو جرد محفوظ مع الخيار والرصيد قبل وبعد</p></div>{historyFetching && <Loader2 className="h-[13px] w-[13px] animate-spin text-[#8E959F]" />}</div>
            {historyLoading ? (
              <LoadingCard />
            ) : adjustments.length === 0 ? (
              <EmptyState history={true} />
            ) : (
              <div className="divide-y divide-[#F0F2F5]">{adjustments.map((adjustment) => <HistoryRow key={adjustment.id} adjustment={adjustment} />)}</div>
            )}
            <div className="border-t border-[#EAEDF1] px-[10px]"><AdminPagination page={historyPage} pageSize={HISTORY_PAGE_SIZE} total={historyTotal} onPageChange={setHistoryPage} /></div>
          </section>
        </>
      )}

      <Dialog open={adjustmentOpen} onOpenChange={(open) => { if (!open && !adjustmentMutation.isPending) { setAdjustmentOpen(false); setActiveProduct(null); setActiveSkuId(""); } }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[680px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4"><div className="flex items-center gap-[10px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#EAF7EE] text-[#629067]"><PackagePlus className="h-[15px] w-[15px]" /></div><div><DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">تسوية المخزون</DialogTitle><DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">{activeProduct?.name_ar}</DialogDescription></div></div></DialogHeader>

          <div className="space-y-[10px] p-[10px]">
            <FormSection title="المخزون المستهدف" icon={Package}>
              <div className="grid grid-cols-3 gap-[6px]"><InfoBox label="إجمالي المنتج" value={`${safeInt(activeProduct?.stock_quantity)} قطعة`} /><InfoBox label="التكلفة" value={format(Number(activeProduct?.cost_price || 0))} /><InfoBox label="الخيارات" value={`${adjustmentSkus.filter((sku) => !sku.is_default).length || 1}`} /></div>

              {adjustmentSkusFetching ? <div className="py-4 text-center"><Loader2 className="mx-auto h-[14px] w-[14px] animate-spin text-[#675CBA]" /></div> : adjustmentSkus.filter((sku) => !sku.is_default).length > 0 && (
                <div><FieldLabel>اختر اللون / المقاس *</FieldLabel><Select value={activeSkuId || "default"} onValueChange={(value) => setActiveSkuId(value === "default" ? "" : value)}><SelectTrigger className="h-[41px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent>{adjustmentSkus.some((sku) => sku.is_default) && <SelectItem value="default">المخزون غير الموزع</SelectItem>}{adjustmentSkus.filter((sku) => !sku.is_default).map((sku) => <SelectItem key={sku.id} value={sku.id}>{sku.label} — {sku.stock_quantity} قطعة</SelectItem>)}</SelectContent></Select></div>
              )}
            </FormSection>

            <FormSection title="نوع الحركة" icon={SlidersHorizontal}>
              <div className="grid grid-cols-2 gap-[6px] sm:grid-cols-4">{(Object.entries(TYPES) as [AdjustmentType, typeof TYPES[AdjustmentType]][]).map(([key, type]) => { const Icon = type.icon; return <button key={key} type="button" onClick={() => setAdjustmentForm((current) => ({ ...current, adjustment_type: key, quantity: "" }))} className={cn("rounded-[10px] border p-[9px] text-right", adjustmentForm.adjustment_type === key ? "border-[#CFC9EC] bg-[#F7F5FF]" : "border-[#E5E9EF] bg-white")}><div className={cn("flex h-[28px] w-[28px] items-center justify-center rounded-[8px]", type.iconStyle)}><Icon className="h-[11px] w-[11px]" /></div><p className="mt-[6px] text-[8.5px] font-semibold text-[#555D67]">{type.label}</p><p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">{type.description}</p></button>; })}</div>
            </FormSection>

            <FormSection title="الكمية" icon={adjustmentForm.adjustment_type === "increase" ? Plus : adjustmentForm.adjustment_type === "recount" ? RotateCcw : Minus}>
              <div><FieldLabel>{adjustmentForm.adjustment_type === "recount" ? "الرصيد الفعلي الجديد *" : "عدد القطع *"}</FieldLabel><Input type="number" min={adjustmentForm.adjustment_type === "recount" ? 0 : 1} step={1} value={adjustmentForm.quantity} onChange={(event) => setAdjustmentForm((current) => ({ ...current, quantity: event.target.value }))} className="h-[42px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] font-semibold shadow-none focus-visible:ring-0" /></div>
              {adjustmentForm.quantity && <div className={cn("grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-[6px] rounded-[10px] border p-[9px]", invalidDecrease ? "border-[#F0D7D4] bg-[#FFF5F3]" : "border-[#DCE3F0] bg-[#F8FAFD]")}><Qty label="قبل" value={currentQty} /><span>→</span><Qty label="التغيير" value={afterQty - currentQty} signed /><span>→</span><Qty label="بعد" value={afterQty} highlight /></div>}
            </FormSection>

            <FormSection title="التوثيق" icon={History}>
              <div><FieldLabel>السبب *</FieldLabel><Textarea value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm((current) => ({ ...current, reason: event.target.value }))} rows={3} placeholder="مثال: استلام شحنة، فرق جرد، قطعة تالفة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:ring-0" /></div>
              <div className="grid grid-cols-1 gap-[7px] sm:grid-cols-2"><Input value={adjustmentForm.reference} onChange={(event) => setAdjustmentForm((current) => ({ ...current, reference: event.target.value }))} placeholder="المرجع - اختياري" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px]" /><Input value={adjustmentForm.notes} onChange={(event) => setAdjustmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات - اختياري" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px]" /></div>
            </FormSection>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3"><button type="button" onClick={() => setAdjustmentOpen(false)} className="h-[36px] rounded-[9px] border border-[#E1E5EA] px-4 text-[8px] font-semibold text-[#707883]">إلغاء</button><button type="button" disabled={adjustmentMutation.isPending || !adjustmentForm.quantity || !adjustmentForm.reason.trim() || invalidDecrease} onClick={() => adjustmentMutation.mutate()} className="flex h-[36px] items-center gap-[6px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white disabled:opacity-40">{adjustmentMutation.isPending ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <CheckCircle2 className="h-[11px] w-[11px]" />}حفظ الحركة</button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={editorOpen} onOpenChange={(open) => { if (!open && !saveEditorMutation.isPending) { setEditorOpen(false); setEditorProduct(null); setEditableSkus([]); setNewSize(""); setNewSizeColor(""); } }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[980px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4"><div className="flex items-center gap-[10px]"><div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]"><Layers3 className="h-[15px] w-[15px]" /></div><div><DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">إدارة المقاسات والمخزون</DialogTitle><DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">{editorProduct?.name_ar} — عدّل المقاس والكمية أو أضف مقاسات جديدة</DialogDescription></div></div></DialogHeader>

          <div className="space-y-[10px] p-[10px]">
            <div className="grid grid-cols-3 gap-[7px]"><SummaryBox label="المخزون قبل" value={safeInt(editorProduct?.stock_quantity)} /><SummaryBox label="المجموع الجديد" value={editorTotal} active /><SummaryBox label="عدد صفوف المخزون" value={editableSkus.length} /></div>

            <FormSection title="إضافة مقاس جديد" icon={Plus}>
              <div className={cn("grid grid-cols-1 gap-[7px]", editorColors.length > 0 ? "sm:grid-cols-[170px_minmax(0,1fr)_auto_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]")}>
                {editorColors.length > 0 && <Select value={newSizeColor || editorColors[0]} onValueChange={setNewSizeColor}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0"><SelectValue placeholder="اختر اللون" /></SelectTrigger><SelectContent>{editorColors.map((color) => <SelectItem key={color} value={color}>{color}</SelectItem>)}</SelectContent></Select>}
                <Input value={newSize} onChange={(event) => setNewSize(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addSizeRows(false); } }} placeholder="اكتب المقاس الجديد، مثال: 42 أو XL" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:ring-0" />
                <button type="button" onClick={() => addSizeRows(false)} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[9px] bg-[#675CBA] px-[12px] text-[8px] font-semibold text-white"><Plus className="h-[10px] w-[10px]" />إضافة المقاس</button>
                {editorColors.length > 1 && <button type="button" onClick={() => addSizeRows(true)} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[9px] border border-[#E2DEF3] bg-white px-[11px] text-[7.5px] font-semibold text-[#675CBA]"><Layers3 className="h-[10px] w-[10px]" />لكل الألوان</button>}
              </div>
              <p className="text-[6.5px] text-[#9BA2AC]">يمكنك إضافة المقاس للون واحد أو لكل الألوان مرة واحدة، ثم تحديد مخزون كل صف.</p>
            </FormSection>

            {editorProduct?.has_quality_variants && <div className="rounded-[10px] border border-[#EEDFC4] bg-[#FFF9EF] p-[9px]"><p className="text-[8px] font-semibold text-[#9A7139]">درجات الجودة غير مربوطة بالمخزون بعد</p><p className="mt-[3px] text-[7px] leading-5 text-[#8A7659]">الخصم الآلي حاليًا يعتمد على اللون والمقاس حتى لا يتم الخصم من خيار خاطئ.</p></div>}

            <FormSection title="المقاسات والكميات" icon={Layers3}>
              {editorSkusFetching ? <div className="py-12"><Loader2 className="mx-auto h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div> : editableSkus.length === 0 ? <div className="py-10 text-center text-[8px] text-[#9BA2AC]">لا توجد صفوف مخزون. أضف مقاسًا جديدًا.</div> : (
                <div className="space-y-[6px]">
                  <div className="hidden grid-cols-[minmax(0,1fr)_130px_120px_34px] gap-[7px] px-[8px] text-[7px] font-semibold text-[#8B929B] sm:grid"><span>الخيار</span><span>المقاس</span><span>الكمية</span><span /></div>
                  {editableSkus.map((sku, index) => (
                    <div key={sku.variant_key} className="grid grid-cols-[minmax(0,1fr)_86px_34px] items-center gap-[7px] rounded-[10px] border border-[#E7EAEF] bg-[#FAFBFC] p-[8px] sm:grid-cols-[minmax(0,1fr)_130px_120px_34px]">
                      <div className="flex min-w-0 items-center gap-[8px]">{sku.color_name ? <ColorDot hex={sku.color_hex} hex2={sku.color_hex2} /> : <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-[#F0F2F5]"><Package className="h-[11px] w-[11px] text-[#858D97]" /></div>}<div className="min-w-0"><p className="truncate text-[8.5px] font-semibold text-[#535B65]">{makeSkuLabel(sku)}</p><p className="mt-[2px] text-[6px] text-[#9BA2AC]">{sku.is_default ? "رصيد غير موزع" : sku.color_name || "بدون لون"}</p></div></div>
                      <Input value={sku.size} disabled={sku.is_default} onChange={(event) => updateEditableSku(index, { size: event.target.value })} placeholder={sku.is_default ? "—" : "المقاس"} className="hidden h-[37px] rounded-[8px] border-[#E2E6EB] bg-white text-center text-[9px] font-semibold shadow-none focus-visible:ring-0 sm:block" />
                      <Input type="number" min={0} step={1} value={sku.stock_quantity} onChange={(event) => updateEditableSku(index, { stock_quantity: safeInt(event.target.value) })} className="h-[37px] rounded-[8px] border-[#E2E6EB] bg-white text-center text-[10px] font-semibold shadow-none focus-visible:ring-0" />
                      <button type="button" disabled={sku.is_default && safeInt(sku.stock_quantity) > 0} title="حذف المقاس" onClick={() => removeEditableSku(index)} className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-[10px] w-[10px]" /></button>
                      {!sku.is_default && <Input value={sku.size} onChange={(event) => updateEditableSku(index, { size: event.target.value })} placeholder="المقاس" className="col-span-3 h-[35px] rounded-[8px] border-[#E2E6EB] bg-white text-center text-[9px] font-semibold shadow-none focus-visible:ring-0 sm:hidden" />}
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3"><p className="hidden text-[7px] text-[#9299A3] sm:block">بعد الحفظ ستظهر هذه المقاسات والكميات نفسها في صفحة المنتج للعميل. الإجمالي: <span className="font-semibold text-[#675CBA]">{editorTotal}</span></p><div className="mr-auto flex gap-[7px]"><button type="button" onClick={() => setEditorOpen(false)} className="h-[36px] rounded-[9px] border border-[#E1E5EA] px-4 text-[8px] font-semibold text-[#707883]">إلغاء</button><button type="button" disabled={saveEditorMutation.isPending || editableSkus.length === 0} onClick={() => saveEditorMutation.mutate()} className="flex h-[36px] items-center gap-[6px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white disabled:opacity-40">{saveEditorMutation.isPending ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <Save className="h-[11px] w-[11px]" />}حفظ المقاسات والمخزون</button></div></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[14px] border-[#E4E8ED] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[14px] font-semibold text-[#353C46]">حذف المنتج</AlertDialogTitle>
            <AlertDialogDescription className="text-[9px] leading-6 text-[#858D97]">سيتم حذف "{deleteTarget?.name_ar || "المنتج"}" ومخزونه وخياراته. سجل حركات المخزون التاريخي يبقى محفوظًا.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] text-[8px]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteProductMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteProductMutation.mutate(deleteTarget.id); }} className="h-[38px] rounded-[9px] bg-[#C76161] text-[8px] text-white hover:bg-[#B65555]">{deleteProductMutation.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <Trash2 className="ml-[5px] h-[11px] w-[11px]" />}حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ title, value, helper, icon: Icon, tone, loading }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "amber" | "blue"; loading: boolean }) => {
  const styles = { indigo: ["bg-[#F1EFFF] text-[#675CBA]", "bg-[#675CBA]"], green: ["bg-[#EAF7EE] text-[#629067]", "bg-[#629067]"], amber: ["bg-[#FFF5E5] text-[#C38838]", "bg-[#C38838]"], blue: ["bg-[#EDF4FF] text-[#5680CF]", "bg-[#5680CF]"] }[tone];
  return <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", styles[1])} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", styles[0])}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p>{loading ? <Loader2 className="mt-[6px] h-[15px] w-[15px] animate-spin text-[#A0A6AF]" /> : <p className="mt-[4px] truncate text-[19px] font-semibold text-[#303741]">{value}</p>}<p className="mt-[5px] text-[7px] text-[#A0A6AF]">{helper}</p></article>;
};

const TabButton = ({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) => <button type="button" onClick={onClick} className={cn("flex h-[35px] items-center gap-[6px] rounded-[9px] px-[11px] text-[9px] font-semibold", active ? "bg-[#F1EFFF] text-[#675CBA]" : "text-[#79818B] hover:bg-[#F7F8FA]")}><Icon className="h-[12px] w-[12px]" />{label}</button>;

const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) => <div className="relative"><Search className="absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[9px] shadow-none focus-visible:ring-0" />{value && <button type="button" onClick={() => onChange("")} className="absolute left-[8px] top-1/2 -translate-y-1/2 text-[#9AA1AB]"><X className="h-[11px] w-[11px]" /></button>}</div>;

const ProductImage = ({ product, large = false }: { product: Product; large?: boolean }) => {
  const variantImage = product.color_variants?.flatMap((variant) => variant.images || []).find(Boolean);
  const image = product.images?.find(Boolean) || variantImage || "";
  return <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#E7EAEF] bg-[#F5F6F8]", large ? "h-[58px] w-[50px]" : "h-[45px] w-[39px]")}>{image ? <img src={image} alt={product.name_ar} loading="lazy" className="h-full w-full object-contain" /> : <Package className="h-[14px] w-[14px] text-[#A0A6AF]" />}</div>;
};

const StockBadge = ({ stock }: { stock: number }) => stock <= 0 ? <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#F0D7D4] bg-[#FFF3F1] px-[7px] text-[6.5px] font-semibold text-[#C15F56]">نفد</span> : stock <= 3 ? <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[7px] text-[6.5px] font-semibold text-[#A9782F]">منخفض</span> : <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[7px] text-[6.5px] font-semibold text-[#568468]">متوفر</span>;

const ActionButton = ({ label, icon: Icon, tone, onClick, full = false }: { label: string; icon: LucideIcon; tone: "green" | "indigo"; onClick: () => void; full?: boolean }) => <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} className={cn("flex h-[31px] items-center justify-center gap-[5px] rounded-[8px] border bg-white px-[8px] text-[7px] font-semibold", tone === "green" ? "border-[#D8E8DD] text-[#57906A]" : "border-[#E2DEF3] text-[#675CBA]", full && "h-[35px] w-full text-[8px]")}><Icon className="h-[9px] w-[9px]" />{label}</button>;

const IconAction = ({ title, icon: Icon, onClick, destructive = false }: { title: string; icon: LucideIcon; onClick: () => void; destructive?: boolean }) => <button type="button" title={title} onClick={(event) => { event.stopPropagation(); onClick(); }} className={cn("flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border bg-white", destructive ? "border-[#F0D7D4] text-[#C15F56]" : "border-[#E2E6EB] text-[#707883]")}><Icon className="h-[10px] w-[10px]" /></button>;

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;

const FieldLabel = ({ children }: { children: ReactNode }) => <p className="mb-[6px] text-[8px] font-semibold text-[#727A84]">{children}</p>;
const InfoBox = ({ label, value }: { label: string; value: string }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[6.5px] text-[#9BA2AC]">{label}</p><p className="mt-[4px] truncate text-[9px] font-semibold text-[#515964]">{value}</p></div>;
const Qty = ({ label, value, signed = false, highlight = false }: { label: string; value: number; signed?: boolean; highlight?: boolean }) => <div className="text-center"><p className="text-[6.5px] text-[#9BA2AC]">{label}</p><p className={cn("mt-[4px] text-[12px] font-bold", highlight ? "text-[#675CBA]" : signed && value > 0 ? "text-[#57906A]" : signed && value < 0 ? "text-[#C15F56]" : "text-[#4C545E]")}>{signed && value > 0 ? "+" : ""}{value}</p></div>;
const SummaryBox = ({ label, value, active = false }: { label: string; value: number; active?: boolean }) => <div className={cn("rounded-[10px] border p-[9px]", active ? "border-[#DCD6F1] bg-[#F8F6FF]" : "border-[#E7EAEF] bg-white")}><p className="text-[6.5px] text-[#9BA2AC]">{label}</p><p className={cn("mt-[4px] text-[15px] font-semibold", active ? "text-[#675CBA]" : "text-[#444C56]")}>{value}</p></div>;

const ColorDot = ({ hex, hex2 }: { hex: string; hex2: string }) => {
  const background = hex2 ? `linear-gradient(135deg, ${hex || "#ddd"} 0 50%, ${hex2} 50% 100%)` : hex || "#ddd";
  return <span className="h-[30px] w-[30px] shrink-0 rounded-[8px] border border-black/10" style={{ background }} />;
};

const HistoryRow = ({ adjustment }: { adjustment: Adjustment }) => {
  const type = TYPES[adjustment.adjustment_type as AdjustmentType] || TYPES.recount;
  const Icon = type.icon;
  return <div className="grid grid-cols-1 gap-[8px] px-[12px] py-[11px] md:grid-cols-[minmax(180px,1.2fr)_minmax(150px,1fr)_90px_160px_minmax(180px,1fr)_130px] md:items-center"><div><p className="truncate text-[9px] font-semibold text-[#454D57]">{adjustment.product_name || "منتج محذوف"}</p><p className="mt-[3px] truncate text-[6.5px] text-[#9BA2AC]">{adjustment.variant_label || "المخزون العام"}</p></div><div className="flex items-center gap-[6px]"><span className={cn("flex h-[27px] w-[27px] items-center justify-center rounded-[8px]", type.iconStyle)}><Icon className="h-[10px] w-[10px]" /></span><span className={cn("rounded-[6px] border px-[6px] py-[3px] text-[6.5px] font-semibold", type.badge)}>{type.label}</span></div><div className={cn("text-[10px] font-bold", adjustment.quantity_change > 0 ? "text-[#57906A]" : adjustment.quantity_change < 0 ? "text-[#C15F56]" : "text-[#707883]")}>{adjustment.quantity_change > 0 ? "+" : ""}{adjustment.quantity_change}</div><div className="text-[7.5px] text-[#747C86]">الخيار: {adjustment.quantity_before} → {adjustment.quantity_after}<br />المنتج: {adjustment.product_quantity_before ?? "—"} → {adjustment.product_quantity_after ?? "—"}</div><div><p className="truncate text-[7.5px] text-[#626B75]">{adjustment.reason}</p>{adjustment.reference && <p className="mt-[3px] truncate text-[6px] text-[#A0A6AF]">{adjustment.reference}</p>}</div><span className="text-[7px] text-[#8D949E]">{formatDate(adjustment.created_at)}</span></div>;
};

const EmptyState = ({ history = false }: { history?: boolean }) => <div className="flex min-h-[220px] flex-col items-center justify-center text-center"><div className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">{history ? <History className="h-[18px] w-[18px]" /> : <Boxes className="h-[18px] w-[18px]" />}</div><h3 className="mt-3 text-[9px] font-semibold text-[#535B65]">{history ? "لا توجد حركات" : "لا توجد منتجات"}</h3></div>;
const LoadingCard = () => <div className="flex h-[220px] items-center justify-center"><Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" /></div>;

export default AdminInventoryAdjustmentsPage;
