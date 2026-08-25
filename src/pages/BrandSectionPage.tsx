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

const SORT_OPTIONS: { value: SortType; label: string; description: string }[] = [
  { value: "none", label: "الأحدث", description: "المضاف حديثًا أولاً" },
  { value: "asc", label: "السعر: الأقل أولاً", description: "من الأقل إلى الأعلى" },
  { value: "desc", label: "السعر: الأعلى أولاً", description: "من الأعلى إلى الأقل" },
  { value: "name", label: "الاسم", description: "ترتيب حسب اسم المنتج" },
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
  return [product.name, product.name_ar, product.description, product.description_ar, product.category, product.brand, ...(Array.isArray(product.sizes) ? product.sizes : []), JSON.stringify(product.color_variants || []), JSON.stringify(product.features || []), JSON.stringify(product.specs || []), JSON.stringify(product.quality_variants || [])].filter(Boolean).join(" ").toLowerCase();
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
  categoryId: product.category_id || undefined,
  brand: product.brand,
  brandId: product.brand_id || undefined,
  inStock: product.in_stock ?? true,
  countries: (product.countries || ["GLOBAL"]) as Product["countries"],
  isFeatured: product.is_featured,
  isBestSeller: product.is_best_seller,
  color_variants: Array.isArray(product.color_variants) ? product.color_variants : [],
  sizes: Array.isArray(product.sizes) ? product.sizes : [],
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

      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [filterOpen, sortOpen]);

  const { data: brand, isLoading: brandLoading } = useQuery({
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

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["brand-section-products", section?.id, brand?.id],
    enabled: Boolean(section?.id && brand?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_section_products").select("product_id,products(*)").eq("section_id", section!.id);
      if (error) throw error;

      const productRows = (data || []).map((item: any) => item.products).filter(Boolean).filter((product: any) => product.is_active && product.brand_id === brand!.id);
      return productRows.map(mapProduct);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const priceRange = useMemo(() => {
    const prices = products.map((product) => Number(product.price || 0)).filter((price) => Number.isFinite(price));
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filterProducts = (source: FilterableProduct[], filters: Record<string, string>, minimum: string, maximum: string, stockOnly: boolean) => {
    let list = [...source];

    Object.values(filters).forEach((value) => {
      if (!value) return;
      const normalizedValue = value.trim().toLowerCase();
      list = list.filter((product) => product._filterText.includes(normalizedValue));
    });

    const parsedMin = minimum.trim() ? Number(minimum) : null;
    const parsedMax = maximum.trim() ? Number(maximum) : null;

    if (parsedMin !== null && Number.isFinite(parsedMin)) list = list.filter((product) => Number(product.price || 0) >= parsedMin);
    if (parsedMax !== null && Number.isFinite(parsedMax)) list = list.filter((product) => Number(product.price || 0) <= parsedMax);
    if (stockOnly) list = list.filter((product) => Boolean(product.inStock));

    return list;
  };

  const visibleProducts = useMemo(() => {
    const list = filterProducts(products, activeFilters, minPrice, maxPrice, inStockOnly);
    if (priceSort === "asc") list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (priceSort === "desc") list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (priceSort === "name") list.sort((a, b) => String(a.nameAr || a.name || "").localeCompare(String(b.nameAr || b.name || ""), "ar"));
    return list;
  }, [products, activeFilters, minPrice, maxPrice, inStockOnly, priceSort]);

  const draftResultCount = useMemo(() => filterProducts(products, draftFilters, draftMinPrice, draftMaxPrice, draftInStockOnly).length, [products, draftFilters, draftMinPrice, draftMaxPrice, draftInStockOnly]);

  const activeFilterCount = useMemo(() => {
    let count = Object.values(activeFilters).filter(Boolean).length;
    if (minPrice.trim()) count += 1;
    if (maxPrice.trim()) count += 1;
    if (inStockOnly) count += 1;
    return count;
  }, [activeFilters, minPrice, maxPrice, inStockOnly]);

  const sortLabel = SORT_OPTIONS.find((option) => option.value === priceSort)?.label || "الأحدث";

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

  if (!slug || !sectionSlug) return <Navigate to="/home" replace />;

  if (brandLoading || sectionLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-3 pt-4 md:px-6 md:pt-6">
            <div className="py-7">
              <div className="h-4 w-20 animate-pulse rounded-full bg-muted" />
              <div className="mt-3 h-7 w-40 animate-pulse rounded-full bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-5 md:gap-y-8">
              {Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!section || !brand) {
    return (
      <div className="flex min-h-screen flex-col bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted/60"><Package className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} /></div>
            <h1 className="mt-4 text-[19px] font-semibold text-foreground">القسم غير موجود</h1>
            <p className="mt-2 text-[11px] text-muted-foreground">قد يكون القسم غير متاح حاليًا.</p>
            <Link to={`/brands/${slug}`} className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#A95B61]"><ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />العودة إلى الماركة</Link>
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

      <main className="flex-1 pb-14">
        <section className="mx-auto w-full max-w-[1400px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
          <Link to={`/brands/${slug}`} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-[#A95B61] md:text-[11px]"><ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />{brand.name}</Link>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[7px] uppercase tracking-[0.2em] text-[#B86168] md:text-[8px]">COLLECTION</span></div>
              <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-foreground md:text-[34px]">{section.name}</h1>
              {section.description && <p className="mt-2 max-w-[560px] text-[11px] leading-6 text-muted-foreground md:text-[12px] md:leading-7">{section.description}</p>}
            </div>
            <span className="shrink-0 pb-1 text-[9px] text-muted-foreground md:text-[10px]">{visibleProducts.length} منتج</span>
          </div>
        </section>

        {(brandFilters.length > 0 || products.length > 0) && (
          <section className="border-y border-border/60 bg-background">
            <div className="mx-auto flex h-[54px] w-full max-w-[1400px] items-center justify-between px-4 md:px-6">
              <button type="button" onClick={openFilters} className="flex items-center gap-2 text-[11px] font-medium text-[#514641] transition-colors hover:text-[#B86168] md:text-[12px]"><SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />فلترة{activeFilterCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[8px] font-semibold text-white">{activeFilterCount}</span>}</button>
              <button type="button" onClick={() => { setFilterOpen(false); setSortOpen(true); }} className="flex items-center gap-1.5 text-[11px] font-medium text-[#514641] transition-colors hover:text-[#B86168] md:text-[12px]">{sortLabel}<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} /></button>
            </div>
          </section>
        )}

        {activeFilterCount > 0 && (
          <section className="mx-auto flex w-full max-w-[1400px] items-center gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
            {Object.entries(activeFilters).map(([key, value]) => value ? <button key={key} type="button" onClick={() => setActiveFilters((previous) => ({ ...previous, [key]: "" }))} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E7D8D3] bg-[#FFF8F6] px-3 text-[9px] text-[#9E6265]">{value}<X className="h-3 w-3" /></button> : null)}
            {minPrice && <button type="button" onClick={() => setMinPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E7D8D3] bg-[#FFF8F6] px-3 text-[9px] text-[#9E6265]">من {minPrice}<X className="h-3 w-3" /></button>}
            {maxPrice && <button type="button" onClick={() => setMaxPrice("")} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E7D8D3] bg-[#FFF8F6] px-3 text-[9px] text-[#9E6265]">إلى {maxPrice}<X className="h-3 w-3" /></button>}
            {inStockOnly && <button type="button" onClick={() => setInStockOnly(false)} className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-[#E7D8D3] bg-[#FFF8F6] px-3 text-[9px] text-[#9E6265]">متوفر فقط<X className="h-3 w-3" /></button>}
            <button type="button" onClick={resetFilters} className="flex h-8 shrink-0 items-center gap-1 text-[9px] text-muted-foreground transition-colors hover:text-[#B86168]"><RotateCcw className="h-3 w-3" strokeWidth={1.5} />مسح</button>
          </section>
        )}

        <section className="mx-auto mt-5 w-full max-w-[1400px] px-4 md:mt-7 md:px-6">
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-4 md:gap-x-5 md:gap-y-8">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex min-h-[250px] items-center justify-center border-y border-border/60"><div className="text-center"><Package className="mx-auto h-5 w-5 text-muted-foreground" strokeWidth={1.4} /><h2 className="mt-3 text-[12px] font-semibold text-foreground">لا توجد منتجات مطابقة</h2><p className="mt-1.5 text-[9px] text-muted-foreground">{products.length === 0 ? "لا توجد منتجات في هذا القسم بعد." : "جرّب تغيير خيارات الفلترة."}</p>{activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="mt-4 text-[10px] font-medium text-[#A95B61]">مسح الفلاتر</button>}</div></div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4">{visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
          )}
        </section>
      </main>

      <Footer />

      {sortOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setSortOpen(false)} aria-label="إغلاق الترتيب" className="absolute inset-0 touch-none bg-black/20" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[460px] rounded-t-[20px] bg-background px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:bottom-5 md:rounded-[18px]">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#DDD4CF] md:hidden" />
            <div className="mb-2 flex items-center justify-between"><h2 className="text-[15px] font-semibold text-foreground">ترتيب حسب</h2><button type="button" onClick={() => setSortOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"><X className="h-4 w-4" strokeWidth={1.5} /></button></div>
            <div>{SORT_OPTIONS.map((option, index) => { const selected = priceSort === option.value; return <button key={option.value} type="button" onClick={() => { setPriceSort(option.value); setSortOpen(false); }} className={`flex w-full items-center justify-between gap-4 py-3.5 text-right ${index !== SORT_OPTIONS.length - 1 ? "border-b border-border/60" : ""}`}><div><p className={`text-[12px] font-medium ${selected ? "text-[#A95B61]" : "text-foreground"}`}>{option.label}</p><p className="mt-0.5 text-[9px] text-muted-foreground">{option.description}</p></div>{selected && <Check className="h-4 w-4 text-[#D4777D]" strokeWidth={1.8} />}</button>; })}</div>
          </div>
        </div>
      )}

      {filterOpen && (
        <div className="fixed inset-0 z-[120]" dir="rtl">
          <button type="button" onClick={() => setFilterOpen(false)} aria-label="إغلاق الفلترة" className="absolute inset-0 touch-none bg-black/25" />
          <div className="absolute bottom-0 right-0 flex max-h-[88svh] w-full flex-col overflow-hidden rounded-t-[22px] bg-background md:bottom-auto md:top-0 md:h-full md:max-h-none md:w-[390px] md:rounded-none">
            <div className="flex h-6 shrink-0 items-center justify-center md:hidden"><span className="h-1 w-9 rounded-full bg-[#DDD4CF]" /></div>
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 pb-4 pt-2 md:pt-4"><div><h2 className="text-[16px] font-semibold text-foreground">الفلترة</h2><p className="mt-1 text-[9px] text-muted-foreground">{draftResultCount} منتج</p></div><button type="button" onClick={() => setFilterOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground"><X className="h-4 w-4" strokeWidth={1.5} /></button></div>
            <div className="flex-1 overscroll-contain overflow-y-auto px-4">
              {brandFilters.map((filter) => {
                const options = normalizeFilterOptions(filter.options);
                if (!options.length) return null;
                return <div key={filter.id} className="border-b border-border/60 py-5"><h3 className="text-[12px] font-semibold text-foreground">{filter.name}</h3><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setDraftFilters((previous) => ({ ...previous, [filter.slug]: "" }))} className={`h-9 rounded-full border px-3 text-[10px] transition-colors ${!draftFilters[filter.slug] ? "border-[#D6AAA7] bg-[#FFF7F5] text-[#A95B61]" : "border-border text-[#675B56]"}`}>الكل</button>{options.map((option) => { const selected = draftFilters[filter.slug] === option; return <button key={option} type="button" onClick={() => setDraftFilters((previous) => ({ ...previous, [filter.slug]: option }))} className={`h-9 rounded-full border px-3 text-[10px] transition-colors ${selected ? "border-[#D6AAA7] bg-[#FFF7F5] text-[#A95B61]" : "border-border text-[#675B56]"}`}>{option}</button>; })}</div></div>;
              })}

              <div className="border-b border-border/60 py-5">
                <div className="flex items-end justify-between"><h3 className="text-[12px] font-semibold text-foreground">السعر</h3>{priceRange.max > 0 && <span className="text-[8px] text-muted-foreground">{priceRange.min} — {priceRange.max}</span>}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label><span className="mb-1.5 block text-[8px] text-muted-foreground">من</span><input type="number" inputMode="decimal" min={0} value={draftMinPrice} onChange={(event) => setDraftMinPrice(event.target.value)} placeholder={String(priceRange.min || 0)} className="h-10 w-full rounded-[9px] border border-border bg-background px-3 text-[11px] outline-none focus:border-[#D6AAA7]" /></label>
                  <label><span className="mb-1.5 block text-[8px] text-muted-foreground">إلى</span><input type="number" inputMode="decimal" min={0} value={draftMaxPrice} onChange={(event) => setDraftMaxPrice(event.target.value)} placeholder={String(priceRange.max || 0)} className="h-10 w-full rounded-[9px] border border-border bg-background px-3 text-[11px] outline-none focus:border-[#D6AAA7]" /></label>
                </div>
              </div>

              <div className="py-5"><button type="button" onClick={() => setDraftInStockOnly((value) => !value)} className="flex w-full items-center justify-between gap-4 text-right"><div><h3 className="text-[12px] font-semibold text-foreground">المتوفر فقط</h3><p className="mt-1 text-[8px] text-muted-foreground">إخفاء المنتجات غير المتوفرة</p></div><span className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${draftInStockOnly ? "bg-[#D4777D]" : "bg-[#DDD5D1]"}`}><span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all ${draftInStockOnly ? "right-[23px]" : "right-[3px]"}`} /></span></button></div>
            </div>

            <div className="grid shrink-0 grid-cols-[0.7fr_1.3fr] gap-2 border-t border-border/60 bg-background px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3"><button type="button" onClick={resetDraftFilters} className="h-11 rounded-[10px] border border-border text-[10px] font-medium text-muted-foreground">مسح</button><button type="button" onClick={applyFilters} className="h-11 rounded-[10px] bg-[#D4777D] text-[11px] font-semibold text-white active:bg-[#B86168]">عرض {draftResultCount} منتج</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandSectionPage;
