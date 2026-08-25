import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductListFilters, { type ProductListFilterValues } from "@/components/ProductListFilters";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

interface Category {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
}

const PAGE_SIZE = 24;

const FALLBACK: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
};

const CATEGORY_SCOPE_ALIASES: Record<string, string[]> = {
  "men:mens-shoes": ["shose", "shoes"],
};

const CategoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: content } = useSiteContent("categories_page_");

  const [brandOpen, setBrandOpen] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);

  const previousScopeRef = useRef("");

  /* =========================================================
     PARAMS
  ========================================================= */

  const parentSlug = searchParams.get("parent") || "";
  const subSlug = searchParams.get("sub") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const productQuery = searchParams.get("q") || "";
  const productSort = (searchParams.get("sort") || "new") as ProductListFilterValues["sort"];
  const inStockOnly = searchParams.get("stock") === "1";
  const minPrice = searchParams.get("min") || "";
  const maxPrice = searchParams.get("max") || "";

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as Category[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const parents = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);

  const selectedParent = useMemo(() => parents.find((parent) => parent.slug === parentSlug) || null, [parents, parentSlug]);

  const subCategories = useMemo(() => {
    if (!selectedParent) return [];

    return categories.filter((category) => category.parent_id === selectedParent.id);
  }, [categories, selectedParent]);

  const selectedSub = useMemo(() => subCategories.find((sub) => sub.slug === subSlug) || null, [subCategories, subSlug]);

  const audienceContext = useMemo(() => {
    if (selectedParent?.slug === "men") return "men";
    if (selectedParent?.slug === "women") return "women";
    if (["babes", "kids"].includes(selectedParent?.slug || "")) return "kids";
    return "";
  }, [selectedParent?.slug]);

  const audienceValues = useMemo(() => {
    if (audienceContext === "men") return ["men", "unisex"];
    if (audienceContext === "women") return ["women", "unisex"];
    if (audienceContext === "kids") return ["kids"];
    return [] as string[];
  }, [audienceContext]);

  const activeProductCategory = selectedSub || (selectedParent && subCategories.length === 0 ? selectedParent : null);

  const scopedCategoryIds = useMemo(() => {
    if (!activeProductCategory) return [];

    const ids = new Set<string>([activeProductCategory.id]);
    const aliasSlugs = CATEGORY_SCOPE_ALIASES[`${selectedParent?.slug || ""}:${activeProductCategory.slug}`] || [];
    const aliasRoot = categories.find((category) => !category.parent_id && aliasSlugs.includes(category.slug));

    if (aliasRoot) {
      const pendingParentIds = [aliasRoot.id];
      ids.add(aliasRoot.id);

      while (pendingParentIds.length > 0) {
        const parentId = pendingParentIds.shift();
        if (!parentId) continue;

        categories.forEach((category) => {
          if (category.parent_id !== parentId || ids.has(category.id)) return;

          ids.add(category.id);
          pendingParentIds.push(category.id);
        });
      }
    }

    return Array.from(ids);
  }, [activeProductCategory, categories, selectedParent?.slug]);

  const audienceRootOnly = Boolean(audienceContext && selectedParent && !selectedSub && ["men", "women"].includes(selectedParent.slug));
  const hasProductScope = Boolean(selectedSub && scopedCategoryIds.length > 0);

  /* =========================================================
     INVALID SUB CATEGORY
  ========================================================= */

  useEffect(() => {
    if (!subSlug || selectedSub || categoriesLoading) return;

    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      next.delete("sub");
      next.delete("brand");
      next.delete("page");

      return next;
    }, { replace: true });
  }, [subSlug, selectedSub, categoriesLoading, setSearchParams]);

  /* =========================================================
     RESET LOCAL PAGINATION
  ========================================================= */

  const productScopeKey = useMemo(() => {
    return [
      audienceContext,
      audienceRootOnly ? "audience-root" : scopedCategoryIds.join(","),
      brandFilter,
      productQuery,
      productSort,
      inStockOnly ? "1" : "0",
      minPrice,
      maxPrice,
    ].join("|");
  }, [audienceContext, audienceRootOnly, scopedCategoryIds, brandFilter, productQuery, productSort, inStockOnly, minPrice, maxPrice]);

  useEffect(() => {
    if (previousScopeRef.current && previousScopeRef.current !== productScopeKey) {
      setLoadedPage(1);
    }

    previousScopeRef.current = productScopeKey;
  }, [productScopeKey]);

  /* =========================================================
     EXACT PRODUCT COUNT
  ========================================================= */

  const { data: totalProductCount = 0 } = useQuery({
    queryKey: ["category-products-count", productScopeKey],
    enabled: hasProductScope,
    queryFn: async () => {
      let query = (supabase as any).from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);
      if (audienceValues.length > 0) query = query.in("audience", audienceValues);

      if (brandFilter !== "all") {
        query = query.eq("brand", brandFilter);
      }

      if (productQuery.trim()) {
        const term = productQuery.trim();

        query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
      }

      if (inStockOnly) {
        query = query.eq("in_stock", true);
      }

      if (Number(minPrice) > 0) {
        query = query.gte("price", Number(minPrice));
      }

      if (Number(maxPrice) > 0) {
        query = query.lte("price", Number(maxPrice));
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const productQueries = useQueries({
    queries: Array.from({ length: loadedPage }, (_, pageIndex) => ({
      queryKey: ["categories-products", productScopeKey, pageIndex + 1],
      enabled: hasProductScope,

      queryFn: async () => {
        const from = pageIndex * PAGE_SIZE;

        let query = (supabase as any).from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true);
        if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);
        if (audienceValues.length > 0) query = query.in("audience", audienceValues);

        if (brandFilter !== "all") {
          query = query.eq("brand", brandFilter);
        }

        if (productQuery.trim()) {
          const term = productQuery.trim();

          query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
        }

        if (inStockOnly) {
          query = query.eq("in_stock", true);
        }

        if (Number(minPrice) > 0) {
          query = query.gte("price", Number(minPrice));
        }

        if (Number(maxPrice) > 0) {
          query = query.lte("price", Number(maxPrice));
        }

        if (productSort === "price-asc") {
          query = query.order("price", { ascending: true });
        } else if (productSort === "price-desc") {
          query = query.order("price", { ascending: false });
        } else if (productSort === "name") {
          query = query.order("name_ar", { ascending: true });
        } else {
          query = query.order("created_at", { ascending: false });
        }

        const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

        if (error) throw error;

        return (data || []).map(mapProductCard);
      },

      staleTime: 5 * 60 * 1000,
      gcTime: 20 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });

  const products = useMemo(() => {
    const seen = new Set<string>();

    return productQueries.flatMap((query) => query.data || []).filter((product) => {
      if (seen.has(product.id)) return false;

      seen.add(product.id);

      return true;
    });
  }, [productQueries]);

  const productsLoading = productQueries.some((query) => query.isLoading || query.isFetching);

  const initialProductsLoading = productsLoading && products.length === 0;

  const hasMore = products.length < totalProductCount;

  /* =========================================================
     AVAILABLE BRANDS

     طلب خفيف لأسماء الماركات في كامل نطاق القسم حتى لا تعتمد
     الفلاتر على أول 24 منتجاً فقط.
  ========================================================= */

  const brandScopeKey = useMemo(() => [audienceContext, audienceRootOnly ? "audience-root" : scopedCategoryIds.join(","), productQuery, inStockOnly ? "1" : "0", minPrice, maxPrice].join("|"), [audienceContext, audienceRootOnly, scopedCategoryIds, productQuery, inStockOnly, minPrice, maxPrice]);

  const { data: availableBrands = [] } = useQuery({
    queryKey: ["category-available-brands", brandScopeKey],
    enabled: hasProductScope,
    queryFn: async () => {
      const brands = new Set<string>();
      const batchSize = 1000;

      for (let page = 0; page < 20; page += 1) {
        let query = (supabase as any).from("products").select("brand").eq("is_active", true);
        if (!audienceRootOnly) query = query.in("category_id", scopedCategoryIds);
        if (audienceValues.length > 0) query = query.in("audience", audienceValues);
        if (productQuery.trim()) { const term = productQuery.trim(); query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`); }
        if (inStockOnly) query = query.eq("in_stock", true);
        if (Number(minPrice) > 0) query = query.gte("price", Number(minPrice));
        if (Number(maxPrice) > 0) query = query.lte("price", Number(maxPrice));

        const from = page * batchSize;
        const { data, error } = await query.range(from, from + batchSize - 1);
        if (error) throw error;
        (data || []).forEach((row: any) => { const brand = String(row.brand || "").trim(); if (brand) brands.add(brand); });
        if ((data || []).length < batchSize) break;
      }

      return Array.from(brands).sort((a, b) => a.localeCompare(b, "ar"));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     CLOSE BRAND MENU
  ========================================================= */

  useEffect(() => {
    setBrandOpen(false);
  }, [parentSlug, subSlug]);

  /* =========================================================
     TOP ON CATEGORY CHANGE
  ========================================================= */

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [parentSlug, subSlug]);

  /* =========================================================
     PARAMS
  ========================================================= */

  const setStepParams = (nextValues: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    params.delete("page");

    setLoadedPage(1);

    setSearchParams(params, { replace: true });

    requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    });
  };

  const updateProductFilters = (values: ProductListFilterValues) => {
    setStepParams({
      brand: values.brand === "all" ? null : values.brand,
      q: values.query || null,
      sort: values.sort === "new" ? null : values.sort,
      stock: values.inStockOnly ? "1" : null,
      min: values.minPrice || null,
      max: values.maxPrice || null,
    });
  };

  /* =========================================================
     LOAD MORE

     لا URL
     لا Navigation
     لا Scroll Jump
  ========================================================= */

  const handleLoadMore = () => {
    if (productsLoading || !hasMore) return;

    setLoadedPage((current) => current + 1);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        {/* =========================================================
            MAIN INTRO
        ========================================================= */}

        {!selectedParent && (
          <section className="border-b border-[#F0E7E3] bg-[#FFF8F6]">
            <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-8 md:pt-9">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[7px] tracking-[0.24em] text-[#B86168]">{getSiteText(content, "categories_page_eyebrow", "FLAMINGO")}</span>
                </div>

                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.04em] text-[#403132] md:text-[38px]">{getSiteText(content, "categories_page_title", "تسوّقي حسب القسم")}</h1>

                <p className="mt-1.5 max-w-[280px] text-[9px] leading-5 text-[#9B8984] md:max-w-md md:text-[11px]">{getSiteText(content, "categories_page_subtitle", "اكتشفي ما يناسبك من مجموعات فلامنجو المختارة بعناية")}</p>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================
            BREADCRUMB
        ========================================================= */}

        {selectedParent && (
          <section className="border-b border-[#F0E7E3] bg-[#FFFDFC]">
            <div className="mx-auto flex h-[46px] w-full max-w-[1500px] items-center justify-between gap-3 px-3 md:h-[50px] md:px-6">
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[9px] text-[#A0938E] md:text-[10px]">
                <button type="button" onClick={() => setStepParams({ parent: null, sub: null, brand: null })} className="shrink-0 transition-colors hover:text-[#B86168]">الأقسام</button>

                <ChevronLeft className="h-3 w-3 shrink-0 stroke-[1.4] text-[#C9BBB6]" />

                {selectedSub ? (
                  <>
                    <button type="button" onClick={() => setStepParams({ sub: null, brand: null })} className="max-w-[100px] truncate text-[#756763] transition-colors hover:text-[#B86168] md:max-w-[180px]">{selectedParent.name_ar}</button>

                    <ChevronLeft className="h-3 w-3 shrink-0 stroke-[1.4] text-[#C9BBB6]" />

                    <span className="max-w-[110px] truncate font-semibold text-[#473A38] md:max-w-[200px]">{selectedSub.name_ar}</span>
                  </>
                ) : (
                  <span className="max-w-[150px] truncate font-semibold text-[#473A38]">{selectedParent.name_ar}</span>
                )}
              </div>

              {!!activeProductCategory && availableBrands.length > 0 && (
                <div className="relative shrink-0">

                  {brandOpen && (
                    <div className="absolute left-0 top-10 z-50 w-48 overflow-hidden rounded-[14px] border border-[#EDE3DF] bg-white shadow-[0_12px_30px_rgba(60,40,35,.09)]">
                      <div className="max-h-56 overflow-y-auto p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button type="button" onClick={() => { setStepParams({ brand: null }); setBrandOpen(false); }} className={`w-full rounded-[10px] px-3 py-2 text-right text-[9px] ${brandFilter === "all" ? "bg-[#FAECE9] font-semibold text-[#B86168]" : "text-[#6B5D59]"}`}>كل الماركات</button>

                        {availableBrands.map((brand) => (
                          <button key={brand} type="button" onClick={() => { setStepParams({ brand }); setBrandOpen(false); }} className={`w-full rounded-[10px] px-3 py-2 text-right text-[9px] ${brandFilter === brand ? "bg-[#FAECE9] font-semibold text-[#B86168]" : "text-[#6B5D59]"}`}>{brand}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            PARENT CATEGORIES
        ========================================================= */}

        {!selectedParent && (
          <section className="mx-auto w-full max-w-[1500px] px-2.5 pb-8 pt-3 md:px-6 md:pb-12 md:pt-6">
            {categoriesLoading ? (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="aspect-[4/5] animate-pulse rounded-[17px] bg-[#F2ECE9]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-5">
                {parents.map((category, index) => (
                  <Link key={category.id} to={`/categories?parent=${category.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-[17px] bg-[#F4F1EF] md:rounded-[20px]">
                    <img src={category.image_url || FALLBACK[category.slug] || FALLBACK.women} alt={category.name_ar} loading={index < 2 ? "eager" : "lazy"} fetchPriority={index < 2 ? "high" : "auto"} decoding="async" className="h-full w-full object-cover md:transition-transform md:duration-300 md:group-hover:scale-[1.02]" />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 md:p-4">
                      <div className="min-w-0">
                        {category.name && <p className="mb-0.5 truncate text-[7px] tracking-[0.11em] text-white/65 md:text-[8px]">{category.name}</p>}

                        <h2 className="truncate text-[17px] font-semibold text-white md:text-[22px]">{category.name_ar}</h2>
                      </div>

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#C96F79] md:h-8 md:w-8">
                        <ChevronLeft className="h-3.5 w-3.5 stroke-[1.7]" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* =========================================================
            SUB CATEGORIES
        ========================================================= */}

        {selectedParent && !selectedSub && subCategories.length > 0 && (
          <>
            <section className="mx-auto w-full max-w-[1500px] px-4 pb-3 pt-5 md:px-6 md:pb-5 md:pt-7">
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                    <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO</span>
                  </div>

                  <h1 className="text-[22px] font-semibold tracking-[-0.035em] text-[#403132] md:text-[30px]">{selectedParent.name_ar}</h1>

                  <p className="mt-1 text-[8px] text-[#9C8D88] md:text-[10px]">اختاري المجموعة التي تريدين استكشافها</p>
                </div>

                <span className="text-[8px] font-medium text-[#B96B70]">{subCategories.length} أقسام</span>
              </div>
            </section>

            <section className="mx-auto w-full max-w-[1500px] px-2.5 pb-9 md:px-6 md:pb-12">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-5">
                {subCategories.map((category, index) => (
                  <Link key={category.id} to={`/categories?parent=${selectedParent.slug}&sub=${category.slug}`} className="group overflow-hidden rounded-[16px] border border-[#EEE5E1] bg-white">
                    <div className="aspect-square overflow-hidden bg-[#F4F1EF]">
                      <img src={category.image_url || FALLBACK[category.slug] || FALLBACK.women} alt={category.name_ar} loading={index < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover md:transition-transform md:duration-300 md:group-hover:scale-[1.02]" />
                    </div>

                    <div className="flex min-h-[52px] items-center justify-between gap-2 px-3 py-2.5">
                      <div className="min-w-0">
                        <h2 className="truncate text-[11px] font-semibold text-[#453937] md:text-[13px]">{category.name_ar}</h2>

                        {category.name && <p className="mt-0.5 truncate text-[7px] text-[#A0938E] md:text-[8px]">{category.name}</p>}
                      </div>

                      <ChevronLeft className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-[#C96F79]" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}

        {/* =========================================================
            PRODUCTS
        ========================================================= */}

        {!!activeProductCategory && (
          <section className="mx-auto w-full max-w-[1500px] pb-9">
            {/* CATEGORY TITLE */}

            <div className="px-3 pb-3 pt-5 md:px-6 md:pb-5 md:pt-7">
              <div className="flex items-end justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                    <span className="font-serif text-[6px] tracking-[0.21em] text-[#B86168]">FLAMINGO EDIT</span>
                  </div>

                  <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-[#403132] md:text-[28px]">{activeProductCategory.name_ar}</h1>
                </div>

                <div className="text-left">
                  <span className="block text-[12px] font-semibold leading-none text-[#B86168]">{totalProductCount}</span>
                  <span className="mt-1 block text-[6px] text-[#A99A94]">منتج</span>
                </div>
              </div>
            </div>

            {/* FILTERS */}

            <div className="px-3 md:px-6">
              <ProductListFilters values={{ query: productQuery, brand: brandFilter, sort: productSort, inStockOnly, minPrice, maxPrice }} brands={availableBrands} resultCount={totalProductCount} onChange={updateProductFilters} />
            </div>

            {/* PRODUCT GRID */}

            <div className="px-2.5 pt-4 md:px-6 md:pt-6">
              {initialProductsLoading ? (
                <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index}>
                      <div className="aspect-[4/5] animate-pulse rounded-[14px] bg-[#F2ECE9]" />
                      <div className="mt-2.5 h-2.5 w-[70%] animate-pulse rounded-full bg-[#EFE8E5]" />
                      <div className="mt-2 h-2.5 w-[36%] animate-pulse rounded-full bg-[#EFE8E5]" />
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex min-h-[42vh] flex-col items-center justify-center px-5 text-center">
                  <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#F9ECE9]">
                    <span className="text-[20px] font-light text-[#C96F79]">F</span>
                  </div>

                  <h2 className="mt-4 text-[14px] font-semibold text-[#453837]">لا توجد منتجات حالياً</h2>

                  <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9D8E89]">جرّبي تغيير الفلاتر أو اختيار ماركة أخرى.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
                    {products.map((product, index) => (
                      <div key={product.id} className="min-w-0">
                        <ProductCard product={product} index={index} />
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="flex flex-col items-center pb-2 pt-10 md:pt-12">
                      <button type="button" onClick={handleLoadMore} disabled={productsLoading} className="flex h-[43px] min-w-[160px] items-center justify-center rounded-full border border-[#DDCBC6] bg-white px-6 text-[9px] font-medium text-[#594B47] transition-colors active:bg-[#FFF7F5] disabled:opacity-50">
                        {productsLoading ? "جاري التحميل..." : "عرض المزيد"}
                      </button>

                      <span className="mt-2 text-[7px] text-[#A99A94]">{products.length} / {totalProductCount}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CategoriesPage;