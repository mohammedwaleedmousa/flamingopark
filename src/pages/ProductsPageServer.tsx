import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronDown, Heart, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import CartDrawer from "@/components/CartDrawer";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import type { Product } from "@/store/useStore";

type ProductAudience = "men" | "women" | "kids" | "unisex";
type AudienceFilter = ProductAudience | "all";

type Category = {
  id: string;
  slug: string;
  name_ar: string;
  parent_id: string | null;
  sort_order: number;
};

type ColorSwatch = {
  name: string;
  hex: string;
  hex2?: string;
};

type FacetResponse = {
  colors?: Array<{ name?: string; hex?: string | null; hex2?: string | null }>;
  sizes?: string[];
  audiences?: ProductAudience[];
  min_price?: number;
  max_price?: number;
  result_count?: number;
};

type FilterIdRow = {
  product_id: string;
  total_count: number | string;
};

const PAGE_SIZE = 12;

const AUDIENCE_OPTIONS: Array<{ value: ProductAudience; label: string }> = [
  { value: "women", label: "نسائي" },
  { value: "men", label: "رجالي" },
  { value: "kids", label: "أطفال" },
  { value: "unisex", label: "للجنسين" },
];

const NAMED_COLOR_HEX: Record<string, string> = {
  أسود: "#111111",
  أبيض: "#FFFFFF",
  احمر: "#D84343",
  أحمر: "#D84343",
  ازرق: "#3765B0",
  أزرق: "#3765B0",
  اخضر: "#4D8A64",
  أخضر: "#4D8A64",
  اصفر: "#D7AA32",
  أصفر: "#D7AA32",
  وردي: "#DC7C87",
  بني: "#76533E",
  رمادي: "#77736F",
  بيج: "#DECBB0",
  ذهبي: "#C6A15C",
  فضي: "#BFC0C2",
  بنفسجي: "#8567A5",
  برتقالي: "#DD8750",
  كحلي: "#273754",
};

const parseAudience = (value: string | null): AudienceFilter =>
  AUDIENCE_OPTIONS.some((option) => option.value === value) ? (value as ProductAudience) : "all";

const ProductsPageServer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadedPages, setLoadedPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [draft, setDraft] = useState(() => new URLSearchParams(searchParams));
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);

  const categorySlug = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const audienceFilter = parseAudience(searchParams.get("audience"));
  const colorFilter = searchParams.get("color") || "all";
  const sizeFilter = searchParams.get("size") || "all";
  const minPrice = Number(searchParams.get("min") || 0);
  const maxPrice = Number(searchParams.get("max") || 0);
  const saleOnly = searchParams.get("sale") === "1";
  const inStockOnly = searchParams.get("stock") === "1";
  const sortBy = searchParams.get("sort") || "new";

  const draftBrand = draft.get("brand") || "all";
  const draftAudience = parseAudience(draft.get("audience"));
  const draftColor = draft.get("color") || "all";
  const draftSize = draft.get("size") || "all";
  const draftMin = Number(draft.get("min") || 0);
  const draftMax = Number(draft.get("max") || 0);
  const draftSale = draft.get("sale") === "1";
  const draftStock = draft.get("stock") === "1";

  const { data: categories = [] } = useQuery({
    queryKey: ["products-server-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name_ar,parent_id,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const currentCategory = useMemo(
    () => categories.find((category) => category.slug === categorySlug) || null,
    [categories, categorySlug],
  );

  const categoryIds = useMemo(() => {
    if (!currentCategory) return null;
    const children = categories.filter((category) => category.parent_id === currentCategory.id);
    return [currentCategory.id, ...children.map((category) => category.id)];
  }, [categories, currentCategory]);

  const { data: brands = [] } = useQuery({
    queryKey: ["products-server-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []).map((row) => row.name).filter((name): name is string => Boolean(name));
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const productPageQueries = useQueries({
    queries: Array.from({ length: loadedPages }, (_, pageIndex) => ({
      queryKey: [
        "products-server-page",
        categoryIds?.join(",") || "all",
        searchQuery,
        brandFilter,
        audienceFilter,
        colorFilter,
        sizeFilter,
        minPrice,
        maxPrice,
        saleOnly,
        inStockOnly,
        sortBy,
        pageIndex + 1,
      ],
      queryFn: async () => {
        const { data: idRows, error: idError } = await (supabase as any).rpc("catalog_filter_product_ids", {
          p_category_ids: categoryIds?.length ? categoryIds : null,
          p_search: searchQuery.trim() || null,
          p_brand: brandFilter === "all" ? null : brandFilter,
          p_audience: audienceFilter === "all" ? null : audienceFilter,
          p_sale_only: saleOnly,
          p_in_stock_only: inStockOnly,
          p_color: colorFilter === "all" ? null : colorFilter,
          p_size: sizeFilter === "all" ? null : sizeFilter,
          p_min_price: minPrice > 0 ? minPrice : null,
          p_max_price: maxPrice > 0 ? maxPrice : null,
          p_sort: sortBy,
          p_offset: pageIndex * PAGE_SIZE,
          p_limit: PAGE_SIZE,
        });

        if (idError) throw idError;

        const rows = (idRows || []) as FilterIdRow[];
        const ids = rows.map((row) => row.product_id);
        const totalCount = rows.length ? Number(rows[0].total_count || 0) : 0;

        if (!ids.length) return { products: [] as Product[], totalCount };

        const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", ids);
        if (error) throw error;

        const mapped = (data || []).map(mapProductCard) as Product[];
        const byId = new Map(mapped.map((product) => [product.id, product]));
        const ordered = ids.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product));

        return { products: ordered, totalCount };
      },
      staleTime: 5 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });

  const products = useMemo(() => {
    const seen = new Set<string>();
    return productPageQueries
      .flatMap((query) => query.data?.products || [])
      .filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      });
  }, [productPageQueries]);

  const totalCount = productPageQueries[0]?.data?.totalCount || 0;
  const loadingProducts = productPageQueries.some((query) => query.isLoading || query.isFetching);
  const hasMore = products.length < totalCount;

  const { data: facets, isFetching: facetsLoading } = useQuery({
    queryKey: [
      "products-server-facets",
      categoryIds?.join(",") || "all",
      searchQuery,
      draftBrand,
      draftAudience,
      draftColor,
      draftSize,
      draftMin,
      draftMax,
      draftSale,
      draftStock,
    ],
    enabled: filtersOpen,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("catalog_filter_facets", {
        p_category_ids: categoryIds?.length ? categoryIds : null,
        p_search: searchQuery.trim() || null,
        p_brand: draftBrand === "all" ? null : draftBrand,
        p_audience: draftAudience === "all" ? null : draftAudience,
        p_sale_only: draftSale,
        p_in_stock_only: draftStock,
        p_color: draftColor === "all" ? null : draftColor,
        p_size: draftSize === "all" ? null : draftSize,
        p_min_price: draftMin > 0 ? draftMin : null,
        p_max_price: draftMax > 0 ? draftMax : null,
      });
      if (error) throw error;
      return (data || {}) as FacetResponse;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const colors = useMemo<ColorSwatch[]>(() =>
    (facets?.colors || [])
      .map((item) => {
        const name = (item.name || "").trim();
        return {
          name,
          hex: item.hex || NAMED_COLOR_HEX[name] || "#E5E2DF",
          hex2: item.hex2 || undefined,
        };
      })
      .filter((item) => item.name), [facets]);

  const sizes = useMemo(() => [...(facets?.sizes || [])].sort((a, b) => a.localeCompare(b, "ar", { numeric: true })), [facets]);
  const facetMin = Number(facets?.min_price ?? 0);
  const facetMax = Number(facets?.max_price ?? 1000);
  const draftCount = Number(facets?.result_count ?? 0);

  useEffect(() => {
    setLoadedPages(1);
  }, [categorySlug, searchQuery, brandFilter, audienceFilter, colorFilter, sizeFilter, minPrice, maxPrice, saleOnly, inStockOnly, sortBy]);

  useEffect(() => {
    if (!filtersOpen || facetsLoading) return;
    setPriceRange([draftMin || facetMin, draftMax || facetMax]);
  }, [filtersOpen, facetsLoading, draftMin, draftMax, facetMin, facetMax]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    setSearchParams(next, { replace: true });
  };

  const setDraftParam = (key: string, value: string | null) => {
    setDraft((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
      return next;
    });
  };

  const openFilters = () => {
    setDraft(new URLSearchParams(searchParams));
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    const next = new URLSearchParams(draft);
    next.delete("page");
    setFiltersOpen(false);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (categorySlug) next.set("category", categorySlug);
    if (searchQuery) next.set("search", searchQuery);
    setSearchParams(next, { replace: true });
  };

  const activeFilterCount =
    (brandFilter !== "all" ? 1 : 0) +
    (audienceFilter !== "all" ? 1 : 0) +
    (colorFilter !== "all" ? 1 : 0) +
    (sizeFilter !== "all" ? 1 : 0) +
    (saleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minPrice > 0 || maxPrice > 0 ? 1 : 0);

  const sortLabel = sortBy === "price-asc" ? "الأقل سعرًا" : sortBy === "price-desc" ? "الأعلى سعرًا" : sortBy === "best" ? "الأكثر مبيعًا" : sortBy === "featured" ? "مختارة" : "الأحدث";

  return (
    <div dir="rtl" className="min-h-screen bg-[#FFFDFC] text-[#261F1D]">
      <Navbar />
      <CartDrawer />

      <main className="pb-24 md:pt-24 md:pb-20">
        <section className="bg-[#FFFDFC]">
          <div className="mx-auto max-w-[1600px] px-4 pb-3 pt-5 text-center md:px-6 md:pb-5 md:pt-8">
            <div className="mb-1.5 flex items-center justify-center gap-2.5">
              <span className="h-px w-6 bg-gradient-to-l from-[#C9797E]/60 to-transparent" />
              <span className="font-serif text-[8px] tracking-[0.34em] text-[#B96C72]">FLAMINGO</span>
              <span className="h-px w-6 bg-gradient-to-r from-[#C9797E]/60 to-transparent" />
            </div>
            <h1 className="text-[21px] font-semibold md:text-[30px]">{currentCategory?.name_ar || "جميع المنتجات"}</h1>
            <p className="mt-1.5 text-[10px] text-[#968A85] md:text-[12px]">تشكيلة مختارة بعناية لتجربة تسوق أسرع وأسهل</p>
          </div>

          <div className="mx-auto max-w-[1600px] border-t border-[#F2ECE9] px-3 py-3 md:px-6">
            <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setParam("category", null)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] ${!categorySlug ? "bg-[#D4777D] text-white" : "border border-[#E9DFDB] bg-white text-[#6D625D]"}`}>الكل</button>
              {categories.filter((category) => !category.parent_id).map((category) => (
                <button key={category.id} onClick={() => setParam("category", category.slug)} className={`shrink-0 rounded-full px-4 py-2 text-[10px] ${categorySlug === category.slug ? "bg-[#D4777D] text-white" : "border border-[#E9DFDB] bg-white text-[#6D625D]"}`}>{category.name_ar}</button>
              ))}
            </div>
          </div>
        </section>

        <section className="sticky top-[68px] z-30 bg-[#FFFDFC] px-3 py-2 md:top-[76px] md:px-6">
          <div className="mx-auto flex h-12 max-w-[1600px] overflow-hidden rounded-[15px] border border-[#EAE0DC] bg-white shadow-sm">
            <button onClick={openFilters} className="flex flex-1 items-center justify-center gap-2 border-l border-[#EFE7E3] text-[11px]">
              <SlidersHorizontal className="h-4 w-4" /> فلترة
              {activeFilterCount > 0 && <span className="rounded-full bg-[#D4777D] px-1.5 py-0.5 text-[8px] text-white">{activeFilterCount}</span>}
            </button>
            <button onClick={() => setSortOpen(true)} className="flex flex-1 items-center justify-center gap-2 text-[11px]">
              {sortLabel}<ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="flex w-20 flex-col items-center justify-center bg-[#FDF9F7]">
              {loadingProducts && products.length === 0 ? <span className="h-3 w-6 animate-pulse rounded bg-[#EDE4E0]" /> : <span className="text-xs font-semibold text-[#B86168]">{totalCount}</span>}
              <span className="text-[8px] text-[#9D918B]">منتج</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-2.5 pt-3 md:px-6 md:pt-5">
          {loadingProducts && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#F3EEEB]" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FAF0EE]"><Heart className="h-6 w-6 text-[#CE7A7F]" /></div>
              <h3 className="mt-4 text-base font-semibold">لا توجد منتجات مطابقة</h3>
              <button onClick={clearFilters} className="mt-4 rounded-full border border-[#DED2CD] bg-white px-6 py-2.5 text-[11px]">إعادة تعيين</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center py-10">
              <button disabled={loadingProducts} onClick={() => setLoadedPages((value) => value + 1)} className="min-w-[178px] rounded-full border border-[#DBCBC6] bg-white px-7 py-3 text-[11px] font-medium disabled:opacity-50">
                {loadingProducts ? "جاري التحميل" : "عرض المزيد"}
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />

      {filtersOpen && (
        <div className="fixed inset-0 z-[100] bg-black/25" onClick={() => setFiltersOpen(false)}>
          <aside onClick={(event) => event.stopPropagation()} className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-[#FFFDFC] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EEE4E0] pb-4">
              <div><h2 className="font-semibold">فلترة المنتجات</h2><p className="mt-1 text-[10px] text-[#9B8F89]">{facetsLoading ? "جاري الحساب..." : `${draftCount} منتج مطابق`}</p></div>
              <button onClick={() => setFiltersOpen(false)} className="rounded-full border p-2"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-6 py-5">
              <div><p className="mb-2 text-[11px] font-semibold">الماركة</p><select value={draftBrand} onChange={(e) => setDraftParam("brand", e.target.value)} className="w-full rounded-xl border border-[#E6DCD8] bg-white p-3 text-xs"><option value="all">كل الماركات</option>{brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}</select></div>

              <div><p className="mb-2 text-[11px] font-semibold">القسم</p><div className="flex flex-wrap gap-2">{AUDIENCE_OPTIONS.filter((option) => !facets?.audiences?.length || facets.audiences.includes(option.value)).map((option) => <button key={option.value} onClick={() => setDraftParam("audience", draftAudience === option.value ? null : option.value)} className={`rounded-full border px-3 py-2 text-[10px] ${draftAudience === option.value ? "border-[#D4777D] bg-[#D4777D] text-white" : "border-[#E6DCD8] bg-white"}`}>{option.label}</button>)}</div></div>

              <div><p className="mb-2 text-[11px] font-semibold">اللون</p><div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">{colors.map((color) => <button key={color.name} title={color.name} onClick={() => setDraftParam("color", draftColor === color.name ? null : color.name)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] ${draftColor === color.name ? "border-[#D4777D] bg-[#FBEDEE]" : "border-[#E6DCD8]"}`}><span className="h-4 w-4 rounded-full border" style={{ background: color.hex2 ? `linear-gradient(135deg, ${color.hex} 50%, ${color.hex2} 50%)` : color.hex }} />{color.name}</button>)}</div></div>

              <div><p className="mb-2 text-[11px] font-semibold">المقاس</p><div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">{sizes.map((size) => <button key={size} onClick={() => setDraftParam("size", draftSize === size ? null : size)} className={`min-w-11 rounded-xl border px-3 py-2 text-[10px] ${draftSize === size ? "border-[#D4777D] bg-[#D4777D] text-white" : "border-[#E6DCD8] bg-white"}`}>{size}</button>)}</div></div>

              <div><div className="mb-3 flex justify-between text-[11px]"><span>السعر</span><span>{Math.round(priceRange[0])} - {Math.round(priceRange[1])}</span></div>{facetMax > facetMin && <Slider min={facetMin} max={facetMax} step={1} value={priceRange} onValueChange={(value) => setPriceRange([value[0], value[1]])} onValueCommit={(value) => { setDraftParam("min", value[0] <= facetMin ? null : String(Math.round(value[0]))); setDraftParam("max", value[1] >= facetMax ? null : String(Math.round(value[1]))); }} />}</div>

              <div className="grid grid-cols-2 gap-2"><button onClick={() => setDraftParam("sale", draftSale ? null : "1")} className={`rounded-xl border p-3 text-[10px] ${draftSale ? "border-[#D4777D] bg-[#FBEDEE]" : "border-[#E6DCD8]"}`}>العروض فقط</button><button onClick={() => setDraftParam("stock", draftStock ? null : "1")} className={`rounded-xl border p-3 text-[10px] ${draftStock ? "border-[#D4777D] bg-[#FBEDEE]" : "border-[#E6DCD8]"}`}>المتوفر فقط</button></div>
            </div>

            <div className="sticky bottom-0 flex gap-2 bg-[#FFFDFC] py-4"><button onClick={() => { const next = new URLSearchParams(); if (categorySlug) next.set("category", categorySlug); if (searchQuery) next.set("search", searchQuery); setDraft(next); }} className="flex-1 rounded-xl border border-[#E1D5D0] py-3 text-[11px]">مسح</button><button onClick={applyFilters} className="flex-[2] rounded-xl bg-[#D4777D] py-3 text-[11px] font-semibold text-white">عرض {facetsLoading ? "..." : draftCount} منتج</button></div>
          </aside>
        </div>
      )}

      {sortOpen && (
        <div className="fixed inset-0 z-[110] flex items-end bg-black/25" onClick={() => setSortOpen(false)}>
          <div onClick={(event) => event.stopPropagation()} className="w-full rounded-t-3xl bg-[#FFFDFC] p-5 md:mx-auto md:mb-8 md:max-w-md md:rounded-3xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">ترتيب المنتجات</h3><button onClick={() => setSortOpen(false)}><X className="h-4 w-4" /></button></div>
            {[{ value: "new", label: "الأحدث" }, { value: "best", label: "الأكثر مبيعًا" }, { value: "featured", label: "مختارة" }, { value: "price-asc", label: "الأقل سعرًا" }, { value: "price-desc", label: "الأعلى سعرًا" }].map((option) => <button key={option.value} onClick={() => { setSortOpen(false); setParam("sort", option.value); }} className={`mb-2 w-full rounded-xl border p-3 text-right text-[11px] ${sortBy === option.value ? "border-[#D4777D] bg-[#FBEDEE]" : "border-[#E7DDD9] bg-white"}`}>{option.label}</button>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPageServer;
