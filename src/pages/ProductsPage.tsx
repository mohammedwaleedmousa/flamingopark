import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Product } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, SlidersHorizontal, X, RotateCcw, Search, ArrowUpDown, Check } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const Chip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <span className="inline-flex items-center gap-2 bg-foreground text-background text-[10px] tracking-[0.25em] uppercase px-3 py-1.5">
    {label}
    <button onClick={onClear} aria-label="clear" className="hover:opacity-70">
      <X className="w-3 h-3" />
    </button>
  </span>
);

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const sortBy = searchParams.get("sort") || "new";
  const saleOnly = searchParams.get("sale") === "1";
  const inStockOnly = searchParams.get("stock") === "1";
  const minPriceParam = Number(searchParams.get("min") || 0);
  const maxPriceParam = Number(searchParams.get("max") || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Debounced search → URL
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput.trim()) next.set("search", searchInput.trim());
      else next.delete("search");
      setSearchParams(next, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [categorySlug, searchQuery, brandFilter, sortBy, saleOnly, inStockOnly, minPriceParam, maxPriceParam]);

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

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 1000 };
    const prices = products.map((p) => (p.discount ? p.price * (1 - p.discount / 100) : p.price));
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const effectiveMin = minPriceParam || priceBounds.min;
  const effectiveMax = maxPriceParam || priceBounds.max;

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
      const finalPrice = p.discount ? p.price * (1 - p.discount / 100) : p.price;
      const okPrice = finalPrice >= effectiveMin && finalPrice <= effectiveMax;
      const okSale = !saleOnly || !!p.discount;
      const okStock = !inStockOnly || p.inStock;
      return okSearch && okBrand && okPrice && okSale && okStock;
    });
    if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    if (sortBy === "best") arr = [...arr].sort((a, b) => Number(!!b.isBestSeller) - Number(!!a.isBestSeller));
    if (sortBy === "featured") arr = [...arr].sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
    return arr;
  }, [products, searchQuery, brandFilter, sortBy, saleOnly, inStockOnly, effectiveMin, effectiveMax]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (v === null || v === "" || v === "all") next.delete(k);
    else next.set(k, v);
    setSearchParams(next);
  };

  const activeFilterCount =
    (brandFilter !== "all" ? 1 : 0) +
    (saleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minPriceParam || maxPriceParam ? 1 : 0);

  const sortOptions: { value: string; label: string }[] = [
    { value: "new", label: "الأحدث" },
    { value: "best", label: "الأكثر مبيعاً" },
    { value: "featured", label: "الأعلى تقييماً" },
    { value: "price-asc", label: "السعر: من الأقل" },
    { value: "price-desc", label: "السعر: من الأعلى" },
  ];
  const currentSortLabel = sortOptions.find((s) => s.value === sortBy)?.label || "الأحدث";

  const paginatedProducts = visibleProducts.slice(0, page * PAGE_SIZE);
  const hasMore = paginatedProducts.length < visibleProducts.length;

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
            {/* Search bar */}
            <div className="relative mb-6 max-w-xl mx-auto">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ابحث عن منتج، ماركة، فئة…"
                className="w-full pr-11 pl-10 py-3 bg-muted/50 border border-border focus:border-foreground outline-none text-sm transition-colors"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-border pb-4 mb-8">
              <button
                onClick={() => setFiltersOpen(true)}
                className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase relative hover:opacity-70 transition-opacity"
              >
                <SlidersHorizontal className="w-4 h-4" /> فلاتر
                {activeFilterCount > 0 && (
                  <span className="bg-foreground text-background text-[9px] px-1.5 py-0.5 ml-1 animate-scale-in">{activeFilterCount}</span>
                )}
              </button>
              <p className="text-xs md:text-sm text-muted-foreground tracking-wide hidden sm:block">{visibleProducts.length} منتج</p>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 text-[11px] tracking-[0.3em] uppercase border border-border hover:border-foreground transition-colors py-2 px-4 outline-none">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{currentSortLabel}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-none border-border min-w-[200px]">
                  {sortOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setParam("sort", opt.value)}
                      className="text-xs tracking-wider cursor-pointer flex items-center justify-between"
                    >
                      <span>{opt.label}</span>
                      {sortBy === opt.value && <Check className="w-3.5 h-3.5" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-6 animate-fade-in">
                {brandFilter !== "all" && (
                  <Chip label={brandFilter} onClear={() => setParam("brand", null)} />
                )}
                {saleOnly && <Chip label="عروض فقط" onClear={() => setParam("sale", null)} />}
                {inStockOnly && <Chip label="متوفر فقط" onClear={() => setParam("stock", null)} />}
                {(minPriceParam || maxPriceParam) && (
                  <Chip
                    label={`${effectiveMin} – ${effectiveMax}`}
                    onClear={() => {
                      const next = new URLSearchParams(searchParams);
                      next.delete("min");
                      next.delete("max");
                      setSearchParams(next);
                    }}
                  />
                )}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <div className="text-center py-24">
                <p className="font-heading text-2xl mb-2">لا توجد منتجات</p>
                <p className="text-sm text-muted-foreground">جرّب فلتراً مختلفاً أو استكشف أقساماً أخرى</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                  {paginatedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex flex-col items-center gap-3 mt-12">
                    <p className="text-xs text-muted-foreground tracking-wider">
                      عرض {paginatedProducts.length} من {visibleProducts.length}
                    </p>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      className="border border-foreground px-10 py-3 text-[11px] tracking-[0.4em] uppercase hover:bg-foreground hover:text-background transition-all active:scale-[0.98]"
                    >
                      عرض المزيد
                    </button>
                  </div>
                )}
              </>
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
              {/* Price range */}
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">نطاق السعر</p>
                <Slider
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={Math.max(1, Math.floor((priceBounds.max - priceBounds.min) / 50))}
                  value={[effectiveMin, effectiveMax]}
                  onValueChange={(v) => {
                    const next = new URLSearchParams(searchParams);
                    if (v[0] !== priceBounds.min) next.set("min", String(v[0])); else next.delete("min");
                    if (v[1] !== priceBounds.max) next.set("max", String(v[1])); else next.delete("max");
                    setSearchParams(next);
                  }}
                  className="my-4"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{effectiveMin}</span>
                  <span>{effectiveMax}</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm">العروض فقط</span>
                  <Switch checked={saleOnly} onCheckedChange={(v) => setParam("sale", v ? "1" : null)} />
                </label>
                <label className="flex items-center justify-between">
                  <span className="text-sm">المتوفر فقط</span>
                  <Switch checked={inStockOnly} onCheckedChange={(v) => setParam("stock", v ? "1" : null)} />
                </label>
              </div>

              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-4">الماركة</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
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
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const next = new URLSearchParams();
                    if (categorySlug) next.set("category", categorySlug);
                    if (searchQuery) next.set("search", searchQuery);
                    setSearchParams(next);
                  }}
                  className="flex-1 py-3 border border-foreground text-[11px] tracking-[0.4em] uppercase hover:bg-foreground hover:text-background transition flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> إعادة تعيين
                </button>
                <button onClick={() => setFiltersOpen(false)} className="flex-1 py-3 bg-foreground text-background text-[11px] tracking-[0.4em] uppercase">
                  تطبيق
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductsPage;
