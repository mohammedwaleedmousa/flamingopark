import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { Product } from "@/store/useStore";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { SlidersHorizontal, X, Heart } from "lucide-react";
import { Slider } from "@/components/ui/slider";
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

const FALLBACK_IMG: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=85",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=900&q=85",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=900&q=85",
};

const shimmerVariants = {
  hidden: { opacity: 0, y: 8 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.45 } }),
};

const QuickView = ({ product, onClose, isMobile }: { product: Product | null; onClose: () => void; isMobile: boolean }) => {
  const { data: content } = useSiteContent("products_page_");
  const store = useStore();
  const { addToCart } = store;
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    // reset when product changes
    setQty(1);
    setActiveImage(0);
    setActiveVariantIndex(product && product.variants && product.variants.length ? 0 : null);
    setSelectedSize(null);
  }, [product]);

  if (!product) return null;

  const variants = product.variants || [];
  const activeVariant = activeVariantIndex !== null ? variants[activeVariantIndex] : undefined;

  const images = activeVariant?.images?.length ? activeVariant.images : product.images;

  const priceSource = activeVariant?.price ?? product.price;
  const discountSource = activeVariant?.discount ?? product.discount;
  const displayPrice = discountSource ? priceSource * (1 - discountSource / 100) : priceSource;

  const sizesForActiveVariant = activeVariant?.sizes ?? [];
  const stockForSize = (size?: string) => {
    if (!size) return product.inStock ? 999 : 0;
    const s = sizesForActiveVariant.find((x) => x.size === size);
    return s ? s.stock : 0;
  };

  const handleAdd = () => {
    addToCart(product, qty, selectedSize ?? undefined, undefined, activeVariant?.id, activeVariant?.colorName);
    onClose();
  };

  return (
    <motion.aside
      initial={isMobile ? { y: "100%" } : { x: "100%" }}
      animate={isMobile ? { y: 0 } : { x: 0 }}
      exit={isMobile ? { y: "100%" } : { x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`fixed top-0 right-0 bottom-0 w-full bg-background z-50 shadow-2xl overflow-y-auto ${isMobile ? 'max-w-none p-4 pb-24' : 'max-w-2xl border-l border-border p-6'}`}
    >
      <div className="flex items-start justify-between mb-4 gap-4">
        <div className="flex-1">
          <h3 className="font-heading text-2xl">{product.nameAr}</h3>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onClose()} className="p-2 hover:bg-muted rounded-md"><X className="w-5 h-5"/></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="w-full aspect-[4/3] bg-muted rounded-xl overflow-hidden flex items-center justify-center">
            {images?.[activeImage] ? (
              <img src={images[activeImage]} alt={product.nameAr} className="w-full h-full object-cover" />
            ) : (
              <div className="text-muted-foreground">No image</div>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {(images || []).map((img, idx) => (
              <button key={idx} onClick={() => setActiveImage(idx)} className={`w-20 h-14 rounded-md overflow-hidden border ${activeImage===idx ? 'ring-2 ring-foreground' : ''}`}>
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-heading text-2xl">{Math.round(displayPrice)}</div>
            {discountSource && <div className="text-sm text-muted-foreground">خصم {discountSource}%</div>}
          </div>

          <p className="text-sm text-foreground/70">{product.descriptionAr || product.description}</p>

          {/* Colors */}
          {variants.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">الألوان</p>
              <div className="flex items-center gap-3">
                {variants.map((v, idx) => (
                  <button key={v.id} onClick={() => { setActiveVariantIndex(idx); setActiveImage(0); setSelectedSize(null); }} title={v.colorName} className={`w-9 h-9 rounded-full border ${activeVariantIndex===idx ? 'ring-2 ring-foreground' : ''}`} style={{ background: v.colorHex || '#eee' }} />
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizesForActiveVariant.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">{getSiteText(content, "products_page_quick_sizes", "المقاسات")}</p>
              <div className="flex flex-wrap gap-2">
                {sizesForActiveVariant.map((s) => {
                  const stock = s.stock;
                  const disabled = stock <= 0;
                  return (
                    <button key={s.size} onClick={() => setSelectedSize(s.size)} disabled={disabled} className={`px-3 py-2 rounded-md border ${selectedSize===s.size ? 'bg-foreground text-background' : 'bg-transparent'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock indicator + qty + add */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">{getSiteText(content, "products_page_quick_status_label", "الحالة:")} <span className="text-foreground">{(selectedSize ? (stockForSize(selectedSize) > 5 ? getSiteText(content, "products_page_quick_status_available", "متاح") : stockForSize(selectedSize) > 0 ? getSiteText(content, "products_page_quick_status_low", "كمية قليلة") : getSiteText(content, "products_page_quick_status_unavailable", "غير متوفر")) : (product.inStock ? getSiteText(content, "products_page_quick_status_available", "متاح") : getSiteText(content, "products_page_quick_status_unavailable", "غير متوفر")))}</span></div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 bg-muted rounded">-</button>
              <div className="px-3">{qty}</div>
              <button onClick={() => setQty(qty + 1)} className="px-3 py-2 bg-muted rounded">+</button>
            </div>
            <button onClick={handleAdd} className="flex-1 py-3 bg-foreground text-background rounded-2xl">{getSiteText(content, "products_page_quick_add_to_cart", "إضافة للسلة")}</button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

const ProductsPage = () => {
  const { data: content } = useSiteContent("products_page_");
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || "";
  const searchQuery = searchParams.get("search") || "";
  const brandFilter = searchParams.get("brand") || "all";
  const sortBy = searchParams.get("sort") || "new";
  const colorFilter = searchParams.get("color") || "all";
  const sizeFilter = searchParams.get("size") || "all";
  const saleOnly = searchParams.get("sale") === "1";
  const inStockOnly = searchParams.get("stock") === "1";
  const minPriceParam = Number(searchParams.get("min") || 0);
  const maxPriceParam = Number(searchParams.get("max") || 0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [toolbarShrunk, setToolbarShrunk] = useState(false);
  const [page, setPage] = useState(1);
  const [quickViewProd, setQuickViewProd] = useState<Product | null>(null);
  const PAGE_SIZE = 12;
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => setPage(1), [categorySlug, searchQuery, brandFilter, colorFilter, sizeFilter, sortBy, saleOnly, inStockOnly, minPriceParam, maxPriceParam]);

  useEffect(() => {
    const onScroll = () => {
      try { setToolbarShrunk(window.scrollY > 72); } catch (e) { /* ignore */ }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const calc = () => setIsMobileViewport(window.innerWidth < 768);
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error; return data as unknown as Category[];
    },
  });

  const currentCategory = categories.find((c) => c.slug === categorySlug) || null;
  const subCategories = useMemo(() => categories.filter((c) => currentCategory && c.parent_id === currentCategory.id), [categories, currentCategory]);
  const isParent = subCategories.length > 0;

  const leafSlugs = useMemo(() => {
    if (!currentCategory) return null; if (isParent) return subCategories.map((c) => c.slug); return [currentCategory.slug];
  }, [currentCategory, isParent, subCategories]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-list", leafSlugs, searchQuery],
    queryFn: async () => {
      let q = supabase.from("products").select("*").eq("is_active", true);
      if (leafSlugs && leafSlugs.length) q = q.in("category", leafSlugs);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
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
        variants: p.variants || undefined,
        ...(p.color_variants ? { color_variants: p.color_variants } : {}),
      })) as Product[];
    },
  });

  const brandsAvailable = useMemo(() => {
    const set = new Set<string>(); products.forEach((p) => p.brand && set.add(p.brand.trim())); return Array.from(set);
  }, [products]);

  const getProductColors = (p: Product): string[] => {
    const fromVariants = (p.variants || []).map((v: any) => (v.colorName || "").trim()).filter(Boolean);
    const colorVariants = (p as any).color_variants;
    const fromColorVariants = Array.isArray(colorVariants)
      ? colorVariants.map((c: any) => {
          if (typeof c === "string") return c.trim();
          return (c?.colorName || c?.name || c?.label || "").trim();
        }).filter(Boolean)
      : [];
    return Array.from(new Set([...fromVariants, ...fromColorVariants]));
  };

  const colorsAvailable = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => getProductColors(p).forEach((c) => set.add(c)));
    return Array.from(set);
  }, [products]);

  const getProductSizes = (p: Product): string[] => {
    const sizes = (p.variants || []).flatMap((v: any) => (v.sizes || []).map((s: any) => (s?.size || "").trim()));
    return Array.from(new Set(sizes.filter(Boolean)));
  };

  const sizesAvailable = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => getProductSizes(p).forEach((s) => set.add(s)));
    return Array.from(set);
  }, [products]);

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 1000 };
    const prices = products.map((p) => (p.discount ? p.price * (1 - p.discount / 100) : p.price));
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const effectiveMin = minPriceParam || priceBounds.min;
  const effectiveMax = maxPriceParam || priceBounds.max;
  const [priceRange, setPriceRange] = useState<[number, number]>([effectiveMin, effectiveMax]);

  useEffect(() => {
    setPriceRange([effectiveMin, effectiveMax]);
  }, [effectiveMin, effectiveMax]);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let arr = products.filter((p) => {
      const okSearch = !q || p.nameAr.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.descriptionAr.toLowerCase().includes(q);
      const okBrand = brandFilter === "all" || p.brand?.trim() === brandFilter;
      const pColors = getProductColors(p);
      const okColor = colorFilter === "all" || pColors.some((c) => c.toLowerCase() === colorFilter.toLowerCase());
      const pSizes = getProductSizes(p);
      const okSize = sizeFilter === "all" || pSizes.includes(sizeFilter);
      const finalPrice = p.discount ? p.price * (1 - p.discount / 100) : p.price;
      const okPrice = finalPrice >= effectiveMin && finalPrice <= effectiveMax;
      const okSale = !saleOnly || !!p.discount;
      const okStock = !inStockOnly || p.inStock;
      return okSearch && okBrand && okColor && okSize && okPrice && okSale && okStock;
    });
    if (sortBy === "price-asc") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") arr = [...arr].sort((a, b) => b.price - a.price);
    if (sortBy === "best") arr = [...arr].sort((a, b) => Number(!!b.isBestSeller) - Number(!!a.isBestSeller));
    if (sortBy === "featured") arr = [...arr].sort((a, b) => Number(!!b.isFeatured) - Number(!!a.isFeatured));
    return arr;
  }, [products, searchQuery, brandFilter, colorFilter, sizeFilter, sortBy, saleOnly, inStockOnly, effectiveMin, effectiveMax]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (v === null || v === "" || v === "all") next.delete(k); else next.set(k, v);
    setSearchParams(next);
  };

  const activeFilterCount =
    (categorySlug ? 1 : 0) +
    (brandFilter !== "all" ? 1 : 0) +
    (colorFilter !== "all" ? 1 : 0) +
    (sizeFilter !== "all" ? 1 : 0) +
    (saleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minPriceParam || maxPriceParam ? 1 : 0);

  const paginatedProducts = visibleProducts.slice(0, page * PAGE_SIZE);
  const hasMore = paginatedProducts.length < visibleProducts.length;

  const clearAllFilters = () => {
    const next = new URLSearchParams();
    if (categorySlug) next.set("category", categorySlug);
    setSearchParams(next);
  };

  const applyPriceRange = (range: [number, number]) => {
    const [minV, maxV] = range;
    const next = new URLSearchParams(searchParams);
    const roundedMin = Math.round(minV);
    const roundedMax = Math.round(maxV);

    if (roundedMin <= priceBounds.min) next.delete("min");
    else next.set("min", String(roundedMin));

    if (roundedMax >= priceBounds.max) next.delete("max");
    else next.set("max", String(roundedMax));

    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pt-20 pb-28 md:pb-20">
        <section className="container mx-auto px-6 pt-8">
          <div className="grid md:grid-cols-[1.15fr_0.85fr] rounded-3xl overflow-hidden bg-card border border-border">
            <div className="p-3 md:p-10 lg:p-12">
              <h1 className="font-heading text-3xl md:text-5xl mt-3 text-foreground leading-tight">{currentCategory ? currentCategory.name_ar : getSiteText(content, "products_page_title", "مجموعة الموسم")}</h1>
              <p className="text-sm md:text-base text-muted-foreground mt-4 max-w-xl">{getSiteText(content, "products_page_subtitle", "تصميم متناسق مع بقية صفحات الموقع يركّز على وضوح العرض وسهولة الوصول للفلاتر.")}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => setFiltersOpen(true)} className="h-10 px-5 rounded-lg bg-foreground text-background text-sm hover:opacity-90 transition-colors">{getSiteText(content, "products_page_filter_cta", "ابدأ الفلترة")}</button>
                <button onClick={clearAllFilters} className="h-10 px-5 rounded-lg border border-border text-foreground bg-background hover:bg-muted text-sm transition-colors">{getSiteText(content, "products_page_reset_cta", "تصفير الاختيارات")}</button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{getSiteText(content, "products_page_stat_products", "المنتجات")}</p>
                  <p className="text-lg font-semibold text-foreground">{visibleProducts.length}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{getSiteText(content, "products_page_stat_filters", "الفلاتر")}</p>
                  <p className="text-lg font-semibold text-foreground">{activeFilterCount}</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="text-[10px] text-muted-foreground">{getSiteText(content, "products_page_stat_page", "الصفحة")}</p>
                  <p className="text-lg font-semibold text-foreground">{page}</p>
                </div>
              </div>
            </div>
            <div className="relative min-h-[260px] md:min-h-full">
              <img
                src={(currentCategory && currentCategory.image_url) || FALLBACK_IMG[categorySlug] || FALLBACK_IMG.women}
                alt={currentCategory ? currentCategory.name_ar : getSiteText(content, "products_page_hero_alt", "عرض خاص")}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1d1f27]/45 via-transparent to-transparent" />
            </div>
          </div>
        </section>

       

        <section id="products-grid" className="container mx-auto px-6 py-8">
          <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {brandFilter !== "all" && <button onClick={() => setParam("brand", null)} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{brandFilter} <X className="inline w-3 h-3" /></button>}
                {colorFilter !== "all" && <button onClick={() => setParam("color", null)} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{colorFilter} <X className="inline w-3 h-3" /></button>}
                {sizeFilter !== "all" && <button onClick={() => setParam("size", null)} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{sizeFilter} <X className="inline w-3 h-3" /></button>}
                {saleOnly && <button onClick={() => setParam("sale", null)} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{getSiteText(content, "products_page_chip_sale", "عروض")} <X className="inline w-3 h-3" /></button>}
                {inStockOnly && <button onClick={() => setParam("stock", null)} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{getSiteText(content, "products_page_chip_stock", "متوفر")} <X className="inline w-3 h-3" /></button>}
                {(minPriceParam || maxPriceParam) && <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete("min"); next.delete("max"); setSearchParams(next); }} className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground border border-border">{effectiveMin} - {effectiveMax} <X className="inline w-3 h-3" /></button>}
                <div className="mr-auto text-sm text-muted-foreground">{visibleProducts.length} {getSiteText(content, "products_page_count_label", "منتج")}</div>
              </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {Array.from({length:8}).map((_,i)=> (
                <motion.div key={i} custom={i} initial="hidden" animate="show" variants={shimmerVariants} className="rounded-2xl bg-gradient-to-r from-muted/50 via-muted to-muted/50 h-64" />
              ))}
            </div>
          ) : visibleProducts.length===0 ? (
            <div className="py-24 flex flex-col items-center gap-6">
              <div className="w-56 h-44 rounded-3xl bg-muted/50 flex items-center justify-center">
                <Heart className="w-12 h-12 text-muted-foreground/40" />
              </div>
              <h3 className="font-heading text-2xl">{getSiteText(content, "products_page_empty_title", "لم يتم العثور على منتجات")}</h3>
              <p className="text-muted-foreground">{getSiteText(content, "products_page_empty_desc", "غير الفلاتر أو استكشف مجموعاتنا المختارة.")}</p>
              <div className="flex gap-3">
                <button onClick={() => setSearchParams(new URLSearchParams())} className="px-4 py-2 border rounded-2xl">{getSiteText(content, "products_page_empty_reset", "إعادة تعيين")}</button>
                <Link to="/products" className="px-4 py-2 bg-foreground text-background rounded-2xl">{getSiteText(content, "products_page_empty_cta", "استكشف الأقسام")}</Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {paginatedProducts.map((p, i) => (
                <motion.div key={p.id} custom={i} initial="hidden" animate="show" variants={shimmerVariants}>
                  <ProductCard product={p} onQuickView={(prod) => setQuickViewProd(prod)} />
                </motion.div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex items-center justify-center mt-10">
              <button onClick={() => setPage((p) => p + 1)} className="px-8 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-colors">{getSiteText(content, "products_page_load_more", "عرض المزيد")}</button>
            </div>
          )}
          </div>
        </section>

        {/* Filters Drawer (mobile) */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex">
              <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
              <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 32 }} className="w-[94vw] max-w-md bg-background h-full overflow-y-auto p-6 shadow-2xl border-l border-border">
                  <div className="relative mb-6 pr-12 pb-4 border-b border-border">
                    <button onClick={() => setFiltersOpen(false)} className="absolute right-0 top-0 h-9 w-9 rounded-full bg-card inline-flex items-center justify-center text-foreground hover:bg-muted transition-colors"><X className="w-5 h-5" /></button>
                    <div>
                      <h3 className="font-heading text-xl text-foreground tracking-wide">{getSiteText(content, "products_page_drawer_title", "فلترة المنتجات")}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{getSiteText(content, "products_page_drawer_subtitle", "اختيار أدق للوصول للقطعة المناسبة")}</p>
                    </div>
                  </div>
                  <div className="space-y-6 pb-24">
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_category", "الفئة")}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setParam('category', null)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!categorySlug ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>الكل</button>
                        {categories.filter((c) => !c.parent_id).map((c) => (
                          <button key={c.id} onClick={() => setParam('category', c.slug)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${categorySlug === c.slug ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>{c.name_ar}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_brand", "الماركة")}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setParam('brand', null)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${brandFilter === 'all' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>جميع الماركات</button>
                        {brandsAvailable.map((b) => (
                          <button key={b} onClick={() => setParam('brand', b)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${brandFilter === b ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>{b}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_color", "اللون")}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setParam('color', null)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${colorFilter === 'all' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>كل الألوان</button>
                        {colorsAvailable.map((c) => (
                          <button key={c} onClick={() => setParam('color', c)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${colorFilter === c ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_size", "المقاس")}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setParam('size', null)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${sizeFilter === 'all' ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>كل المقاسات</button>
                        {sizesAvailable.map((s) => (
                          <button key={s} onClick={() => setParam('size', s)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${sizeFilter === s ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_price", "السعر")}</p>
                      <div className="rounded-xl bg-card border border-border px-4 py-4">
                        <Slider
                          value={[priceRange[0], priceRange[1]]}
                          min={priceBounds.min}
                          max={priceBounds.max}
                          step={1}
                          onValueChange={(vals) => {
                            if (vals.length === 2) {
                              setPriceRange([vals[0], vals[1]]);
                            }
                          }}
                          onValueCommit={(vals) => {
                            if (vals.length === 2) {
                              applyPriceRange([vals[0], vals[1]]);
                            }
                          }}
                        />
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                          <span>من {Math.round(priceRange[0])}</span>
                          <span>إلى {Math.round(priceRange[1])}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-3">{getSiteText(content, "products_page_filter_state", "الحالة")}</p>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => setParam('sale', saleOnly ? null : '1')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${saleOnly ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>عروض</button>
                        <button onClick={() => setParam('stock', inStockOnly ? null : '1')} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${inStockOnly ? 'bg-foreground text-background' : 'bg-card text-muted-foreground border border-border hover:bg-muted'}`}>متوفر</button>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 left-0 right-0 py-4 bg-background/95 backdrop-blur-sm border-t border-border">
                    <div className="flex gap-3">
                      <button onClick={() => clearAllFilters()} className="flex-1 py-3 rounded-full bg-card border border-border text-muted-foreground hover:bg-muted transition-colors">{getSiteText(content, "products_page_drawer_reset", "إعادة تعيين")}</button>
                      <button onClick={() => setFiltersOpen(false)} className="flex-1 py-3 rounded-full bg-foreground text-background hover:opacity-90 transition-colors">{getSiteText(content, "products_page_drawer_apply", "تطبيق")}</button>
                    </div>
                  </div>
                </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick View Drawer */}
        <AnimatePresence>{quickViewProd && <QuickView product={quickViewProd} isMobile={isMobileViewport} onClose={() => setQuickViewProd(null)} />}</AnimatePresence>

      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;
