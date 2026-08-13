import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronRight, Package, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";

import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/store/useStore";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
}

interface SectionRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
}

interface BrandFilterRow {
  id: string;
  name: string;
  slug: string;
  filter_type: string;
  options: any;
  sort_order: number | null;
}

interface FilterableProduct extends Product {
  _filterText: string;
  _createdAt?: string;
}

type SortType = "none" | "asc" | "desc" | "name";

const SORT_OPTIONS: { value: SortType; label: string }[] = [
  { value: "none", label: "الأحدث" },
  { value: "asc", label: "السعر: الأقل أولاً" },
  { value: "desc", label: "السعر: الأعلى أولاً" },
  { value: "name", label: "الاسم" },
];

const normalizeFilterOptions = (options: any): string[] => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option: any) => {
      if (typeof option === "string") return option;

      return option?.value || option?.label || option?.name || "";
    })
    .filter(Boolean);
};

const createFilterText = (product: any) => {
  return [
    product.name,
    product.name_ar,
    product.description,
    product.description_ar,
    product.category,
    product.brand,
    ...(Array.isArray(product.sizes) ? product.sizes : []),
    JSON.stringify(product.color_variants || []),
    JSON.stringify(product.features || []),
    JSON.stringify(product.specs || []),
    JSON.stringify(product.quality_variants || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const mapProduct = (product: any): FilterableProduct => ({
  id: product.id,
  name: product.name,
  nameAr: product.name_ar,
  slug: product.slug,
  price: Number(product.price),
  originalPrice: product.original_price ? Number(product.original_price) : undefined,
  discount: product.discount || undefined,
  description: product.description || "",
  descriptionAr: product.description_ar || "",
  images: product.images?.length > 0 ? product.images : product.color_variants?.[0]?.images || [],
  category: product.category,
  brand: product.brand,
  inStock: product.in_stock ?? true,
  countries: (product.countries || ["GLOBAL"]) as Product["countries"],
  isFeatured: product.is_featured,
  isBestSeller: product.is_best_seller,
  _filterText: createFilterText(product),
  _createdAt: product.created_at,
});

const BrandSectionPage = () => {
  const { slug, sectionSlug } = useParams<{ slug: string; sectionSlug: string }>();

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const [priceSort, setPriceSort] = useState<SortType>("none");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({});
  const [draftMinPrice, setDraftMinPrice] = useState("");
  const [draftMaxPrice, setDraftMaxPrice] = useState("");
  const [draftInStockOnly, setDraftInStockOnly] = useState(false);

  /* =========================================================
     LOCK BACKGROUND
  ========================================================= */

  useEffect(() => {
    if (!filterOpen && !sortOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;

    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.overflow = previousOverflow;

      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    };
  }, [filterOpen, sortOpen]);

  /* =========================================================
     BRAND
  ========================================================= */

  const { data: brand } = useQuery({
    queryKey: ["brand-by-slug-sec", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name,slug").eq("slug", slug).eq("is_active", true).maybeSingle();

      if (error) throw error;

      return data as BrandRow | null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SECTION
  ========================================================= */

  const { data: section, isLoading: sectionLoading } = useQuery({
    queryKey: ["brand-section", brand?.id, sectionSlug],
    enabled: Boolean(brand?.id && sectionSlug),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_sections").select("id,name,slug,image_url,description").eq("brand_id", brand!.id).eq("slug", sectionSlug).eq("is_active", true).maybeSingle();

      if (error) throw error;

      return data as SectionRow | null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     FILTERS
  ========================================================= */

  const { data: brandFilters = [] } = useQuery({
    queryKey: ["brand-filters-for-section", brand?.id, section?.id],
    enabled: Boolean(brand?.id && section?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_filters").select("id,name,slug,filter_type,options,sort_order,section_id").eq("brand_id", brand!.id).eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return ((data || []) as Array<BrandFilterRow & { section_id?: string | null }>).filter((filter) => !filter.section_id || filter.section_id === section!.id);
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["brand-section-products", section?.id],
    enabled: Boolean(section?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_section_products").select(`product_id,products(*)`).eq("section_id", section!.id);

      if (error) throw error;

      const productRows = (data || []).map((item: any) => item.products).filter(Boolean).filter((product: any) => product.is_active);

      return productRows.map(mapProduct);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     PRICE RANGE
  ========================================================= */

  const priceRange = useMemo(() => {
    const prices = products.map((product) => Number(product.price || 0)).filter((price) => Number.isFinite(price));

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
     FILTER FUNCTION
  ========================================================= */

  const filterProducts = (source: FilterableProduct[], filters: Record<string, string>, minimum: string, maximum: string, stockOnly: boolean) => {
    let list = [...source];

    Object.values(filters).forEach((value) => {
      if (!value) return;

      const normalizedValue = value.trim().toLowerCase();

      list = list.filter((product) => product._filterText.includes(normalizedValue));
    });

    const parsedMin = minimum.trim() ? Number(minimum) : null;
    const parsedMax = maximum.trim() ? Number(maximum) : null;

    if (parsedMin !== null && Number.isFinite(parsedMin)) {
      list = list.filter((product) => Number(product.price || 0) >= parsedMin);
    }

    if (parsedMax !== null && Number.isFinite(parsedMax)) {
      list = list.filter((product) => Number(product.price || 0) <= parsedMax);
    }

    if (stockOnly) {
      list = list.filter((product) => Boolean(product.inStock));
    }

    return list;
  };

  /* =========================================================
     VISIBLE PRODUCTS
  ========================================================= */

  const visibleProducts = useMemo(() => {
    const list = filterProducts(products, activeFilters, minPrice, maxPrice, inStockOnly);

    if (priceSort === "asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    if (priceSort === "desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }

    if (priceSort === "name") {
      list.sort((a, b) => String(a.nameAr || a.name || "").localeCompare(String(b.nameAr || b.name || ""), "ar"));
    }

    return list;
  }, [products, activeFilters, minPrice, maxPrice, inStockOnly, priceSort]);

  const draftResultCount = useMemo(() => {
    return filterProducts(products, draftFilters, draftMinPrice, draftMaxPrice, draftInStockOnly).length;
  }, [products, draftFilters, draftMinPrice, draftMaxPrice, draftInStockOnly]);

  const activeFilterCount = useMemo(() => {
    let count = Object.values(activeFilters).filter(Boolean).length;

    if (minPrice.trim()) count += 1;
    if (maxPrice.trim()) count += 1;
    if (inStockOnly) count += 1;

    return count;
  }, [activeFilters, minPrice, maxPrice, inStockOnly]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === priceSort)?.label || "الأحدث";

  /* =========================================================
     ACTIONS
  ========================================================= */

  const openFilters = () => {
    setSortOpen(false);

    setDraftFilters(activeFilters);
    setDraftMinPrice(minPrice);
    setDraftMaxPrice(maxPrice);
    setDraftInStockOnly(inStockOnly);

    setFilterOpen(true);
  };

  const applyFilters = () => {
    setActiveFilters(draftFilters);
    setMinPrice(draftMinPrice);
    setMaxPrice(draftMaxPrice);
    setInStockOnly(draftInStockOnly);
    setFilterOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters({});
    setDraftMinPrice("");
    setDraftMaxPrice("");
    setDraftInStockOnly(false);
  };

  const resetFilters = () => {
    setActiveFilters({});
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  };

  if (!slug || !sectionSlug) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        {sectionLoading ? (
          <div className="flex h-[40vh] items-center justify-center text-[13px] text-muted-foreground">جاري التحميل...</div>
        ) : !section ? (
          <div className="mx-auto max-w-3xl px-4 py-24 text-center">
            <h1 className="mb-3 text-2xl font-semibold text-foreground">القسم غير موجود</h1>

            <Link to={`/brands/${slug}`} className="text-[12px] font-medium text-[#B86168] hover:text-[#A95B61]">العودة لصفحة الماركة</Link>
          </div>
        ) : (
          <>
            {/* =====================================================
                HERO
                نفس التصميم القديم
            ===================================================== */}

            <section className="relative h-[45vh] w-full overflow-hidden bg-[#F2EFED] md:h-[60vh]">
              {section.image_url && <img loading="eager" decoding="async" fetchPriority="high" src={section.image_url} alt={section.name} className="absolute inset-0 h-full w-full object-cover object-center" />}

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />

              <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col items-center justify-end px-4 pb-10 text-center text-white">
                <p className="mb-2 text-[11px] tracking-[0.18em] text-white/80">
                  <Link to={`/brands/${slug}`} className="transition-colors hover:text-[#F2C7C5]">{brand?.name}</Link>
                </p>

                <h1 className="text-4xl font-semibold uppercase tracking-[0.18em] text-white drop-shadow-sm md:text-6xl md:tracking-[0.24em]">{section.name}</h1>

                {section.description && <p className="mt-5 max-w-xl text-[13px] leading-7 text-white/85 md:text-[15px]">{section.description}</p>}

                <p className="mt-3 text-[10px] tracking-widest text-white/65">{products.length} منتج</p>
              </div>
            </section>

            {/* =====================================================
                CONTENT
            ===================================================== */}

            <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
              {/* BACK */}

              <div className="mb-6">
                <Link to={`/brands/${slug}`} className="inline-flex items-center gap-1 text-[13px] text-[#82746F] transition-colors hover:text-[#B86168]">
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  العودة إلى {brand?.name}
                </Link>
              </div>

              {/* =====================================================
                  FILTER BAR
              ===================================================== */}

              {(brandFilters.length > 0 || products.length > 0) && (
                <div className="mb-10 flex items-center justify-between gap-3 rounded-[18px] border border-[#E8DEDA] bg-[#FFFDFC] p-3 shadow-[0_4px_18px_rgba(54,42,37,0.035)] md:mb-12 md:p-4">
                  {/* FILTER */}

                  <button type="button" onClick={openFilters} className="flex h-[44px] items-center gap-2 rounded-[11px] border border-[#E3D9D5] bg-background px-4 text-[12px] font-medium text-[#554945] transition-colors hover:border-[#D6AAA6] hover:text-[#B86168]">
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />

                    <span>فلترة</span>

                    {activeFilterCount > 0 && <span className="flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[9px] font-semibold text-white">{activeFilterCount}</span>}
                  </button>

                  {/* SORT */}

                  <button type="button" onClick={() => { setFilterOpen(false); setSortOpen(true); }} className="flex h-[44px] min-w-[140px] items-center justify-between gap-3 rounded-[11px] border border-[#E3D9D5] bg-background px-4 text-[12px] font-medium text-[#554945] transition-colors hover:border-[#D6AAA6] hover:text-[#B86168]">
                    <span>{sortLabel}</span>
                    <ChevronDown className="h-4 w-4 text-[#998B86]" strokeWidth={1.5} />
                  </button>
                </div>
              )}

              {/* ACTIVE FILTERS */}

              {activeFilterCount > 0 && (
                <div className="-mt-7 mb-8 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mt-8 md:mb-10">
                  {Object.entries(activeFilters).map(([key, value]) => {
                    if (!value) return null;

                    return (
                      <button key={key} type="button" onClick={() => setActiveFilters((previous) => ({ ...previous, [key]: "" }))} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D5D1] bg-[#FFF7F5] px-3 text-[10px] text-[#9D6265]">
                        {value}
                        <X className="h-3 w-3" />
                      </button>
                    );
                  })}

                  {minPrice && (
                    <button type="button" onClick={() => setMinPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D5D1] bg-[#FFF7F5] px-3 text-[10px] text-[#9D6265]">
                      من {minPrice}
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {maxPrice && (
                    <button type="button" onClick={() => setMaxPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D5D1] bg-[#FFF7F5] px-3 text-[10px] text-[#9D6265]">
                      إلى {maxPrice}
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  {inStockOnly && (
                    <button type="button" onClick={() => setInStockOnly(false)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E5D5D1] bg-[#FFF7F5] px-3 text-[10px] text-[#9D6265]">
                      متوفر فقط
                      <X className="h-3 w-3" />
                    </button>
                  )}

                  <button type="button" onClick={resetFilters} className="flex h-8 shrink-0 items-center gap-1.5 px-1 text-[10px] text-muted-foreground transition-colors hover:text-[#B86168]">
                    <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
                    مسح الكل
                  </button>
                </div>
              )}

              {/* =====================================================
                  PRODUCTS
              ===================================================== */}

              {productsLoading ? (
                <div className="flex min-h-[200px] items-center justify-center text-[13px] text-muted-foreground">جاري تحميل المنتجات...</div>
              ) : visibleProducts.length === 0 ? (
                <div className="flex min-h-[250px] items-center justify-center border-y border-[#E9E1DD]">
                  <div className="text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F1EF]">
                      <Package className="h-5 w-5 text-[#9B8E88]" strokeWidth={1.5} />
                    </div>

                    <h2 className="mt-3 text-[13px] font-semibold text-foreground">لا توجد منتجات مطابقة</h2>

                    <p className="mt-1.5 text-[10px] text-muted-foreground">{products.length === 0 ? "لا توجد منتجات في هذا القسم بعد." : "جرّب تغيير خيارات الفلترة."}</p>

                    {activeFilterCount > 0 && (
                      <button type="button" onClick={resetFilters} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-[#E3D9D5] px-3.5 text-[10px] font-medium text-[#A95B61]">
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                        مسح الفلاتر
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                  {visibleProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />

      {/* =====================================================
          SORT MENU
      ===================================================== */}

      {sortOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setSortOpen(false)} aria-label="إغلاق الترتيب" className="absolute inset-0 touch-none bg-black/25" />

          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[460px] rounded-t-[22px] bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-14px_45px_rgba(35,28,25,0.14)] md:bottom-5 md:rounded-[20px]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#DDD3CE] md:hidden" />

            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-foreground">ترتيب المنتجات</h2>
                <p className="mt-1 text-[10px] text-muted-foreground">اختر طريقة الترتيب</p>
              </div>

              <button type="button" onClick={() => setSortOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4DBD7] text-[#82746F]">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-[#E7DEDA]">
              {SORT_OPTIONS.map((option, index) => {
                const selected = priceSort === option.value;

                return (
                  <button key={option.value} type="button" onClick={() => { setPriceSort(option.value); setSortOpen(false); }} className={`flex w-full items-center justify-between gap-4 px-4 py-4 text-right ${index !== SORT_OPTIONS.length - 1 ? "border-b border-[#ECE4E1]" : ""} ${selected ? "bg-[#FFF7F5]" : "bg-background"}`}>
                    <span className={`text-[13px] font-medium ${selected ? "text-[#A95B61]" : "text-[#4E433F]"}`}>{option.label}</span>

                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D8CFCA]"}`}>{selected && <Check className="h-3 w-3 text-white" strokeWidth={2} />}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          FILTER SHEET
      ===================================================== */}

      {filterOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setFilterOpen(false)} aria-label="إغلاق الفلترة" className="absolute inset-0 touch-none bg-black/30" />

          <div className="absolute bottom-0 right-0 flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[24px] bg-background shadow-[0_-14px_45px_rgba(35,28,25,0.14)] md:bottom-auto md:top-0 md:h-full md:max-h-none md:w-[400px] md:rounded-none">
            <div className="flex h-6 shrink-0 items-center justify-center md:hidden">
              <span className="h-1 w-10 rounded-full bg-[#DDD3CE]" />
            </div>

            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-[#E8DFDB] px-4 pb-4 pt-2 md:pt-4">
              <div>
                <h2 className="text-[17px] font-semibold text-foreground">فلترة المنتجات</h2>
                <p className="mt-1 text-[10px] text-muted-foreground">{draftResultCount} منتج مطابق</p>
              </div>

              <button type="button" onClick={() => setFilterOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4DBD7] text-[#82746F]">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="flex-1 overscroll-contain overflow-y-auto px-4">
              {/* DYNAMIC FILTERS */}

              {brandFilters.map((filter) => {
                const options = normalizeFilterOptions(filter.options);

                if (!options.length) return null;

                return (
                  <div key={filter.id} className="border-b border-[#E9E1DD] py-5">
                    <h3 className="text-[13px] font-semibold text-[#4E433F]">{filter.name}</h3>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDraftFilters((previous) => ({ ...previous, [filter.slug]: "" }))} className={`flex min-h-[43px] items-center justify-between gap-2 rounded-[10px] border px-3 text-[11px] ${!draftFilters[filter.slug] ? "border-[#D5AAA6] bg-[#FFF7F5] text-[#A95B61]" : "border-[#E5DDD9] bg-background text-[#554945]"}`}>
                        <span>الكل</span>
                        {!draftFilters[filter.slug] && <Check className="h-3.5 w-3.5" strokeWidth={1.8} />}
                      </button>

                      {options.map((option) => {
                        const selected = draftFilters[filter.slug] === option;

                        return (
                          <button key={option} type="button" onClick={() => setDraftFilters((previous) => ({ ...previous, [filter.slug]: option }))} className={`flex min-h-[43px] items-center justify-between gap-2 rounded-[10px] border px-3 text-[11px] ${selected ? "border-[#D5AAA6] bg-[#FFF7F5] text-[#A95B61]" : "border-[#E5DDD9] bg-background text-[#554945]"}`}>
                            <span className="truncate">{option}</span>
                            {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* PRICE */}

              <div className="border-b border-[#E9E1DD] py-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#4E433F]">السعر</h3>
                    <p className="mt-1 text-[9px] text-muted-foreground">حدد نطاق السعر</p>
                  </div>

                  {priceRange.max > 0 && <span className="text-[9px] text-muted-foreground">{priceRange.min} — {priceRange.max}</span>}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <label>
                    <span className="mb-1.5 block text-[9px] text-muted-foreground">من</span>
                    <input type="number" inputMode="decimal" min={0} value={draftMinPrice} onChange={(event) => setDraftMinPrice(event.target.value)} placeholder={String(priceRange.min || 0)} className="h-[46px] w-full rounded-[10px] border border-[#E4DBD7] bg-background px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-[#D5AAA6]" />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[9px] text-muted-foreground">إلى</span>
                    <input type="number" inputMode="decimal" min={0} value={draftMaxPrice} onChange={(event) => setDraftMaxPrice(event.target.value)} placeholder={String(priceRange.max || 0)} className="h-[46px] w-full rounded-[10px] border border-[#E4DBD7] bg-background px-3 text-[12px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-[#D5AAA6]" />
                  </label>
                </div>
              </div>

              {/* STOCK */}

              <div className="py-5">
                <button type="button" onClick={() => setDraftInStockOnly((value) => !value)} className="flex w-full items-center justify-between gap-4 text-right">
                  <div>
                    <h3 className="text-[13px] font-semibold text-[#4E433F]">المتوفر فقط</h3>
                    <p className="mt-1 text-[9px] text-muted-foreground">إخفاء المنتجات غير المتوفرة حاليًا</p>
                  </div>

                  <span className={`relative h-[27px] w-[48px] shrink-0 rounded-full transition-colors ${draftInStockOnly ? "bg-[#D4777D]" : "bg-[#DDD5D1]"}`}>
                    <span className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow-sm transition-all ${draftInStockOnly ? "right-[24px]" : "right-[3px]"}`} />
                  </span>
                </button>
              </div>
            </div>

            {/* FOOTER */}

            <div className="grid shrink-0 grid-cols-[0.72fr_1.28fr] gap-2 border-t border-[#E8DFDB] bg-background px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={resetDraftFilters} className="flex h-[46px] items-center justify-center gap-1.5 rounded-[11px] border border-[#E4DBD7] text-[11px] font-medium text-[#82746F]">
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
                مسح
              </button>

              <button type="button" onClick={applyFilters} className="h-[46px] rounded-[11px] bg-[#D4777D] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#C96F79] active:bg-[#B86168]">
                عرض {draftResultCount} منتج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandSectionPage;