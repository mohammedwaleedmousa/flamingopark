import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, CheckCircle2, CircleOff, FolderTree, Layers3, Link2, Loader2, RotateCcw, Save, Search, Tag, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface Category {
  id: string;
  name_ar: string;
  parent_id: string | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface BrandCategoryRow {
  brand_id: string;
  category_id: string;
}

type BrandFilter = "all" | "linked" | "unlinked" | "changed";

const AdminBrandCategoryMapPage = () => {
  const queryClient = useQueryClient();

  const [brandSearch, setBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");
  const [pendingByBrand, setPendingByBrand] = useState<Record<string, string[]>>({});
  const [savingAll, setSavingAll] = useState(false);

  /* =========================================================
     QUERIES
  ========================================================= */

  const { data: brands = [], isLoading: brandsLoading, isFetching: brandsFetching } = useQuery({
    queryKey: ["map-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,slug,logo_url,is_active,sort_order").eq("is_active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });

      if (error) throw error;

      return (data || []) as Brand[];
    },
    staleTime: 30_000,
  });

  const { data: categories = [], isLoading: categoriesLoading, isFetching: categoriesFetching } = useQuery({
    queryKey: ["map-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name_ar,parent_id,is_active,sort_order").eq("is_active", true).order("sort_order", { ascending: true }).order("name_ar", { ascending: true });

      if (error) throw error;

      return (data || []) as Category[];
    },
    staleTime: 60_000,
  });

  const { data: rows = [], isLoading: rowsLoading, isFetching: rowsFetching } = useQuery({
    queryKey: ["map-brand-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_categories").select("brand_id,category_id");

      if (error) throw error;

      return (data || []) as BrandCategoryRow[];
    },
    staleTime: 30_000,
  });

  /* =========================================================
     DERIVED
  ========================================================= */

  const linksByBrand = useMemo(() => {
    return rows.reduce<Record<string, string[]>>((accumulator, row) => {
      if (!accumulator[row.brand_id]) accumulator[row.brand_id] = [];

      accumulator[row.brand_id].push(row.category_id);

      return accumulator;
    }, {});
  }, [rows]);

  const rootCategories = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, Category[]>();

    categories.forEach((category) => {
      if (!category.parent_id) return;

      const current = map.get(category.parent_id) || [];

      current.push(category);

      map.set(category.parent_id, current);
    });

    return map;
  }, [categories]);

  const visibleCategoryIds = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();

    if (!query) return new Set(categories.map((category) => category.id));

    const ids = new Set<string>();

    rootCategories.forEach((root) => {
      const children = childrenByParent.get(root.id) || [];
      const rootMatches = root.name_ar.toLowerCase().includes(query);
      const matchingChildren = children.filter((child) => child.name_ar.toLowerCase().includes(query));

      if (rootMatches) {
        ids.add(root.id);
        children.forEach((child) => ids.add(child.id));
        return;
      }

      if (matchingChildren.length > 0) {
        ids.add(root.id);
        matchingChildren.forEach((child) => ids.add(child.id));
      }
    });

    return ids;
  }, [categories, rootCategories, childrenByParent, categorySearch]);

  const getSelection = (brandId: string) => pendingByBrand[brandId] ?? linksByBrand[brandId] ?? [];

  const isBrandDirty = (brandId: string) => pendingByBrand[brandId] !== undefined;

  const pendingBrandIds = useMemo(() => Object.keys(pendingByBrand), [pendingByBrand]);

  const stats = useMemo(() => {
    const linkedBrands = brands.filter((brand) => (linksByBrand[brand.id] || []).length > 0).length;

    return {
      brands: brands.length,
      categories: categories.length,
      linkedBrands,
      unlinkedBrands: brands.length - linkedBrands,
      links: rows.length,
      changed: pendingBrandIds.length,
    };
  }, [brands, categories.length, linksByBrand, rows.length, pendingBrandIds.length]);

  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();

    return brands.filter((brand) => {
      const selectedCount = getSelection(brand.id).length;

      const matchesSearch = !query || brand.name.toLowerCase().includes(query) || String(brand.slug || "").toLowerCase().includes(query);

      const matchesFilter =
        brandFilter === "all" ||
        (brandFilter === "linked" && selectedCount > 0) ||
        (brandFilter === "unlinked" && selectedCount === 0) ||
        (brandFilter === "changed" && isBrandDirty(brand.id));

      return matchesSearch && matchesFilter;
    });
  }, [brands, brandSearch, brandFilter, linksByBrand, pendingByBrand]);

  const isLoading = brandsLoading || categoriesLoading || rowsLoading;
  const isFetching = brandsFetching || categoriesFetching || rowsFetching;

  /* =========================================================
     SELECTION
  ========================================================= */

  const setBrandSelection = (brandId: string, ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids));

    const original = [...(linksByBrand[brandId] || [])].sort();
    const next = [...uniqueIds].sort();

    const unchanged = original.length === next.length && original.every((value, index) => value === next[index]);

    if (unchanged) {
      setPendingByBrand((current) => {
        const clone = { ...current };
        delete clone[brandId];
        return clone;
      });

      return;
    }

    setPendingByBrand((current) => ({
      ...current,
      [brandId]: uniqueIds,
    }));
  };

  const toggleSelection = (brandId: string, categoryId: string, checked: boolean) => {
    const current = getSelection(brandId);

    const next = checked ? (current.includes(categoryId) ? current : [...current, categoryId]) : current.filter((id) => id !== categoryId);

    setBrandSelection(brandId, next);
  };

  const selectAllCategoriesForBrand = (brandId: string) => {
    setBrandSelection(brandId, categories.map((category) => category.id));
  };

  const clearBrandCategories = (brandId: string) => {
    setBrandSelection(brandId, []);
  };

  const resetBrand = (brandId: string) => {
    setPendingByBrand((current) => {
      const clone = { ...current };

      delete clone[brandId];

      return clone;
    });
  };

  const toggleRootCategory = (brandId: string, root: Category, checked: boolean) => {
    const children = childrenByParent.get(root.id) || [];
    const ids = [root.id, ...children.map((child) => child.id)];
    const current = getSelection(brandId);

    if (checked) {
      setBrandSelection(brandId, [...current, ...ids]);
      return;
    }

    setBrandSelection(brandId, current.filter((id) => !ids.includes(id)));
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveBrandLinks = async (brandId: string, categoryIds: string[]) => {
    const currentIds = linksByBrand[brandId] || [];

    const currentSet = new Set(currentIds);
    const nextSet = new Set(categoryIds);

    const toRemove = currentIds.filter((categoryId) => !nextSet.has(categoryId));
    const toInsert = categoryIds.filter((categoryId) => !currentSet.has(categoryId));

    if (toRemove.length > 0) {
      const { error } = await (supabase as any).from("brand_categories").delete().eq("brand_id", brandId).in("category_id", toRemove);

      if (error) throw error;
    }

    if (toInsert.length > 0) {
      const { error } = await (supabase as any).from("brand_categories").insert(toInsert.map((categoryId) => ({ brand_id: brandId, category_id: categoryId })));

      if (error) throw error;
    }
  };

  const saveBrandMutation = useMutation({
    mutationFn: async ({ brandId, categoryIds }: { brandId: string; categoryIds: string[] }) => {
      await saveBrandLinks(brandId, categoryIds);

      return brandId;
    },

    onSuccess: async (brandId) => {
      setPendingByBrand((current) => {
        const clone = { ...current };

        delete clone[brandId];

        return clone;
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["map-brand-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-brand-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["categories-mapped-brands"] }),
      ]);

      const brand = brands.find((item) => item.id === brandId);

      toast({
        title: "تم حفظ الربط",
        description: `تم تحديث أقسام ${brand?.name || "الماركة"}.`,
      });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ الربط",
        description: error?.message || "حدث خطأ أثناء حفظ ربط الماركة.",
        variant: "destructive",
      });
    },
  });

  const saveAllChanges = async () => {
    if (pendingBrandIds.length === 0) return;

    setSavingAll(true);

    try {
      for (const brandId of pendingBrandIds) {
        await saveBrandLinks(brandId, pendingByBrand[brandId] || []);
      }

      setPendingByBrand({});

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["map-brand-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-brand-categories"] }),
        queryClient.invalidateQueries({ queryKey: ["categories-mapped-brands"] }),
      ]);

      toast({
        title: "تم حفظ جميع التغييرات",
        description: `تم تحديث ربط ${pendingBrandIds.length} ماركة بنجاح.`,
      });
    } catch (error: any) {
      console.error("Save all brand map error:", error);

      toast({
        title: "تعذر حفظ جميع التغييرات",
        description: error?.message || "تم إيقاف العملية بسبب خطأ أثناء الحفظ.",
        variant: "destructive",
      });

      await queryClient.invalidateQueries({ queryKey: ["map-brand-categories"] });
    } finally {
      setSavingAll(false);
    }
  };

  const resetAllChanges = () => {
    setPendingByBrand({});
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>

          <p className="mt-3 text-[8px] font-medium text-[#969DA7]">جاري تحميل خريطة الماركات والأقسام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <AdminPageHeader category="الكتالوج والمخزون" title="ربط الماركات بالأقسام" description="تحكم في الأقسام التي تظهر داخلها كل ماركة في واجهة المتجر" />

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <MapStatCard title="الماركات النشطة" value={stats.brands} helper={`${stats.linkedBrands} مرتبطة بأقسام`} icon={Tag} tone="indigo" />
        <MapStatCard title="الأقسام النشطة" value={stats.categories} helper="متاحة للربط مع الماركات" icon={FolderTree} tone="blue" />
        <MapStatCard title="إجمالي الروابط" value={stats.links} helper={`${stats.unlinkedBrands} ماركة بدون أقسام`} icon={Link2} tone="green" />
        <MapStatCard title="تغييرات غير محفوظة" value={stats.changed} helper={stats.changed > 0 ? "تحتاج إلى حفظ" : "جميع البيانات محفوظة"} icon={stats.changed > 0 ? Save : CheckCircle2} tone="coral" />
      </section>

      {/* =====================================================
          CONTROLS
      ===================================================== */}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-[10px] border-b border-[#EDF0F3] px-[14px] py-[11px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <Link2 className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>

            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">مساحة الربط</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">يمكنك تعديل أكثر من ماركة ثم حفظ جميع التغييرات دفعة واحدة</p>
            </div>
          </div>

          {pendingBrandIds.length > 0 && (
            <div className="flex items-center gap-[6px]">
              <button type="button" disabled={savingAll} onClick={resetAllChanges} className="flex h-[34px] items-center gap-[5px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7px] font-semibold text-[#747C86] transition-colors hover:bg-[#F7F9FB] disabled:opacity-40">
                <RotateCcw className="h-[10px] w-[10px]" />
                إلغاء التغييرات
              </button>

              <button type="button" disabled={savingAll} onClick={() => void saveAllChanges()} className="flex h-[34px] items-center gap-[5px] rounded-[8px] bg-[#675CBA] px-[11px] text-[7px] font-semibold text-white transition-colors hover:bg-[#594FAB] disabled:opacity-50">
                {savingAll ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Save className="h-[10px] w-[10px]" />}
                حفظ الكل
                <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-[5px] bg-white/15 px-[4px] text-[6px]">{pendingBrandIds.length}</span>
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[12px] lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />

            <Input value={brandSearch} onChange={(event) => setBrandSearch(event.target.value)} placeholder="ابحث باسم الماركة أو الرابط..." className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] pl-[34px] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />

            {brandSearch && (
              <button type="button" onClick={() => setBrandSearch("")} className="absolute left-[8px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[7px] text-[#9AA1AB] hover:bg-white hover:text-[#5C6470]">
                <X className="h-[11px] w-[11px]" />
              </button>
            )}
          </div>

          <Select value={brandFilter} onValueChange={(value) => setBrandFilter(value as BrandFilter)}>
            <SelectTrigger className="h-[40px] rounded-[10px] border-[#E3E7EC] bg-[#F8FAFC] text-[8px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">كل الماركات</SelectItem>
              <SelectItem value="linked">مرتبطة بأقسام</SelectItem>
              <SelectItem value="unlinked">بدون أقسام</SelectItem>
              <SelectItem value="changed">غير محفوظة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* =====================================================
          WORKSPACE
      ===================================================== */}

      <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* CATEGORY SIDEBAR */}

        <aside className="hidden self-start overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white xl:sticky xl:top-[16px] xl:block">
          <div className="border-b border-[#EDF0F3] px-[12px] py-[11px]">
            <div className="flex items-center gap-[7px]">
              <FolderTree className="h-[12px] w-[12px] text-[#5680CF]" />
              <p className="text-[9px] font-semibold text-[#4B535D]">دليل الأقسام</p>
            </div>

            <div className="relative mt-[8px]">
              <Search className="absolute right-[10px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 text-[#9BA2AC]" />

              <Input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="بحث في الأقسام..." className="h-[34px] rounded-[8px] border-[#E5E8ED] bg-[#F8FAFC] pr-[29px] text-[7px] shadow-none focus-visible:ring-0" />
            </div>
          </div>

          <div className="max-h-[calc(100vh-330px)] overflow-y-auto p-[7px]">
            {rootCategories.filter((root) => visibleCategoryIds.has(root.id)).map((root) => {
              const children = (childrenByParent.get(root.id) || []).filter((child) => visibleCategoryIds.has(child.id));

              return (
                <div key={root.id} className="mb-[5px] rounded-[9px] border border-[#EDF0F3] bg-[#FCFDFE] p-[7px]">
                  <div className="flex items-center gap-[6px]">
                    <FolderTree className="h-[9px] w-[9px] text-[#675CBA]" />
                    <span className="truncate text-[7px] font-semibold text-[#5B636D]">{root.name_ar}</span>
                  </div>

                  {children.length > 0 && (
                    <div className="mr-[14px] mt-[6px] space-y-[4px]">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center gap-[5px] text-[6.5px] text-[#89919B]">
                          <span className="h-[4px] w-[4px] rounded-full bg-[#BFC5CD]" />
                          <span className="truncate">{child.name_ar}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* BRAND MAPPING */}

        <div className="space-y-[8px]">
          {isFetching && (
            <div className="flex items-center justify-end gap-[5px] text-[6.5px] text-[#969DA7]">
              <Loader2 className="h-[9px] w-[9px] animate-spin" />
              جاري تحديث البيانات...
            </div>
          )}

          {filteredBrands.map((brand) => {
            const selected = getSelection(brand.id);
            const dirty = isBrandDirty(brand.id);

            return (
              <BrandMappingCard
                key={brand.id}
                brand={brand}
                categories={categories}
                rootCategories={rootCategories}
                childrenByParent={childrenByParent}
                selected={selected}
                dirty={dirty}
                saving={saveBrandMutation.isPending && saveBrandMutation.variables?.brandId === brand.id}
                categorySearch={categorySearch}
                visibleCategoryIds={visibleCategoryIds}
                onToggle={(categoryId, checked) => toggleSelection(brand.id, categoryId, checked)}
                onToggleRoot={(root, checked) => toggleRootCategory(brand.id, root, checked)}
                onSelectAll={() => selectAllCategoriesForBrand(brand.id)}
                onClear={() => clearBrandCategories(brand.id)}
                onReset={() => resetBrand(brand.id)}
                onSave={() => saveBrandMutation.mutate({ brandId: brand.id, categoryIds: selected })}
              />
            );
          })}

          {filteredBrands.length === 0 && <EmptyBrands />}
        </div>
      </section>
    </div>
  );
};

/* =========================================================
   BRAND MAPPING CARD
========================================================= */

const BrandMappingCard = ({ brand, categories, rootCategories, childrenByParent, selected, dirty, saving, categorySearch, visibleCategoryIds, onToggle, onToggleRoot, onSelectAll, onClear, onReset, onSave }: { brand: Brand; categories: Category[]; rootCategories: Category[]; childrenByParent: Map<string, Category[]>; selected: string[]; dirty: boolean; saving: boolean; categorySearch: string; visibleCategoryIds: Set<string>; onToggle: (categoryId: string, checked: boolean) => void; onToggleRoot: (root: Category, checked: boolean) => void; onSelectAll: () => void; onClear: () => void; onReset: () => void; onSave: () => void }) => {
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const selectedPercentage = categories.length > 0 ? Math.round((selected.length / categories.length) * 100) : 0;

  return (
    <article className={cn("overflow-hidden rounded-[16px] border bg-white transition-colors", dirty ? "border-[#CEC8EB]" : "border-[#E5E9EF]")}>
      {/* BRAND HEADER */}

      <div className={cn("flex flex-col gap-[10px] border-b px-[13px] py-[11px] sm:flex-row sm:items-center sm:justify-between", dirty ? "border-[#E5E0F4] bg-[#FCFBFF]" : "border-[#EDF0F3]")}>
        <div className="flex min-w-0 items-center gap-[10px]">
          <BrandLogo brand={brand} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[6px]">
              <h3 className="truncate text-[11px] font-semibold text-[#3E4650]">{brand.name}</h3>

              {dirty && (
                <span className="inline-flex items-center gap-[4px] rounded-[6px] bg-[#F1EFFF] px-[6px] py-[3px] text-[6px] font-semibold text-[#675CBA]">
                  <span className="h-[4px] w-[4px] rounded-full bg-[#675CBA]" />
                  غير محفوظ
                </span>
              )}
            </div>

            <div className="mt-[4px] flex flex-wrap items-center gap-x-[9px] gap-y-[3px] text-[6.5px] text-[#989FA8]">
              <span>{selected.length} من {categories.length} قسم</span>
              <span>•</span>
              <span>{selectedPercentage}% من الكتالوج</span>

              {brand.slug && (
                <>
                  <span>•</span>
                  <span dir="ltr">/{brand.slug}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[5px]">
          <button type="button" onClick={onSelectAll} className="h-[31px] rounded-[8px] border border-[#E3E7EC] bg-white px-[8px] text-[6.5px] font-semibold text-[#6D7580] transition-colors hover:bg-[#F8FAFC]">تحديد الكل</button>

          <button type="button" onClick={onClear} className="h-[31px] rounded-[8px] border border-[#E3E7EC] bg-white px-[8px] text-[6.5px] font-semibold text-[#858C96] transition-colors hover:bg-[#F8FAFC]">إلغاء الكل</button>

          {dirty && (
            <button type="button" disabled={saving} onClick={onReset} className="flex h-[31px] items-center gap-[4px] rounded-[8px] border border-[#E3E7EC] bg-white px-[8px] text-[6.5px] font-semibold text-[#858C96] hover:bg-[#F8FAFC] disabled:opacity-40">
              <RotateCcw className="h-[9px] w-[9px]" />
              تراجع
            </button>
          )}

          <button type="button" disabled={!dirty || saving} onClick={onSave} className={cn("flex h-[31px] items-center gap-[5px] rounded-[8px] px-[9px] text-[6.5px] font-semibold transition-colors", dirty ? "bg-[#675CBA] text-white hover:bg-[#594FAB]" : "bg-[#F0F2F5] text-[#9BA2AC]")}>
            {saving ? <Loader2 className="h-[9px] w-[9px] animate-spin" /> : dirty ? <Save className="h-[9px] w-[9px]" /> : <Check className="h-[9px] w-[9px]" />}
            {saving ? "جاري الحفظ" : dirty ? "حفظ" : "محفوظ"}
          </button>
        </div>
      </div>

      {/* PROGRESS */}

      <div className="h-[3px] bg-[#F0F2F5]">
        <div className="h-full bg-[#5680CF] transition-[width] duration-200" style={{ width: `${selectedPercentage}%` }} />
      </div>

      {/* CATEGORIES */}

      <div className="p-[9px]">
        <div className="grid grid-cols-1 gap-[7px] md:grid-cols-2 2xl:grid-cols-3">
          {rootCategories.filter((root) => visibleCategoryIds.has(root.id)).map((root) => {
            const children = (childrenByParent.get(root.id) || []).filter((child) => visibleCategoryIds.has(child.id));
            const allIds = [root.id, ...children.map((child) => child.id)];

            const checkedCount = allIds.filter((id) => selectedSet.has(id)).length;
            const rootChecked = checkedCount === allIds.length;
            const partiallyChecked = checkedCount > 0 && checkedCount < allIds.length;

            return (
              <div key={root.id} className={cn("overflow-hidden rounded-[10px] border transition-colors", checkedCount > 0 ? "border-[#DCE3F0] bg-[#FBFCFF]" : "border-[#E8EBEF] bg-[#FCFDFE]")}>
                <label className="flex cursor-pointer items-center gap-[8px] px-[9px] py-[8px] transition-colors hover:bg-[#F8FAFC]">
                  <Checkbox checked={partiallyChecked ? "indeterminate" : rootChecked} onCheckedChange={(value) => onToggleRoot(root, Boolean(value))} className="h-[14px] w-[14px] border-[#BCC2CA] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA] data-[state=indeterminate]:border-[#675CBA] data-[state=indeterminate]:bg-[#675CBA]" />

                  <FolderTree className="h-[10px] w-[10px] shrink-0 text-[#675CBA]" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[7.5px] font-semibold text-[#565E68]">{root.name_ar}</p>
                  </div>

                  <span className={cn("rounded-[5px] px-[5px] py-[2px] text-[5.5px] font-semibold", checkedCount > 0 ? "bg-[#EDF4FF] text-[#5680CF]" : "bg-[#F0F2F5] text-[#9299A3]")}>{checkedCount}/{allIds.length}</span>
                </label>

                {children.length > 0 && (
                  <div className="border-t border-[#EEF1F4] bg-white">
                    {children.map((child) => {
                      const checked = selectedSet.has(child.id);

                      return (
                        <label key={child.id} className={cn("flex cursor-pointer items-center gap-[7px] border-b border-[#F3F4F6] px-[9px] py-[7px] last:border-b-0 transition-colors hover:bg-[#FAFBFC]", checked && "bg-[#FAFBFF]")}>
                          <Checkbox checked={checked} onCheckedChange={(value) => onToggle(child.id, Boolean(value))} className="h-[13px] w-[13px] border-[#C1C6CE] data-[state=checked]:border-[#5680CF] data-[state=checked]:bg-[#5680CF]" />

                          <span className="h-[4px] w-[4px] rounded-full bg-[#C5CAD1]" />

                          <span className="min-w-0 flex-1 truncate text-[6.5px] font-medium text-[#747C86]">{child.name_ar}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {categorySearch && rootCategories.filter((root) => visibleCategoryIds.has(root.id)).length === 0 && (
          <div className="py-10 text-center">
            <Search className="mx-auto h-[18px] w-[18px] text-[#A0A6AF]" />
            <p className="mt-2 text-[7px] text-[#9299A3]">لا توجد أقسام مطابقة للبحث</p>
          </div>
        )}
      </div>
    </article>
  );
};

/* =========================================================
   BRAND LOGO
========================================================= */

const BrandLogo = ({ brand }: { brand: Brand }) => {
  if (!brand.logo_url) {
    return (
      <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[10px] border border-[#E6E9EE] bg-[#F3F5F7] text-[#969EA8]">
        <Tag className="h-[14px] w-[14px]" />
      </div>
    );
  }

  return (
    <div className="flex h-[40px] w-[40px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#E6E9EE] bg-white p-[6px]">
      <img src={brand.logo_url} alt={brand.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
    </div>
  );
};

/* =========================================================
   STATS
========================================================= */

const MapStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: typeof Link2; tone: "indigo" | "blue" | "green" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[15px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />

      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}>
        <Icon className="h-[14px] w-[14px]" strokeWidth={1.7} />
      </div>

      <p className="mt-[12px] text-[8px] font-medium text-[#8D949E]">{title}</p>
      <p dir="ltr" className="mt-[4px] text-right text-[20px] font-semibold leading-none tracking-[-0.035em] text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[5px] text-[6.5px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyBrands = () => {
  return (
    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[16px] border border-[#E5E9EF] bg-white px-6 text-center">
      <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]">
        <Tag className="h-[18px] w-[18px]" />
      </div>

      <h3 className="mt-3 text-[9px] font-semibold text-[#535B65]">لا توجد ماركات</h3>
      <p className="mt-[4px] text-[7px] text-[#9BA2AC]">لم نجد ماركات مطابقة لعملية البحث أو الفلتر الحالي.</p>
    </div>
  );
};

export default AdminBrandCategoryMapPage;