import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import LoadingScreen from "@/components/LoadingScreen";
import { Product } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, SlidersHorizontal, X } from "lucide-react";

interface Category {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
}

const FALLBACK_IMG: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=85",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=900&q=85",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=900&q=85",
};

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const sortBy = searchParams.get("sort") || "new";
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const currentCategory = categories.find((c) => c.slug === categorySlug) || null;
  const subCategories = useMemo(
    () => categories.filter((c) => currentCategory && c.parent_id === currentCategory.id),
    [categories, currentCategory]
  );
  const isParent = subCategories.length > 0;

  // Build leaf slugs for product fetch
  const leafSlugs = useMemo(() => {
    if (!currentCategory) return null;
    if (isParent) return subCategories.map((c) => c.slug);
    return [currentCategory.slug];
  }, [currentCategory, isParent, subCategories]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-list", leafSlugs, searchQuery],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (leafSlugs && leafSlugs.length) q = q.in("category", leafSlugs);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "",
        descriptionAr: p.description_ar || "",
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
  });

  const brandsAvailable = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.brand && set.add(p.brand.trim()));
    return Array.from(set);
  }, [products]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let arr = products.filter((p) => {
      const okSearch =
        !q ||
        p.nameAr.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.descriptionAr.toLowerCase().includes(q);
      const okBrand = brandFilter === "all" || p.brand?.trim() === brandFilter;
      return okSearch && okBrand;
    });
    if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    return arr;
  }, [products, searchQuery, brandFilter, sortBy]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (v === null || v === "" || v === "all") next.delete(k);
    else next.set(k, v);
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pt-20 md:pt-24 pb-16">
        {/* Breadcrumb / hero */}
        <section className="border-b border-border bg-muted/40">
          <div className="container mx-auto px-6 py-8 md:py-12">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">
              <Link to="/home" className="hover:text-foreground">الرئيسية</Link>
              <ChevronLeft className="w-3 h-3" />
              <Link to="/products" className="hover:text-foreground">المنتجات</Link>
              {currentCategory && (
                <>
                  <ChevronLeft className="w-3 h-3" />
                  <span className="text-foreground">{currentCategory.name_ar}</span>
                </>
              )}
            </div>
            <h1 className="font-heading text-3xl md:text-5xl text-foreground">
              {searchQuery ? `نتائج البحث: "${searchQuery}"` : currentCategory ? currentCategory.name_ar : "كل المنتجات"}
            </h1>
            {currentCategory && (
              <p className="text-sm text-muted-foreground mt-3">
                {isParent ? `استكشف ${subCategories.length} فئة` : `${visibleProducts.length} منتج`}
              </p>
            )}
          </div>
        </section>

        {/* Sub-categories grid (when current is a parent) */}
        {isParent && !searchQuery && (
          <section className="container mx-auto px-6 py-10 md:py-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {subCategories.map((sc) => (
                <Link
                  key={sc.id}
                  to={`/products?category=${sc.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={sc.image_url || FALLBACK_IMG[currentCategory!.slug] || FALLBACK_IMG.women}
                    alt={sc.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center text-white">
                    <p className="text-[10px] tracking-[0.35em] uppercase opacity-70 mb-1">{sc.name}</p>
                    <h3 className="font-heading text-lg md:text-xl">{sc.name_ar}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Product listing (leaf or search) */}
        {(!isParent || searchQuery) && (
          <section className="container mx-auto px-6 py-8">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase"
              >
                <SlidersHorizontal className="w-4 h-4" /> فلاتر
              </button>
              <p className="text-sm text-muted-foreground">{visibleProducts.length} منتج</p>
              <select
                value={sortBy}
                onChange={(e) => setParam("sort", e.target.value)}
                className="bg-transparent text-[11px] tracking-[0.3em] uppercase border-b border-border focus:border-foreground outline-none py-1 px-2"
              >
                <option value="new">الأحدث</option>
                <option value="price-asc">السعر: تصاعدي</option>
                <option value="price-desc">السعر: تنازلي</option>
              </select>
            </div>

            {isLoading ? (
              <LoadingScreen label="جاري التحميل" />
            ) : visibleProducts.length === 0 ? (
              <div className="text-center py-24">
                <p className="font-heading text-2xl mb-2">لا توجد منتجات</p>
                <p className="text-sm text-muted-foreground">جرّب فلتراً مختلفاً أو استكشف أقساماً أخرى</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Filters drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[60] flex" dir="rtl">
          <div className="flex-1 bg-foreground/40" onClick={() => setFiltersOpen(false)} />
          <aside className="w-[85vw] max-w-sm bg-background h-full overflow-y-auto animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="font-heading text-lg">الفلاتر</h3>
              <button onClick={() => setFiltersOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-8">
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">الماركة</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" name="brand" checked={brandFilter === "all"} onChange={() => setParam("brand", null)} />
                    <span className="text-sm">جميع الماركات</span>
                  </label>
                  {brandsAvailable.map((b) => (
                    <label key={b} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name="brand" checked={brandFilter === b} onChange={() => setParam("brand", b)} />
                      <span className="text-sm">{b}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={() => { setSearchParams({}); setFiltersOpen(false); }} className="w-full py-3 border border-foreground text-[11px] tracking-[0.4em] uppercase hover:bg-foreground hover:text-background transition">
                إعادة تعيين
              </button>
            </div>
          </aside>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductsPage;
