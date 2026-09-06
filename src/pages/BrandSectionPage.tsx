import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Package } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import type { Product } from "@/store/useStore";

interface BrandSectionRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  brand_sections: BrandSectionRow[] | null;
}

type SortType = "new" | "asc" | "desc" | "name";
const PAGE_SIZE = 16;

const BrandSectionPage = () => {
  const { slug, sectionSlug } = useParams<{ slug: string; sectionSlug: string }>();
  const [sort, setSort] = useState<SortType>("new");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loadedPage, setLoadedPage] = useState(1);

  // Same cache key as BrandPage: when the customer opens a brand first,
  // this page reuses that result immediately instead of requesting the brand again.
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ["brand-page-shell-v2", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,slug,brand_sections(id,name,slug,image_url,description,sort_order,is_active)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as BrandRow | null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const section = useMemo(() => {
    return (brand?.brand_sections || []).find((item) => item.is_active !== false && item.slug === sectionSlug) || null;
  }, [brand?.brand_sections, sectionSlug]);

  const productQueries = useQueries({
    queries: Array.from({ length: loadedPage }, (_, pageIndex) => ({
      queryKey: ["brand-section-products-fast-v1", section?.id, brand?.id, pageIndex + 1],
      enabled: Boolean(section?.id && brand?.id),
      queryFn: async () => {
        const from = pageIndex * PAGE_SIZE;
        const { data, error } = await (supabase as any)
          .from("brand_section_products")
          .select(`product_id,products!inner(${PRODUCT_CARD_SELECT})`)
          .eq("section_id", section!.id)
          .eq("products.is_active", true)
          .eq("products.brand_id", brand!.id)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        return (data || [])
          .map((row: any) => row.products)
          .filter(Boolean)
          .map(mapProductCard) as Product[];
      },
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
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
  const productsError = productQueries.some((query) => query.isError);
  const lastPage = productQueries[productQueries.length - 1]?.data || [];
  const hasMore = lastPage.length === PAGE_SIZE;

  const visibleProducts = useMemo(() => {
    const list = products.filter((product) => !inStockOnly || product.inStock);
    return [...list].sort((a, b) => {
      if (sort === "asc") return Number(a.price || 0) - Number(b.price || 0);
      if (sort === "desc") return Number(b.price || 0) - Number(a.price || 0);
      if (sort === "name") return String(a.nameAr || a.name || "").localeCompare(String(b.nameAr || b.name || ""), "ar");
      return 0;
    });
  }, [products, sort, inStockOnly]);

  if (!slug || !sectionSlug) return <Navigate to="/home" replace />;

  if (brandLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background" dir="rtl">
        <Navbar /><CartDrawer />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 md:px-6">
          <div className="mb-7 h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!brand || !section) {
    return (
      <div className="flex min-h-screen flex-col bg-background" dir="rtl">
        <Navbar /><CartDrawer />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <Package className="mx-auto h-6 w-6 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold">القسم غير موجود</h1>
            <Link to={`/brands/${slug}`} className="mt-4 inline-flex items-center gap-1 text-sm text-[#A95B61]"><ChevronRight className="h-4 w-4" /> العودة إلى الماركة</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="flex-1 pb-14">
        <section className="mx-auto w-full max-w-[1400px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
          <Link to={`/brands/${slug}`} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-[#A95B61] md:text-[11px]"><ChevronRight className="h-3.5 w-3.5" /> {brand.name}</Link>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[7px] uppercase tracking-[0.2em] text-[#B86168]">COLLECTION</span></div>
              <h1 className="text-[25px] font-semibold tracking-[-0.035em] md:text-[34px]">{section.name}</h1>
              {section.description && <p className="mt-2 max-w-[560px] text-[11px] leading-6 text-muted-foreground">{section.description}</p>}
            </div>
            <span className="shrink-0 pb-1 text-[9px] text-muted-foreground">{visibleProducts.length} منتج</span>
          </div>
        </section>

        {products.length > 0 && (
          <section className="border-y border-border/60">
            <div className="mx-auto flex h-[54px] w-full max-w-[1400px] items-center justify-between gap-3 px-4 md:px-6">
              <button type="button" onClick={() => setInStockOnly((value) => !value)} className={`rounded-full border px-3 py-1.5 text-[10px] ${inStockOnly ? "border-[#D6AAA7] bg-[#FFF7F5] text-[#A95B61]" : "border-border text-muted-foreground"}`}>المتوفر فقط</button>
              <label className="relative flex items-center">
                <select value={sort} onChange={(event) => setSort(event.target.value as SortType)} className="appearance-none bg-transparent py-2 pl-6 pr-2 text-[10px] font-medium outline-none">
                  <option value="new">الأحدث</option><option value="asc">السعر: الأقل أولاً</option><option value="desc">السعر: الأعلى أولاً</option><option value="name">الاسم</option>
                </select>
                <ChevronDown className="pointer-events-none absolute left-1 h-3.5 w-3.5 text-muted-foreground" />
              </label>
            </div>
          </section>
        )}

        <section className="mx-auto mt-5 w-full max-w-[1400px] px-4 md:mt-7 md:px-6">
          {productsLoading && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
          ) : productsError && products.length === 0 ? (
            <div className="flex min-h-[250px] items-center justify-center border-y border-border/60 text-center"><div><Package className="mx-auto h-5 w-5 text-muted-foreground" /><h2 className="mt-3 text-[12px] font-semibold">تعذر تحميل المنتجات</h2><p className="mt-1.5 text-[9px] text-muted-foreground">أعد تحميل الصفحة للمحاولة مرة أخرى.</p></div></div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex min-h-[250px] items-center justify-center border-y border-border/60 text-center"><div><Package className="mx-auto h-5 w-5 text-muted-foreground" /><h2 className="mt-3 text-[12px] font-semibold">لا توجد منتجات مطابقة</h2></div></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4">
                {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
              </div>
              {hasMore && <div className="flex justify-center pt-9"><button type="button" disabled={productsLoading} onClick={() => setLoadedPage((page) => page + 1)} className="h-11 rounded-full border border-border bg-background px-7 text-[10px] font-medium text-foreground disabled:opacity-50">{productsLoading ? "جاري التحميل..." : "عرض المزيد"}</button></div>}
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BrandSectionPage;