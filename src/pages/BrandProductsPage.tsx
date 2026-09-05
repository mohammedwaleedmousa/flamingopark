import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Package, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface BrandSectionRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
}

interface SectionRelationRow {
  section_id: string;
  product_id: string;
}

type SortOption = "newest" | "price-asc" | "price-desc" | "name";

const SORT_OPTIONS: { value: SortOption; label: string; description: string }[] = [
  { value: "newest", label: "الأحدث", description: "المنتجات المضافة حديثًا أولاً" },
  { value: "price-asc", label: "السعر: الأقل أولاً", description: "من السعر الأقل إلى الأعلى" },
  { value: "price-desc", label: "السعر: الأعلى أولاً", description: "من السعر الأعلى إلى الأقل" },
  { value: "name", label: "الاسم", description: "ترتيب المنتجات حسب الاسم" },
];

const BrandProductsPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const [selectedSection, setSelectedSection] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");

  const [draftSection, setDraftSection] = useState("all");
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [draftInStockOnly, setDraftInStockOnly] = useState(false);

  /* =========================================================
     LOCK PAGE SCROLL
     يعمل بشكل صحيح حتى على iPhone / Safari
  ========================================================= */

  useEffect(() => {
    const shouldLock = filtersOpen || sortOpen;

    if (!shouldLock) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const root = document.documentElement;

    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      body.style.overflow = previousOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;

      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    };
  }, [filtersOpen, sortOpen]);

  /* =========================================================
     BRAND
  ========================================================= */

  const { data: brand, isLoading: brandLoading, error: brandError } = useQuery({
    queryKey: ["brand-products-page", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name,slug,logo_url").eq("slug", slug).eq("is_active", true).maybeSingle();

      if (error) throw error;

      return data as BrandRow | null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["brand-products-page-list", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("brand_id", brand!.id).eq("is_active", true).order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     BRAND SECTIONS
  ========================================================= */

  const { data: sections = [] } = useQuery({
    queryKey: ["brand-products-filter-sections", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_sections").select("id,name,slug,sort_order").eq("brand_id", brand!.id).eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandSectionRow[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SECTION RELATIONS
  ========================================================= */

  const { data: sectionRelations = [] } = useQuery({
    queryKey: ["brand-products-filter-relations", brand?.id, sections.map((section) => section.id).join(",")],
    enabled: Boolean(brand?.id && sections.length),
    queryFn: async () => {
      const sectionIds = sections.map((section) => section.id);

      const { data, error } = await (supabase as any).from("brand_section_products").select("section_id,product_id").in("section_id", sectionIds);

      if (error) throw error;

      return (data || []) as SectionRelationRow[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SECTION PRODUCT MAP
  ========================================================= */

  const sectionProductIds = useMemo(() => {
    const map = new Map<string, Set<string>>();

    sectionRelations.forEach((relation) => {
      if (!map.has(relation.section_id)) {
        map.set(relation.section_id, new Set<string>());
      }

      map.get(relation.section_id)!.add(relation.product_id);
    });

    return map;
  }, [sectionRelations]);

  /* =========================================================
     PRICE RANGE
  ========================================================= */

  const priceRange = useMemo(() => {
    const prices = products.map((product) => Number((product as any).price || 0)).filter((price) => Number.isFinite(price) && price >= 0);

    if (!prices.length) {
      return {
        min: 0,
        max: 0,
      };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  /* =========================================================
     FILTER PRODUCTS
  ========================================================= */

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (selectedSection !== "all") {
      const allowedProducts = sectionProductIds.get(selectedSection) || new Set<string>();

      result = result.filter((product) => allowedProducts.has(product.id));
    }

    const parsedMin = minPrice.trim() ? Number(minPrice) : null;
    const parsedMax = maxPrice.trim() ? Number(maxPrice) : null;

    if (parsedMin !== null && Number.isFinite(parsedMin)) {
      result = result.filter((product) => Number((product as any).price || 0) >= parsedMin);
    }

    if (parsedMax !== null && Number.isFinite(parsedMax)) {
      result = result.filter((product) => Number((product as any).price || 0) <= parsedMax);
    }

    if (inStockOnly) {
      result = result.filter((product) => {
        const stock = (product as any).inStock ?? (product as any).in_stock ?? true;

        return Boolean(stock);
      });
    }

    result.sort((a, b) => {
      const priceA = Number((a as any).price || 0);
      const priceB = Number((b as any).price || 0);

      if (sort === "price-asc") {
        return priceA - priceB;
      }

      if (sort === "price-desc") {
        return priceB - priceA;
      }

      if (sort === "name") {
        const nameA = String((a as any).nameAr || (a as any).name_ar || (a as any).name || "");
        const nameB = String((b as any).nameAr || (b as any).name_ar || (b as any).name || "");

        return nameA.localeCompare(nameB, "ar");
      }

      return 0;
    });

    return result;
  }, [products, selectedSection, sectionProductIds, minPrice, maxPrice, inStockOnly, sort]);

  /* =========================================================
     DRAFT FILTER RESULTS COUNT
  ========================================================= */

  const draftResultCount = useMemo(() => {
    let result = [...products];

    if (draftSection !== "all") {
      const allowedProducts = sectionProductIds.get(draftSection) || new Set<string>();

      result = result.filter((product) => allowedProducts.has(product.id));
    }

    const parsedMin = draftMinPrice.trim() ? Number(draftMinPrice) : null;
    const parsedMax = draftMaxPrice.trim() ? Number(draftMaxPrice) : null;

    if (parsedMin !== null && Number.isFinite(parsedMin)) {
      result = result.filter((product) => Number((product as any).price || 0) >= parsedMin);
    }

    if (parsedMax !== null && Number.isFinite(parsedMax)) {
      result = result.filter((product) => Number((product as any).price || 0) <= parsedMax);
    }

    if (draftInStockOnly) {
      result = result.filter((product) => {
        const stock = (product as any).inStock ?? (product as any).in_stock ?? true;

        return Boolean(stock);
      });
    }

    return result.length;
  }, [products, draftSection, sectionProductIds, draftMinPrice, draftMaxPrice, draftInStockOnly]);

  /* =========================================================
     ACTIVE FILTERS
  ========================================================= */

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (selectedSection !== "all") count += 1;
    if (minPrice.trim()) count += 1;
    if (maxPrice.trim()) count += 1;
    if (inStockOnly) count += 1;

    return count;
  }, [selectedSection, minPrice, maxPrice, inStockOnly]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label || "الأحدث";

  /* =========================================================
     FILTER ACTIONS
  ========================================================= */

  const openFilters = () => {
    setSortOpen(false);

    setDraftSection(selectedSection);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftInStockOnly(inStockOnly);

    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setSelectedSection(draftSection);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setInStockOnly(draftInStockOnly);

    setFiltersOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftSection("all");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftInStockOnly(false);
  };

  const resetFilters = () => {
    setSelectedSection("all");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);

    setDraftSection("all");
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftInStockOnly(false);
  };

  if (!slug) {
    return <Navigate to="/brands" replace />;
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!brandLoading && (!brand || brandError)) {
    return (
      <div className="flex min-h-screen flex-col bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="flex flex-1 items-center justify-center px-4 py-20">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border">
              <Package className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>

            <h1 className="mt-4 text-[20px] font-semibold text-foreground">الماركة غير موجودة</h1>

            <p className="mt-2 text-[12px] text-muted-foreground">قد تكون الماركة غير متاحة أو تم تغيير الرابط.</p>

            <Link to="/brands" className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border px-4 text-[11px] font-medium text-[#A95B61]">
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              العودة إلى الماركات
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="flex-1 pb-14 pt-5 md:pb-20 md:pt-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <section className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
          <Link to={`/brands/${slug}`} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-[#A95B61] md:text-[12px]">
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            العودة إلى {brand?.name || "الماركة"}
          </Link>

          <div className="mt-7 flex items-end justify-between gap-4 border-b border-border/60 pb-7">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-[2px] w-5 rounded-full bg-[#D4777D]" />
                <span className="font-serif text-[8px] uppercase tracking-[0.22em] text-[#B86168] md:text-[9px]">ALL PRODUCTS</span>
              </div>

              <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-foreground md:text-[36px]">{brand?.name || "المنتجات"}</h1>
            </div>

            {!brandLoading && !productsLoading && <span className="pb-1 text-[10px] text-muted-foreground md:text-[11px]">{filteredProducts.length} منتج</span>}
          </div>
        </section>

        {/* =====================================================
            FILTER / SORT TOOLBAR
        ===================================================== */}

        <section className="sticky top-0 z-30 mt-3 border-b border-border/60 bg-background/95 backdrop-blur-[8px] md:static md:mt-5 md:bg-background md:backdrop-blur-none">
          <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 px-4 py-2.5 md:px-6">
            {/* FILTER */}

            <button type="button" onClick={openFilters} className="flex h-[46px] min-w-[96px] items-center justify-center gap-2 rounded-[12px] border border-[#E5DDD9] bg-background px-4 text-[12px] font-medium text-[#4E433F] transition-colors active:bg-muted/40">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />

              <span>فلترة</span>

              {activeFilterCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[9px] font-semibold text-white">{activeFilterCount}</span>}
            </button>

            {/* SORT */}

            <button type="button" onClick={() => { setFiltersOpen(false); setSortOpen(true); }} className="flex h-[46px] min-w-[132px] items-center justify-between gap-3 rounded-[12px] border border-[#E5DDD9] bg-background px-4 text-[12px] font-medium text-[#4E433F] transition-colors active:bg-muted/40">
              <span>{sortLabel}</span>
              <ChevronDown className="h-4 w-4 text-[#948681]" strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {/* =====================================================
            ACTIVE FILTERS
        ===================================================== */}

        {activeFilterCount > 0 && (
          <section className="mx-auto mt-2 flex w-full max-w-[1400px] items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
            {selectedSection !== "all" && (
              <button type="button" onClick={() => setSelectedSection("all")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D7D2] bg-[#FFF8F6] px-3 text-[10px] text-[#9E6165]">
                {sections.find((section) => section.id === selectedSection)?.name || "القسم"}
                <X className="h-3 w-3" />
              </button>
            )}

            {minPrice && (
              <button type="button" onClick={() => setMinPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D7D2] bg-[#FFF8F6] px-3 text-[10px] text-[#9E6165]">
                من {minPrice}
                <X className="h-3 w-3" />
              </button>
            )}

            {maxPrice && (
              <button type="button" onClick={() => setMaxPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D7D2] bg-[#FFF8F6] px-3 text-[10px] text-[#9E6165]">
                إلى {maxPrice}
                <X className="h-3 w-3" />
              </button>
            )}

            {inStockOnly && (
              <button type="button" onClick={() => setInStockOnly(false)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D7D2] bg-[#FFF8F6] px-3 text-[10px] text-[#9E6165]">
                متوفر فقط
                <X className="h-3 w-3" />
              </button>
            )}

            <button type="button" onClick={resetFilters} className="flex h-8 shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
              مسح الكل
            </button>
          </section>
        )}

        {/* =====================================================
            PRODUCTS
        ===================================================== */}

        <section className="mx-auto mt-5 w-full max-w-[1400px] px-4 md:mt-7 md:px-6">
          {brandLoading || productsLoading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
              {Array.from({ length: 12 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center border-y border-border/60">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
                  <Package className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </div>

                <h2 className="mt-3 text-[13px] font-semibold text-foreground">لا توجد منتجات مطابقة</h2>

                <p className="mt-1.5 text-[10px] text-muted-foreground">جرّب تغيير خيارات الفلترة.</p>

                {activeFilterCount > 0 && (
                  <button type="button" onClick={resetFilters} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border px-3.5 text-[10px] font-medium text-[#A95B61]">
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                    مسح الفلاتر
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* =====================================================
          SORT MENU
      ===================================================== */}

      {sortOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setSortOpen(false)} aria-label="إغلاق الترتيب" className="absolute inset-0 cursor-default bg-black/25" />

          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-[22px] bg-background px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_40px_rgba(35,28,25,0.14)] md:bottom-5 md:rounded-[22px]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#DDD3CE] md:hidden" />

            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">ترتيب المنتجات</h2>
                <p className="mt-1 text-[10px] text-muted-foreground">اختر طريقة عرض المنتجات</p>
              </div>

              <button type="button" onClick={() => setSortOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-border/70">
              {SORT_OPTIONS.map((option, index) => {
                const selected = sort === option.value;

                return (
                  <button key={option.value} type="button" onClick={() => { setSort(option.value); setSortOpen(false); }} className={`flex w-full items-center justify-between gap-4 px-4 py-3.5 text-right transition-colors ${index !== SORT_OPTIONS.length - 1 ? "border-b border-border/60" : ""} ${selected ? "bg-[#FFF7F5]" : "bg-background active:bg-muted/40"}`}>
                    <div>
                      <p className={`text-[13px] font-medium ${selected ? "text-[#A95B61]" : "text-foreground"}`}>{option.label}</p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">{option.description}</p>
                    </div>

                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D9D0CC]"}`}>{selected && <Check className="h-3 w-3 text-white" strokeWidth={2} />}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FILTER DRAWER
      ===================================================== */}

      {filtersOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setFiltersOpen(false)} aria-label="إغلاق الفلترة" className="absolute inset-0 cursor-default bg-black/30" />

          <div className="absolute bottom-0 right-0 flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[24px] bg-background shadow-[0_-14px_45px_rgba(35,28,25,0.14)] md:bottom-auto md:top-0 md:h-full md:max-h-none md:w-[400px] md:rounded-none">
            {/* HANDLE */}

            <div className="flex h-6 shrink-0 items-center justify-center md:hidden">
              <span className="h-1 w-10 rounded-full bg-[#DDD3CE]" />
            </div>

            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 pb-4 pt-2 md:pt-4">
              <div>
                <h2 className="text-[17px] font-semibold text-foreground">فلترة المنتجات</h2>
                <p className="mt-1 text-[10px] text-muted-foreground">{draftResultCount} منتج مطابق</p>
              </div>

              <button type="button" onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="flex-1 overscroll-contain overflow-y-auto px-4">
              {/* SECTIONS */}

              {sections.length > 0 && (
                <div className="border-b border-border/70 py-5">
                  <h3 className="text-[13px] font-semibold text-foreground">القسم</h3>

                  <p className="mt-1 text-[9px] text-muted-foreground">اختر القسم الذي تريد عرضه</p>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDraftSection("all")} className={`flex min-h-[42px] items-center justify-between gap-2 rounded-[10px] border px-3 text-[11px] transition-colors ${draftSection === "all" ? "border-[#D7AAA7] bg-[#FFF7F5] text-[#A95B61]" : "border-border bg-background text-foreground"}`}>
                      <span>جميع الأقسام</span>

                      {draftSection === "all" && <Check className="h-3.5 w-3.5" strokeWidth={1.8} />}
                    </button>

                    {sections.map((section) => (
                      <button key={section.id} type="button" onClick={() => setDraftSection(section.id)} className={`flex min-h-[42px] items-center justify-between gap-2 rounded-[10px] border px-3 text-[11px] transition-colors ${draftSection === section.id ? "border-[#D7AAA7] bg-[#FFF7F5] text-[#A95B61]" : "border-border bg-background text-foreground"}`}>
                        <span className="truncate">{section.name}</span>

                        {draftSection === section.id && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRICE */}

              <div className="border-b border-border/70 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">السعر</h3>
                    <p className="mt-1 text-[9px] text-muted-foreground">حدد نطاق السعر المناسب</p>
                  </div>

                  {priceRange.max > 0 && <span className="text-[9px] text-muted-foreground">{priceRange.min} — {priceRange.max}</span>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <label>
                    <span className="mb-1.5 block text-[9px] text-muted-foreground">من</span>

                    <input type="number" inputMode="decimal" min={0} value={draftMinPrice} onChange={(event) => setDraftMinPrice(event.target.value)} placeholder={String(priceRange.min || 0)} className="h-[46px] w-full rounded-[11px] border border-border bg-background px-3 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-[#D7AAA7]" />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[9px] text-muted-foreground">إلى</span>

                    <input type="number" inputMode="decimal" min={0} value={draftMaxPrice} onChange={(event) => setDraftMaxPrice(event.target.value)} placeholder={String(priceRange.max || 0)} className="h-[46px] w-full rounded-[11px] border border-border bg-background px-3 text-[12px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-[#D7AAA7]" />
                  </label>
                </div>
              </div>

              {/* AVAILABILITY */}

              <div className="py-5">
                <button type="button" onClick={() => setDraftInStockOnly((value) => !value)} className="flex w-full items-center justify-between gap-5 text-right">
                  <div>
                    <h3 className="text-[13px] font-semibold text-foreground">المتوفر فقط</h3>

                    <p className="mt-1 text-[9px] text-muted-foreground">إخفاء المنتجات غير المتوفرة حاليًا</p>
                  </div>

                  <span className={`relative h-[27px] w-[48px] shrink-0 rounded-full transition-colors ${draftInStockOnly ? "bg-[#D4777D]" : "bg-[#DED6D2]"}`}>
                    <span className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.16)] transition-all ${draftInStockOnly ? "right-[24px]" : "right-[3px]"}`} />
                  </span>
                </button>
              </div>
            </div>

            {/* FOOTER */}

            <div className="grid shrink-0 grid-cols-[0.72fr_1.28fr] gap-2 border-t border-border/70 bg-background px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={resetDraftFilters} className="flex h-[46px] items-center justify-center gap-1.5 rounded-[11px] border border-border text-[11px] font-medium text-muted-foreground">
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                مسح
              </button>

              <button type="button" onClick={applyFilters} className="h-[46px] rounded-[11px] bg-[#D4777D] px-4 text-[12px] font-semibold text-white transition-colors active:bg-[#B86168]">
                عرض {draftResultCount} منتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandProductsPage;
