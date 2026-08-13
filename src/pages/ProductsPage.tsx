import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType, useSearchParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Heart, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { Slider } from "@/components/ui/slider";

import { Product, VariantSize, useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";
import { clearCatalogScroll, restoreCatalogScroll } from "@/lib/catalogScroll";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "auto";
}

type ColorVariant = {
  id?: string;
  name?: string;
  colorName?: string;
  hex?: string;
  hex2?: string;
  images?: string[];
  price?: number;
  discount?: number;
  sizes?: VariantSize[];
};

type ColorSwatch = {
  name: string;
  hex: string;
  hex2?: string;
};

type CatalogProduct = Product & {
  color_variants?: ColorVariant[] | string;
};

type CatalogMetaProduct = {
  id: string;
  brand: string | null;
  price: number;
  discount: number | null;
  in_stock: boolean | null;
  category_id: string | null;
  color_variants: ColorVariant[] | string | null;
  created_at: string | null;
  is_best_seller: boolean | null;
  is_featured: boolean | null;
};

interface Category {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
}

const PAGE_SIZE = 12;
const META_BATCH_SIZE = 500;

const NAMED_COLOR_HEX: Record<string, string> = {
  أسود: "#111111",
  black: "#111111",
  أبيض: "#FFFFFF",
  white: "#FFFFFF",
  أحمر: "#D84343",
  red: "#D84343",
  أزرق: "#3765B0",
  blue: "#3765B0",
  أخضر: "#4D8A64",
  green: "#4D8A64",
  أصفر: "#D7AA32",
  yellow: "#D7AA32",
  وردي: "#DC7C87",
  pink: "#DC7C87",
  بني: "#76533E",
  brown: "#76533E",
  رمادي: "#77736F",
  gray: "#77736F",
  grey: "#77736F",
  بيج: "#DECBB0",
  beige: "#DECBB0",
  ذهبي: "#C6A15C",
  gold: "#C6A15C",
  فضي: "#BFC0C2",
  silver: "#BFC0C2",
  بنفسجي: "#8567A5",
  purple: "#8567A5",
  برتقالي: "#DD8750",
  orange: "#DD8750",
  كحلي: "#273754",
  navy: "#273754",
};

const shimmerVariants = {
  hidden: { opacity: 0, y: 7 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.018, duration: 0.32 } }),
};

const parseVariants = (value: ColorVariant[] | string | null | undefined): ColorVariant[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const getVariantColorName = (variant: ColorVariant) => {
  return (variant.colorName || variant.name || "").trim();
};

const getProductColors = (product: { color_variants?: ColorVariant[] | string | null }) => {
  return Array.from(new Set(parseVariants(product.color_variants).map(getVariantColorName).filter(Boolean)));
};

const getProductSizes = (product: { color_variants?: ColorVariant[] | string | null }) => {
  return Array.from(new Set(parseVariants(product.color_variants).flatMap((variant) => (variant.sizes || []).map((size) => size?.size?.trim() || "")).filter(Boolean)));
};

const getFinalPrice = (product: { price: number; discount?: number | null }) => {
  return product.discount ? product.price * (1 - product.discount / 100) : product.price;
};

const QuickView = ({ product, onClose, isMobile }: { product: CatalogProduct | null; onClose: () => void; isMobile: boolean }) => {
  const { data: content } = useSiteContent("products_page_");
  const { addToCart } = useStore();

  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  useEffect(() => {
    if (!product) return;

    const variants = parseVariants(product.color_variants);

    setQty(1);
    setActiveImage(0);
    setSelectedSize(null);
    setActiveVariantIndex(variants.length ? 0 : null);
  }, [product]);

  if (!product) return null;

  const variants = parseVariants(product.color_variants);
  const currentVariantIndex = activeVariantIndex === null && variants.length ? 0 : activeVariantIndex;
  const activeVariant = currentVariantIndex !== null ? variants[currentVariantIndex] : undefined;

  const images = activeVariant?.images?.length ? activeVariant.images : product.images || [];

  const priceSource = activeVariant?.price ?? product.price;
  const discountSource = activeVariant?.discount ?? product.discount;
  const displayPrice = discountSource ? priceSource * (1 - discountSource / 100) : priceSource;

  const fallbackSizes: VariantSize[] = (product.sizes || []).map((size) => ({ size, stock: product.inStock ? 999 : 0 }));
  const sizesForActiveVariant = activeVariant?.sizes || fallbackSizes;

  const stockForSize = (size?: string) => {
    if (!size) return product.inStock ? 999 : 0;
    return sizesForActiveVariant.find((item) => item.size === size)?.stock || 0;
  };

  const handleAdd = () => {
    addToCart(product, qty, selectedSize ?? undefined, undefined, activeVariant?.id, activeVariant?.colorName || activeVariant?.name);
    onClose();
  };

  return (
    <motion.aside initial={isMobile ? { y: "100%" } : { x: "100%" }} animate={isMobile ? { y: 0 } : { x: 0 }} exit={isMobile ? { y: "100%" } : { x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className={`fixed inset-y-0 right-0 z-[90] w-full overflow-y-auto bg-[#FFFCFA] shadow-[0_0_50px_rgba(65,45,38,.16)] ${isMobile ? "p-4 pb-24" : "max-w-2xl border-l border-[#ECE3DF] p-6"}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-[9px] tracking-[0.22em] text-[#C5797D]">FLAMINGO</p>
          <h3 className="truncate text-xl font-semibold text-[#27201D]">{product.nameAr}</h3>
          <p className="mt-1 text-[11px] text-[#928680]">{product.brand}</p>
        </div>

        <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EAE0DC] bg-white text-[#554945]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-[#F4F0ED]">
            {images[activeImage] ? <img src={images[activeImage]} alt={product.nameAr} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#9A8E88]">لا توجد صورة</div>}
          </div>

          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {images.map((image, index) => (
              <button key={`${image}-${index}`} onClick={() => setActiveImage(index)} className={`h-[66px] w-[54px] shrink-0 overflow-hidden rounded-xl border transition-all ${activeImage === index ? "border-[#C86D73] ring-1 ring-[#C86D73]/20" : "border-[#E7DDD9]"}`}>
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-end justify-between border-b border-[#EEE6E2] pb-4">
            <span className="text-2xl font-semibold text-[#29211E]">{Math.round(displayPrice)}</span>
            {!!discountSource && <span className="rounded-full bg-[#F9E8E6] px-2.5 py-1 text-[10px] font-medium text-[#BD666C]">خصم {discountSource}%</span>}
          </div>

          <p className="text-xs leading-6 text-[#786D67]">{product.descriptionAr || product.description}</p>

          {variants.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-medium text-[#4C413D]">اللون</p>

              <div className="flex flex-wrap gap-3">
                {variants.map((variant, index) => {
                  const name = getVariantColorName(variant);
                  const active = currentVariantIndex === index;
                  const hex = variant.hex || NAMED_COLOR_HEX[name] || NAMED_COLOR_HEX[name.toLowerCase()] || "#E6E2DF";

                  return <button key={variant.id || index} onClick={() => { setActiveVariantIndex(index); setActiveImage(0); setSelectedSize(null); setQty(1); }} title={name} className={`h-9 w-9 rounded-full border-2 transition-all ${active ? "border-[#C86D73] ring-2 ring-[#C86D73]/15" : "border-[#DED4D0]"}`} style={{ background: variant.hex2 ? `linear-gradient(135deg, ${hex} 50%, ${variant.hex2} 50%)` : hex }} />;
                })}
              </div>
            </div>
          )}

          {sizesForActiveVariant.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-medium text-[#4C413D]">{getSiteText(content, "products_page_quick_sizes", "المقاسات")}</p>

              <div className="flex flex-wrap gap-2">
                {sizesForActiveVariant.map((size) => {
                  const disabled = size.stock <= 0;

                  return <button key={size.size} onClick={() => setSelectedSize(size.size)} disabled={disabled} className={`min-w-[44px] rounded-xl border px-3 py-2 text-[11px] transition-all ${selectedSize === size.size ? "border-[#D4777D] bg-[#D4777D] text-white" : "border-[#E4DAD6] bg-white text-[#594E49]"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`}>{size.size}</button>;
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-[#897D77]">الحالة: <span className="font-medium text-[#3B312D]">{selectedSize ? stockForSize(selectedSize) > 5 ? "متاح" : stockForSize(selectedSize) > 0 ? "كمية قليلة" : "غير متوفر" : product.inStock ? "متاح" : "غير متوفر"}</span></p>

          <div className="flex gap-2.5 pt-1">
            <div className="flex h-[46px] items-center rounded-xl border border-[#E5DBD7] bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-full w-10 text-lg">−</button>
              <span className="w-7 text-center text-xs">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="h-full w-10 text-lg">+</button>
            </div>

            <button onClick={handleAdd} className="flex-1 rounded-xl bg-[#D4777D] text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(212,119,125,.20)]">إضافة للسلة</button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

const ProductsPage = () => {
  const { data: content } = useSiteContent("products_page_");

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navType = useNavigationType();

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
  const page = Math.max(1, Number(searchParams.get("page") || 1));

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [quickViewProd, setQuickViewProd] = useState<CatalogProduct | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const previousCatalogSearch = useRef(location.search);
  const pendingLoadMoreScroll = useRef<number | null>(null);
  const previousProductsLength = useRef(0);
  const restoredCatalogKey = useRef<string | null>(null);

  const catalogScrollKey = useMemo(() => {
    const params = new URLSearchParams(location.search);

    params.delete("page");

    const query = params.toString();

    return `${location.pathname}${query ? `?${query}` : ""}`;
  }, [location.pathname, location.search]);

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 768);

    update();

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const previous = new URLSearchParams(previousCatalogSearch.current);
    const current = new URLSearchParams(location.search);

    previousCatalogSearch.current = location.search;

    const keys = [...new Set([...previous.keys(), ...current.keys()])];
    const onlyPageChanged = keys.every((key) => key === "page" || previous.get(key) === current.get(key));

    if (navType === "POP" || onlyPageChanged) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, navType]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as Category[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const currentCategory = useMemo(() => categories.find((category) => category.slug === categorySlug) || null, [categories, categorySlug]);

  const subCategories = useMemo(() => {
    if (!currentCategory) return [];
    return categories.filter((category) => category.parent_id === currentCategory.id);
  }, [categories, currentCategory]);

  const leafCategoryIds = useMemo(() => {
    if (!currentCategory) return null;

    if (subCategories.length) return [currentCategory.id, ...subCategories.map((category) => category.id)];

    return [currentCategory.id];
  }, [currentCategory, subCategories]);

  /*
   * ============================================================
   * CATALOG METADATA
   * يجلب معلومات خفيفة لكل المنتجات.
   *
   * هذا هو السبب أن:
   * 1. عدد المنتجات كامل.
   * 2. كل الألوان تظهر.
   * 3. كل المقاسات تظهر.
   * 4. اللون والمقاس يعملان حتى على منتج لم يتم تحميل Card له.
   * ============================================================
   */
  const { data: catalogMetadata = [], isLoading: metadataLoading } = useQuery({
    queryKey: ["catalog-filter-metadata", leafCategoryIds?.join(",") || "all", searchQuery, brandFilter, saleOnly, inStockOnly],
    queryFn: async () => {
      const rows: CatalogMetaProduct[] = [];

      let from = 0;

      while (true) {
        let query = supabase.from("products").select("id,brand,price,discount,in_stock,category_id,color_variants,created_at,is_best_seller,is_featured").eq("is_active", true);

        if (leafCategoryIds?.length) query = query.in("category_id", leafCategoryIds);

        if (searchQuery.trim()) {
          const term = searchQuery.trim();
          query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
        }

        if (brandFilter !== "all") query = query.eq("brand", brandFilter);
        if (saleOnly) query = query.gt("discount", 0);
        if (inStockOnly) query = query.eq("in_stock", true);

        const { data, error } = await query.order("id", { ascending: true }).range(from, from + META_BATCH_SIZE - 1);

        if (error) throw error;

        const batch = (data || []) as CatalogMetaProduct[];

        rows.push(...batch);

        if (batch.length < META_BATCH_SIZE) break;

        from += META_BATCH_SIZE;
      }

      return rows;
    },
    staleTime: 5 * 60 * 1000,
  });

  /*
   * جميع الألوان من كل المنتجات وليس فقط المنتجات المحملة.
   */
  const colorsAvailable = useMemo<ColorSwatch[]>(() => {
    const map = new Map<string, ColorSwatch>();

    catalogMetadata.forEach((product) => {
      parseVariants(product.color_variants).forEach((variant) => {
        const name = getVariantColorName(variant);

        if (!name) return;

        const key = name.toLowerCase();

        if (map.has(key)) return;

        map.set(key, {
          name,
          hex: variant.hex || NAMED_COLOR_HEX[name] || NAMED_COLOR_HEX[key] || "#E5E2DF",
          hex2: variant.hex2 || undefined,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [catalogMetadata]);

  const sizesAvailable = useMemo(() => {
    const sizes = new Set<string>();

    catalogMetadata.forEach((product) => {
      getProductSizes(product).forEach((size) => sizes.add(size));
    });

    return Array.from(sizes);
  }, [catalogMetadata]);

  const priceBounds = useMemo(() => {
    if (!catalogMetadata.length) return { min: 0, max: 1000 };

    const prices = catalogMetadata.map(getFinalPrice);

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [catalogMetadata]);

  const effectiveMin = minPriceParam || priceBounds.min;
  const effectiveMax = maxPriceParam || priceBounds.max;

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);

  useEffect(() => {
    setPriceRange([effectiveMin, effectiveMax]);
  }, [effectiveMin, effectiveMax]);

  /*
   * ============================================================
   * النتائج الحقيقية للفلاتر.
   *
   * نحدد IDs لجميع المنتجات المطابقة أولاً.
   * ثم نحمل Cards للعدد المطلوب فقط.
   * ============================================================
   */
  const matchingMetadata = useMemo(() => {
    let result = catalogMetadata.filter((product) => {
      const finalPrice = getFinalPrice(product);

      const colorMatch = colorFilter === "all" || getProductColors(product).some((color) => color.toLowerCase() === colorFilter.toLowerCase());
      const sizeMatch = sizeFilter === "all" || getProductSizes(product).includes(sizeFilter);
      const priceMatch = finalPrice >= effectiveMin && finalPrice <= effectiveMax;

      return colorMatch && sizeMatch && priceMatch;
    });

    if (sortBy === "price-asc") {
      result = [...result].sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
    } else if (sortBy === "price-desc") {
      result = [...result].sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
    } else if (sortBy === "best") {
      result = [...result].sort((a, b) => {
        const bestDiff = Number(!!b.is_best_seller) - Number(!!a.is_best_seller);

        if (bestDiff !== 0) return bestDiff;

        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    } else if (sortBy === "featured") {
      result = [...result].sort((a, b) => {
        const featuredDiff = Number(!!b.is_featured) - Number(!!a.is_featured);

        if (featuredDiff !== 0) return featuredDiff;

        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
    } else {
      result = [...result].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }

    return result;
  }, [catalogMetadata, colorFilter, sizeFilter, effectiveMin, effectiveMax, sortBy]);

  const totalProductsCount = matchingMetadata.length;

  /*
   * كل صفحة عبارة عن IDs معروفة مسبقاً.
   * بهذا لا نضيع صفحات على منتجات لا تطابق اللون أو المقاس.
   */
  const pageIdGroups = useMemo(() => {
    return Array.from({ length: page }, (_, index) => {
      const from = index * PAGE_SIZE;
      const to = from + PAGE_SIZE;

      return matchingMetadata.slice(from, to).map((product) => product.id);
    }).filter((ids) => ids.length > 0);
  }, [matchingMetadata, page]);

  const productQueries = useQueries({
    queries: pageIdGroups.map((ids, index) => ({
      queryKey: ["catalog-products-page", ids.join(","), index + 1],
      queryFn: async () => {
        const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", ids);

        if (error) throw error;

        const mapped = (data || []).map(mapProductCard) as CatalogProduct[];
        const map = new Map(mapped.map((product) => [product.id, product]));

        return ids.map((id) => map.get(id)).filter((product): product is CatalogProduct => Boolean(product));
      },
      staleTime: 60 * 1000,
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

  const isLoadingProducts = metadataLoading || productQueries.some((query) => query.isLoading || query.isFetching);

  const hasMore = products.length < totalProductsCount;

  /*
   * ============================================================
   * SCROLL RESTORATION
   * ============================================================
   */
  useEffect(() => {
    if (isLoadingProducts || !products.length) return;
    if (pendingLoadMoreScroll.current !== null) return;
    if (restoredCatalogKey.current === catalogScrollKey) return;

    restoreCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = catalogScrollKey;
  }, [isLoadingProducts, products.length, catalogScrollKey]);

  /*
   * يحافظ على نفس المكان حرفياً بعد عرض المزيد.
   */
  useLayoutEffect(() => {
    const oldLength = previousProductsLength.current;
    const newLength = products.length;

    if (pendingLoadMoreScroll.current !== null && !isLoadingProducts && newLength > oldLength) {
      const savedScroll = pendingLoadMoreScroll.current;

      pendingLoadMoreScroll.current = null;

      window.scrollTo({
        top: savedScroll,
        left: 0,
        behavior: "auto",
      });

      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedScroll,
          left: 0,
          behavior: "auto",
        });
      });
    }

    previousProductsLength.current = newLength;
  }, [products.length, isLoadingProducts]);

  const { data: brandsAvailable = [] } = useQuery({
    queryKey: ["product-filter-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("name").eq("is_active", true).order("name");

      if (error) throw error;

      return (data || []).map((brand) => brand.name).filter((name): name is string => Boolean(name));
    },
    staleTime: 5 * 60 * 1000,
  });

  const setParam = (key: string, value: string | null) => {
    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    const next = new URLSearchParams(searchParams);

    if (value === null || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    next.delete("page");

    setSearchParams(next);
  };

  const handleLoadMore = () => {
    if (isLoadingProducts || !hasMore) return;

    pendingLoadMoreScroll.current = window.scrollY;

    const next = new URLSearchParams(searchParams);

    next.set("page", String(page + 1));

    /*
     * replace مهم جداً:
     * لا ننشئ History entry جديدة عند كل ضغطة عرض المزيد.
     */
    setSearchParams(next, { replace: true });
  };

  const clearAllFilters = () => {
    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    const next = new URLSearchParams();

    if (categorySlug) next.set("category", categorySlug);

    setSearchParams(next);
  };

  const applyPriceRange = (range: [number, number]) => {
    const next = new URLSearchParams(searchParams);

    const min = Math.round(range[0]);
    const max = Math.round(range[1]);

    if (min <= priceBounds.min) next.delete("min");
    else next.set("min", String(min));

    if (max >= priceBounds.max) next.delete("max");
    else next.set("max", String(max));

    next.delete("page");

    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    setSearchParams(next);
  };

  const activeFilterCount = (categorySlug ? 1 : 0) + (brandFilter !== "all" ? 1 : 0) + (colorFilter !== "all" ? 1 : 0) + (sizeFilter !== "all" ? 1 : 0) + (saleOnly ? 1 : 0) + (inStockOnly ? 1 : 0) + (minPriceParam || maxPriceParam ? 1 : 0);

  const currentSortLabel = sortBy === "best" ? "الأكثر مبيعًا" : sortBy === "featured" ? "مختارة" : sortBy === "price-asc" ? "الأقل سعرًا" : sortBy === "price-desc" ? "الأعلى سعرًا" : "الأحدث";

  return (
  <div className="min-h-screen bg-[#FFF9F7] text-[#35282A]" dir="rtl">
    <Navbar />
    <CartDrawer />

    <main className="pb-36 md:pt-24 md:pb-20">
      {/* =========================================================
          FLAMINGO SIGNATURE HEADER
      ========================================================= */}
      <section className="relative overflow-hidden border-b border-[#EEDFDA] bg-[#FFF9F7]">
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-[#F4D8D7]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 top-10 h-40 w-40 rounded-full bg-[#FCE8E3]/70 blur-3xl" />

        <div className="relative mx-auto w-full max-w-[1600px] px-4 pt-7 pb-6 md:px-6 md:pt-12 md:pb-10">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="h-[2px] w-5 rounded-full bg-[#C96F79]" />
                <span className="font-serif text-[7px] font-medium tracking-[0.3em] text-[#A7535D] md:text-[8px]">FLAMINGO PARK</span>
              </div>

              <h1 className="text-[30px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#3A292B] md:text-[48px]">{currentCategory ? currentCategory.name_ar : getSiteText(content, "products_page_title", "جميع المنتجات")}</h1>

              <p className="mt-3 max-w-[300px] text-[9px] leading-[1.9] text-[#9A7E7E] md:max-w-md md:text-[11px]">{currentCategory ? "اكتشف اختيارات فلامنجو المميزة من هذه المجموعة." : "مختارات أنيقة بعناية لتجربة تسوق تحمل توقيع فلامنجو."}</p>
            </div>

            <div className="hidden md:block">
              <div className="flex items-end gap-2">
                <span className="text-[32px] font-light leading-none tracking-[-0.055em] text-[#4A3436]">{metadataLoading ? "—" : totalProductsCount}</span>
                <span className="pb-[3px] text-[7px] tracking-[0.14em] text-[#B38F8E]">PIECES</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            FLAMINGO CATEGORY RAIL
        ========================================================= */}
        <div className="relative border-t border-[#F1E5E1] bg-[#FFFDFC]/90">
          <div className="mx-auto w-full max-w-[1600px] px-3 md:px-6">
            <div className="flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-2.5">
              <button onClick={() => setParam("category", null)} className={`shrink-0 rounded-full px-4 py-[8px] text-[9px] font-medium transition-all md:px-5 md:text-[10px] ${!categorySlug ? "bg-[#C96F79] text-white shadow-[0_6px_18px_rgba(201,111,121,.23)]" : "border border-[#EBDAD5] bg-white text-[#826B6B] hover:border-[#D9B6B2] hover:text-[#A7535D]"}`}>الكل</button>

              {categories.filter((category) => !category.parent_id).map((category) => (
                <button key={category.id} onClick={() => setParam("category", category.slug)} className={`shrink-0 rounded-full px-4 py-[8px] text-[9px] font-medium transition-all md:px-5 md:text-[10px] ${categorySlug === category.slug ? "bg-[#C96F79] text-white shadow-[0_6px_18px_rgba(201,111,121,.23)]" : "border border-[#EBDAD5] bg-white text-[#826B6B] hover:border-[#D9B6B2] hover:text-[#A7535D]"}`}>{category.name_ar}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          DESKTOP FLAMINGO TOOLBAR
      ========================================================= */}
      <section className="sticky top-[76px] z-30 hidden border-b border-[#EEDFDA] bg-[#FFF9F7]/94 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-[58px] w-full max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setFiltersOpen(true)} className="flex h-10 items-center gap-2 rounded-full border border-[#E7D4CF] bg-white px-4 text-[10px] font-medium text-[#5C4143] shadow-[0_4px_14px_rgba(96,62,64,.04)] transition-all hover:border-[#D8AAA7] hover:text-[#A7535D]">
              <SlidersHorizontal className="h-[14px] w-[14px] stroke-[1.6]" />
              فلترة
              {activeFilterCount > 0 && <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#C96F79] px-1 text-[7px] font-semibold text-white">{activeFilterCount}</span>}
            </button>

            <button onClick={() => setSortOpen(true)} className="flex h-10 items-center gap-1.5 rounded-full border border-[#E7D4CF] bg-white px-4 text-[10px] font-medium text-[#5C4143] shadow-[0_4px_14px_rgba(96,62,64,.04)] transition-all hover:border-[#D8AAA7] hover:text-[#A7535D]">
              {currentSortLabel}
              <ChevronDown className="h-3 w-3 stroke-[1.5]" />
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-[#F7E9E6] px-3.5 py-2">
            <span className="text-[11px] font-semibold text-[#A7535D]">{metadataLoading ? "—" : totalProductsCount}</span>
            <span className="text-[8px] text-[#9D7E7D]">منتج</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          ACTIVE FILTERS
      ========================================================= */}
      {activeFilterCount > 0 && (
        <section className="border-b border-[#EEDFDA] bg-[#FFF4F1]">
          <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
            {brandFilter !== "all" && <button onClick={() => setParam("brand", null)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">{brandFilter}<X className="h-2.5 w-2.5" /></button>}
            {colorFilter !== "all" && <button onClick={() => setParam("color", null)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">{colorFilter}<X className="h-2.5 w-2.5" /></button>}
            {sizeFilter !== "all" && <button onClick={() => setParam("size", null)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">{sizeFilter}<X className="h-2.5 w-2.5" /></button>}
            {saleOnly && <button onClick={() => setParam("sale", null)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">العروض<X className="h-2.5 w-2.5" /></button>}
            {inStockOnly && <button onClick={() => setParam("stock", null)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">متوفر<X className="h-2.5 w-2.5" /></button>}

            {(minPriceParam > 0 || maxPriceParam > 0) && (
              <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete("min"); next.delete("max"); next.delete("page"); setSearchParams(next); }} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E9D3CE] bg-white px-2.5 py-1.5 text-[8px] font-medium text-[#8B5E61]">
                {effectiveMin} — {effectiveMax}
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            <button onClick={clearAllFilters} className="shrink-0 px-2 text-[8px] font-semibold text-[#A7535D]">مسح الكل</button>
          </div>
        </section>
      )}

      {/* =========================================================
          PRODUCTS
      ========================================================= */}
      <section id="products-grid" className="mx-auto w-full max-w-[1600px] px-[6px] pt-[7px] sm:px-3 sm:pt-3 md:px-6 md:pt-6">
        {isLoadingProducts && products.length === 0 ? (
          <div className="grid grid-cols-2 gap-x-[6px] gap-y-6 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index}>
                <div className="aspect-[4/5] animate-pulse rounded-[14px] bg-[#F2E8E5]" />
                <div className="mt-2.5 h-2 w-[67%] animate-pulse rounded-full bg-[#EFE2DE]" />
                <div className="mt-2 h-2 w-[34%] animate-pulse rounded-full bg-[#EFE2DE]" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-[57vh] flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-[70px] w-[70px] items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-[#E8D3CF]" />
              <span className="absolute inset-[7px] rounded-full bg-[#F8E8E5]" />
              <Heart className="relative h-5 w-5 stroke-[1.2] text-[#B76067]" />
            </div>

            <p className="mt-5 font-serif text-[7px] tracking-[0.27em] text-[#A7535D]">FLAMINGO PARK</p>
            <h3 className="mt-2 text-[19px] font-semibold tracking-[-0.03em] text-[#3B2B2D]">لم نجد نتائج مناسبة</h3>
            <p className="mt-2 max-w-[260px] text-[9px] leading-5 text-[#9E8281]">جرّب تعديل خيارات الفلترة لتكتشف المزيد من القطع.</p>

            <button onClick={clearAllFilters} className="mt-5 rounded-full border border-[#DAB8B4] bg-white px-5 py-2 text-[8px] font-medium text-[#9D565C]">إعادة تعيين</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-[6px] gap-y-6 sm:gap-x-3 sm:gap-y-7 md:grid-cols-3 md:gap-x-5 md:gap-y-9 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product, index) => (
              <motion.div key={product.id} custom={index} initial={isMobileViewport ? false : "hidden"} animate={isMobileViewport ? false : "show"} variants={shimmerVariants} className="min-w-0">
                <ProductCard product={product} onQuickView={(selectedProduct) => setQuickViewProd(selectedProduct)} />
              </motion.div>
            ))}
          </div>
        )}

        {/* =========================================================
            LOAD MORE
        ========================================================= */}
        {hasMore && (
          <div className="mx-auto flex max-w-[430px] flex-col items-center px-5 pb-6 pt-14 md:pt-16">
            <div className="mb-5 w-full">
              <div className="h-[2px] overflow-hidden rounded-full bg-[#F0DEDA]">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#C96F79,#E5A0A3)] transition-all duration-500" style={{ width: `${Math.min(100, (products.length / Math.max(totalProductsCount, 1)) * 100)}%` }} />
              </div>

              <div className="mt-2 flex justify-between text-[7px] text-[#AD8D8B]">
                <span>{products.length}</span>
                <span>{totalProductsCount}</span>
              </div>
            </div>

            <button onClick={handleLoadMore} disabled={isLoadingProducts} className="group flex h-[44px] min-w-[164px] items-center justify-center gap-2 rounded-full border border-[#D8B7B3] bg-white px-6 text-[9px] font-medium text-[#8B565A] shadow-[0_7px_20px_rgba(122,76,79,.06)] transition-all hover:border-[#C96F79] hover:text-[#A7535D] active:scale-[0.985] disabled:opacity-50">
              {isLoadingProducts ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-[#E2CBC7] border-t-[#C96F79]" />
                  جاري التحميل
                </>
              ) : (
                <>
                  عرض المزيد
                  <ChevronDown className="h-3 w-3 stroke-[1.5]" />
                </>
              )}
            </button>

            <span className="mt-2.5 font-serif text-[6px] tracking-[0.14em] text-[#B28F8D]">FLAMINGO COLLECTION</span>
          </div>
        )}
      </section>

      {/* =========================================================
          MOBILE FLAMINGO FLOATING DOCK
      ========================================================= */}
      <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+14px)] left-1/2 z-40 w-[calc(100%-28px)] max-w-[370px] -translate-x-1/2 md:hidden">
        <div className="relative overflow-hidden rounded-[20px] border border-[#E8CFCA]/90 bg-[#FFF8F5]/95 p-[5px] shadow-[0_16px_46px_rgba(105,58,62,.19)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-x-12 -top-10 h-16 rounded-full bg-[#F2CBCD]/35 blur-xl" />

          <div className="relative flex h-[50px] items-center rounded-[15px] bg-white/80">
            <button onClick={() => setFiltersOpen(true)} className="flex h-full flex-1 items-center justify-center gap-2 text-[#5A3D40]">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full ${activeFilterCount > 0 ? "bg-[#F6DEDC] text-[#A7535D]" : "bg-[#F8EFEC] text-[#735B5C]"}`}>
                <SlidersHorizontal className="h-[13px] w-[13px] stroke-[1.6]" />
              </span>

              <span className="text-[9px] font-semibold">فلترة</span>

              {activeFilterCount > 0 && <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#C96F79] px-1 text-[7px] font-semibold text-white">{activeFilterCount}</span>}
            </button>

            <span className="h-6 w-px bg-[#E9D8D4]" />

            <button onClick={() => setSortOpen(true)} className="flex h-full flex-1 items-center justify-center gap-1.5 text-[#5A3D40]">
              <div className="min-w-0 text-center">
                <span className="block text-[6px] leading-none text-[#B09291]">ترتيب</span>
                <span className="mt-1 block max-w-[80px] truncate text-[8px] font-semibold leading-none">{currentSortLabel}</span>
              </div>

              <ChevronDown className="h-3 w-3 stroke-[1.4] text-[#9B7979]" />
            </button>

            <span className="h-6 w-px bg-[#E9D8D4]" />

            <div className="flex h-full min-w-[58px] flex-col items-center justify-center">
              <span className="text-[11px] font-semibold leading-none text-[#A7535D]">{metadataLoading ? "—" : totalProductsCount}</span>
              <span className="mt-1 text-[6px] leading-none text-[#B09391]">منتج</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          SORT SHEET
      ========================================================= */}
      <AnimatePresence>
        {sortOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-[#3A2729]/28 backdrop-blur-[3px] md:items-center" onClick={() => setSortOpen(false)}>
            <motion.div initial={isMobileViewport ? { y: "100%" } : { opacity: 0, y: 10 }} animate={isMobileViewport ? { y: 0 } : { opacity: 1, y: 0 }} exit={isMobileViewport ? { y: "100%" } : { opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 350, damping: 37 }} onClick={(event) => event.stopPropagation()} className="w-full rounded-t-[26px] bg-[#FFF9F7] px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3 shadow-[0_-18px_50px_rgba(75,43,46,.12)] md:max-w-[380px] md:rounded-[20px] md:p-6">
              <div className="mx-auto mb-5 h-[3px] w-8 rounded-full bg-[#E2C7C4] md:hidden" />

              <div className="flex items-start justify-between">
                <div>
                  <p className="font-serif text-[7px] tracking-[0.27em] text-[#A7535D]">FLAMINGO</p>
                  <h3 className="mt-1.5 text-[22px] font-semibold tracking-[-0.04em] text-[#3B292B]">ترتيب المنتجات</h3>
                  <p className="mt-1 text-[8px] text-[#AA8988]">اختر الطريقة المناسبة لعرض المجموعة</p>
                </div>

                <button onClick={() => setSortOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8D1CC] bg-white text-[#6F5052]">
                  <X className="h-4 w-4 stroke-[1.4]" />
                </button>
              </div>

              <div className="mt-6 overflow-hidden rounded-[18px] border border-[#EBDAD5] bg-white">
                {[
                  { value: "new", label: "الأحدث", desc: "أحدث القطع المضافة" },
                  { value: "best", label: "الأكثر مبيعًا", desc: "الأكثر طلبًا من العملاء" },
                  { value: "featured", label: "مختارات فلامنجو", desc: "اختياراتنا المميزة" },
                  { value: "price-asc", label: "الأقل سعرًا", desc: "من الأقل إلى الأعلى" },
                  { value: "price-desc", label: "الأعلى سعرًا", desc: "من الأعلى إلى الأقل" },
                ].map((option) => (
                  <button key={option.value} onClick={() => { setParam("sort", option.value); setSortOpen(false); }} className="flex min-h-[60px] w-full items-center justify-between border-b border-[#F2E6E2] px-4 text-right last:border-0">
                    <div>
                      <span className={`block text-[10px] font-semibold ${sortBy === option.value ? "text-[#A7535D]" : "text-[#554043]"}`}>{option.label}</span>
                      <span className="mt-1 block text-[7px] text-[#AF9190]">{option.desc}</span>
                    </div>

                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${sortBy === option.value ? "border-[#C96F79] bg-[#C96F79]" : "border-[#E3D2CE] bg-white"}`}>
                      {sortBy === option.value && <Check className="h-2.5 w-2.5 stroke-[2.2] text-white" />}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          FLAMINGO FILTER DRAWER
      ========================================================= */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-end bg-[#3A2729]/28 backdrop-blur-[3px] md:items-stretch">
            <div className="absolute inset-0" onClick={() => setFiltersOpen(false)} />

            <motion.aside initial={isMobileViewport ? { y: "100%" } : { x: "100%" }} animate={isMobileViewport ? { y: 0 } : { x: 0 }} exit={isMobileViewport ? { y: "100%" } : { x: "100%" }} transition={{ type: "spring", stiffness: 330, damping: 37 }} className="relative mr-auto flex max-h-[94vh] w-full flex-col rounded-t-[28px] bg-[#FFF9F7] shadow-[0_-22px_60px_rgba(75,43,46,.14)] md:h-full md:max-h-none md:w-[420px] md:rounded-none">
              {/* HEADER */}
              <div className="shrink-0 px-5 pt-3 md:px-6 md:pt-6">
                <div className="mx-auto mb-4 h-[3px] w-8 rounded-full bg-[#E2C7C4] md:hidden" />

                <div className="flex items-start justify-between border-b border-[#EBDAD5] pb-5">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="h-[2px] w-4 rounded-full bg-[#C96F79]" />
                      <p className="font-serif text-[7px] tracking-[0.25em] text-[#A7535D]">FLAMINGO REFINE</p>
                    </div>

                    <h3 className="text-[23px] font-semibold tracking-[-0.045em] text-[#3B292B]">اختياراتك</h3>
                    <p className="mt-1 text-[8px] text-[#A78988]">{metadataLoading ? "جاري تجهيز الخيارات..." : `${totalProductsCount} منتج مطابق`}</p>
                  </div>

                  <button onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E6CEC9] bg-white text-[#745356]">
                    <X className="h-4 w-4 stroke-[1.4]" />
                  </button>
                </div>
              </div>

              {/* CONTENT */}
              <div className="flex-1 overflow-y-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
                {/* CATEGORY */}
                <div className="border-b border-[#EDE0DC] py-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#493537]">القسم</p>
                      <p className="mt-1 text-[7px] text-[#B29391]">اختر القسم المناسب</p>
                    </div>

                    {categorySlug && <button onClick={() => setParam("category", null)} className="text-[7px] font-medium text-[#A7535D]">مسح</button>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setParam("category", null)} className={`rounded-full px-3.5 py-2 text-[8px] font-medium ${!categorySlug ? "bg-[#C96F79] text-white" : "border border-[#E6D3CE] bg-white text-[#776061]"}`}>الكل</button>

                    {categories.filter((category) => !category.parent_id).map((category) => (
                      <button key={category.id} onClick={() => setParam("category", category.slug)} className={`rounded-full px-3.5 py-2 text-[8px] font-medium ${categorySlug === category.slug ? "bg-[#C96F79] text-white" : "border border-[#E6D3CE] bg-white text-[#776061]"}`}>{category.name_ar}</button>
                    ))}
                  </div>
                </div>

                {/* BRANDS */}
                <div className="border-b border-[#EDE0DC] py-5">
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#493537]">الماركة</p>
                      <p className="mt-1 text-[7px] text-[#B29391]">{brandsAvailable.length} ماركة متاحة</p>
                    </div>

                    {brandFilter !== "all" && <button onClick={() => setParam("brand", null)} className="text-[7px] font-medium text-[#A7535D]">مسح</button>}
                  </div>

                  <div className="max-h-[116px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-2 gap-x-7 gap-y-3.5">
                      <button onClick={() => setParam("brand", null)} className={`truncate text-right text-[8px] ${brandFilter === "all" ? "font-semibold text-[#A7535D]" : "text-[#7C6565]"}`}>جميع الماركات</button>

                      {brandsAvailable.map((brand) => (
                        <button key={brand} onClick={() => setParam("brand", brand)} className={`truncate text-right text-[8px] ${brandFilter === brand ? "font-semibold text-[#A7535D]" : "text-[#7C6565]"}`}>{brand}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLORS */}
                <div className="border-b border-[#EDE0DC] py-5">
                  <div className="mb-4 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#493537]">اللون</p>
                      <p className="mt-1 text-[7px] text-[#B29391]">{metadataLoading ? "..." : `${colorsAvailable.length} لون متاح`}</p>
                    </div>

                    {colorFilter !== "all" && <button onClick={() => setParam("color", null)} className="text-[7px] font-medium text-[#A7535D]">مسح</button>}
                  </div>

                  {/* 3 ROWS THEN HIDDEN SCROLL */}
                  <div className="max-h-[151px] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-5 gap-x-3 gap-y-4">
                      <button onClick={() => setParam("color", null)} className="flex min-w-0 flex-col items-center">
                        <span className={`relative flex h-[33px] w-[33px] items-center justify-center rounded-full border-2 ${colorFilter === "all" ? "border-[#C96F79] ring-2 ring-[#C96F79]/10" : "border-[#E2D2CD]"}`} style={{ background: "conic-gradient(#C96F79,#E2A3A5,#C8A06A,#8A9D7A,#7E91A2,#9A769A,#C96F79)" }}>
                          <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#FFF9F7] text-[6px] font-semibold text-[#6C5455]">كل</span>
                        </span>
                        <span className="mt-1.5 text-[7px] text-[#826B6B]">الكل</span>
                      </button>

                      {colorsAvailable.map((color) => {
                        const active = colorFilter.toLowerCase() === color.name.toLowerCase();

                        return (
                          <button key={color.name} onClick={() => setParam("color", active ? null : color.name)} className="flex min-w-0 flex-col items-center">
                            <span className={`relative h-[33px] w-[33px] rounded-full border-2 ${active ? "border-[#C96F79] ring-2 ring-[#C96F79]/10" : "border-[#E2D2CD]"}`} style={{ background: color.hex2 ? `linear-gradient(135deg, ${color.hex} 50%, ${color.hex2} 50%)` : color.hex }}>
                              {active && <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-[15px] w-[15px] items-center justify-center rounded-full bg-white/95 shadow-sm"><Check className="h-2 w-2 stroke-[2.5] text-[#5E494A]" /></span></span>}
                            </span>

                            <span className={`mt-1.5 max-w-full truncate text-[7px] ${active ? "font-semibold text-[#A7535D]" : "text-[#826B6B]"}`}>{color.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {colorsAvailable.length > 14 && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="h-px w-6 bg-[#E4D3CF]" />
                      <span className="text-[6px] text-[#B39492]">اسحب لعرض المزيد</span>
                      <span className="h-px w-6 bg-[#E4D3CF]" />
                    </div>
                  )}
                </div>

                {/* SIZES */}
                {sizesAvailable.length > 0 && (
                  <div className="border-b border-[#EDE0DC] py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-[#493537]">المقاس</p>
                      {sizeFilter !== "all" && <button onClick={() => setParam("size", null)} className="text-[7px] font-medium text-[#A7535D]">مسح</button>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setParam("size", null)} className={`flex h-8 min-w-[42px] items-center justify-center rounded-[10px] border px-2.5 text-[8px] font-medium ${sizeFilter === "all" ? "border-[#C96F79] bg-[#F7E4E2] text-[#A7535D]" : "border-[#E2D2CD] bg-white text-[#756060]"}`}>الكل</button>

                      {sizesAvailable.map((size) => (
                        <button key={size} onClick={() => setParam("size", size)} className={`flex h-8 min-w-[42px] items-center justify-center rounded-[10px] border px-2.5 text-[8px] font-medium ${sizeFilter === size ? "border-[#C96F79] bg-[#F7E4E2] text-[#A7535D]" : "border-[#E2D2CD] bg-white text-[#756060]"}`}>{size}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRICE */}
                <div className="border-b border-[#EDE0DC] py-5">
                  <div className="mb-5 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#493537]">السعر</p>
                      <p className="mt-1 text-[7px] text-[#B29391]">حدد النطاق المناسب</p>
                    </div>

                    <span className="rounded-full bg-[#F5E5E2] px-3 py-1.5 text-[8px] font-semibold text-[#9D5A5F]">{Math.round(priceRange[0])} — {Math.round(priceRange[1])}</span>
                  </div>

                  <div className="rounded-[16px] border border-[#E9D8D3] bg-white px-4 py-5">
                    <Slider value={[priceRange[0], priceRange[1]]} min={priceBounds.min} max={priceBounds.max} step={1} onValueChange={(values) => { if (values.length === 2) setPriceRange([values[0], values[1]]); }} onValueCommit={(values) => { if (values.length === 2) applyPriceRange([values[0], values[1]]); }} />

                    <div className="mt-4 flex justify-between text-[6px] text-[#B29A97]">
                      <span>{priceBounds.min}</span>
                      <span>{priceBounds.max}</span>
                    </div>
                  </div>
                </div>

                {/* STATUS */}
                <div className="py-5">
                  <p className="mb-3 text-[11px] font-semibold text-[#493537]">الحالة</p>

                  <div className="space-y-2">
                    <button onClick={() => setParam("sale", saleOnly ? null : "1")} className={`flex h-[48px] w-full items-center justify-between rounded-[14px] border px-3.5 ${saleOnly ? "border-[#D9A4A2] bg-[#F9E9E6]" : "border-[#E7D8D4] bg-white"}`}>
                      <span className={`text-[8px] font-medium ${saleOnly ? "text-[#A7535D]" : "text-[#6F595A]"}`}>العروض فقط</span>

                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${saleOnly ? "border-[#C96F79] bg-[#C96F79]" : "border-[#E0CECA] bg-white"}`}>
                        {saleOnly && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                    </button>

                    <button onClick={() => setParam("stock", inStockOnly ? null : "1")} className={`flex h-[48px] w-full items-center justify-between rounded-[14px] border px-3.5 ${inStockOnly ? "border-[#D9A4A2] bg-[#F9E9E6]" : "border-[#E7D8D4] bg-white"}`}>
                      <span className={`text-[8px] font-medium ${inStockOnly ? "text-[#A7535D]" : "text-[#6F595A]"}`}>المتوفر فقط</span>

                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${inStockOnly ? "border-[#C96F79] bg-[#C96F79]" : "border-[#E0CECA] bg-white"}`}>
                        {inStockOnly && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="shrink-0 border-t border-[#E8D8D3] bg-[#FFF9F7]/97 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 backdrop-blur-xl md:px-6 md:pb-5">
                <div className="grid grid-cols-[.82fr_1.65fr] gap-2.5">
                  <button onClick={clearAllFilters} className="flex h-[46px] items-center justify-center gap-1.5 rounded-[14px] border border-[#DCC4BF] bg-white text-[8px] font-medium text-[#775D5E]">
                    <RotateCcw className="h-3 w-3 stroke-[1.5]" />
                    إعادة تعيين
                  </button>

                  <button onClick={() => setFiltersOpen(false)} className="h-[46px] rounded-[14px] bg-[linear-gradient(135deg,#C96F79,#B65E67)] text-[9px] font-semibold text-white shadow-[0_9px_24px_rgba(185,94,103,.23)]">
                    {metadataLoading ? "عرض المنتجات" : `عرض ${totalProductsCount} منتج`}
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickViewProd && <QuickView product={quickViewProd} isMobile={isMobileViewport} onClose={() => setQuickViewProd(null)} />}
      </AnimatePresence>
    </main>

    <Footer />
  </div>
);
};

export default ProductsPage;