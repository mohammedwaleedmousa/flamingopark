import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BarChart3, Boxes, CheckCircle2, Edit, Eye, EyeOff, Filter, Layers3, Loader2, Package, PackageCheck, PackageX, Plus, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { optimizeImage } from "@/lib/imageUrl";

interface DbProduct {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  cost_price: number | null;
  original_price: number | null;
  discount: number | null;
  description: string;
  description_ar: string;
  images: string[];
  category: string;
  category_id: string | null;
  brand: string;
  brand_id: string | null;
  in_stock: boolean;
  countries: string[];
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  color_variants?: any[];
  sort_order: number | null;
}

interface FilterCategory {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  parent_id: string | null;
}

const PAGE_SIZE = 25;

const AdminProductsPage = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, inStock: 0, outOfStock: 0 });

  const [page, setPage] = useState(() => {
    const saved = Number(sessionStorage.getItem("admin-products-page") || 1);
    return Number.isFinite(saved) && saved > 0 ? Math.floor(saved) : 1;
  });
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(() => sessionStorage.getItem("admin-products-search") || "");
  const search = useDebounce(searchInput, 350);

  const [status, setStatus] = useState<"all" | "active" | "inactive">(() => (sessionStorage.getItem("admin-products-status") as "all" | "active" | "inactive") || "all");
  const [stock, setStock] = useState<"all" | "in" | "out">(() => (sessionStorage.getItem("admin-products-stock") as "all" | "in" | "out") || "all");
  const [categoryFilter, setCategoryFilter] = useState(() => sessionStorage.getItem("admin-products-category") || "all");
  const [brandFilter, setBrandFilter] = useState(() => sessionStorage.getItem("admin-products-brand") || "all");
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const [categories, setCategories] = useState<FilterCategory[]>([]);
  const [availableBrandNames, setAvailableBrandNames] = useState<string[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; bulk?: boolean } | null>(null);

  const didHydrateFilters = useRef(false);

  useEffect(() => {
    if (!didHydrateFilters.current) { didHydrateFilters.current = true; return; }
    setPage(1);
  }, [search, status, stock, categoryFilter, brandFilter]);

  useEffect(() => { sessionStorage.setItem("admin-products-page", String(page)); }, [page]);
  useEffect(() => { sessionStorage.setItem("admin-products-search", searchInput); }, [searchInput]);

  useEffect(() => {
    sessionStorage.setItem("admin-products-status", status);
    sessionStorage.setItem("admin-products-stock", stock);
    sessionStorage.setItem("admin-products-category", categoryFilter);
    sessionStorage.setItem("admin-products-brand", brandFilter);
  }, [status, stock, categoryFilter, brandFilter]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("id,name,name_ar,slug,parent_id").eq("is_active", true).order("sort_order");
      setCategories((data || []) as FilterCategory[]);
    };

    void fetchCategories();
  }, []);

  const parentCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);

  const categoryScope = useMemo(() => {
    if (categoryFilter === "all" || categoryFilter === "__uncategorized__") return [] as FilterCategory[];

    const scopedIds = new Set<string>([categoryFilter]);

    let changed = true;

    while (changed) {
      changed = false;

      categories.forEach((category) => {
        if (category.parent_id && scopedIds.has(category.parent_id) && !scopedIds.has(category.id)) {
          scopedIds.add(category.id);
          changed = true;
        }
      });
    }

    return categories.filter((category) => scopedIds.has(category.id));
  }, [categories, categoryFilter]);

  useEffect(() => {
    const fetchBrandNames = async () => {
      let query = supabase.from("products").select("brand,category,category_id");

      if (categoryFilter === "__uncategorized__") {
        query = query.is("category_id", null);
      } else if (categoryFilter !== "all") {
        if (categoryScope.length === 0) {
          setAvailableBrandNames([]);
          return;
        }

        const categoryIds = categoryScope.map((category) => category.id);
        const categoryValues = categoryScope.flatMap((category) => [category.slug, category.name, category.name_ar]).filter(Boolean).map((value) => `"${value.replaceAll('"', '\\"')}"`);

        query = query.or(`category_id.in.(${categoryIds.join(",")}),category.in.(${categoryValues.join(",")})`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to load product brands", error);
        return;
      }

      const names = Array.from(new Set((data || []).map((product) => product.brand?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "ar"));

      setAvailableBrandNames(names);
    };

    void fetchBrandNames();
  }, [categoryFilter, categoryScope]);

  useEffect(() => {
    if (brandFilter !== "all" && !availableBrandNames.includes(brandFilter)) setBrandFilter("all");
  }, [availableBrandNames, brandFilter]);

  useEffect(() => {
    void fetchProducts();
    void fetchProductStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, stock, page, categoryFilter, brandFilter, categoryScope]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setSelected(new Set());

    if (categoryFilter !== "all" && categoryFilter !== "__uncategorized__" && categoryScope.length === 0) {
      setProducts([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    let query = supabase.from("products").select("id,name,name_ar,slug,price,cost_price,discount,category,category_id,brand,brand_id,in_stock,is_active,countries,images,color_variants,sort_order", { count: "exact" });

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},name_ar.ilike.${term},slug.ilike.${term}`);
    }

    if (status !== "all") query = query.eq("is_active", status === "active");
    if (stock !== "all") query = query.eq("in_stock", stock === "in");

    if (categoryFilter === "__uncategorized__") {
      query = query.is("category_id", null);
    } else if (categoryFilter !== "all") {
      const categoryIds = categoryScope.map((category) => category.id);
      const categoryValues = categoryScope.flatMap((category) => [category.slug, category.name, category.name_ar]).filter(Boolean).map((value) => `"${value.replaceAll('"', '\\"')}"`);

      query = query.or(`category_id.in.(${categoryIds.join(",")}),category.in.(${categoryValues.join(",")})`);
    }

    if (brandFilter !== "all") query = query.eq("brand", brandFilter);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query.order("sort_order", { ascending: true }).order("created_at", { ascending: false }).range(from, to);

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل المنتجات", variant: "destructive" });
    } else {
      setProducts((data || []) as DbProduct[]);
      setTotal(count || 0);
    }

    setIsLoading(false);
  };

  const fetchProductStats = async () => {
    const { data, error } = await supabase.from("products").select("is_active,in_stock,stock_quantity");

    if (error) {
      console.error("Failed to fetch product stats", error);
      return;
    }

    const rows = data || [];

    setStats({
      total: rows.length,
      active: rows.filter((product) => product.is_active).length,
      inStock: rows.filter((product) => (product.stock_quantity ?? 0) > 0).length,
      outOfStock: rows.filter((product) => (product.stock_quantity ?? 0) <= 0).length,
    });
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const next = !currentState;

    setProducts((current) => current.map((product) => product.id === id ? { ...product, is_active: next } : product));

    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحديث الحالة", variant: "destructive" });
      await fetchProducts();
      return;
    }

    toast({ title: "تم", description: next ? "تم تفعيل المنتج" : "تم تعطيل المنتج" });

    await fetchProductStats();
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({ title: "خطأ", description: "فشل في حذف المنتج", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: "تم حذف المنتج" });

    await Promise.all([fetchProducts(), fetchProductStats()]);
  };

  const toggleSelectAll = () => {
    if (products.length > 0 && products.every((product) => selected.has(product.id))) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(products.map((product) => product.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  };

  const bulkSetActive = async (active: boolean) => {
    if (selected.size === 0) return;

    setBulkBusy(true);

    const ids = Array.from(selected);
    const { error } = await supabase.from("products").update({ is_active: active }).in("id", ids);

    setBulkBusy(false);

    if (error) {
      toast({ title: "خطأ", description: "فشل التحديث الجماعي", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: `تم تحديث ${ids.length} منتج` });

    await Promise.all([fetchProducts(), fetchProductStats()]);
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;

    setBulkBusy(true);

    const ids = Array.from(selected);
    const { error } = await supabase.from("products").delete().in("id", ids);

    setBulkBusy(false);
    setConfirmDelete(null);

    if (error) {
      toast({ title: "خطأ", description: "فشل الحذف الجماعي", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: `تم حذف ${ids.length} منتج` });

    await Promise.all([fetchProducts(), fetchProductStats()]);
  };

  const bulkAssignCategory = async () => {
    if (selected.size === 0 || !bulkCategoryId) return;

    const category = categories.find((item) => item.id === bulkCategoryId);

    if (!category) return;

    setBulkBusy(true);

    const ids = Array.from(selected);
    const { error } = await supabase.from("products").update({ category: category.slug, category_id: category.id }).in("id", ids);

    setBulkBusy(false);

    if (error) {
      toast({ title: "خطأ", description: "فشل تعيين القسم للمنتجات", variant: "destructive" });
      return;
    }

    toast({ title: "تم", description: `تم تعيين قسم ${category.name_ar} لـ ${ids.length} منتج` });

    setSelected(new Set());
    setBulkCategoryId("");

    await fetchProducts();
  };

  const clearFilters = () => {
    setSearchInput("");
    setStatus("all");
    setStock("all");
    setCategoryFilter("all");
    setBrandFilter("all");
  };

  const rememberProductPosition = (productId: string) => {
    sessionStorage.setItem("admin-products-page", String(page));
    sessionStorage.setItem("admin-products-search", searchInput);
    sessionStorage.setItem("admin-products-return-id", productId);
    sessionStorage.setItem("admin-products-return-scroll", String(window.scrollY));
  };

  useEffect(() => {
    if (isLoading || products.length === 0) return;
    const returnId = sessionStorage.getItem("admin-products-return-id");
    if (!returnId || !products.some((product) => product.id === returnId)) return;
    const savedScroll = Number(sessionStorage.getItem("admin-products-return-scroll") || 0);
    requestAnimationFrame(() => { requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-product-id="${returnId}"]`)).find((element) => element.offsetParent !== null);
      if (target) target.scrollIntoView({ block: "center", behavior: "auto" });
      else if (Number.isFinite(savedScroll)) window.scrollTo({ top: savedScroll, left: 0, behavior: "auto" });
      sessionStorage.removeItem("admin-products-return-id");
      sessionStorage.removeItem("admin-products-return-scroll");
    }); });
  }, [isLoading, products, page]);

  const allSelected = useMemo(() => products.length > 0 && products.every((product) => selected.has(product.id)), [products, selected]);

  const hasFilters = Boolean(searchInput.trim()) || status !== "all" || stock !== "all" || categoryFilter !== "all" || brandFilter !== "all";

  const getProductImage = (product: DbProduct) => {
    const candidates: string[] = [];

    if (Array.isArray(product.images)) candidates.push(...product.images.filter(Boolean));

    if (Array.isArray(product.color_variants)) {
      product.color_variants.forEach((variant) => {
        if (Array.isArray(variant?.images)) candidates.push(...variant.images.filter(Boolean));
      });
    }

    const unique = Array.from(new Set(candidates));

    const preferred = unique.find((image) => !/\.(heic|heif)(\?|$)/i.test(image));

    return preferred || unique[0] || "/placeholder.svg";
  };

  const formatPrice = (product: DbProduct) => `${Number(product.price || 0).toLocaleString("en-US")} ر.ي`;

  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader
        category="الكتالوج والمخزون"
        title="إدارة المنتجات"
        description={`${total.toLocaleString("ar-EG")} نتيجة مطابقة للفلاتر الحالية`}
        actions={[
          { label: "إضافة منتج", icon: Plus, href: "/admin/products/new", variant: "primary" },
          { label: "المخزون", icon: Boxes, href: "/admin/inventory-adjustments", variant: "outline" },
          { label: "التقارير", icon: BarChart3, href: "/admin/reports", variant: "outline" },
        ]}
      />

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <ProductStatCard title="إجمالي المنتجات" value={stats.total} helper="جميع منتجات الكتالوج" icon={Package} tone="indigo" />
        <ProductStatCard title="المنتجات النشطة" value={stats.active} helper={`${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% من الكتالوج`} icon={CheckCircle2} tone="green" />
        <ProductStatCard title="متوفر بالمخزون" value={stats.inStock} helper="جاهز للبيع حاليًا" icon={PackageCheck} tone="blue" />
        <ProductStatCard title="نفد المخزون" value={stats.outOfStock} helper="يحتاج إلى المتابعة" icon={PackageX} tone="coral" />
      </section>

      {/* =====================================================
          FILTER PANEL
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[11px]">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <Filter className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">البحث والتصفية</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">اعثر على المنتج المطلوب بسرعة</p>
            </div>
          </div>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="flex h-[29px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#8A919B] transition-colors hover:bg-[#F5F7F9] hover:text-[#555D68]">
              <X className="h-[10px] w-[10px]" strokeWidth={1.8} />
              مسح الكل
            </button>
          )}
        </div>

        <div className="space-y-[11px] p-[12px]">
          {/* CATEGORY */}

          {parentCategories.length > 0 && (
            <div>
              <div className="mb-[7px] flex items-center justify-between">
                <span className="text-[7.5px] font-semibold text-[#969DA7]">التصنيف</span>
                <span className="text-[6.5px] text-[#A8AEB6]">{parentCategories.length} قسم رئيسي</span>
              </div>

              <div className="-mx-[2px] flex items-center gap-[5px] overflow-x-auto px-[2px] pb-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip active={categoryFilter === "all"} onClick={() => { setCategoryFilter("all"); setBrandFilter("all"); }}>كل المنتجات</FilterChip>

                <FilterChip active={categoryFilter === "__uncategorized__"} tone="amber" onClick={() => { setCategoryFilter("__uncategorized__"); setBrandFilter("all"); }}>غير مصنفة</FilterChip>

                {parentCategories.map((category) => (
                  <FilterChip key={category.id} active={categoryFilter === category.id} onClick={() => { setCategoryFilter(category.id); setBrandFilter("all"); }}>{category.name_ar}</FilterChip>
                ))}
              </div>
            </div>
          )}

          {/* BRANDS */}

          {categoryFilter !== "all" && availableBrandNames.length > 0 && (
            <div className="border-t border-[#EFF1F4] pt-[10px]">
              <div className="mb-[7px] flex items-center justify-between">
                <span className="text-[7.5px] font-semibold text-[#969DA7]">الماركات</span>
                <span className="text-[6.5px] text-[#A8AEB6]">{availableBrandNames.length} ماركة</span>
              </div>

              <div className="-mx-[2px] flex items-center gap-[5px] overflow-x-auto px-[2px] pb-[2px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FilterChip active={brandFilter === "all"} tone="rose" onClick={() => setBrandFilter("all")}>كل الماركات</FilterChip>

                {availableBrandNames.map((brandName) => (
                  <FilterChip key={brandName} active={brandFilter === brandName} tone="rose" onClick={() => setBrandFilter(brandName)}>{brandName}</FilterChip>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH ROW */}

          <div className="grid grid-cols-1 gap-[7px] border-t border-[#EFF1F4] pt-[11px] lg:grid-cols-[minmax(0,1fr)_165px_165px]">
            <div className="relative">
              <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" strokeWidth={1.7} />

              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="ابحث باسم المنتج أو slug..." className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[10px] font-medium shadow-none placeholder:text-[#A4ABB4] focus-visible:border-[#D7DBE5] focus-visible:bg-white focus-visible:ring-0" />

              {searchInput && (
                <button type="button" onClick={() => setSearchInput("")} aria-label="مسح البحث" className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] transition-colors hover:bg-white hover:text-[#5C6470]">
                  <X className="h-[11px] w-[11px]" />
                </button>
              )}
            </div>

            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[9px] shadow-none focus:ring-0">
                <SelectValue placeholder="حالة المنتج" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stock} onValueChange={(value) => setStock(value as typeof stock)}>
              <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[9px] shadow-none focus:ring-0">
                <SelectValue placeholder="المخزون" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">كل المخزون</SelectItem>
                <SelectItem value="in">متوفر</SelectItem>
                <SelectItem value="out">غير متوفر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* =================================================
              BULK ACTIONS
          ================================================= */}

          {selected.size > 0 && (
            <div className="flex flex-col gap-[10px] rounded-[12px] border border-[#DED9F1] bg-[#F8F6FF] p-[10px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[31px] min-w-[31px] items-center justify-center rounded-[9px] bg-[#675CBA] px-[7px] text-[9px] font-bold text-white">{selected.size}</div>

                <div>
                  <p className="text-[9px] font-semibold text-[#544D7D]">منتجات محددة</p>
                  <p className="mt-[2px] text-[6.5px] text-[#918AAE]">يمكن تطبيق إجراء جماعي على العناصر المحددة</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-[6px]">
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger className="h-[34px] w-[160px] rounded-[8px] border-[#DED9EB] bg-white text-[8px] shadow-none">
                    <SelectValue placeholder="اختيار قسم" />
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button type="button" disabled={bulkBusy || !bulkCategoryId} onClick={() => void bulkAssignCategory()} className="flex h-[34px] items-center rounded-[8px] border border-[#DDD9EA] bg-white px-[9px] text-[8px] font-semibold text-[#655D80] transition-colors hover:bg-[#FDFDFF] disabled:cursor-not-allowed disabled:opacity-40">تعيين القسم</button>

                <button type="button" disabled={bulkBusy} onClick={() => void bulkSetActive(true)} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#D9E7DD] bg-white px-[9px] text-[8px] font-semibold text-[#568468] transition-colors hover:bg-[#F5FAF6] disabled:opacity-40">
                  <Eye className="h-[10px] w-[10px]" />
                  تفعيل
                </button>

                <button type="button" disabled={bulkBusy} onClick={() => void bulkSetActive(false)} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#E3E6EA] bg-white px-[9px] text-[8px] font-semibold text-[#717984] transition-colors hover:bg-[#F7F9FB] disabled:opacity-40">
                  <EyeOff className="h-[10px] w-[10px]" />
                  تعطيل
                </button>

                <button type="button" disabled={bulkBusy} onClick={() => setConfirmDelete({ bulk: true })} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white px-[9px] text-[8px] font-semibold text-[#C15F56] transition-colors hover:bg-[#FFF3F1] disabled:opacity-40">
                  <Trash2 className="h-[10px] w-[10px]" />
                  حذف
                </button>

                <button type="button" onClick={() => setSelected(new Set())} className="flex h-[34px] items-center rounded-[8px] px-[8px] text-[8px] font-semibold text-[#8A919B] transition-colors hover:bg-white">إلغاء</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          MOBILE LIST
      ===================================================== */}

      <section className="space-y-[8px] md:hidden">
        {isLoading && products.length === 0 ? (
          <LoadingProducts />
        ) : products.length === 0 ? (
          <EmptyProducts />
        ) : (
          products.map((product) => (
            <article key={product.id} data-product-id={product.id} className={cn("overflow-hidden rounded-[14px] border bg-white transition-colors", selected.has(product.id) ? "border-[#CFC9EC] bg-[#FBFAFF]" : "border-[#E5E9EF]")}>
              <div className="p-[11px]">
                <div className="flex items-start gap-[10px]">
                  <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} className="mt-[3px] h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />

                  <div className="flex h-[72px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#EAEDF1] bg-[#F6F7F8]">
                    <img loading="lazy" decoding="async" src={optimizeImage(getProductImage(product), 180, 76)} alt={product.name_ar || product.name} onError={(event) => { event.currentTarget.src = "/placeholder.svg"; }} className="h-full w-full object-contain" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-[7px]">
                      <div className="min-w-0">
                        <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{product.name_ar || product.name}</h3>
                        <p dir="ltr" className="mt-[3px] truncate text-right text-[7px] text-[#A0A6AF]">{product.slug}</p>
                      </div>

                      <ProductStatus active={product.is_active} />
                    </div>

                    <div className="mt-[8px] flex flex-wrap items-center gap-[5px]">
                      {product.category && <InfoTag>{product.category}</InfoTag>}
                      {product.brand && <InfoTag tone="rose">{product.brand}</InfoTag>}
                    </div>

                    <div className="mt-[8px] flex items-end justify-between gap-2">
                      <div>
                        <p dir="ltr" className="text-right text-[12px] font-semibold text-[#353C46]">{formatPrice(product)}</p>
                        {(product.discount ?? 0) > 0 && <p className="mt-[2px] text-[6.5px] font-semibold text-[#C76161]">خصم {product.discount}%</p>}
                      </div>

                      <StockStatus inStock={product.in_stock} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr_36px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                <button type="button" onClick={() => void toggleActive(product.id, product.is_active)} className="flex h-[34px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white text-[8px] font-semibold text-[#69717C]">
                  {product.is_active ? <EyeOff className="h-[11px] w-[11px]" /> : <Eye className="h-[11px] w-[11px]" />}
                  {product.is_active ? "تعطيل" : "تفعيل"}
                </button>

                <Link to={`/admin/products/${product.id}`} onClick={() => rememberProductPosition(product.id)} className="flex h-[34px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white text-[8px] font-semibold text-[#69717C]">
                  <Edit className="h-[11px] w-[11px]" />
                  تعديل
                </Link>

                <button type="button" onClick={() => setConfirmDelete({ id: product.id })} className="flex h-[34px] w-[36px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]">
                  <Trash2 className="h-[12px] w-[12px]" />
                </button>
              </div>
            </article>
          ))
        )}

        <div className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white px-[8px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          DESKTOP TABLE
      ===================================================== */}

      <section className="hidden overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[14px] py-[11px]">
          <div>
            <div className="flex items-center gap-[7px]">
              <Layers3 className="h-[13px] w-[13px] text-[#675CBA]" strokeWidth={1.8} />
              <h2 className="text-[10px] font-semibold text-[#454C56]">قائمة المنتجات</h2>
            </div>

            <p className="mt-[4px] text-[7px] text-[#9CA3AC]">عرض {firstResult.toLocaleString("ar-EG")} - {lastResult.toLocaleString("ar-EG")} من أصل {total.toLocaleString("ar-EG")}</p>
          </div>

          {isLoading && (
            <span className="flex items-center gap-[5px] text-[7px] font-medium text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[7.5px] font-semibold text-[#9299A3]">
                <th className="w-[42px] px-[10px] text-center">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} className="h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                </th>

                <th className="px-[10px] text-right font-semibold">المنتج</th>
                <th className="px-[10px] text-right font-semibold">التصنيف</th>
                <th className="px-[10px] text-right font-semibold">السعر</th>
                <th className="px-[10px] text-right font-semibold">المخزون</th>
                <th className="px-[10px] text-right font-semibold">الحالة</th>
                <th className="w-[125px] px-[10px] text-center font-semibold">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-[260px] text-center">
                    <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#8D949F]" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyProducts />
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} data-product-id={product.id} className={cn("h-[72px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]", selected.has(product.id) && "bg-[#FAF9FF]")}>
                    <td className="px-[10px] text-center">
                      <Checkbox checked={selected.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} className="h-[15px] w-[15px] border-[#BAC0C8] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                    </td>

                    <td className="px-[10px]">
                      <div className="flex min-w-[260px] items-center gap-[10px]">
                        <div className="flex h-[54px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#E8EBEF] bg-[#F6F7F8]">
                          <img loading="lazy" decoding="async" src={optimizeImage(getProductImage(product), 150, 76)} alt={product.name_ar || product.name} onError={(event) => { event.currentTarget.src = "/placeholder.svg"; }} className="h-full w-full object-contain" />
                        </div>

                        <div className="min-w-0">
                          <Link to={`/admin/products/${product.id}`} onClick={() => rememberProductPosition(product.id)} className="block max-w-[250px] truncate text-[10px] font-semibold text-[#424A54] transition-colors hover:text-[#675CBA]">{product.name_ar || product.name}</Link>

                          <p dir="ltr" className="mt-[4px] max-w-[250px] truncate text-right text-[6.8px] text-[#A1A7B0]">{product.slug}</p>

                          {product.brand && <p className="mt-[3px] max-w-[250px] truncate text-[7px] font-medium text-[#9A7181]">{product.brand}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="px-[10px]">
                      {product.category ? <InfoTag>{product.category}</InfoTag> : <span className="text-[7px] text-[#A4AAB2]">غير مصنف</span>}
                    </td>

                    <td className="px-[10px]">
                      <p dir="ltr" className="text-right text-[10px] font-semibold text-[#3E454F]">{formatPrice(product)}</p>

                      {(product.discount ?? 0) > 0 && <span className="mt-[4px] inline-flex rounded-[6px] bg-[#FFF0F0] px-[5px] py-[2px] text-[6.5px] font-semibold text-[#C76161]">-{product.discount}%</span>}
                    </td>

                    <td className="px-[10px]">
                      <StockStatus inStock={product.in_stock} />
                    </td>

                    <td className="px-[10px]">
                      <ProductStatus active={product.is_active} />
                    </td>

                    <td className="px-[10px]">
                      <div className="flex items-center justify-center gap-[4px]">
                        <ActionButton label={product.is_active ? "تعطيل المنتج" : "تفعيل المنتج"} onClick={() => void toggleActive(product.id, product.is_active)}>
                          {product.is_active ? <EyeOff className="h-[12px] w-[12px]" /> : <Eye className="h-[12px] w-[12px]" />}
                        </ActionButton>

                        <Link to={`/admin/products/${product.id}`} onClick={() => rememberProductPosition(product.id)} aria-label="تعديل المنتج" className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707884] transition-colors hover:border-[#D7DCE3] hover:bg-[#F7F9FB] hover:text-[#675CBA]">
                          <Edit className="h-[12px] w-[12px]" strokeWidth={1.7} />
                        </Link>

                        <ActionButton destructive label="حذف المنتج" onClick={() => setConfirmDelete({ id: product.id })}>
                          <Trash2 className="h-[12px] w-[12px]" />
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#EAEDF1] px-[10px]">
          <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </section>

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      <AlertDialog open={Boolean(confirmDelete)} onOpenChange={(open) => { if (!open) setConfirmDelete(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.7} />
            </div>

            <AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">تأكيد الحذف</AlertDialogTitle>

            <AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">
              {confirmDelete?.bulk ? `سيتم حذف ${selected.size} منتج نهائيًا من النظام. لا يمكن التراجع عن هذه العملية.` : "سيتم حذف هذا المنتج نهائيًا من النظام. لا يمكن التراجع عن هذه العملية."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>

            <AlertDialogAction className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]" onClick={() => {
              if (confirmDelete?.bulk) {
                void bulkDelete();
                return;
              }

              if (confirmDelete?.id) {
                const id = confirmDelete.id;
                setConfirmDelete(null);
                void deleteOne(id);
              }
            }}>
              {bulkBusy ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Trash2 className="ml-[5px] h-[12px] w-[12px]" />}
              حذف نهائي
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   STAT CARD
========================================================= */

const ProductStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: typeof Package; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const styles = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#57906A]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#567BC5]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#C9685D]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <div className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", styles.line)} />

      <div className="flex items-start justify-between">
        <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", styles.icon)}>
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
        </div>

        <span className="text-[6.5px] font-medium text-[#A2A8B1]">CATALOG</span>
      </div>

      <p className="mt-[12px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p dir="ltr" className="mt-[4px] text-right text-[20px] font-semibold leading-none tracking-[-0.035em] text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[5px] text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </div>
  );
};

/* =========================================================
   FILTER CHIP
========================================================= */

const FilterChip = ({ children, active, tone = "indigo", onClick }: { children: React.ReactNode; active: boolean; tone?: "indigo" | "rose" | "amber"; onClick: () => void }) => {
  const activeClass = tone === "rose" ? "border-[#E6D5DC] bg-[#FFF1F5] text-[#A95E70]" : tone === "amber" ? "border-[#EADCBF] bg-[#FFF7E8] text-[#A9782F]" : "border-[#DCD7F1] bg-[#F3F1FF] text-[#6258AE]";

  return (
    <button type="button" onClick={onClick} className={cn("h-[30px] shrink-0 rounded-[8px] border px-[10px] text-[7.5px] font-semibold transition-colors", active ? activeClass : "border-[#E7EAEF] bg-white text-[#7D858F] hover:border-[#DDE1E7] hover:bg-[#F8FAFC] hover:text-[#515964]")}>{children}</button>
  );
};

/* =========================================================
   TAGS
========================================================= */

const InfoTag = ({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "rose" }) => {
  return <span className={cn("inline-flex max-w-[150px] truncate rounded-[6px] px-[6px] py-[3px] text-[6.5px] font-medium", tone === "rose" ? "bg-[#FFF1F5] text-[#A76474]" : "bg-[#EFF5FD] text-[#5C78A3]")}>{children}</span>;
};

const ProductStatus = ({ active }: { active: boolean }) => {
  return (
    <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[7px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E2E5E9] bg-[#F5F6F8] text-[#7B838E]")}>
      <span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />
      {active ? "نشط" : "معطل"}
    </span>
  );
};

const StockStatus = ({ inStock }: { inStock: boolean }) => {
  return (
    <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[7px] font-semibold", inStock ? "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" : "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]")}>
      <span className={cn("h-[5px] w-[5px] rounded-full", inStock ? "bg-[#5680CF]" : "bg-[#D06A5E]")} />
      {inStock ? "متوفر" : "نفد"}
    </span>
  );
};

/* =========================================================
   ACTION
========================================================= */

const ActionButton = ({ children, label, destructive = false, onClick }: { children: React.ReactNode; label: string; destructive?: boolean; onClick: () => void }) => {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border bg-white transition-colors", destructive ? "border-[#F0D7D4] text-[#C15F56] hover:bg-[#FFF3F1]" : "border-[#E3E7EC] text-[#707884] hover:border-[#D7DCE3] hover:bg-[#F7F9FB] hover:text-[#675CBA]")}>{children}</button>
  );
};

/* =========================================================
   EMPTY / LOADING
========================================================= */

const EmptyProducts = () => {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Package className="h-[19px] w-[19px]" strokeWidth={1.5} />
      </div>

      <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد منتجات</h3>
      <p className="mt-[4px] text-[7.5px] leading-5 text-[#9BA2AC]">لم نجد منتجات مطابقة للبحث أو الفلاتر الحالية.</p>
    </div>
  );
};

const LoadingProducts = () => {
  return (
    <div className="flex h-[230px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
      <div className="text-center">
        <Loader2 className="mx-auto h-[20px] w-[20px] animate-spin text-[#675CBA]" />
        <p className="mt-2 text-[7.5px] font-medium text-[#969DA7]">جاري تحميل المنتجات...</p>
      </div>
    </div>
  );
};

export default AdminProductsPage;