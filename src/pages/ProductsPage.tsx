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
import { toast } from "@/hooks/use-toast";
import { clearCatalogScroll, restoreCatalogScroll } from "@/lib/catalogScroll";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
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

type ProductAudience = "men" | "women" | "kids" | "unisex";
type AudienceFilter = ProductAudience | "all";

type CatalogProduct = Product & {
  color_variants?: ColorVariant[] | string;
};

type CatalogMetaProduct = {
  id: string;
  price: number;
  discount: number | null;
  color_variants: ColorVariant[] | string | null;
  sizes: string[] | null;
  audience: ProductAudience | null;
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

const AUDIENCE_OPTIONS: Array<{ value: ProductAudience; label: string }> = [
  { value: "women", label: "نسائي" },
  { value: "men", label: "رجالي" },
  { value: "kids", label: "أطفال" },
  { value: "unisex", label: "للجنسين" },
];

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
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: Math.min(i, 8) * 0.018,
      duration: 0.32,
    },
  }),
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

const getProductColors = (product: { color_variants?: ColorVariant[] | string | null }): string[] => {
  return Array.from(new Set(parseVariants(product.color_variants).map(getVariantColorName).filter(Boolean)));
};

const getProductSizes = (product: { color_variants?: ColorVariant[] | string | null; sizes?: string[] | null }): string[] => {
  return Array.from(
    new Set(
      [
        ...(product.sizes || []),
        ...parseVariants(product.color_variants)
          .flatMap((variant) => (variant.sizes || []).map((size) => size?.size || "")),
      ]
        .map((size) => typeof size === "string" ? size.trim() : "")
        .filter(Boolean)
    )
  );
};

const parseAudienceFilter = (value: string | null): AudienceFilter => {
  return AUDIENCE_OPTIONS.some((option) => option.value === value)
    ? value as ProductAudience
    : "all";
};

const getAudienceLabel = (value: AudienceFilter) => {
  return AUDIENCE_OPTIONS.find((option) => option.value === value)?.label || "الكل";
};

const matchesAudienceFilter = (audience: ProductAudience | null, filter: AudienceFilter) => {
  if (filter === "all") return true;
  if (filter === "women") return audience === "women" || audience === "unisex" || audience === null;
  if (filter === "men") return audience === "men" || audience === "unisex";
  return audience === filter;
};

const isShoeCategoryScope = (slug: string, categories: Category[]) => {
  if (!slug) return false;

  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  let category = categories.find((item) => item.slug === slug) || null;
  const visited = new Set<string>();

  while (category && !visited.has(category.id)) {
    visited.add(category.id);

    const normalizedSlug = category.slug.toLowerCase().replace("shose", "shoes");
    const normalizedName = category.name_ar.replace(/[أإآ]/g, "ا");

    if (normalizedSlug.includes("shoe") || normalizedName.includes("حذ") || normalizedName.includes("جزم")) {
      return true;
    }

    category = category.parent_id ? categoriesById.get(category.parent_id) || null : null;
  }

  return false;
};

const getFinalPrice = (product: { price: number; discount?: number | null }) => {
  return product.discount ? product.price * (1 - product.discount / 100) : product.price;
};

/* =========================================================
   QUICK VIEW
========================================================= */

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

  const fallbackSizes: VariantSize[] = (product.sizes || []).map((size) => ({
    size,
    stock: product.inStock ? 999 : 0,
  }));

  const sizesForActiveVariant = activeVariant?.sizes || fallbackSizes;

  const stockForSize = (size?: string) => {
    if (!size) return product.inStock ? 999 : 0;

    return sizesForActiveVariant.find((item) => item.size === size)?.stock || 0;
  };

  const handleAdd = () => {
    if (sizesForActiveVariant.length > 0 && !selectedSize) {
      toast({ title: "اختر المقاس", description: "حدد المقاس قبل إضافة المنتج للسلة.", variant: "destructive" });
      return;
    }

    const activeStock = selectedSize ? stockForSize(selectedSize) : typeof product.stockQuantity === "number" ? product.stockQuantity : product.inStock ? 999 : 0;
    if (activeStock <= 0 || qty > activeStock) {
      toast({ title: "الكمية غير متوفرة", description: "اختر كمية متاحة من هذا المنتج.", variant: "destructive" });
      return;
    }

    addToCart(product, qty, selectedSize ?? undefined, undefined, activeVariant?.id, activeVariant?.colorName || activeVariant?.name);
    onClose();
  };

  return (
    <motion.aside initial={isMobile ? { y: "100%" } : { x: "100%" }} animate={isMobile ? { y: 0 } : { x: 0 }} exit={isMobile ? { y: "100%" } : { x: "100%" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className={`fixed inset-y-0 right-0 z-[90] w-full overflow-y-auto bg-[#FFFDFC] shadow-[0_0_50px_rgba(65,45,38,.16)] ${isMobile ? "p-4 pb-24" : "max-w-2xl border-l border-[#ECE3DF] p-6"}`}>
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
              <button onClick={() => { const max = selectedSize ? stockForSize(selectedSize) : typeof product.stockQuantity === "number" ? product.stockQuantity : 999; setQty(Math.min(qty + 1, Math.max(1, max))); }} className="h-full w-10 text-lg">+</button>
            </div>

            <button onClick={handleAdd} className="flex-1 rounded-xl bg-[#D4777D] text-[12px] font-semibold text-white shadow-[0_8px_24px_rgba(212,119,125,.20)]">إضافة للسلة</button>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

/* =========================================================
   PRODUCTS PAGE
========================================================= */

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
  const audienceFilter = parseAudienceFilter(searchParams.get("audience"));
  const saleOnly = searchParams.get("sale") === "1";
  const inStockOnly = searchParams.get("stock") === "1";
  const minPriceParam = Number(searchParams.get("min") || 0);
  const maxPriceParam = Number(searchParams.get("max") || 0);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [quickViewProd, setQuickViewProd] = useState<CatalogProduct | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  /*
   * Load More محلي.
   * لا نغير URL نهائياً.
   */
  const [loadedPage, setLoadedPage] = useState(1);

  /*
   * الفلاتر المؤقتة داخل Drawer.
   * المنتجات الموجودة في الخلفية لن تتغير أثناء الاختيار.
   */
  const [draftFilters, setDraftFilters] = useState<URLSearchParams>(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("page");
    return params;
  });

  const previousCatalogSearch = useRef(location.search);
  const restoredCatalogKey = useRef<string | null>(null);
  const overlayScrollRef = useRef(0);

  const draftCategorySlug = draftFilters.get("category") || "";
  const draftBrandFilter = draftFilters.get("brand") || "all";
  const draftColorFilter = draftFilters.get("color") || "all";
  const draftSizeFilter = draftFilters.get("size") || "all";
  const draftAudienceFilter = parseAudienceFilter(draftFilters.get("audience"));
  const draftSaleOnly = draftFilters.get("sale") === "1";
  const draftInStockOnly = draftFilters.get("stock") === "1";
  const draftMinPriceParam = Number(draftFilters.get("min") || 0);
  const draftMaxPriceParam = Number(draftFilters.get("max") || 0);

  const catalogScrollKey = useMemo(() => {
    const params = new URLSearchParams(location.search);

    params.delete("page");

    const query = params.toString();

    return `${location.pathname}${query ? `?${query}` : ""}`;
  }, [location.pathname, location.search]);

  /* =========================================================
     VIEWPORT
  ========================================================= */

  useEffect(() => {
    const update = () => setIsMobileViewport(window.innerWidth < 768);

    update();

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  /* =========================================================
     NAVIGATION SCROLL
  ========================================================= */

  useEffect(() => {
    const previous = new URLSearchParams(previousCatalogSearch.current);
    const current = new URLSearchParams(location.search);

    previousCatalogSearch.current = location.search;

    const keys = [...new Set([...previous.keys(), ...current.keys()])];
    const onlyPageChanged = keys.every((key) => key === "page" || previous.get(key) === current.get(key));

    if (navType === "POP" || onlyPageChanged) return;

    /*
     * عند تغيير فلتر حقيقي نبدأ من الأعلى.
     * Load More لا يصل لهذا effect لأنه لا يغير URL.
     */
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [location.pathname, location.search, navType]);

  /* =========================================================
     FREEZE BACKGROUND WHILE OVERLAY IS OPEN
  ========================================================= */

  useLayoutEffect(() => {
    const overlayOpen = filtersOpen || sortOpen || !!quickViewProd;

    if (!overlayOpen) return;

    const body = document.body;

    overlayScrollRef.current = window.scrollY;

    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousLeft = body.style.left;
    const previousRight = body.style.right;
    const previousWidth = body.style.width;
    const previousOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${overlayScrollRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      const scrollY = overlayScrollRef.current;

      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.left = previousLeft;
      body.style.right = previousRight;
      body.style.width = previousWidth;
      body.style.overflow = previousOverflow;

      window.scrollTo({
        top: scrollY,
        left: 0,
        behavior: "auto",
      });
    };
  }, [filtersOpen, sortOpen, quickViewProd]);

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const { data: categories = [] } = useQuery({
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

  const currentCategory = useMemo(() => {
    return categories.find((category) => category.slug === categorySlug) || null;
  }, [categories, categorySlug]);

  const subCategories = useMemo(() => {
    if (!currentCategory) return [];

    return categories.filter((category) => category.parent_id === currentCategory.id);
  }, [categories, currentCategory]);

  const leafCategoryIds = useMemo(() => {
    if (!currentCategory) return null;

    if (subCategories.length) {
      return [
        currentCategory.id,
        ...subCategories.map((category) => category.id),
      ];
    }

    return [currentCategory.id];
  }, [currentCategory, subCategories]);

  const draftCurrentCategory = useMemo(() => {
    return categories.find((category) => category.slug === draftCategorySlug) || null;
  }, [categories, draftCategorySlug]);

  const draftSubCategories = useMemo(() => {
    if (!draftCurrentCategory) return [];

    return categories.filter((category) => category.parent_id === draftCurrentCategory.id);
  }, [categories, draftCurrentCategory]);

  const draftLeafCategoryIds = useMemo(() => {
    if (!draftCurrentCategory) return null;

    return [
      draftCurrentCategory.id,
      ...draftSubCategories.map((category) => category.id),
    ];
  }, [draftCurrentCategory, draftSubCategories]);

  const isDraftShoeCategory = useMemo(() => {
    return isShoeCategoryScope(draftCategorySlug, categories);
  }, [draftCategorySlug, categories]);

  /* =========================================================
     EXACT SERVER COUNT

     سريع جداً لأنه head:true
  ========================================================= */

  const { data: exactServerCount = 0 } = useQuery({
    queryKey: [
      "products-exact-count",
      leafCategoryIds?.join(",") || "all",
      searchQuery,
      brandFilter,
      audienceFilter,
      saleOnly,
      inStockOnly,
    ],

    queryFn: async () => {
      let query = supabase.from("products").select("id", {
        count: "exact",
        head: true,
      }).eq("is_active", true);

      if (leafCategoryIds?.length) {
        query = query.in("category_id", leafCategoryIds);
      }

      if (searchQuery.trim()) {
        const term = searchQuery.trim();

        query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
      }

      if (brandFilter !== "all") {
        query = query.eq("brand", brandFilter);
      }

      if (audienceFilter === "women") {
        query = query.or("audience.eq.women,audience.eq.unisex,audience.is.null");
      } else if (audienceFilter === "men") {
        query = query.in("audience", ["men", "unisex"]);
      } else if (audienceFilter === "kids" || audienceFilter === "unisex") {
        query = query.eq("audience", audienceFilter);
      }

      if (saleOnly) {
        query = query.gt("discount", 0);
      }

      if (inStockOnly) {
        query = query.eq("in_stock", true);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    },

    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /* =========================================================
     CATALOG METADATA

     هذه البيانات خفيفة ولا تحتوي صور المنتج.
     نحتاجها للألوان والمقاسات والسعر النهائي.
  ========================================================= */

  const needsClientFiltering = colorFilter !== "all" || sizeFilter !== "all" || minPriceParam > 0 || maxPriceParam > 0;

  // Applied metadata powers the actual result set only when a client-side
  // color, size, or price filter is active. Drawer facets use their own scope.
  const shouldLoadMetadata = needsClientFiltering;

  const { data: catalogMetadata = [], isLoading: catalogMetadataLoading } = useQuery({
    queryKey: [
      "catalog-filter-metadata",
      leafCategoryIds?.join(",") || "all",
      searchQuery,
      brandFilter,
      audienceFilter,
      saleOnly,
      inStockOnly,
    ],

    enabled: shouldLoadMetadata,

    queryFn: async () => {
      const rows: CatalogMetaProduct[] = [];

      let from = 0;

      while (true) {
        let query = supabase.from("products").select("id,price,discount,color_variants,sizes,audience,created_at,is_best_seller,is_featured").eq("is_active", true);

        if (leafCategoryIds?.length) {
          query = query.in("category_id", leafCategoryIds);
        }

        if (searchQuery.trim()) {
          const term = searchQuery.trim();

          query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
        }

        if (brandFilter !== "all") {
          query = query.eq("brand", brandFilter);
        }

        if (audienceFilter === "women") {
          query = query.or("audience.eq.women,audience.eq.unisex,audience.is.null");
        } else if (audienceFilter === "men") {
          query = query.in("audience", ["men", "unisex"]);
        } else if (audienceFilter === "kids" || audienceFilter === "unisex") {
          query = query.eq("audience", audienceFilter);
        }

        if (saleOnly) {
          query = query.gt("discount", 0);
        }

        if (inStockOnly) {
          query = query.eq("in_stock", true);
        }

        const { data, error } = await query.order("id", { ascending: true }).range(from, from + META_BATCH_SIZE - 1);

        if (error) throw error;

        const batch = (data || []) as CatalogMetaProduct[];

        rows.push(...batch);

        if (batch.length < META_BATCH_SIZE) {
          break;
        }

        from += META_BATCH_SIZE;
      }

      return rows;
    },

    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /* =========================================================
     LIVE FILTER FACETS

     Category, brand, audience, sale, and stock choices update
     the available colors and sizes before the drawer is applied.
  ========================================================= */

  const { data: facetMetadata = [], isLoading: facetMetadataLoading, isFetching: facetMetadataFetching } = useQuery({
    queryKey: [
      "catalog-live-filter-facets",
      draftLeafCategoryIds?.join(",") || "all",
      searchQuery,
      draftBrandFilter,
      draftSaleOnly,
      draftInStockOnly,
    ],

    enabled: filtersOpen,

    queryFn: async () => {
      const rows: CatalogMetaProduct[] = [];
      let from = 0;

      while (true) {
        let query = supabase.from("products").select("id,price,discount,color_variants,sizes,audience,created_at,is_best_seller,is_featured").eq("is_active", true);

        if (draftLeafCategoryIds?.length) {
          query = query.in("category_id", draftLeafCategoryIds);
        }

        if (searchQuery.trim()) {
          const term = searchQuery.trim();

          query = query.or(`name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`);
        }

        if (draftBrandFilter !== "all") {
          query = query.eq("brand", draftBrandFilter);
        }

        if (draftSaleOnly) {
          query = query.gt("discount", 0);
        }

        if (draftInStockOnly) {
          query = query.eq("in_stock", true);
        }

        const { data, error } = await query.order("id", { ascending: true }).range(from, from + META_BATCH_SIZE - 1);

        if (error) throw error;

        const batch = (data || []) as CatalogMetaProduct[];

        rows.push(...batch);

        if (batch.length < META_BATCH_SIZE) break;

        from += META_BATCH_SIZE;
      }

      return rows;
    },

    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const audienceScopedFacetMetadata = useMemo(() => {
    return facetMetadata.filter((product) => matchesAudienceFilter(product.audience, draftAudienceFilter));
  }, [facetMetadata, draftAudienceFilter]);

  const filterMetadataLoading = filtersOpen && (facetMetadataLoading || facetMetadataFetching);

  /* =========================================================
     COLORS
  ========================================================= */

  const colorsAvailable = useMemo<ColorSwatch[]>(() => {
    const map = new Map<string, ColorSwatch>();

    audienceScopedFacetMetadata.forEach((product) => {
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
  }, [audienceScopedFacetMetadata]);

  /* =========================================================
     SIZES
  ========================================================= */

  const sizesAvailable = useMemo(() => {
    const sizes = new Set<string>();

    audienceScopedFacetMetadata.forEach((product) => {
      getProductSizes(product).forEach((size) => {
        sizes.add(size);
      });
    });

    return Array.from(sizes).sort((a, b) => a.localeCompare(b, "ar", { numeric: true, sensitivity: "base" }));
  }, [audienceScopedFacetMetadata]);

  const availableAudienceOptions = useMemo(() => {
    return AUDIENCE_OPTIONS.filter((option) => {
      return facetMetadata.some((product) => matchesAudienceFilter(product.audience, option.value));
    });
  }, [facetMetadata]);

  /* =========================================================
     PRICE BOUNDS
  ========================================================= */

  const catalogPriceBounds = useMemo(() => {
    if (!catalogMetadata.length) {
      return {
        min: 0,
        max: 1000,
      };
    }

    const prices = catalogMetadata.map(getFinalPrice);

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [catalogMetadata]);

  const filterPriceBounds = useMemo(() => {
    if (!audienceScopedFacetMetadata.length) {
      return {
        min: 0,
        max: 1000,
      };
    }

    const prices = audienceScopedFacetMetadata.map(getFinalPrice);

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [audienceScopedFacetMetadata]);

  const effectiveMin = minPriceParam || catalogPriceBounds.min;
  const effectiveMax = maxPriceParam || catalogPriceBounds.max;

  const [priceRange, setPriceRange] = useState<[number, number]>([
    0,
    1000,
  ]);

  useEffect(() => {
    if (!filtersOpen || filterMetadataLoading) return;

    setPriceRange([
      draftMinPriceParam || filterPriceBounds.min,
      draftMaxPriceParam || filterPriceBounds.max,
    ]);
  }, [filtersOpen, filterMetadataLoading, draftMinPriceParam, draftMaxPriceParam, filterPriceBounds]);

  const draftResultCount = useMemo(() => {
    const min = draftMinPriceParam || filterPriceBounds.min;
    const max = draftMaxPriceParam || filterPriceBounds.max;

    return audienceScopedFacetMetadata.filter((product) => {
      const colorMatch =
        draftColorFilter === "all" ||
        getProductColors(product).some((color) => color.toLowerCase() === draftColorFilter.toLowerCase());
      const sizeMatch = draftSizeFilter === "all" || getProductSizes(product).includes(draftSizeFilter);
      const price = getFinalPrice(product);

      return colorMatch && sizeMatch && price >= min && price <= max;
    }).length;
  }, [
    audienceScopedFacetMetadata,
    draftColorFilter,
    draftSizeFilter,
    draftMinPriceParam,
    draftMaxPriceParam,
    filterPriceBounds,
  ]);

  /* =========================================================
     MATCHING METADATA

     فقط عند Color / Size / Price.
  ========================================================= */

  const matchingMetadata = useMemo(() => {
    if (!needsClientFiltering) {
      return catalogMetadata;
    }

    let result = catalogMetadata.filter((product) => {
      const finalPrice = getFinalPrice(product);

      const colorMatch =
        colorFilter === "all" ||
        getProductColors(product).some(
          (color) =>
            color.toLowerCase() ===
            colorFilter.toLowerCase()
        );

      const sizeMatch =
        sizeFilter === "all" ||
        getProductSizes(product).includes(sizeFilter);

      const priceMatch =
        finalPrice >= effectiveMin &&
        finalPrice <= effectiveMax;

      return colorMatch && sizeMatch && priceMatch;
    });

    if (sortBy === "price-asc") {
      result = [...result].sort(
        (a, b) => getFinalPrice(a) - getFinalPrice(b)
      );
    } else if (sortBy === "price-desc") {
      result = [...result].sort(
        (a, b) => getFinalPrice(b) - getFinalPrice(a)
      );
    } else if (sortBy === "best") {
      result = [...result].sort((a, b) => {
        const bestDifference =
          Number(!!b.is_best_seller) -
          Number(!!a.is_best_seller);

        if (bestDifference !== 0) {
          return bestDifference;
        }

        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
    } else if (sortBy === "featured") {
      result = [...result].sort((a, b) => {
        const featuredDifference =
          Number(!!b.is_featured) -
          Number(!!a.is_featured);

        if (featuredDifference !== 0) {
          return featuredDifference;
        }

        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      });
    } else {
      result = [...result].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    }

    return result;
  }, [
    catalogMetadata,
    needsClientFiltering,
    colorFilter,
    sizeFilter,
    effectiveMin,
    effectiveMax,
    sortBy,
  ]);

  /*
   * العدد الكامل.
   *
   * بدون Color/Size/Price:
   * نستخدم Supabase exact count السريع.
   *
   * معهم:
   * نستخدم جميع Metadata وليس المنتجات المحملة فقط.
   */
  const totalProductsCount = needsClientFiltering
    ? matchingMetadata.length
    : exactServerCount;

  /* =========================================================
     NORMAL SERVER PAGES

     هذا المسار يعمل في البداية.
     لا ينتظر Metadata.
  ========================================================= */

  const normalProductQueries = useQueries({
    queries: !needsClientFiltering
      ? Array.from({ length: loadedPage }, (_, pageIndex) => ({
          queryKey: [
            "products-fast-page",
            leafCategoryIds?.join(",") || "all",
            searchQuery,
            brandFilter,
            audienceFilter,
            sortBy,
            saleOnly,
            inStockOnly,
            pageIndex + 1,
          ],

          queryFn: async () => {
            let query = supabase
              .from("products")
              .select(PRODUCT_CARD_SELECT)
              .eq("is_active", true);

            if (leafCategoryIds?.length) {
              query = query.in(
                "category_id",
                leafCategoryIds
              );
            }

            if (searchQuery.trim()) {
              const term = searchQuery.trim();

              query = query.or(
                `name_ar.ilike.%${term}%,name.ilike.%${term}%,description_ar.ilike.%${term}%`
              );
            }

            if (brandFilter !== "all") {
              query = query.eq(
                "brand",
                brandFilter
              );
            }

            if (audienceFilter === "women") {
              query = query.or("audience.eq.women,audience.eq.unisex,audience.is.null");
            } else if (audienceFilter === "men") {
              query = query.in("audience", ["men", "unisex"]);
            } else if (audienceFilter === "kids" || audienceFilter === "unisex") {
              query = query.eq("audience", audienceFilter);
            }

            if (saleOnly) {
              query = query.gt("discount", 0);
            }

            if (inStockOnly) {
              query = query.eq("in_stock", true);
            }

            if (sortBy === "price-asc") {
              query = query.order("price", {
                ascending: true,
              });
            } else if (sortBy === "price-desc") {
              query = query.order("price", {
                ascending: false,
              });
            } else if (sortBy === "best") {
              query = query
                .order("is_best_seller", {
                  ascending: false,
                })
                .order("created_at", {
                  ascending: false,
                });
            } else if (sortBy === "featured") {
              query = query
                .order("is_featured", {
                  ascending: false,
                })
                .order("created_at", {
                  ascending: false,
                });
            } else {
              query = query.order("created_at", {
                ascending: false,
              });
            }

            const from =
              pageIndex * PAGE_SIZE;

            const { data, error } =
              await query.range(
                from,
                from + PAGE_SIZE - 1
              );

            if (error) throw error;

            return (data || []).map(
              mapProductCard
            ) as CatalogProduct[];
          },

          staleTime: 5 * 60 * 1000,
          gcTime: 15 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
        }))
      : [],
  });

  /* =========================================================
     CLIENT FILTERED PAGES

     يستخدم فقط عند Color / Size / Price.
  ========================================================= */

  const filteredPageIdGroups = useMemo(() => {
    if (!needsClientFiltering) {
      return [];
    }

    return Array.from(
      { length: loadedPage },
      (_, index) => {
        const from = index * PAGE_SIZE;
        const to = from + PAGE_SIZE;

        return matchingMetadata
          .slice(from, to)
          .map((product) => product.id);
      }
    ).filter((ids) => ids.length > 0);
  }, [
    needsClientFiltering,
    matchingMetadata,
    loadedPage,
  ]);

  const filteredProductQueries = useQueries({
    queries: needsClientFiltering
      ? filteredPageIdGroups.map(
          (ids, index) => ({
            queryKey: [
              "catalog-filtered-page",
              ids.join(","),
              index + 1,
            ],

            queryFn: async () => {
              const { data, error } =
                await supabase
                  .from("products")
                  .select(PRODUCT_CARD_SELECT)
                  .in("id", ids);

              if (error) throw error;

              const mapped = (
                data || []
              ).map(
                mapProductCard
              ) as CatalogProduct[];

              const mappedById = new Map(
                mapped.map((product) => [
                  product.id,
                  product,
                ])
              );

              return ids
                .map((id) =>
                  mappedById.get(id)
                )
                .filter(
                  (
                    product
                  ): product is CatalogProduct =>
                    Boolean(product)
                );
            },

            staleTime: 5 * 60 * 1000,
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
          })
        )
      : [],
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const products = useMemo(() => {
    const sourceQueries = needsClientFiltering
      ? filteredProductQueries
      : normalProductQueries;

    const seen = new Set<string>();

    return sourceQueries
      .flatMap(
        (query) => query.data || []
      )
      .filter((product) => {
        if (seen.has(product.id)) {
          return false;
        }

        seen.add(product.id);

        return true;
      });
  }, [
    needsClientFiltering,
    normalProductQueries,
    filteredProductQueries,
  ]);

  const isLoadingProducts = needsClientFiltering
    ? catalogMetadataLoading ||
      filteredProductQueries.some(
        (query) =>
          query.isLoading ||
          query.isFetching
      )
    : normalProductQueries.some(
        (query) =>
          query.isLoading ||
          query.isFetching
      );

  const hasMore =
    products.length < totalProductsCount;

  /* =========================================================
     BRANDS
  ========================================================= */

  const { data: brandsAvailable = [] } = useQuery({
    queryKey: ["product-filter-brands"],

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from("brands")
          .select("name")
          .eq("is_active", true)
          .order("name");

      if (error) throw error;

      return (data || [])
        .map((brand) => brand.name)
        .filter(
          (name): name is string =>
            Boolean(name)
        );
    },

    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  /* =========================================================
     RESET LOAD MORE ON REAL FILTER CHANGE
  ========================================================= */

  useEffect(() => {
    setLoadedPage(1);
  }, [
    categorySlug,
    searchQuery,
    brandFilter,
    audienceFilter,
    colorFilter,
    sizeFilter,
    saleOnly,
    inStockOnly,
    minPriceParam,
    maxPriceParam,
    sortBy,
  ]);

  /* =========================================================
     RESTORE CATALOG POSITION
  ========================================================= */

  useEffect(() => {
    if (isLoadingProducts) return;
    if (!products.length) return;
    if (restoredCatalogKey.current === catalogScrollKey) return;

    restoreCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current =
      catalogScrollKey;
  }, [
    isLoadingProducts,
    products.length,
    catalogScrollKey,
  ]);

  /* =========================================================
     NORMAL PARAM SETTER
  ========================================================= */

  const setParam = (key: string, value: string | null) => {
    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    setLoadedPage(1);

    const next =
      new URLSearchParams(searchParams);

    if (
      value === null ||
      value === "" ||
      value === "all"
    ) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    if (key === "category") {
      next.delete("color");
      next.delete("size");

      if (!isShoeCategoryScope(value || "", categories)) {
        next.delete("audience");
      }
    }

    /*
     * page لم يعد جزءاً من Load More.
     */
    next.delete("page");

    setSearchParams(next, {
      replace: true,
    });
  };

  /* =========================================================
     FILTER DRAFT
  ========================================================= */

  const openFilters = () => {
    const draft =
      new URLSearchParams(searchParams);

    draft.delete("page");

    setDraftFilters(draft);

    setPriceRange([
      effectiveMin,
      effectiveMax,
    ]);

    /*
     * لو لم يبدأ Metadata بعد، ابدأه فوراً.
     */

    setFiltersOpen(true);
  };

  const setDraftParam = (key: string, value: string | null) => {
    setDraftFilters((current) => {
      const next =
        new URLSearchParams(current);

      if (
        value === null ||
        value === "" ||
        value === "all"
      ) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      next.delete("page");

      return next;
    });
  };

  const setDraftCategory = (value: string | null) => {
    setDraftFilters((current) => {
      const next = new URLSearchParams(current);

      if (!value) {
        next.delete("category");
      } else {
        next.set("category", value);
      }

      next.delete("color");
      next.delete("size");

      if (!isShoeCategoryScope(value || "", categories)) {
        next.delete("audience");
      }

      next.delete("page");
      return next;
    });
  };

  const setDraftBrand = (value: string | null) => {
    setDraftFilters((current) => {
      const next = new URLSearchParams(current);

      if (!value || value === "all") {
        next.delete("brand");
      } else {
        next.set("brand", value);
      }

      next.delete("color");
      next.delete("size");
      next.delete("page");
      return next;
    });
  };

  const setDraftAudience = (value: ProductAudience | null) => {
    setDraftFilters((current) => {
      const next = new URLSearchParams(current);

      if (!value) {
        next.delete("audience");
      } else {
        next.set("audience", value);
      }

      next.delete("color");
      next.delete("size");
      next.delete("page");
      return next;
    });
  };

  const resetDraftFilters = () => {
    const next = new URLSearchParams();

    if (categorySlug) {
      next.set(
        "category",
        categorySlug
      );
    }

    setDraftFilters(next);

    setPriceRange([
      filterPriceBounds.min,
      filterPriceBounds.max,
    ]);
  };

  const commitDraftPriceRange = (range: [number, number]) => {
    const min = Math.round(range[0]);
    const max = Math.round(range[1]);

    setDraftFilters((current) => {
      const next =
        new URLSearchParams(current);

      if (min <= filterPriceBounds.min) {
        next.delete("min");
      } else {
        next.set(
          "min",
          String(min)
        );
      }

      if (max >= filterPriceBounds.max) {
        next.delete("max");
      } else {
        next.set(
          "max",
          String(max)
        );
      }

      next.delete("page");

      return next;
    });
  };

  const applyDraftFilters = () => {
    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    setLoadedPage(1);

    const next =
      new URLSearchParams(draftFilters);

    next.delete("page");

    /*
     * أغلق Drawer أولاً.
     */
    setFiltersOpen(false);

    /*
     * ثم غيّر المنتجات بعد انتهاء حركة الإغلاق.
     * بهذا لن تراها تتبدل بالخلفية.
     */
    window.setTimeout(() => {
      setSearchParams(next, {
        replace: true,
      });
    }, 170);
  };

  /* =========================================================
     SORT
  ========================================================= */

  const handleSortSelect = (value: string) => {
    if (value === sortBy) {
      setSortOpen(false);
      return;
    }

    /*
     * أغلق Sort أولاً.
     */
    setSortOpen(false);

    /*
     * ثم غيّر البيانات بعد الإغلاق.
     */
    window.setTimeout(() => {
      setParam("sort", value);
    }, 170);
  };

  /* =========================================================
     LOAD MORE

     لا URL
     لا Navigation
     لا page query param
  ========================================================= */

  const handleLoadMore = () => {
    if (
      isLoadingProducts ||
      !hasMore
    ) {
      return;
    }

    setLoadedPage(
      (current) => current + 1
    );
  };

  /* =========================================================
     CLEAR ALL
  ========================================================= */

  const clearAllFilters = () => {
    clearCatalogScroll(catalogScrollKey);

    restoredCatalogKey.current = null;

    setLoadedPage(1);

    const next =
      new URLSearchParams();

    if (categorySlug) {
      next.set(
        "category",
        categorySlug
      );
    }

    setSearchParams(next, {
      replace: true,
    });
  };

  /* =========================================================
     COUNTERS
  ========================================================= */

  const activeFilterCount =
    (categorySlug ? 1 : 0) +
    (brandFilter !== "all" ? 1 : 0) +
    (audienceFilter !== "all" ? 1 : 0) +
    (colorFilter !== "all" ? 1 : 0) +
    (sizeFilter !== "all" ? 1 : 0) +
    (saleOnly ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (minPriceParam || maxPriceParam ? 1 : 0);

  const currentSortLabel =
    sortBy === "best"
      ? "الأكثر مبيعًا"
      : sortBy === "featured"
        ? "مختارة"
        : sortBy === "price-asc"
          ? "الأقل سعرًا"
          : sortBy === "price-desc"
            ? "الأعلى سعرًا"
            : "الأحدث";

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#261F1D]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-24 md:pt-24 md:pb-20 [overflow-anchor:none]">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <section className="bg-[#FFFDFC]">
          <div className="mx-auto w-full max-w-[1600px] px-4 pt-5 pb-3 text-center md:px-6 md:pt-8 md:pb-5">
            <div className="mb-1.5 flex items-center justify-center gap-2.5">
              <span className="h-px w-6 bg-gradient-to-l from-[#C9797E]/60 to-transparent" />
              <span className="font-serif text-[8px] tracking-[0.34em] text-[#B96C72] md:text-[9px]">FLAMINGO</span>
              <span className="h-px w-6 bg-gradient-to-r from-[#C9797E]/60 to-transparent" />
            </div>

            <h1 className="text-[21px] font-semibold leading-tight tracking-[-0.02em] text-[#261F1D] md:text-[30px]">{currentCategory ? currentCategory.name_ar : getSiteText(content, "products_page_title", "جميع المنتجات")}</h1>

            <p className="mx-auto mt-1.5 max-w-lg text-[10px] leading-5 text-[#968A85] md:text-[12px]">{currentCategory ? "مختارات فلامنجو لهذه المجموعة" : "تشكيلة مختارة بعناية لتجربة تسوق أكثر أناقة"}</p>
          </div>

          {/* =========================================================
              CATEGORIES
          ========================================================= */}
          <div className="mx-auto w-full max-w-[1600px] border-t border-[#F2ECE9] px-3 py-3 md:px-6">
            <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setParam("category", null)} className={`shrink-0 rounded-full px-4 py-[7px] text-[10px] font-medium transition-all md:text-[11px] ${!categorySlug ? "bg-[#D4777D] text-white shadow-[0_5px_16px_rgba(212,119,125,.19)]" : "border border-[#E9DFDB] bg-white text-[#6D625D]"}`}>الكل</button>

              {categories.filter((category) => !category.parent_id).map((category) => (
                <button key={category.id} onClick={() => setParam("category", category.slug)} className={`shrink-0 rounded-full px-4 py-[7px] text-[10px] font-medium transition-all md:text-[11px] ${categorySlug === category.slug ? "bg-[#D4777D] text-white shadow-[0_5px_16px_rgba(212,119,125,.19)]" : "border border-[#E9DFDB] bg-white text-[#6D625D]"}`}>{category.name_ar}</button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================
            PREMIUM TOOLBAR
        ========================================================= */}
        <section className="sticky top-[68px] z-30 transform-gpu bg-[#FFFDFC] px-3 py-2 [backface-visibility:hidden] md:top-[76px] md:px-6">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex h-[48px] items-center overflow-hidden rounded-[15px] border border-[#EAE0DC] bg-white shadow-[0_8px_28px_rgba(65,45,38,.055)]">
              <button onClick={openFilters} className="group flex h-full min-w-0 flex-1 items-center justify-center gap-2 border-l border-[#EFE7E3] px-3 transition-colors active:bg-[#FBF5F3]">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${activeFilterCount > 0 ? "bg-[#F8E7E6] text-[#BE666C]" : "bg-[#F7F3F1] text-[#625752]"}`}>
                  <SlidersHorizontal className="h-[14px] w-[14px] stroke-[1.7]" />
                </span>

                <span className="truncate text-[11px] font-medium text-[#3D3430]">فلترة</span>

                {activeFilterCount > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[8px] font-semibold text-white">{activeFilterCount}</span>}
              </button>

              <button onClick={() => setSortOpen(true)} className="flex h-full min-w-0 flex-1 items-center justify-center gap-2 border-l border-[#EFE7E3] px-2 transition-colors active:bg-[#FBF5F3]">
                <span className="min-w-0">
                  <span className="block text-[8px] leading-none text-[#AAA09B]">ترتيب</span>
                  <span className="mt-1 block max-w-[78px] truncate text-[10px] font-medium leading-none text-[#3D3430]">{currentSortLabel}</span>
                </span>

                <ChevronDown className="h-3.5 w-3.5 shrink-0 stroke-[1.5] text-[#756A65]" />
              </button>

              <div className="flex h-full w-[72px] shrink-0 flex-col items-center justify-center bg-[#FDF9F7] sm:w-[82px]">
                {catalogMetadataLoading && needsClientFiltering ? <span className="h-3 w-6 animate-pulse rounded bg-[#EDE4E0]" /> : <span className="text-[12px] font-semibold leading-none text-[#B86168]">{totalProductsCount}</span>}
                <span className="mt-1 text-[8px] leading-none text-[#9D918B]">منتج</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            ACTIVE FILTERS
        ========================================================= */}
        {activeFilterCount > 0 && (
          <section className="mx-auto w-full max-w-[1600px] px-3 pt-1 md:px-6">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {brandFilter !== "all" && <button onClick={() => setParam("brand", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">{brandFilter}<X className="h-2.5 w-2.5" /></button>}

              {audienceFilter !== "all" && <button onClick={() => setParam("audience", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">{getAudienceLabel(audienceFilter)}<X className="h-2.5 w-2.5" /></button>}

              {colorFilter !== "all" && <button onClick={() => setParam("color", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">{colorFilter}<X className="h-2.5 w-2.5" /></button>}

              {sizeFilter !== "all" && <button onClick={() => setParam("size", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">{sizeFilter}<X className="h-2.5 w-2.5" /></button>}

              {saleOnly && <button onClick={() => setParam("sale", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">العروض<X className="h-2.5 w-2.5" /></button>}

              {inStockOnly && <button onClick={() => setParam("stock", null)} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">متوفر<X className="h-2.5 w-2.5" /></button>}

              {(minPriceParam > 0 || maxPriceParam > 0) && <button onClick={() => { const next = new URLSearchParams(searchParams); next.delete("min"); next.delete("max"); next.delete("page"); setLoadedPage(1); setSearchParams(next, { replace: true }); }} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F9EFED] px-2.5 py-1.5 text-[9px] font-medium text-[#956268]">{effectiveMin} - {effectiveMax}<X className="h-2.5 w-2.5" /></button>}

              <button onClick={clearAllFilters} className="shrink-0 px-2 py-1.5 text-[9px] font-medium text-[#B75F66]">مسح الكل</button>
            </div>
          </section>
        )}

        {/* =========================================================
            PRODUCTS
        ========================================================= */}
        <section id="products-grid" className="mx-auto w-full max-w-[1600px] px-2.5 pt-3 md:px-6 md:pt-5">
          {isLoadingProducts && products.length === 0 ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                  <div className="aspect-[4/5] animate-pulse rounded-[15px] bg-[#F3EEEB]" />
                  <div className="mt-2.5 h-2.5 w-[72%] animate-pulse rounded-full bg-[#F0E9E6]" />
                  <div className="mt-2 h-2.5 w-[38%] animate-pulse rounded-full bg-[#F0E9E6]" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[52vh] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-[#FAF0EE]">
                <Heart className="h-7 w-7 stroke-[1.25] text-[#CE7A7F]" />
              </div>

              <h3 className="mt-5 text-[17px] font-semibold text-[#302724]">لا توجد منتجات مطابقة</h3>
              <p className="mt-2 max-w-[280px] text-[11px] leading-5 text-[#948883]">جرّب إزالة أحد خيارات الفلترة أو اختيار مجموعة مختلفة.</p>

              <button onClick={clearAllFilters} className="mt-5 rounded-full border border-[#DED2CD] bg-white px-6 py-2.5 text-[11px] font-medium text-[#594D48]">إعادة تعيين</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product, index) => (
                <motion.div key={product.id} custom={index} initial={isMobileViewport ? false : "hidden"} animate={isMobileViewport ? false : "show"} variants={shimmerVariants} className="min-w-0">
                  <ProductCard product={product} onQuickView={(selectedProduct) => setQuickViewProd(selectedProduct)} />
                </motion.div>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="flex flex-col items-center justify-center pb-5 pt-10 md:pt-14">
              <button onClick={handleLoadMore} disabled={isLoadingProducts} className="group flex h-[46px] min-w-[178px] items-center justify-center rounded-full border border-[#DBCBC6] bg-white px-7 text-[11px] font-medium text-[#514540] shadow-[0_7px_24px_rgba(64,44,37,.055)] transition-all active:scale-[0.985] disabled:cursor-wait disabled:opacity-60">
                {isLoadingProducts ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#E3D7D2] border-t-[#C66C72]" />
                    جاري التحميل
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    عرض المزيد
                    <ChevronDown className="h-3.5 w-3.5 stroke-[1.6]" />
                  </span>
                )}
              </button>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="h-px w-5 bg-[#E2D6D1]" />
                <span className="text-[8px] tracking-[0.12em] text-[#AAA09B]">{products.length} / {totalProductsCount}</span>
                <span className="h-px w-5 bg-[#E2D6D1]" />
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            SORT
        ========================================================= */}
        <AnimatePresence>
          {sortOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="fixed inset-0 z-[80] flex items-end justify-center bg-[#211B19]/35 backdrop-blur-[2px] md:items-center" onClick={() => setSortOpen(false)}>
              <motion.div initial={isMobileViewport ? { y: "100%" } : { opacity: 0, scale: 0.97 }} animate={isMobileViewport ? { y: 0 } : { opacity: 1, scale: 1 }} exit={isMobileViewport ? { y: "100%" } : { opacity: 0, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }} onClick={(event) => event.stopPropagation()} className="w-full rounded-t-[26px] bg-[#FFFDFC] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3 shadow-[0_-20px_50px_rgba(55,37,31,.12)] md:max-w-[380px] md:rounded-[22px] md:p-5">
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#DDD1CD] md:hidden" />

                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <p className="text-[9px] text-[#B66A70]">FLAMINGO</p>
                    <h3 className="mt-0.5 text-[16px] font-semibold text-[#302724]">ترتيب المنتجات</h3>
                  </div>

                  <button onClick={() => setSortOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EAE0DC] bg-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 overflow-hidden rounded-[16px] border border-[#ECE2DE] bg-white">
                  {[
                    { value: "new", label: "الأحدث", desc: "أحدث المنتجات المضافة" },
                    { value: "best", label: "الأكثر مبيعًا", desc: "القطع الأكثر طلبًا" },
                    { value: "featured", label: "مختارات فلامنجو", desc: "منتجات مختارة بعناية" },
                    { value: "price-asc", label: "السعر: الأقل أولًا", desc: "من الأقل إلى الأعلى" },
                    { value: "price-desc", label: "السعر: الأعلى أولًا", desc: "من الأعلى إلى الأقل" },
                  ].map((option) => (
                    <button key={option.value} onClick={() => handleSortSelect(option.value)} className="flex min-h-[57px] w-full items-center justify-between border-b border-[#F0E9E6] px-3.5 text-right last:border-0">
                      <div>
                        <span className={`block text-[11px] ${sortBy === option.value ? "font-semibold text-[#B95F66]" : "font-medium text-[#4B403B]"}`}>{option.label}</span>
                        <span className="mt-1 block text-[8px] text-[#A0958F]">{option.desc}</span>
                      </div>

                      <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border transition-all ${sortBy === option.value ? "border-[#D4777D] bg-[#D4777D]" : "border-[#DDD2CE] bg-white"}`}>
                        {sortBy === option.value && <Check className="h-3 w-3 stroke-[2.2] text-white" />}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================
            FILTER DRAWER
        ========================================================= */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="fixed inset-0 z-[80] flex items-end bg-[#211B19]/35 backdrop-blur-[2px] md:items-stretch">
              <div className="absolute inset-0" onClick={() => setFiltersOpen(false)} />

              <motion.aside initial={isMobileViewport ? { y: "100%" } : { x: "100%" }} animate={isMobileViewport ? { y: 0 } : { x: 0 }} exit={isMobileViewport ? { y: "100%" } : { x: "100%" }} transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }} className="relative mr-auto flex max-h-[92vh] w-full flex-col rounded-t-[28px] bg-[#FFFDFC] shadow-[0_-20px_60px_rgba(55,37,31,.14)] md:h-full md:max-h-none md:w-[430px] md:rounded-none">
                {/* HEADER */}
                <div className="shrink-0 px-4 pt-3 md:px-6 md:pt-6">
                  <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-[#DDD1CD] md:hidden" />

                  <div className="flex items-center justify-between border-b border-[#EEE6E2] pb-4">
                    <div>
                      <p className="text-[8px] tracking-[0.18em] text-[#B86A70]">FLAMINGO FILTER</p>
                      <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#302724]">فلترة المنتجات</h3>
                      <p className="mt-1 text-[9px] text-[#9A8F89]">{filterMetadataLoading ? "جاري تجهيز الخيارات..." : `${draftResultCount} منتج مطابق لاختياراتك`}</p>
                    </div>

                    <button onClick={() => setFiltersOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E9DEDA] bg-white text-[#554944]">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-6">
                  {/* CATEGORY */}
                  <div className="border-b border-[#F0E8E5] py-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#403632]">الفئة</p>
                        <p className="mt-0.5 text-[8px] text-[#AAA09A]">اختر القسم المناسب</p>
                      </div>

                      {draftCategorySlug && <button onClick={() => setDraftCategory(null)} className="text-[8px] font-medium text-[#B76269]">مسح</button>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setDraftCategory(null)} className={`rounded-full px-3.5 py-2 text-[10px] font-medium transition-all ${!draftCategorySlug ? "bg-[#D4777D] text-white shadow-[0_5px_14px_rgba(212,119,125,.17)]" : "border border-[#E6DCD8] bg-white text-[#6D625D]"}`}>الكل</button>

                      {categories.filter((category) => !category.parent_id).map((category) => (
                        <button key={category.id} onClick={() => setDraftCategory(category.slug)} className={`rounded-full px-3.5 py-2 text-[10px] font-medium transition-all ${draftCategorySlug === category.slug ? "bg-[#D4777D] text-white shadow-[0_5px_14px_rgba(212,119,125,.17)]" : "border border-[#E6DCD8] bg-white text-[#6D625D]"}`}>{category.name_ar}</button>
                      ))}
                    </div>
                  </div>

                  {/* SHOE AUDIENCE */}
                  {isDraftShoeCategory && (
                    <div className="border-b border-[#F0E8E5] py-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-semibold text-[#403632]">نوع الأحذية</p>
                          <p className="mt-0.5 text-[8px] text-[#AAA09A]">اختر رجالي أو نسائي</p>
                        </div>

                        {draftAudienceFilter !== "all" && <button onClick={() => setDraftAudience(null)} className="text-[8px] font-medium text-[#B76269]">مسح</button>}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setDraftAudience(null)} className={`min-h-[40px] rounded-xl border px-3 text-[9px] font-medium transition-all ${draftAudienceFilter === "all" ? "border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border-[#E4DAD6] bg-white text-[#655A55]"}`}>كل الأحذية</button>

                        {(filterMetadataLoading ? AUDIENCE_OPTIONS : availableAudienceOptions).map((option) => (
                          <button key={option.value} onClick={() => setDraftAudience(option.value)} className={`min-h-[40px] rounded-xl border px-3 text-[9px] font-medium transition-all ${draftAudienceFilter === option.value ? "border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border-[#E4DAD6] bg-white text-[#655A55]"}`}>{option.label}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BRANDS */}
                  <div className="border-b border-[#F0E8E5] py-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#403632]">الماركة</p>
                        <p className="mt-0.5 text-[8px] text-[#AAA09A]">{brandsAvailable.length} ماركة متاحة</p>
                      </div>

                      {draftBrandFilter !== "all" && <button onClick={() => setDraftBrand(null)} className="text-[8px] font-medium text-[#B76269]">مسح</button>}
                    </div>

                    <div className="max-h-[126px] overflow-y-auto overscroll-contain pr-[1px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setDraftBrand(null)} className={`rounded-full px-3.5 py-2 text-[9px] font-medium transition-all ${draftBrandFilter === "all" ? "border border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border border-[#E6DCD8] bg-white text-[#6C615C]"}`}>جميع الماركات</button>

                        {brandsAvailable.map((brand) => (
                          <button key={brand} onClick={() => setDraftBrand(brand)} className={`rounded-full px-3.5 py-2 text-[9px] font-medium transition-all ${draftBrandFilter === brand ? "border border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border border-[#E6DCD8] bg-white text-[#6C615C]"}`}>{brand}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* COLORS - 3 ROWS THEN HIDDEN SCROLL */}
                  <div className="border-b border-[#F0E8E5] py-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#403632]">اللون</p>
                        <p className="mt-0.5 text-[8px] text-[#AAA09A]">{filterMetadataLoading ? "جاري تحميل الألوان" : `${colorsAvailable.length} لون متاح`}</p>
                      </div>

                      {draftColorFilter !== "all" && <button onClick={() => setDraftParam("color", null)} className="text-[8px] font-medium text-[#B76269]">مسح</button>}
                    </div>

                    <div className="max-h-[178px] overflow-y-auto overscroll-contain px-[1px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
                        <button onClick={() => setDraftParam("color", null)} className="group flex min-w-0 flex-col items-center">
                          <span className={`relative flex h-[38px] w-[38px] items-center justify-center rounded-full border-2 transition-all ${draftColorFilter === "all" ? "border-[#C96B71] ring-2 ring-[#C96B71]/12" : "border-[#E2D9D5]"}`} style={{ background: "conic-gradient(#D4777D,#D4AB62,#6D9779,#6D8DA8,#8970A8,#D4777D)" }}>
                            <span className="flex h-[29px] w-[29px] items-center justify-center rounded-full bg-[#FFFDFC] text-[8px] font-semibold text-[#5F544F]">كل</span>
                          </span>

                          <span className={`mt-1.5 max-w-full truncate text-[8px] ${draftColorFilter === "all" ? "font-semibold text-[#B65E65]" : "text-[#786D67]"}`}>الكل</span>
                        </button>

                        {colorsAvailable.map((color) => {
                          const active = draftColorFilter.toLowerCase() === color.name.toLowerCase();

                          return (
                            <button key={color.name} onClick={() => setDraftParam("color", active ? null : color.name)} className="group flex min-w-0 flex-col items-center">
                              <span className={`relative block h-[38px] w-[38px] rounded-full border-2 transition-all ${active ? "border-[#C96B71] ring-2 ring-[#C96B71]/12" : "border-[#E2D9D5]"}`} style={{ background: color.hex2 ? `linear-gradient(135deg, ${color.hex} 0%, ${color.hex} 50%, ${color.hex2} 50%, ${color.hex2} 100%)` : color.hex }}>
                                {active && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white/95 shadow-[0_2px_7px_rgba(30,20,18,.16)]">
                                      <Check className="h-2.5 w-2.5 stroke-[2.4] text-[#4F4540]" />
                                    </span>
                                  </span>
                                )}
                              </span>

                              <span className={`mt-1.5 max-w-full truncate px-1 text-[8px] ${active ? "font-semibold text-[#B65E65]" : "text-[#786D67]"}`}>{color.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {colorsAvailable.length > 11 && (
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <span className="h-px w-7 bg-[#E8DEDA]" />
                        <span className="text-[7px] text-[#ADA39E]">اسحب لعرض المزيد</span>
                        <span className="h-px w-7 bg-[#E8DEDA]" />
                      </div>
                    )}
                  </div>

                  {/* SIZES */}
                  {sizesAvailable.length > 0 && (
                    <div className="border-b border-[#F0E8E5] py-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-semibold text-[#403632]">المقاس</p>
                          <p className="mt-0.5 text-[8px] text-[#AAA09A]">اختر المقاس المطلوب</p>
                        </div>

                        {draftSizeFilter !== "all" && <button onClick={() => setDraftParam("size", null)} className="text-[8px] font-medium text-[#B76269]">مسح</button>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setDraftParam("size", null)} className={`min-w-[44px] rounded-xl px-3 py-2 text-[9px] font-medium ${draftSizeFilter === "all" ? "border border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border border-[#E4DAD6] bg-white text-[#655A55]"}`}>الكل</button>

                        {sizesAvailable.map((size) => (
                          <button key={size} onClick={() => setDraftParam("size", size)} className={`min-w-[44px] rounded-xl px-3 py-2 text-[9px] font-medium ${draftSizeFilter === size ? "border border-[#D4777D] bg-[#FAEDEC] text-[#B95F66]" : "border border-[#E4DAD6] bg-white text-[#655A55]"}`}>{size}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PRICE */}
                  <div className="border-b border-[#F0E8E5] py-5">
                    <div className="mb-4 flex items-end justify-between">
                      <div>
                        <p className="text-[12px] font-semibold text-[#403632]">نطاق السعر</p>
                        <p className="mt-0.5 text-[8px] text-[#AAA09A]">حدد ميزانيتك</p>
                      </div>

                      <div className="rounded-full bg-[#F8F2EF] px-3 py-1.5 text-[9px] font-medium text-[#8B6967]">
                        {Math.round(priceRange[0])} — {Math.round(priceRange[1])}
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[#EAE0DC] bg-white px-4 py-5 shadow-[0_5px_18px_rgba(60,42,36,.025)]">
                      <Slider value={[priceRange[0], priceRange[1]]} min={filterPriceBounds.min} max={filterPriceBounds.max} step={1} onValueChange={(values) => { if (values.length === 2) setPriceRange([values[0], values[1]]); }} onValueCommit={(values) => { if (values.length === 2) commitDraftPriceRange([values[0], values[1]]); }} />

                      <div className="mt-4 flex items-center justify-between text-[8px] text-[#A19792]">
                        <span>{filterPriceBounds.min}</span>
                        <span>{filterPriceBounds.max}</span>
                      </div>
                    </div>
                  </div>

                  {/* STATUS */}
                  <div className="py-5">
                    <div className="mb-3">
                      <p className="text-[12px] font-semibold text-[#403632]">الحالة</p>
                      <p className="mt-0.5 text-[8px] text-[#AAA09A]">خيارات إضافية</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button onClick={() => setDraftParam("sale", draftSaleOnly ? null : "1")} className={`relative min-h-[54px] overflow-hidden rounded-[15px] border px-3 text-right transition-all ${draftSaleOnly ? "border-[#D4777D] bg-[#FAEDEC]" : "border-[#E7DDD9] bg-white"}`}>
                        <span className={`block text-[10px] font-semibold ${draftSaleOnly ? "text-[#B85E65]" : "text-[#554A45]"}`}>العروض فقط</span>
                        <span className="mt-1 block text-[7px] text-[#A29892]">المنتجات المخفضة</span>

                        {draftSaleOnly && <Check className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C6666D]" />}
                      </button>

                      <button onClick={() => setDraftParam("stock", draftInStockOnly ? null : "1")} className={`relative min-h-[54px] overflow-hidden rounded-[15px] border px-3 text-right transition-all ${draftInStockOnly ? "border-[#D4777D] bg-[#FAEDEC]" : "border-[#E7DDD9] bg-white"}`}>
                        <span className={`block text-[10px] font-semibold ${draftInStockOnly ? "text-[#B85E65]" : "text-[#554A45]"}`}>المتوفر فقط</span>
                        <span className="mt-1 block text-[7px] text-[#A29892]">جاهز للطلب</span>

                        {draftInStockOnly && <Check className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#C6666D]" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* BOTTOM */}
                <div className="shrink-0 border-t border-[#EDE4E0] bg-[#FFFDFC]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+13px)] pt-3 backdrop-blur-xl md:px-6 md:pb-5">
                  <div className="grid grid-cols-[.85fr_1.45fr] gap-2.5">
                    <button onClick={resetDraftFilters} className="flex h-[47px] items-center justify-center gap-1.5 rounded-[14px] border border-[#DFD4CF] bg-white text-[10px] font-medium text-[#6B5F59]">
                      <RotateCcw className="h-3.5 w-3.5 stroke-[1.6]" />
                      إعادة تعيين
                    </button>

                    <button onClick={applyDraftFilters} className="h-[47px] rounded-[14px] bg-[#D4777D] text-[11px] font-semibold text-white shadow-[0_7px_22px_rgba(212,119,125,.23)]">
                      {filterMetadataLoading ? "جاري التجهيز..." : `عرض ${draftResultCount} منتج`}
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
