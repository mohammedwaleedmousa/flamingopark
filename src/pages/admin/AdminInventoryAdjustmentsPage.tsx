import { useEffect, useMemo, useState, type LucideIcon } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, History, Loader2, Minus, Package, PackageCheck, PackageX, Plus, RotateCcw, Search, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { useCurrency } from "@/lib/currency";

interface Product {
  id: string;
  name: string;
  name_ar: string;
  brand: string | null;
  cost_price: number | null;
  stock_quantity: number;
  in_stock: boolean | null;
}

interface Adjustment {
  id: string;
  product_id: string | null;
  product_name: string | null;
  adjustment_type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

type AdjustmentType = "increase" | "decrease" | "recount" | "damage";
type AdjustmentFilter = "all" | AdjustmentType;

interface FormState {
  product_id: string;
  adjustment_type: AdjustmentType;
  quantity: string;
  reason: string;
  reference: string;
  notes: string;
}

const PAGE_SIZE = 40;

const TYPES: Record<AdjustmentType, { label: string; description: string; icon: LucideIcon; badge: string; iconStyle: string }> = {
  increase: {
    label: "زيادة",
    description: "إضافة كمية جديدة إلى المخزون",
    icon: TrendingUp,
    badge: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]",
    iconStyle: "bg-[#EAF7EE] text-[#629067]",
  },
  decrease: {
    label: "نقص",
    description: "إنقاص كمية من الرصيد الحالي",
    icon: TrendingDown,
    badge: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]",
    iconStyle: "bg-[#FFF5E5] text-[#C38838]",
  },
  recount: {
    label: "جرد",
    description: "استبدال الرصيد بالعدد الفعلي",
    icon: ClipboardCheck,
    badge: "border-[#DCE7F5] bg-[#F1F6FC] text-[#5679A4]",
    iconStyle: "bg-[#EDF4FF] text-[#5680CF]",
  },
  damage: {
    label: "تالف",
    description: "إخراج قطع تالفة من المخزون",
    icon: AlertTriangle,
    badge: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]",
    iconStyle: "bg-[#FFF0ED] text-[#D06A5E]",
  },
};

const emptyForm = (): FormState => ({
  product_id: "",
  adjustment_type: "increase",
  quantity: "",
  reason: "",
  reference: "",
  notes: "",
});

const AdminInventoryAdjustmentsPage = () => {
  const queryClient = useQueryClient();
  const { format } = useCurrency();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const [productSearch, setProductSearch] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);

  const [typeFilter, setTypeFilter] = useState<AdjustmentFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

  /* =========================================================
     PRODUCTS FOR SELECT
  ========================================================= */

  const { data: products = [], isFetching: productsFetching } = useQuery({
    queryKey: ["inventory-product-search", productSearch],
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,name_ar,brand,cost_price,stock_quantity,in_stock").eq("is_active", true).order("name_ar", { ascending: true }).limit(60);

      const term = productSearch.trim();

      if (term) {
        const safeTerm = term.replace(/[,%()]/g, " ");

        query = query.or(`name_ar.ilike.%${safeTerm}%,name.ilike.%${safeTerm}%,brand.ilike.%${safeTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Product[];
    },
    staleTime: 20_000,
  });

  /* =========================================================
     SELECTED PRODUCT
  ========================================================= */

  const { data: selectedProductData } = useQuery({
    queryKey: ["inventory-selected-product", form.product_id],
    enabled: Boolean(form.product_id),
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,name_ar,brand,cost_price,stock_quantity,in_stock").eq("id", form.product_id).single();

      if (error) throw error;

      return data as Product;
    },
  });

  const selectedProduct = selectedProductData || products.find((product) => product.id === form.product_id) || null;

  /* =========================================================
     ADJUSTMENT HISTORY
  ========================================================= */

  const { data: adjustmentsResult, isLoading: adjustmentsLoading, isFetching: adjustmentsFetching } = useQuery({
    queryKey: ["inventory-adjustments", page, typeFilter, search],
    queryFn: async () => {
      let query = supabase.from("inventory_adjustments").select("*", { count: "exact" });

      if (typeFilter !== "all") query = query.eq("adjustment_type", typeFilter);

      const term = search.trim();

      if (term) {
        const safeTerm = term.replace(/[,%()]/g, " ");

        query = query.or(`product_name.ilike.%${safeTerm}%,reason.ilike.%${safeTerm}%,reference.ilike.%${safeTerm}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count, error } = await query.order("created_at", { ascending: false }).range(from, to);

      if (error) throw error;

      return {
        rows: (data || []) as Adjustment[],
        total: count || 0,
      };
    },
  });

  const adjustments = adjustmentsResult?.rows || [];
  const adjustmentsTotal = adjustmentsResult?.total || 0;

  /* =========================================================
     INVENTORY SUMMARY
  ========================================================= */

  const { data: inventoryRows = [], isLoading: summaryLoading } = useQuery({
    queryKey: ["inventory-summary-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("stock_quantity,cost_price,in_stock").eq("is_active", true);

      if (error) throw error;

      return data || [];
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    let totalUnits = 0;
    let inventoryValue = 0;
    let outOfStock = 0;
    let lowStock = 0;

    inventoryRows.forEach((product) => {
      const quantity = Math.max(0, Number(product.stock_quantity || 0));
      const cost = Math.max(0, Number(product.cost_price || 0));

      totalUnits += quantity;
      inventoryValue += quantity * cost;

      if (quantity === 0) outOfStock += 1;
      else if (quantity <= 3) lowStock += 1;
    });

    return {
      totalProducts: inventoryRows.length,
      totalUnits,
      inventoryValue,
      outOfStock,
      lowStock,
    };
  }, [inventoryRows]);

  /* =========================================================
     PREDICTED STOCK
  ========================================================= */

  const enteredQuantity = Math.max(0, Number(form.quantity || 0));
  const currentQuantity = Math.max(0, Number(selectedProduct?.stock_quantity || 0));

  const predictedQuantity = useMemo(() => {
    if (!selectedProduct || !form.quantity) return currentQuantity;

    if (form.adjustment_type === "increase") return currentQuantity + enteredQuantity;

    if (form.adjustment_type === "decrease" || form.adjustment_type === "damage") return Math.max(0, currentQuantity - enteredQuantity);

    if (form.adjustment_type === "recount") return enteredQuantity;

    return currentQuantity;
  }, [selectedProduct, form.quantity, form.adjustment_type, currentQuantity, enteredQuantity]);

  const predictedChange = predictedQuantity - currentQuantity;

  const invalidDecrease = Boolean(selectedProduct) && ["decrease", "damage"].includes(form.adjustment_type) && enteredQuantity > currentQuantity;

  /* =========================================================
     SAVE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("اختر المنتج أولًا.");

      const quantity = Number(form.quantity);

      if (!Number.isInteger(quantity)) throw new Error("الكمية يجب أن تكون رقمًا صحيحًا.");

      if (form.adjustment_type === "recount") {
        if (quantity < 0) throw new Error("كمية الجرد لا يمكن أن تكون سالبة.");
      } else if (quantity <= 0) {
        throw new Error("الكمية يجب أن تكون أكبر من صفر.");
      }

      if (!form.reason.trim()) throw new Error("سبب التسوية مطلوب.");

      if (invalidDecrease) throw new Error(`لا يمكن خصم ${quantity} قطعة. المخزون الحالي هو ${currentQuantity}.`);

      const { data, error } = await (supabase as any).rpc("apply_inventory_adjustment", {
        p_product_id: form.product_id,
        p_adjustment_type: form.adjustment_type,
        p_quantity: quantity,
        p_reason: form.reason.trim(),
        p_reference: form.reference.trim() || null,
        p_notes: form.notes.trim() || null,
      });

      if (error) throw error;

      return data;
    },

    onSuccess: async () => {
      toast({
        title: "تم تحديث المخزون",
        description: `تم تحديث الرصيد من ${currentQuantity} إلى ${predictedQuantity}.`,
      });

      setOpen(false);
      setForm(emptyForm());
      setProductSearch("");

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-summary-products"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-product-search"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-selected-product"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
      ]);
    },

    onError: (error: any) => {
      console.error("Inventory adjustment error:", error);

      toast({
        title: "تعذر تحديث المخزون",
        description: error?.message || "حدث خطأ أثناء تنفيذ التسوية.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     DIALOG
  ========================================================= */

  const openNewAdjustment = () => {
    setForm(emptyForm());
    setProductSearch("");
    setOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;

    setOpen(false);
    setForm(emptyForm());
    setProductSearch("");
  };

  const selectedType = TYPES[form.adjustment_type];

  const firstResult = adjustmentsTotal === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, adjustmentsTotal);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader
        category="المخزون"
        title="تسويات المخزون"
        description="إدارة الزيادة والنقص والجرد والتالف مع سجل مالي كامل لكل حركة"
        actions={[
          {
            label: "تسوية جديدة",
            icon: Plus,
            onClick: openNewAdjustment,
            variant: "primary",
          },
        ]}
      />

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <InventoryStatCard title="إجمالي الوحدات" value={stats.totalUnits.toLocaleString("en-US")} helper={`${stats.totalProducts} منتج نشط`} icon={Boxes} tone="indigo" loading={summaryLoading} />
        <InventoryStatCard title="قيمة المخزون" value={format(stats.inventoryValue)} helper="بناءً على سعر التكلفة" icon={Wallet} tone="green" loading={summaryLoading} />
        <InventoryStatCard title="مخزون منخفض" value={stats.lowStock.toLocaleString("en-US")} helper="من 1 إلى 3 قطع" icon={AlertTriangle} tone="amber" loading={summaryLoading} />
        <InventoryStatCard title="نفد المخزون" value={stats.outOfStock.toLocaleString("en-US")} helper="الرصيد الحالي يساوي صفر" icon={PackageX} tone="coral" loading={summaryLoading} />
      </section>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[11px]">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <History className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#444B55]">سجل حركات المخزون</p>
              <p className="mt-[2px] text-[8px] text-[#9BA2AC]">كل تعديل يتم حفظ الرصيد قبله وبعده تلقائيًا</p>
            </div>
          </div>

          {adjustmentsFetching && (
            <span className="flex items-center gap-[5px] text-[8px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[12px] lg:grid-cols-[minmax(0,1fr)_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />

            <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="بحث بالمنتج، السبب أو المرجع..." className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />

            {searchInput && (
              <button type="button" onClick={() => setSearchInput("")} className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-white hover:text-[#5C6470]">
                <X className="h-[11px] w-[11px]" />
              </button>
            )}
          </div>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as AdjustmentFilter)}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">كل أنواع الحركات</SelectItem>
              <SelectItem value="increase">زيادة</SelectItem>
              <SelectItem value="decrease">نقص</SelectItem>
              <SelectItem value="recount">جرد</SelectItem>
              <SelectItem value="damage">تالف</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* =====================================================
          MOBILE
      ===================================================== */}

      <section className="space-y-[8px] md:hidden">
        {adjustmentsLoading ? (
          <InventoryLoading />
        ) : adjustments.length === 0 ? (
          <InventoryEmpty />
        ) : (
          adjustments.map((adjustment) => {
            const type = TYPES[adjustment.adjustment_type as AdjustmentType] || TYPES.recount;
            const Icon = type.icon;
            const positive = adjustment.quantity_change > 0;
            const negative = adjustment.quantity_change < 0;

            return (
              <article key={adjustment.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex items-start gap-[10px]">
                    <div className={cn("flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px]", type.iconStyle)}>
                      <Icon className="h-[14px] w-[14px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-[7px]">
                        <div className="min-w-0">
                          <h3 className="truncate text-[11px] font-semibold text-[#3F4751]">{adjustment.product_name || "منتج محذوف"}</h3>
                          <p className="mt-[3px] text-[8px] text-[#9299A3]">{formatDate(adjustment.created_at)}</p>
                        </div>

                        <AdjustmentBadge type={adjustment.adjustment_type as AdjustmentType} />
                      </div>

                      <div className="mt-[10px] grid grid-cols-3 gap-[5px]">
                        <MiniValue label="قبل" value={adjustment.quantity_before.toLocaleString("en-US")} />
                        <MiniValue label="التغيير" value={`${positive ? "+" : ""}${adjustment.quantity_change.toLocaleString("en-US")}`} valueClass={positive ? "text-[#57906A]" : negative ? "text-[#C15F56]" : "text-[#707883]"} />
                        <MiniValue label="بعد" value={adjustment.quantity_after.toLocaleString("en-US")} />
                      </div>

                      <p className="mt-[9px] text-[8.5px] leading-5 text-[#68717B]">{adjustment.reason}</p>

                      {adjustment.reference && <p className="mt-[4px] text-[7px] text-[#9BA2AC]">المرجع: {adjustment.reference}</p>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}

        <div className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white px-[8px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={adjustmentsTotal} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          DESKTOP TABLE
      ===================================================== */}

      <section className="hidden overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[14px] py-[11px]">
          <div>
            <div className="flex items-center gap-[7px]">
              <Boxes className="h-[13px] w-[13px] text-[#675CBA]" />
              <h2 className="text-[11px] font-semibold text-[#454C56]">سجل التسويات</h2>
            </div>

            <p className="mt-[4px] text-[8px] text-[#9CA3AC]">عرض {firstResult.toLocaleString("ar-EG")} - {lastResult.toLocaleString("ar-EG")} من أصل {adjustmentsTotal.toLocaleString("ar-EG")}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right font-semibold">المنتج</th>
                <th className="px-[12px] text-right font-semibold">النوع</th>
                <th className="px-[12px] text-right font-semibold">قبل</th>
                <th className="px-[12px] text-right font-semibold">التغيير</th>
                <th className="px-[12px] text-right font-semibold">بعد</th>
                <th className="px-[12px] text-right font-semibold">قيمة الحركة</th>
                <th className="px-[12px] text-right font-semibold">السبب</th>
                <th className="px-[12px] text-right font-semibold">المرجع</th>
                <th className="px-[12px] text-right font-semibold">التاريخ</th>
              </tr>
            </thead>

            <tbody>
              {adjustmentsLoading ? (
                <tr>
                  <td colSpan={9} className="h-[260px] text-center">
                    <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <InventoryEmpty />
                  </td>
                </tr>
              ) : (
                adjustments.map((adjustment) => {
                  const positive = adjustment.quantity_change > 0;
                  const negative = adjustment.quantity_change < 0;

                  return (
                    <tr key={adjustment.id} className="h-[64px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[12px]">
                        <div className="min-w-[180px]">
                          <p className="max-w-[220px] truncate text-[10.5px] font-semibold text-[#414953]">{adjustment.product_name || "منتج محذوف"}</p>
                          <p dir="ltr" className="mt-[3px] max-w-[180px] truncate text-right text-[7px] text-[#A0A6AF]">{adjustment.product_id || "—"}</p>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <AdjustmentBadge type={adjustment.adjustment_type as AdjustmentType} />
                      </td>

                      <td className="px-[12px]">
                        <span className="text-[10px] font-semibold text-[#5A626D]">{adjustment.quantity_before.toLocaleString("en-US")}</span>
                      </td>

                      <td className="px-[12px]">
                        <span className={cn("text-[10px] font-bold", positive ? "text-[#57906A]" : negative ? "text-[#C15F56]" : "text-[#747C86]")}>{positive ? "+" : ""}{adjustment.quantity_change.toLocaleString("en-US")}</span>
                      </td>

                      <td className="px-[12px]">
                        <span className="inline-flex h-[27px] min-w-[30px] items-center justify-center rounded-[7px] bg-[#F1F3F6] px-[7px] text-[9px] font-bold text-[#4E5660]">{adjustment.quantity_after.toLocaleString("en-US")}</span>
                      </td>

                      <td className="px-[12px]">
                        <div>
                          <p className="text-[9px] font-semibold text-[#515964]">{format(Number(adjustment.total_cost || 0))}</p>
                          <p className="mt-[3px] text-[7px] text-[#A0A6AF]">@ {format(Number(adjustment.unit_cost || 0))}</p>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <p className="max-w-[230px] truncate text-[9px] text-[#666F79]" title={adjustment.reason}>{adjustment.reason}</p>
                        {adjustment.notes && <p className="mt-[3px] max-w-[230px] truncate text-[7px] text-[#A0A6AF]">{adjustment.notes}</p>}
                      </td>

                      <td className="px-[12px]">
                        <span className="max-w-[140px] truncate text-[8px] text-[#8C949E]">{adjustment.reference || "—"}</span>
                      </td>

                      <td className="px-[12px]">
                        <span className="whitespace-nowrap text-[8px] text-[#858D97]">{formatDate(adjustment.created_at, true)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#EAEDF1] px-[10px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={adjustmentsTotal} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          ADJUSTMENT DIALOG
      ===================================================== */}

      <Dialog open={open} onOpenChange={(value) => { if (!value) closeDialog(); else setOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[680px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                <Boxes className="h-[15px] w-[15px]" />
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">تسوية مخزون جديدة</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[8.5px] text-[#9299A3]">سيتم تحديث كمية المنتج وتسجيل الحركة في نفس العملية.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-[10px] p-[10px]">
            {/* PRODUCT */}

            <FormSection title="المنتج" icon={Package}>
              <div>
                <FieldLabel>البحث عن المنتج</FieldLabel>

                <div className="relative">
                  <Search className="absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#9AA1AB]" />

                  <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="اكتب اسم المنتج أو الماركة..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pr-[34px] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />

                  {productsFetching && <Loader2 className="absolute left-[11px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 animate-spin text-[#8E959F]" />}
                </div>
              </div>

              <div>
                <FieldLabel>اختر المنتج *</FieldLabel>

                <Select value={form.product_id} onValueChange={(value) => setForm((current) => ({ ...current, product_id: value }))}>
                  <SelectTrigger className="h-[42px] rounded-[9px] border-[#E2E6EB] bg-white text-[9px] shadow-none focus:ring-0">
                    <SelectValue placeholder="اختر منتجًا من النتائج" />
                  </SelectTrigger>

                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name_ar} — مخزون {product.stock_quantity}
                      </SelectItem>
                    ))}

                    {products.length === 0 && <div className="p-3 text-center text-[8px] text-muted-foreground">لا توجد نتائج</div>}
                  </SelectContent>
                </Select>
              </div>

              {selectedProduct && (
                <div className="grid grid-cols-3 gap-[6px]">
                  <ProductInfo label="المخزون الحالي" value={selectedProduct.stock_quantity.toLocaleString("en-US")} />
                  <ProductInfo label="التكلفة" value={format(Number(selectedProduct.cost_price || 0))} />
                  <ProductInfo label="الحالة" value={selectedProduct.in_stock ? "متوفر" : "نفد"} valueClass={selectedProduct.in_stock ? "text-[#57906A]" : "text-[#C15F56]"} />
                </div>
              )}
            </FormSection>

            {/* TYPE */}

            <FormSection title="نوع التسوية" icon={selectedType.icon}>
              <div className="grid grid-cols-2 gap-[6px] sm:grid-cols-4">
                {(Object.entries(TYPES) as [AdjustmentType, typeof TYPES[AdjustmentType]][]).map(([key, type]) => {
                  const Icon = type.icon;
                  const active = form.adjustment_type === key;

                  return (
                    <button key={key} type="button" onClick={() => setForm((current) => ({ ...current, adjustment_type: key, quantity: "" }))} className={cn("rounded-[10px] border p-[9px] text-right transition-colors", active ? "border-[#CFC9EC] bg-[#F7F5FF]" : "border-[#E5E9EF] bg-white hover:bg-[#FAFBFC]")}>
                      <div className={cn("flex h-[28px] w-[28px] items-center justify-center rounded-[8px]", type.iconStyle)}>
                        <Icon className="h-[11px] w-[11px]" />
                      </div>

                      <p className={cn("mt-[7px] text-[8.5px] font-semibold", active ? "text-[#6259A9]" : "text-[#555D67]")}>{type.label}</p>
                      <p className="mt-[2px] line-clamp-2 text-[6.5px] leading-[13px] text-[#9BA2AC]">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </FormSection>

            {/* QUANTITY */}

            <FormSection title="الكمية" icon={form.adjustment_type === "recount" ? RotateCcw : form.adjustment_type === "increase" ? Plus : Minus}>
              <div>
                <FieldLabel>{form.adjustment_type === "recount" ? "العدد الفعلي بعد الجرد *" : "عدد القطع *"}</FieldLabel>

                <Input type="number" min={form.adjustment_type === "recount" ? 0 : 1} step={1} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} placeholder={form.adjustment_type === "recount" ? "مثال: 8" : "مثال: 3"} className="h-[42px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] font-semibold shadow-none focus-visible:bg-white focus-visible:ring-0" />
              </div>

              {selectedProduct && form.quantity && (
                <div className={cn("rounded-[11px] border p-[10px]", invalidDecrease ? "border-[#F0D7D4] bg-[#FFF5F3]" : "border-[#DCE3F0] bg-[#F8FAFD]")}>
                  <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-[6px]">
                    <QuantityPreview label="قبل" value={currentQuantity} />

                    <span className="text-[11px] text-[#A0A6AF]">→</span>

                    <QuantityPreview label="التغيير" value={predictedChange} signed />

                    <span className="text-[11px] text-[#A0A6AF]">→</span>

                    <QuantityPreview label="بعد" value={predictedQuantity} emphasize />
                  </div>

                  {invalidDecrease && <p className="mt-[8px] text-center text-[8px] font-semibold text-[#C15F56]">لا يمكن أن يصبح المخزون أقل من صفر.</p>}
                </div>
              )}
            </FormSection>

            {/* DETAILS */}

            <FormSection title="تفاصيل الحركة" icon={History}>
              <div>
                <FieldLabel>سبب التسوية *</FieldLabel>

                <Textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="مثال: استلام شحنة جديدة، فرق جرد، قطعة تالفة..." rows={3} className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] leading-5 shadow-none focus-visible:bg-white focus-visible:ring-0" />
              </div>

              <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                <div>
                  <FieldLabel>المرجع</FieldLabel>

                  <Input value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} placeholder="رقم فاتورة / شحنة / جرد" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </div>

                <div>
                  <FieldLabel>ملاحظات إضافية</FieldLabel>

                  <Input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="اختياري" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </div>
              </div>
            </FormSection>
          </div>

          {/* FOOTER */}

          <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white/95 px-5 py-3 backdrop-blur">
            <button type="button" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[36px] rounded-[9px] border border-[#E1E5EA] bg-white px-4 text-[8.5px] font-semibold text-[#707883] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40">إلغاء</button>

            <button type="button" disabled={saveMutation.isPending || !form.product_id || !form.quantity || !form.reason.trim() || invalidDecrease} onClick={() => saveMutation.mutate()} className="flex h-[36px] items-center gap-[6px] rounded-[9px] bg-[#675CBA] px-5 text-[8.5px] font-semibold text-white transition-colors hover:bg-[#594FAB] disabled:cursor-not-allowed disabled:opacity-40">
              {saveMutation.isPending ? <Loader2 className="h-[11px] w-[11px] animate-spin" /> : <CheckCircle2 className="h-[11px] w-[11px]" />}
              {saveMutation.isPending ? "جاري التحديث..." : "حفظ وتحديث المخزون"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const InventoryStatCard = ({ title, value, helper, icon: Icon, tone, loading }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "amber" | "coral"; loading: boolean }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    amber: { icon: "bg-[#FFF5E5] text-[#C38838]", line: "bg-[#C38838]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />

      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
      </div>

      <p className="mt-[12px] text-[8.5px] font-medium text-[#8D949E]">{title}</p>

      {loading ? <Loader2 className="mt-[6px] h-[15px] w-[15px] animate-spin text-[#A0A6AF]" /> : <p className="mt-[4px] truncate text-[19px] font-semibold leading-none tracking-[-0.03em] text-[#303741]">{value}</p>}

      <p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const AdjustmentBadge = ({ type }: { type: AdjustmentType }) => {
  const config = TYPES[type] || TYPES.recount;
  const Icon = config.icon;

  return (
    <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[7px] font-semibold", config.badge)}>
      <Icon className="h-[9px] w-[9px]" />
      {config.label}
    </span>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) => {
  return (
    <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
      <div className="mb-[11px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[9px]">
        <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]">
          <Icon className="h-[11px] w-[11px]" />
        </div>

        <h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3>
      </div>

      <div className="space-y-[9px]">{children}</div>
    </section>
  );
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => <p className="mb-[6px] text-[8px] font-semibold text-[#727A84]">{children}</p>;

const ProductInfo = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => {
  return (
    <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]">
      <p className="text-[6.5px] text-[#9BA2AC]">{label}</p>
      <p className={cn("mt-[4px] truncate text-[9px] font-semibold text-[#515964]", valueClass)}>{value}</p>
    </div>
  );
};

const QuantityPreview = ({ label, value, signed = false, emphasize = false }: { label: string; value: number; signed?: boolean; emphasize?: boolean }) => {
  const positive = value > 0;
  const negative = value < 0;

  return (
    <div className="text-center">
      <p className="text-[6.5px] text-[#9BA2AC]">{label}</p>
      <p className={cn("mt-[4px] text-[12px] font-bold", emphasize ? "text-[#675CBA]" : signed && positive ? "text-[#57906A]" : signed && negative ? "text-[#C15F56]" : "text-[#4C545E]")}>{signed && positive ? "+" : ""}{value.toLocaleString("en-US")}</p>
    </div>
  );
};

const MiniValue = ({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) => {
  return (
    <div className="rounded-[8px] bg-[#F8FAFC] p-[7px] text-center">
      <p className="text-[6px] text-[#9BA2AC]">{label}</p>
      <p className={cn("mt-[3px] text-[9px] font-bold text-[#4E5660]", valueClass)}>{value}</p>
    </div>
  );
};

const InventoryEmpty = () => {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Boxes className="h-[18px] w-[18px]" />
      </div>

      <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد تسويات مخزون</h3>
      <p className="mt-[4px] text-[7.5px] text-[#9BA2AC]">ستظهر هنا جميع حركات الزيادة والنقص والجرد والتالف.</p>
    </div>
  );
};

const InventoryLoading = () => {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
        <p className="mt-2 text-[8px] text-[#969DA7]">جاري تحميل سجل المخزون...</p>
      </div>
    </div>
  );
};

const formatDate = (value: string, withTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ar-EG", withTime ? {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } : {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default AdminInventoryAdjustmentsPage;