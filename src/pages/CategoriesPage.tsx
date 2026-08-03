import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import type { Product } from "@/store/useStore";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { clearCatalogScroll, restoreCatalogScroll } from "@/lib/catalogScroll";
import { ChevronDown } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
}

const FALLBACK: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
};

const CategoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { data: content } = useSiteContent("categories_page_");
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name,name_ar,parent_id,image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const parentSlug = searchParams.get("parent") || "";
  const subSlug = searchParams.get("sub") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const [brandOpen, setBrandOpen] = useState(false);

  const parents = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const selectedParent = useMemo(() => parents.find((p) => p.slug === parentSlug) || null, [parents, parentSlug]);
  const subCategories = useMemo(
    () => categories.filter((c) => selectedParent && c.parent_id === selectedParent.id),
    [categories, selectedParent],
  );
  const selectedSub = useMemo(() => subCategories.find((s) => s.slug === subSlug) || null, [subCategories, subSlug]);
  // Opening a parent category includes it and its subcategories in the product query.
  const effectiveLeafCategory = selectedSub || null;

  const effectiveLeafSlug = effectiveLeafCategory?.slug || "";
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const PAGE_SIZE = 24;

  const scopedCategoryIds = useMemo(() => {
    if (!selectedSub) return [] as string[];
    return [selectedSub.id];
  }, [selectedSub]);

  const productQueries = useQueries({
    queries: Array.from({ length: page }, (_, pageIndex) => ({
      queryKey: ["categories-leaf-products", scopedCategoryIds.join(","), brandFilter, pageIndex + 1],
      enabled: scopedCategoryIds.length > 0,
      queryFn: async () => {
        const from = pageIndex * PAGE_SIZE;
        let query = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).in("category_id", scopedCategoryIds);
        if (brandFilter !== "all") query = query.eq("brand", brandFilter);
        const { data, error } = await query.order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        return (data || []).map(mapProductCard);
      },
    })),
  });

  const leafProducts = useMemo(() => {
    const seen = new Set<string>();
    return productQueries.flatMap((query) => query.data || []).filter((product) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    });
  }, [productQueries]);
  const productsLoading = productQueries.some((query) => query.isLoading);
  const leafPage = productQueries[productQueries.length - 1]?.data || [];
  const hasMore = leafPage.length === PAGE_SIZE;

  useEffect(() => {
    if (!productsLoading && leafProducts.length > 0) restoreCatalogScroll(`${location.pathname}${location.search}`);
  }, [productsLoading, leafProducts.length, location.pathname, location.search]);

  const brands = useMemo(() => Array.from(new Set(leafProducts.map((product) => product.brand?.trim()).filter(Boolean))) as string[], [leafProducts]);

    const availableBrands = brands;


  const visibleProducts = useMemo(() => {
    if (brandFilter === "all") return leafProducts;
    return leafProducts.filter((p) => p.brand?.trim() === brandFilter);
  }, [leafProducts, brandFilter]);
  useEffect(() => {
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    }, [subSlug, parentSlug]);
    useEffect(() => {
      setBrandOpen(false);
    }, [parentSlug, subSlug]);
  const setStepParams = (next: Record<string, string | null>) => {
  const currentScroll = window.scrollY;

  const p = new URLSearchParams(searchParams);

  Object.entries(next).forEach(([key, value]) => {
    if (!value) p.delete(key);
    else p.set(key, value);
  });

  if (!("page" in next)) {
    p.delete("page");
  }


  setSearchParams(p);
  if (!("page" in next)) {
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }
};
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <section
          className={`container mx-auto px-6 ${selectedSub ? "mb-4" : "mb-10"} text-center`}>
          {!selectedSub && (
            <>
              <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground mb-3">
                {getSiteText(content, "categories_page_eyebrow", " ")}
              </p>
              <h1 className="font-heading text-4xl md:text-6xl">
                {getSiteText(content, "categories_page_title", "الأقسام")}
              </h1>
              <p className="text-sm text-muted-foreground mt-3">
                {getSiteText(content, "categories_page_subtitle", "اختاري القسم ثم الماركة واستعرضي المنتجات")}
              </p>
            </>
          )}
          <section className="container mx-auto px-6 mb-10">
            {selectedSub && (
              <div
                dir="rtl"
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  text-xs
                  text-muted-foreground
                "
              >
              {/* المسار */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setStepParams({
                      parent:null,
                      sub:null,
                      brand:null
                    })
                  }
                  className="hover:text-black transition"
                >
                  الأقسام
                </button>
                {selectedParent && (
                  <>
                    <span className="opacity-30">/</span>
                    <button
                      onClick={() =>
                        setStepParams({
                          sub:null,
                          brand:null
                        })
                      }
                      className="text-black hover:opacity-60"
                    >
                      {selectedParent.name_ar}
                    </button>
                  </>
                )}
                {selectedSub && (
                  <>
                    <span className="opacity-30">/</span>
                    <button
                      onClick={() =>
                        setStepParams({
                          brand:null
                        })
                      }
                      className="text-black font-medium hover:opacity-60"
                    >
                      {selectedSub.name_ar}
                    </button>
                  </>
                )}
              </div>
              {/* Dropdown الماركات */}
              {selectedSub && availableBrands.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setBrandOpen(!brandOpen)}
                    className="
                      group
                      flex
                      items-center
                      gap-2
                      px-5
                      py-2.5
                      rounded-full
                      border
                      border-pink-200
                      bg-white
                      text-black
                      text-xs
                      font-medium
                      shadow-sm
                      hover:border-pink-400
                      hover:shadow-md
                      transition-all
                      duration-300
                    "
                  >
                    <span
                      className="
                        relative
                        before:absolute
                        before:-bottom-1
                        before:right-0
                        before:h-[1px]
                        before:w-0
                        before:bg-pink-500
                        before:transition-all
                        group-hover:before:w-full
                      "
                    >
                      الماركات
                    </span>
                    <ChevronDown
                      className={`
                        w-4
                        h-4
                        text-pink-500
                        transition-transform
                        duration-300
                        ${brandOpen ? "rotate-180" : ""}
                      `}
                    />
                  </button>
                  {brandOpen && (
                    <div
                      className="
                      absolute
                      left-0
                      top-12
                      z-50
                      w-52
                      max-h-72
                      overflow-y-auto
                      touch-pan-y
                      bg-background
                      border
                      border-border
                      shadow-xl
                      rounded-xl
                      p-3
                      "
                      >
                      <button
                        onClick={() => {
                          setStepParams({brand:null});
                          setBrandOpen(false);
                        }}
                        className="
                          w-full
                          text-right
                          px-3
                          py-2
                          text-sm
                          rounded-lg
                          hover:bg-muted
                        "
                      >
                        كل الماركات
                      </button>
                      {availableBrands.map((brand)=>(
                        <button
                          key={brand}
                          onClick={()=>{
                            setStepParams({brand});
                            setBrandOpen(false);
                          }}
                          className={`
                            w-full
                            text-right
                            px-3
                            py-2
                            text-sm
                            rounded-lg
                            transition
                            ${
                              brandFilter === brand
                              ? "bg-black text-white"
                              : "hover:bg-muted"
                            }
                          `}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>
            )}
          </section>
        </section>

        {!selectedParent && (
          <section className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {parents.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories?parent=${c.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={c.image_url || FALLBACK[c.slug] || FALLBACK.women}
                    alt={c.name_ar}
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center text-white">
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-70 mb-1">{c.name}</p>
                    <h3 className="font-heading text-xl md:text-2xl">{c.name_ar}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {selectedParent && !selectedSub && subCategories.length > 0 && (
          <section className="container mx-auto px-4 md:px-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {subCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories?parent=${selectedParent.slug}&sub=${c.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden bg-muted"
                  onClick={() => {
                    window.scrollTo({
                      top: 0,
                      behavior: "instant",
                    });
                  }}
                  >
                  <img
                    src={c.image_url || FALLBACK[c.slug] || FALLBACK.women}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center text-white">
                    <h3 className="font-heading text-lg md:text-xl">{c.name_ar}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!!selectedSub && (
          <section
            className="container mx-auto px-4 md:px-6 space-y-5"
          >
          
            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground">جاري تحميل المنتجات...</div>
            ) : visibleProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد منتجات لهذه الماركة داخل هذا القسم</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
                {hasMore && (
                  <div className="flex justify-center pt-3">
                    <Button variant="outline" onClick={() => { setStepParams({ page: String(page + 1) }); }}>عرض المزيد</Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoriesPage;