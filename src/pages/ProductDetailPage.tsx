import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Heart, Minus, Package, Plus, RotateCcw, Share2, Shield, ShoppingBag, ShoppingCart, Star, Truck } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductReviews from "@/components/ProductReviews";
import ProductQA from "@/components/ProductQA";
import AccessoryCard from "@/components/AccessoryCard";
import ProductDetailSkeleton from "@/components/ProductDetailSkeleton";

import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useStore, Product } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { toast } from "@/hooks/use-toast";
import { useCurrency } from "@/lib/currency";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

type ProductAccessory = {
  name: string;
  name_ar: string;
  price: number;
  image_url?: string;
  description?: string;
  description_ar?: string;
};

type ProductFeature = {
  icon: string;
  title: string;
  desc: string;
};

type ProductColorVariant = {
  name: string;
  hex: string;
  hex2?: string;
  images: string[];
  sizes?: Array<string | { size: string; stock: number }>;
  stock?: number;
};

type ProductSpec = {
  label: string;
  value: string;
};

type QualityVariant = {
  id?: string;
  name: string;
  price: number;
  description?: string;
  images?: string[];
  in_stock?: boolean;
};

const WHATSAPP_URL = "https://wa.me/967778579777";

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { addToCart } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items: recentItems, add: addRecent } = useRecentlyViewed();
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();

  const country = "GLOBAL" as any;

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [selectedQualityIdx, setSelectedQualityIdx] = useState<number | null>(null);
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const [openSection, setOpenSection] = useState<"details" | "specs" | "return" | "delivery" | null>("details");

  /* =========================================================
     PRODUCT
  ========================================================= */

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,name_ar,slug,price,cost_price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants").eq("slug", slug).eq("is_active", true).maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const accessories = (data as any).accessories || [];
      const colorVariants = ((data as any).color_variants || []) as ProductColorVariant[];

      const baseImages = data.images?.length ? data.images : colorVariants?.[0]?.images || [];

      return {
        id: data.id,
        name: data.name,
        nameAr: data.name_ar,
        slug: data.slug,
        price: Number(data.price),
        costPrice: data.cost_price ? Number(data.cost_price) : undefined,
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        discount: data.discount || undefined,
        description: data.description || "",
        descriptionAr: data.description_ar || "",
        images: baseImages,
        category: data.category,
        categoryId: (data as any).category_id || undefined,
        brand: data.brand,
        inStock: data.in_stock ?? true,
        stockQuantity: typeof (data as any).stock_quantity === "number" ? (data as any).stock_quantity : undefined,
        countries: (data.countries || ["GLOBAL"]) as Product["countries"],
        isFeatured: data.is_featured,
        isBestSeller: data.is_best_seller,
        hasSizes: (data as any).has_sizes ?? false,
        sizes: (data as any).sizes || [],
        accessories: accessories as ProductAccessory[],
        features: ((data as any).features || []) as ProductFeature[],
        colorVariants,
        specs: ((data as any).specs || []) as ProductSpec[],
        returnPolicy: (data as any).return_policy as string | null,
        hasQualityVariants: (data as any).has_quality_variants ?? false,
        qualityVariants: ((data as any).quality_variants || []) as QualityVariant[],
      };
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     RETURN POLICY
  ========================================================= */

  const { data: defaultReturnPolicy } = useQuery({
    queryKey: ["default-return-policy"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "default_return_policy").maybeSingle();

      const value = data?.value;

      return (typeof value === "string" ? value : value ?? null) as string | null;
    },
    staleTime: 1000 * 60 * 10,
  });

  /* =========================================================
     RELATED PRODUCTS
  ========================================================= */

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", (product as any)?.categoryId, product?.id, country],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).eq("category_id", (product as any).categoryId).neq("id", product!.id).contains("countries", [country]).limit(4);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    enabled: !!product && !!country && !!(product as any)?.categoryId,
    staleTime: 1000 * 60 * 5,
  });

  /* =========================================================
     INITIAL COLOR
  ========================================================= */

  useEffect(() => {
    if (product?.colorVariants?.length && selectedColorIdx === null) {
      setSelectedColorIdx(0);
    }
  }, [product, selectedColorIdx]);

  /* =========================================================
     PRELOAD FIRST COLOR IMAGES
  ========================================================= */

  useEffect(() => {
    if (!product?.colorVariants?.length) return;

    product.colorVariants.slice(0, 6).forEach((color) => {
      const src = color.images?.[0];

      if (!src) return;

      const img = new Image();
      img.src = optimizeImage(src, 900, 76);
    });
  }, [product]);

  /* =========================================================
     RECENTLY VIEWED
  ========================================================= */

  useEffect(() => {
    if (!product) return;

    addRecent(product as Product);
  }, [product?.id]);

  /* =========================================================
     SEO
  ========================================================= */

  useEffect(() => {
    if (!product) return;

    const siteUrl = "https://flamingopark.store";
    const productUrl = `${siteUrl}/product/${encodeURIComponent(product.slug)}`;
    const title = `${product.nameAr || product.name} | Flamingo Park`;
    const description = product.descriptionAr || product.description || `تسوّق ${product.nameAr || product.name} من Flamingo Park.`;
    const image = product.images?.[0] || `${siteUrl}/icons/flamingo.jpeg`;
    const previousTitle = document.title;

    const setMeta = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      const previousContent = element?.content;

      if (element) {
        element.content = content;
      }

      return () => {
        if (element && previousContent !== undefined) {
          element.content = previousContent;
        }
      };
    };

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.href;

    if (canonical) {
      canonical.href = productUrl;
    }

    document.title = title;

    const restore = [
      setMeta('meta[name="description"]', description),
      setMeta('meta[property="og:title"]', title),
      setMeta('meta[property="og:description"]', description),
      setMeta('meta[property="og:url"]', productUrl),
      setMeta('meta[property="og:image"]', image),
      setMeta('meta[name="twitter:title"]', title),
      setMeta('meta[name="twitter:description"]', description),
      setMeta('meta[name="twitter:url"]', productUrl),
      setMeta('meta[name="twitter:image"]', image),
    ];

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.nameAr || product.name,
      description,
      image: product.images?.length ? product.images : [image],
      sku: product.id,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      offers: {
        "@type": "Offer",
        url: productUrl,
        priceCurrency: "YER",
        price: product.price,
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    };

    document.getElementById("product-json-ld")?.remove();

    const script = document.createElement("script");

    script.id = "product-json-ld";
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);

    document.head.appendChild(script);

    return () => {
      document.title = previousTitle;

      restore.forEach((restoreMeta) => restoreMeta());

      if (canonical && previousCanonical) {
        canonical.href = previousCanonical;
      }

      script.remove();
    };
  }, [product]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDFC]" dir="rtl">
        <div className="px-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FAECE9]">
            <ShoppingBag className="h-6 w-6 stroke-[1.4] text-[#C66C72]" />
          </span>

          <h1 className="mt-4 text-[20px] font-semibold text-[#443633]">المنتج غير موجود</h1>

          <p className="mt-2 text-[9px] text-[#968782]">قد يكون المنتج قد نفد أو لم يعد متاحًا.</p>

          <button type="button" onClick={() => navigate("/products")} className="mt-5 h-11 rounded-[12px] bg-[#D4777D] px-7 text-[9px] font-semibold text-white">
            تصفح المنتجات
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     PRICE + VARIANTS
  ========================================================= */

  const accessoriesTotal =
    product.accessories?.reduce((sum, accessory, index) => {
      const key = `${index}-${accessory.name_ar}`;

      return sum + accessory.price * (accessoryQuantities[key] || 0);
    }, 0) || 0;

  const activeQuality = product.hasQualityVariants && selectedQualityIdx !== null ? product.qualityVariants?.[selectedQualityIdx] : null;

  const effectivePrice = activeQuality ? Number(activeQuality.price) : product.price;
  const effectiveDescription = activeQuality?.description || product.descriptionAr || product.description;
  const totalPrice = effectivePrice + accessoriesTotal;
  const currency = currencySymbol;

  const activeColorVariant = selectedColorIdx !== null ? product.colorVariants?.[selectedColorIdx] : null;
  const qualityImages = activeQuality?.images?.length ? activeQuality.images : null;

  const displayImages = qualityImages?.length ? qualityImages : activeColorVariant?.images?.length ? activeColorVariant.images : product.images?.length ? product.images : ["/placeholder.svg"];

  const sizesToShow = (activeColorVariant?.sizes?.length ? activeColorVariant.sizes : product.sizes || []).map((entry) => (typeof entry === "string" ? entry : entry.size));

  const selectedSizeStock = activeColorVariant?.sizes?.find((entry) => typeof entry !== "string" && entry.size === selectedSize);

  const activeStock =
    typeof selectedSizeStock === "object"
      ? selectedSizeStock.stock
      : activeColorVariant?.sizes?.length
        ? undefined
        : activeColorVariant?.stock ?? product.stockQuantity;

  const effectiveReturnPolicy = product.returnPolicy || defaultReturnPolicy;

  const available = activeQuality?.in_stock === false ? false : typeof activeStock === "number" ? activeStock > 0 : product.inStock;

  const lowStock = typeof activeStock === "number" && activeStock > 0 && activeStock <= 5;

  const isLiked = isFavorite(product.id);

  /* =========================================================
     ACCESSORY
  ========================================================= */

  const updateAccessoryQuantity = (key: string, delta: number) => {
    setAccessoryQuantities((current) => ({
      ...current,
      [key]: Math.max(0, (current[key] || 0) + delta),
    }));
  };

  /* =========================================================
     VALIDATION
  ========================================================= */

  const validateSelection = () => {
    if (!available) {
      toast({
        title: "المنتج غير متوفر حالياً",
        variant: "destructive",
      });

      return false;
    }

    if (sizesToShow.length > 0 && !selectedSize) {
      toast({
        title: "اختر المقاس أولاً",
        description: "يرجى تحديد المقاس قبل المتابعة.",
        variant: "destructive",
      });

      return false;
    }

    return true;
  };

  /* =========================================================
     ADD TO CART
  ========================================================= */

  const addCurrentProductToCart = () => {
    const selectedAccessories =
      product.accessories
        ?.map((accessory, index) => ({
          acc: accessory,
          qty: accessoryQuantities[`${index}-${accessory.name_ar}`] || 0,
        }))
        .filter(({ qty }) => qty > 0)
        .map(({ acc, qty }) => ({
          name: acc.name,
          name_ar: acc.name_ar,
          price: acc.price,
          quantity: qty,
          image_url: acc.image_url,
        })) || [];

    const colorName = activeColorVariant?.name;

    addToCart(product, quantity, selectedSize || undefined, selectedAccessories.length ? selectedAccessories : undefined, undefined, undefined, colorName);
  };

  const handleAddToCart = () => {
    if (!validateSelection()) return;

    addCurrentProductToCart();

    setJustAdded(true);

    window.setTimeout(() => {
      setJustAdded(false);
    }, 3000);

    toast({
      title: "تمت الإضافة إلى السلة",
      description: `${product.nameAr || product.name} × ${quantity}`,
    });
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;

    addCurrentProductToCart();

    navigate("/cart");
  };

  /* =========================================================
     SHARE
  ========================================================= */

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product.nameAr || product.name,
          text: product.descriptionAr || product.description,
          url: window.location.href,
        });

        return;
      }

      await navigator.clipboard.writeText(window.location.href);

      toast({
        title: "تم نسخ رابط المنتج",
      });
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.href);

        toast({
          title: "تم نسخ رابط المنتج",
        });
      } catch {
        toast({
          title: "تعذر مشاركة الرابط",
          variant: "destructive",
        });
      }
    }
  };

  /* =========================================================
     GALLERY
  ========================================================= */

  const nextImage = () => {
    setSelectedImage((current) => (current === displayImages.length - 1 ? 0 : current + 1));
  };

  const prevImage = () => {
    setSelectedImage((current) => (current === 0 ? displayImages.length - 1 : current - 1));
  };

  const goToImage = (index: number) => {
    setSelectedImage(index);
  };

  /* =========================================================
     FEATURES
  ========================================================= */

  const defaultFeatures: ProductFeature[] = [
    {
      icon: "truck",
      title: "توصيل سريع",
      desc: "2 - 7 أيام",
    },
    {
      icon: "rotate",
      title: "إرجاع سهل",
      desc: "حسب السياسة",
    },
    {
      icon: "shield",
      title: "منتج موثوق",
      desc: "جودة مضمونة",
    },
  ];

  const features = product.features?.length ? product.features.slice(0, 3) : defaultFeatures;

  const getFeatureIcon = (icon: string) => {
    const icons = {
      truck: Truck,
      shield: Shield,
      rotate: RotateCcw,
      star: Star,
      check: Check,
    };

    return icons[icon as keyof typeof icons] || Truck;
  };

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      {/* =====================================================
          DESKTOP NAVBAR
      ===================================================== */}

      <div className="hidden md:block">
        <Navbar />
      </div>

      <CartDrawer />

      {/* =====================================================
          MOBILE HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 flex h-[50px] items-center justify-between border-b border-[#EEE4E0] bg-white px-2 md:hidden">
        <button type="button" onClick={() => navigate(-1)} aria-label="رجوع" className="flex h-10 w-10 items-center justify-center rounded-full text-[#443A37] active:bg-[#FFF5F3]">
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <button type="button" onClick={() => navigate("/home")} aria-label="Flamingo Park" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={38} height={38} className="h-[38px] w-[38px] object-contain" />
        </button>

        <div className="flex items-center">
          <button type="button" onClick={() => navigate("/cart")} aria-label="السلة" className="flex h-9 w-9 items-center justify-center rounded-full text-[#443A37] active:bg-[#FFF5F3]">
            <ShoppingCart className="h-[19px] w-[19px]" strokeWidth={1.5} />
          </button>

          <button type="button" onClick={() => toggleFavorite(product as Product)} aria-label="المفضلة" className="flex h-9 w-9 items-center justify-center rounded-full text-[#443A37] active:bg-[#FFF5F3]">
            <Heart className={`h-[19px] w-[19px] ${isLiked ? "fill-[#D4777D] text-[#D4777D]" : ""}`} strokeWidth={1.5} />
          </button>

          <button type="button" onClick={handleShare} aria-label="مشاركة المنتج" className="flex h-9 w-9 items-center justify-center rounded-full text-[#443A37] active:bg-[#FFF5F3]">
            <Share2 className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="pb-[88px] md:pb-16 md:pt-4">
        <div className="mx-auto w-full max-w-[1380px] md:px-6">
          {/* =================================================
              BREADCRUMB
          ================================================= */}

          <nav className="mb-4 hidden items-center gap-2 text-[9px] text-[#A0928D] md:flex" aria-label="مسار التنقل">
            <button type="button" onClick={() => navigate("/home")} className="transition-colors hover:text-[#B86168]">
              الرئيسية
            </button>

            <ChevronLeft className="h-3 w-3" strokeWidth={1.4} />

            <button type="button" onClick={() => navigate("/products")} className="transition-colors hover:text-[#B86168]">
              المنتجات
            </button>

            <ChevronLeft className="h-3 w-3" strokeWidth={1.4} />

            <span className="max-w-[300px] truncate text-[#554844]">{product.nameAr || product.name}</span>
          </nav>

          {/* =================================================
              MAIN PRODUCT
          ================================================= */}

          <div className="grid grid-cols-1 bg-white md:overflow-hidden md:rounded-[18px] md:border md:border-[#EDE3DF] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
            {/* ===============================================
                GALLERY
            =============================================== */}

            <section className="min-w-0 bg-white lg:border-l lg:border-[#EDE3DF]">
              <div className="lg:sticky lg:top-[98px]">
                <div className="relative aspect-[1/1.08] w-full overflow-hidden bg-[#F6F4F2] sm:aspect-[1/0.95] lg:aspect-[4/5]">
                  <motion.div key={`${activeColorVariant?.name || "default"}-${selectedQualityIdx ?? "default"}-${selectedImage}`} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.14 }} drag={displayImages.length > 1 ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} dragMomentum={false} onDragEnd={(_, info) => { if (displayImages.length <= 1) return; if (info.offset.x < -55 || info.velocity.x < -450) { nextImage(); return; } if (info.offset.x > 55 || info.velocity.x > 450) prevImage(); }} style={{ touchAction: "pan-y" }} className="h-full w-full cursor-grab active:cursor-grabbing">
                    <TransformWrapper minScale={1} maxScale={4} centerOnInit centerZoomedOut limitToBounds panning={{ disabled: true }} wheel={{ disabled: true }} doubleClick={{ disabled: true }}>
                      <TransformComponent wrapperClass="!h-full !w-full !overflow-hidden" contentClass="!h-full !w-full">
                        <img src={optimizeImage(displayImages[selectedImage] || displayImages[0], 1400, 84)} alt={product.nameAr || product.name} fetchPriority="high" decoding="async" onError={handleImageError} draggable={false} className="h-full w-full select-none object-contain object-center" />
                      </TransformComponent>
                    </TransformWrapper>
                  </motion.div>

                  {/* DISCOUNT */}

                  {!!product.discount && <span className="absolute right-3 top-3 z-10 rounded-[6px] bg-[#D4777D] px-2 py-1 text-[9px] font-semibold text-white md:right-5 md:top-5">-{product.discount}%</span>}

                  {/* IMAGE COUNTER */}

                  <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full border border-[#E8DDD9] bg-white/95 px-2.5 py-1 text-[8px] font-semibold text-[#A95B61] md:bottom-5 md:right-5">
                    {selectedImage + 1} / {displayImages.length}
                  </span>

                  {/* ARROWS */}

                  {displayImages.length > 1 && (
                    <>
                      <button type="button" onClick={prevImage} aria-label="الصورة السابقة" className="absolute right-4 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E7DDD9] bg-white/95 text-[#786863] shadow-sm md:flex">
                        <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
                      </button>

                      <button type="button" onClick={nextImage} aria-label="الصورة التالية" className="absolute left-4 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#E7DDD9] bg-white/95 text-[#786863] shadow-sm md:flex">
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
                      </button>
                    </>
                  )}

                  {/* MOBILE DOTS */}

                  {displayImages.length > 1 && (
                    <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 md:hidden">
                      {displayImages.slice(0, 8).map((_, index) => (
                        <span key={index} className={`h-1 rounded-full transition-all ${selectedImage === index ? "w-4 bg-[#D4777D]" : "w-1 bg-[#C9BFBB]"}`} />
                      ))}
                    </div>
                  )}
                </div>

                {/* THUMBNAILS */}

                {displayImages.length > 1 && (
                  <div className="border-b border-[#EEE4E0] bg-white">
                    <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-4 md:py-3">
                      {displayImages.map((image, index) => (
                        <button type="button" key={`${image}-${index}`} onClick={() => goToImage(index)} aria-label={`عرض الصورة ${index + 1}`} className={`relative h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[8px] bg-[#F6F4F2] transition md:h-[66px] md:w-[66px] ${selectedImage === index ? "ring-1 ring-[#C96F79] ring-offset-2" : "opacity-70 hover:opacity-100"}`}>
                          <img src={optimizeImage(image, 220, 78)} alt="" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center p-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ===============================================
                DETAILS
            =============================================== */}

            <section className="min-w-0 bg-white lg:px-6 lg:py-6">
              {/* TITLE */}

              <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0 lg:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {product.brand && (
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className="h-[2px] w-3 bg-[#D4777D]" />
                        <span className="text-[8px] font-semibold tracking-[0.08em] text-[#B86168]">{product.brand}</span>
                      </div>
                    )}

                    <h1 className="text-[16px] font-semibold leading-[1.65] tracking-[-0.025em] text-[#302725] md:text-[20px]">{product.nameAr || product.name}</h1>
                  </div>

                  {/* DESKTOP ACTIONS */}

                  <div className="hidden shrink-0 items-center gap-1 lg:flex">
                    <button type="button" onClick={() => toggleFavorite(product as Product)} aria-label="المفضلة" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DDD9] text-[#746762] hover:bg-[#FFF7F5]">
                      <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-[#D4777D] text-[#D4777D]" : ""}`} strokeWidth={1.5} />
                    </button>

                    <button type="button" onClick={handleShare} aria-label="مشاركة" className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E7DDD9] text-[#746762] hover:bg-[#FFF7F5]">
                      <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* RATING */}

                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-[1px]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-[11px] w-[11px] fill-[#DCA653] text-[#DCA653]" strokeWidth={1} />
                    ))}
                  </div>

                  <span className="text-[8px] font-semibold text-[#665853]">4.7</span>
                  <span className="text-[8px] text-[#A49792]">(128 تقييم)</span>
                </div>

                {/* PRICE */}

                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <span className="text-[21px] font-bold leading-none text-[#B86168] md:text-[24px]">{formatCurrency(totalPrice * quantity)}</span>

                  {product.originalPrice && !activeQuality && <span className="text-[9px] text-[#AA9B96] line-through">{formatCurrency(product.originalPrice)}</span>}

                  {!!product.discount && <span className="rounded-full bg-[#FFF0EE] px-2 py-1 text-[7px] font-semibold text-[#B45D63]">خصم {product.discount}%</span>}
                </div>

                {/* STOCK */}

                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${available ? (lowStock ? "bg-[#D99855]" : "bg-[#6E9574]") : "bg-[#C96767]"}`} />

                  <p className={`text-[8px] font-medium ${available ? (lowStock ? "text-[#A96D39]" : "text-[#527258]") : "text-[#A95959]"}`}>
                    {available ? (typeof activeStock === "number" ? `متوفر — ${activeStock} قطعة${lowStock ? " فقط" : ""}` : "متوفر الآن") : "غير متوفر حالياً"}
                  </p>
                </div>
              </div>

              {/* ===============================================
                  QUALITY
              =============================================== */}

              {product.hasQualityVariants && product.qualityVariants?.length > 0 && (
                <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#413633]">الجودة / الخامة</span>
                    <span className="text-[8px] text-[#9B8D88]">{activeQuality?.name || "اختر"}</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {product.qualityVariants.map((variant, index) => {
                      const active = selectedQualityIdx === index;

                      return (
                        <button type="button" key={variant.id || index} onClick={() => { setSelectedQualityIdx(active ? null : index); setSelectedImage(0); }} className={`flex min-w-[145px] items-center gap-2 rounded-[10px] border p-2 text-right ${active ? "border-[#D9A7A4] bg-[#FFF7F5]" : "border-[#E9DFDB] bg-white"}`}>
                          {variant.images?.[0] ? (
                            <img src={optimizeImage(variant.images[0], 160, 78)} alt={variant.name} loading="lazy" decoding="async" onError={handleImageError} className="h-10 w-10 shrink-0 rounded-[7px] bg-[#F6F4F2] object-contain" />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[7px] bg-[#F8F3F1]">
                              <Package className="h-4 w-4 stroke-[1.4] text-[#B96A70]" />
                            </span>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[8px] font-semibold text-[#4C403C]">{variant.name}</p>
                            <p className="mt-1 text-[9px] font-semibold text-[#B86168]">{formatCurrency(Number(variant.price))}</p>
                          </div>

                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#C96F79]" strokeWidth={2} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===============================================
                  COLORS
              =============================================== */}

              {product.colorVariants?.length > 0 && (
                <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#413633]">اللون</span>
                    <span className="text-[8px] text-[#8F807B]">— {selectedColorIdx !== null ? product.colorVariants[selectedColorIdx]?.name : "اختر اللون"}</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {product.colorVariants.map((variant, index) => {
                      const active = selectedColorIdx === index;

                      return (
                        <button type="button" key={`${variant.name}-${index}`} title={variant.name} aria-label={variant.name} onClick={() => { setSelectedColorIdx(index); setSelectedImage(0); setSelectedSize(null); setQuantity(1); }} className={`relative flex h-8 w-8 items-center justify-center rounded-full ${active ? "ring-2 ring-[#D4777D] ring-offset-[3px]" : "ring-1 ring-[#DFD4D0]"}`}>
                          <span className="h-full w-full rounded-full border border-black/[0.06]" style={variant.hex2 ? { background: `linear-gradient(135deg, ${variant.hex} 0%, ${variant.hex} 50%, ${variant.hex2} 50%, ${variant.hex2} 100%)` } : { backgroundColor: variant.hex }} />

                          {active && <Check className="absolute h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.75)]" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===============================================
                  SIZE
              =============================================== */}

              {sizesToShow.length > 0 && (
                <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#413633]">المقاس</span>
                    {selectedSize && <span className="text-[8px] text-[#958782]">المختار: {selectedSize}</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sizesToShow.map((size: string) => (
                      <button type="button" key={size} onClick={() => { setSelectedSize(size); setQuantity(1); }} className={`min-w-[58px] rounded-[8px] border px-3 py-2 text-[9px] font-semibold ${selectedSize === size ? "border-[#D4777D] bg-[#FFF5F3] text-[#A95B61]" : "border-[#E4DAD6] bg-white text-[#5E514D]"}`}>
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===============================================
                  QUANTITY
              =============================================== */}

              <div className="flex items-center justify-between border-b border-[#EEE4E0] px-3.5 py-3 sm:px-5 lg:px-0">
                <div>
                  <span className="block text-[10px] font-semibold text-[#413633]">الكمية</span>
                  <span className="mt-1 block text-[7px] text-[#A0938E]">حدد العدد المطلوب</span>
                </div>

                <div className="flex h-9 items-center overflow-hidden rounded-[9px] border border-[#E4DAD6]">
                  <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="إنقاص الكمية" className="flex h-full w-9 items-center justify-center active:bg-[#FFF5F3]">
                    <Minus className="h-3 w-3" strokeWidth={1.6} />
                  </button>

                  <span className="flex h-full min-w-[38px] items-center justify-center border-x border-[#EEE4E0] text-[10px] font-semibold text-[#A95B61]">{quantity}</span>

                  <button type="button" onClick={() => { if (typeof activeStock === "number" && quantity >= activeStock) { toast({ title: "الكمية غير متوفرة", description: `المتاح: ${activeStock} فقط`, variant: "destructive" }); return; } setQuantity((current) => current + 1); }} aria-label="زيادة الكمية" className="flex h-full w-9 items-center justify-center active:bg-[#FFF5F3]">
                    <Plus className="h-3 w-3" strokeWidth={1.6} />
                  </button>
                </div>
              </div>

              {/* ===============================================
                  TRUST
              =============================================== */}

              <div className="grid grid-cols-3 border-b border-[#EEE4E0] bg-[#FFFBFA]">
                {features.map((feature, index) => {
                  const Icon = getFeatureIcon(feature.icon);

                  return (
                    <div key={`${feature.title}-${index}`} className={`flex min-h-[72px] flex-col items-center justify-center px-1.5 py-2.5 text-center ${index !== features.length - 1 ? "border-l border-[#EEE4E0]" : ""}`}>
                      <Icon className="mb-1 h-4 w-4 text-[#C66C72]" strokeWidth={1.4} />
                      <span className="text-[8px] font-semibold leading-4 text-[#4E423E]">{feature.title}</span>
                      <span className="text-[7px] leading-4 text-[#998B86]">{feature.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* ===============================================
                  ACCESSORIES
              =============================================== */}

              {product.accessories?.length > 0 && (
                <div className="border-b border-[#EEE4E0] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3">
                    <h2 className="text-[10px] font-semibold text-[#413633]">إضافات اختيارية</h2>
                    <p className="mt-1 text-[7px] text-[#A0938E]">يمكن إضافتها إلى طلبك</p>
                  </div>

                  <div className="space-y-2">
                    {product.accessories.map((accessory, index) => {
                      const key = `${index}-${accessory.name_ar}`;

                      return <AccessoryCard key={key} accessory={accessory} quantity={accessoryQuantities[key] || 0} currency={currency} onQuantityChange={(delta) => updateAccessoryQuantity(key, delta)} />;
                    })}
                  </div>
                </div>
              )}

              {/* ===============================================
                  ACCORDIONS
              =============================================== */}

              <div className="divide-y divide-[#EEE4E0]">
                {/* DETAILS */}

                <div>
                  <button type="button" onClick={() => setOpenSection(openSection === "details" ? null : "details")} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                    <span className="text-[10px] font-semibold text-[#413633]">تفاصيل المنتج</span>

                    <ChevronDown className={`h-3.5 w-3.5 text-[#A95B61] transition-transform ${openSection === "details" ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>

                  {openSection === "details" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                      <div className="px-3.5 pb-4 sm:px-5 lg:px-0">
                        <p className="whitespace-pre-line text-[9px] leading-6 text-[#796A65]">{effectiveDescription || "منتج مختار بعناية من فلامنجو بارك."}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* SPECS */}

                {product.specs?.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setOpenSection(openSection === "specs" ? null : "specs")} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                      <span className="text-[10px] font-semibold text-[#413633]">المواصفات</span>

                      <ChevronDown className={`h-3.5 w-3.5 text-[#A95B61] transition-transform ${openSection === "specs" ? "rotate-180" : ""}`} strokeWidth={1.5} />
                    </button>

                    {openSection === "specs" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                        <dl className="px-3.5 pb-4 sm:px-5 lg:px-0">
                          {product.specs.map((spec, index) => (
                            <div key={`${spec.label}-${index}`} className="flex items-start justify-between gap-4 border-b border-[#F2EBE8] py-2.5 last:border-0">
                              <dt className="text-[8px] text-[#998B86]">{spec.label}</dt>
                              <dd className="max-w-[65%] text-left text-[8px] font-semibold text-[#4E423E]">{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* DELIVERY */}

                <div>
                  <button type="button" onClick={() => setOpenSection(openSection === "delivery" ? null : "delivery")} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.4} />
                      <span className="text-[10px] font-semibold text-[#413633]">الشحن والتوصيل</span>
                    </div>

                    <ChevronDown className={`h-3.5 w-3.5 text-[#A95B61] transition-transform ${openSection === "delivery" ? "rotate-180" : ""}`} strokeWidth={1.5} />
                  </button>

                  {openSection === "delivery" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                      <div className="px-3.5 pb-4 text-[9px] leading-6 text-[#796A65] sm:px-5 lg:px-0">
                        <p>التوصيل داخل عدن يتم في نفس اليوم حسب توفر المنتج ووقت الطلب.</p>
                        <p className="mt-1">التوصيل إلى بقية المحافظات يستغرق عادة من 2 إلى 7 أيام حسب المنطقة وإجراءات الشحن.</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* RETURN */}

                {effectiveReturnPolicy && (
                  <div>
                    <button type="button" onClick={() => setOpenSection(openSection === "return" ? null : "return")} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.4} />
                        <span className="text-[10px] font-semibold text-[#413633]">الإرجاع والاستبدال</span>
                      </div>

                      <ChevronDown className={`h-3.5 w-3.5 text-[#A95B61] transition-transform ${openSection === "return" ? "rotate-180" : ""}`} strokeWidth={1.5} />
                    </button>

                    {openSection === "return" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                        <div className="px-3.5 pb-4 sm:px-5 lg:px-0">
                          <p className="whitespace-pre-line text-[9px] leading-6 text-[#796A65]">{effectiveReturnPolicy}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* ===============================================
                  SUCCESS
              =============================================== */}

              {justAdded && (
                <div className="mx-3.5 mb-4 flex items-center justify-between gap-3 rounded-[10px] border border-[#E8C9C6] bg-[#FFF6F4] px-3 py-2.5 sm:mx-5 lg:mx-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D4777D]">
                      <Check className="h-3 w-3 text-white" strokeWidth={2.2} />
                    </span>

                    <div>
                      <p className="text-[8px] font-semibold text-[#A95B61]">تمت الإضافة إلى السلة</p>
                      <p className="mt-0.5 text-[7px] text-[#9D7878]">الكمية: {quantity}</p>
                    </div>
                  </div>

                  <button type="button" onClick={() => navigate("/cart")} className="text-[8px] font-semibold text-[#A95B61]">
                    عرض السلة
                  </button>
                </div>
              )}

              {/* ===============================================
                  DESKTOP BUY
              =============================================== */}

              <div className="hidden border-t border-[#EEE4E0] pt-5 lg:block">
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddToCart} disabled={!available} className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#D4777D] bg-white px-5 text-[10px] font-semibold text-[#B86168] transition-colors hover:bg-[#FFF7F5] disabled:cursor-not-allowed disabled:opacity-40">
                    <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
                    أضف إلى السلة
                  </button>

                  <button type="button" onClick={handleBuyNow} disabled={!available} className="h-[46px] flex-1 rounded-[10px] bg-[#D4777D] px-5 text-[10px] font-semibold text-white transition-colors hover:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-40">
                    اشتري الآن
                  </button>

                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="واتساب" className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] border border-[#E4DAD6] bg-white text-[#4F8C64]">
                    <FaWhatsapp className="h-[18px] w-[18px]" />
                  </a>
                </div>
              </div>
            </section>
          </div>

          {/* =================================================
              BELOW CONTENT
          ================================================= */}

          <div className="mt-2 bg-white px-3.5 sm:px-5 md:mt-6 md:rounded-[18px] md:border md:border-[#EDE3DF] md:px-6">
            {/* STORE */}

            <section className="flex items-center justify-between border-b border-[#EEE4E0] py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                  <ShoppingBag className="h-4 w-4 text-[#C66C72]" strokeWidth={1.4} />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[10px] font-semibold text-[#403633]">Flamingo Park</p>
                    <Shield className="h-3 w-3 text-[#C66C72]" strokeWidth={1.6} />
                  </div>

                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-[#DCA653] text-[#DCA653]" strokeWidth={1} />
                    <span className="text-[7px] font-semibold text-[#665853]">4.8</span>
                    <span className="text-[7px] text-[#A49792]">متجر موثوق</span>
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => navigate("/products")} className="h-8 rounded-full border border-[#DDB9B5] px-3 text-[7px] font-semibold text-[#A95B61] active:bg-[#FFF7F5]">
                عرض المتجر
              </button>
            </section>

            {/* QA */}

            <section className="py-5 md:py-7">
              <ProductQA productId={product.id} />
            </section>

            {/* REVIEWS */}

            <section className="border-t border-[#EEE4E0] py-5 md:py-7">
              <ProductReviews productId={product.id} productName={product.nameAr || product.name} />
            </section>
          </div>

          {/* =================================================
              RELATED
          ================================================= */}

          {relatedProducts.length > 0 && (
            <section className="mt-2 bg-white px-2.5 py-5 md:mt-6 md:rounded-[18px] md:border md:border-[#EDE3DF] md:px-6 md:py-7">
              <div className="mb-4 flex items-end justify-between px-0.5">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-[2px] w-4 bg-[#D4777D]" />
                    <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FOR YOU</span>
                  </div>

                  <h2 className="text-[15px] font-semibold text-[#403633] md:text-[19px]">قد يعجبك أيضاً</h2>
                </div>

                <button type="button" onClick={() => navigate("/products")} className="text-[7px] font-semibold text-[#A95B61]">
                  عرض الكل
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 md:gap-x-4 md:gap-y-7 lg:grid-cols-4">
                {relatedProducts.map((item, index) => (
                  <ProductCard key={item.id} product={item} index={index} />
                ))}
              </div>
            </section>
          )}

          {/* =================================================
              RECENT
          ================================================= */}

          {recentItems.filter((item) => item.id !== product.id).length > 0 && (
            <section className="mt-2 bg-white px-2.5 py-5 md:mt-6 md:rounded-[18px] md:border md:border-[#EDE3DF] md:px-6 md:py-7">
              <div className="mb-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-[2px] w-4 bg-[#D4777D]" />
                  <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">RECENTLY VIEWED</span>
                </div>

                <h2 className="text-[15px] font-semibold text-[#403633] md:text-[19px]">شاهدت مؤخراً</h2>
              </div>

              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 md:gap-x-4 md:gap-y-7 lg:grid-cols-4">
                {recentItems
                  .filter((item) => item.id !== product.id)
                  .slice(0, 4)
                  .map((item, index) => (
                    <ProductCard key={item.id} product={item} index={index} />
                  ))}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* =====================================================
          MOBILE BUY BAR
      ===================================================== */}

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#EDE3DF] bg-white px-2.5 pt-2 shadow-[0_-5px_18px_rgba(50,35,30,0.06)] lg:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
        <div className="flex h-[49px] gap-2">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="واتساب" className="flex h-full w-[46px] shrink-0 items-center justify-center rounded-[10px] border border-[#E4DAD6] bg-white text-[#4F8C64]">
            <FaWhatsapp className="h-[18px] w-[18px]" />
          </a>

          <button type="button" onClick={handleAddToCart} disabled={!available} className="flex h-full flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#D4777D] bg-white px-2 text-[9px] font-semibold text-[#B86168] active:bg-[#FFF7F5] disabled:opacity-40">
            <ShoppingBag className="h-[15px] w-[15px]" strokeWidth={1.6} />
            <span>{available ? "أضف للسلة" : "غير متوفر"}</span>
          </button>

          <button type="button" onClick={handleBuyNow} disabled={!available} className="h-full flex-1 rounded-[10px] bg-[#D4777D] px-2 text-[9px] font-semibold text-white active:bg-[#C96B72] disabled:opacity-40">
            اشتري الآن
          </button>
        </div>
      </div>

      <div className="pb-[72px] lg:pb-0">
        <Footer />
      </div>
    </div>
  );
};

export default ProductDetailPage;