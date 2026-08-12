import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import ProductQA from '@/components/ProductQA';
import AccessoryCard from '@/components/AccessoryCard';
import ProductDetailSkeleton from '@/components/ProductDetailSkeleton';
import { Button } from '@/components/ui/button';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useStore, Product } from '@/store/useStore';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCT_CARD_SELECT, mapProductCard } from '@/lib/productCardData';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/lib/currency';
import { ShoppingBag, ShoppingCart, Share2, ChevronLeft, ChevronRight, Minus, Plus, Check, Heart, Truck, Shield, RotateCcw, Star, Package, ChevronDown } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { optimizeImage, handleImageError } from '@/lib/imageUrl';

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

const WHATSAPP_URL = 'https://wa.me/967778579777';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStore();
  const country = 'GLOBAL' as any;
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items: recentItems, add: addRecent } = useRecentlyViewed();
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [selectedQualityIdx, setSelectedQualityIdx] = useState<number | null>(null);
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const [openSection, setOpenSection] = useState<'details' | 'specs' | 'return' | 'delivery' | null>('details');

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id,name,name_ar,slug,price,cost_price,original_price,discount,description,description_ar,images,category,category_id,brand,in_stock,stock_quantity,countries,is_featured,is_best_seller,accessories,has_sizes,sizes,features,color_variants,specs,return_policy,has_quality_variants,quality_variants').eq('slug', slug).eq('is_active', true).maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const accessories = (data as any).accessories || [];
      const colorVariants = ((data as any).color_variants || []) as ProductColorVariant[];

      const baseImages = data.images?.length > 0 ? data.images : colorVariants?.[0]?.images || [];

      return {
        id: data.id,
        name: data.name,
        nameAr: data.name_ar,
        slug: data.slug,
        price: Number(data.price),
        costPrice: data.cost_price ? Number(data.cost_price) : undefined,
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        discount: data.discount || undefined,
        description: data.description || '',
        descriptionAr: data.description_ar || '',
        images: baseImages,
        category: data.category,
        categoryId: (data as any).category_id || undefined,
        brand: data.brand,
        inStock: data.in_stock ?? true,
        stockQuantity: typeof (data as any).stock_quantity === 'number' ? (data as any).stock_quantity : undefined,
        countries: (data.countries || ['GLOBAL']) as Product['countries'],
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
  });

  const { data: defaultReturnPolicy } = useQuery({
    queryKey: ['default-return-policy'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('site_settings').select('value').eq('key', 'default_return_policy').maybeSingle();
      const value = data?.value;
      return (typeof value === 'string' ? value : value ?? null) as string | null;
    },
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', (product as any)?.categoryId, product?.id, country],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select(PRODUCT_CARD_SELECT).eq('is_active', true).eq('category_id', (product as any).categoryId).neq('id', product!.id).contains('countries', [country]).limit(4);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    enabled: !!product && !!country && !!(product as any)?.categoryId,
  });

  useEffect(() => {
    if (product?.colorVariants?.length && selectedColorIdx === null) setSelectedColorIdx(0);
  }, [product, selectedColorIdx]);

  useEffect(() => {
    if (!product?.colorVariants) return;

    product.colorVariants.forEach((color) => {
      color.images?.forEach((src) => {
        const img = new Image();
        img.src = optimizeImage(src, 1400, 82);
      });
    });
  }, [product]);

  useEffect(() => {
    if (product) addRecent(product as Product);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;

    const siteUrl = 'https://flamingopark.store';
    const productUrl = `${siteUrl}/product/${encodeURIComponent(product.slug)}`;
    const title = `${product.nameAr || product.name} | Flamingo Park`;
    const description = product.descriptionAr || product.description || `تسوّق ${product.nameAr || product.name} من Flamingo Park.`;
    const image = product.images?.[0] || `${siteUrl}/icons/flamingo.jpeg`;
    const previousTitle = document.title;

    const setMeta = (selector: string, content: string) => {
      const element = document.head.querySelector<HTMLMetaElement>(selector);
      const previousContent = element?.content;

      if (element) element.content = content;

      return () => {
        if (element && previousContent !== undefined) element.content = previousContent;
      };
    };

    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousCanonical = canonical?.href;

    if (canonical) canonical.href = productUrl;

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
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.nameAr || product.name,
      description,
      image: product.images?.length ? product.images : [image],
      sku: product.id,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'YER',
        price: product.price,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    };

    const oldScript = document.getElementById('product-json-ld');
    oldScript?.remove();

    const script = document.createElement('script');
    script.id = 'product-json-ld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      document.title = previousTitle;
      restore.forEach((fn) => fn());
      if (canonical && previousCanonical) canonical.href = previousCanonical;
      script.remove();
    };
  }, [product]);

  if (isLoading) return <ProductDetailSkeleton />;

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" dir="rtl">
        <div className="space-y-6 text-center">
          <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground" />
          <h1 className="font-heading text-2xl">المنتج غير موجود</h1>
          <Button onClick={() => navigate('/products')}>تصفح المنتجات</Button>
        </div>
      </div>
    );
  }

  const accessoriesTotal = product.accessories?.reduce((sum, accessory, index) => {
    const key = `${index}-${accessory.name_ar}`;
    return sum + accessory.price * (accessoryQuantities[key] || 0);
  }, 0) || 0;

  const activeQuality = product.hasQualityVariants && selectedQualityIdx !== null ? product.qualityVariants?.[selectedQualityIdx] : null;
  const effectivePrice = activeQuality ? Number(activeQuality.price) : product.price;
  const effectiveDescription = activeQuality?.description || product.descriptionAr || product.description;
  const discountedPrice = effectivePrice;
  const totalPrice = discountedPrice + accessoriesTotal;
  const currency = currencySymbol;

  const activeColorVariant = selectedColorIdx !== null ? product.colorVariants?.[selectedColorIdx] : null;
  const qualityImages = activeQuality?.images?.length ? activeQuality.images : null;

  const displayImages = qualityImages?.length
    ? qualityImages
    : activeColorVariant?.images?.length
      ? activeColorVariant.images
      : product.images?.length
        ? product.images
        : ['/placeholder.svg'];

  const sizesToShow = (activeColorVariant?.sizes?.length ? activeColorVariant.sizes : product.sizes || []).map((entry) => typeof entry === 'string' ? entry : entry.size);

  const selectedSizeStock = activeColorVariant?.sizes?.find((entry) => typeof entry !== 'string' && entry.size === selectedSize);

  const activeStock = typeof selectedSizeStock === 'object'
    ? selectedSizeStock.stock
    : activeColorVariant?.sizes?.length
      ? undefined
      : activeColorVariant?.stock ?? product.stockQuantity;

  const effectiveReturnPolicy = product.returnPolicy || defaultReturnPolicy;

  const available = activeQuality?.in_stock === false ? false : typeof activeStock === 'number' ? activeStock > 0 : product.inStock;
  const lowStock = typeof activeStock === 'number' && activeStock > 0 && activeStock <= 5;
  const isLiked = isFavorite(product.id);

  const updateAccessoryQuantity = (key: string, delta: number) => {
    setAccessoryQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  };

  const validateSelection = () => {
    if (!available) {
      toast({ title: 'المنتج غير متوفر حالياً', variant: 'destructive' });
      return false;
    }

    if (sizesToShow.length > 0 && !selectedSize) {
      toast({ title: 'اختر المقاس أولاً', description: 'يرجى تحديد المقاس قبل المتابعة.', variant: 'destructive' });
      return false;
    }

    return true;
  };

  const addCurrentProductToCart = () => {
    const selectedAccessories = product.accessories?.map((accessory, index) => ({
      acc: accessory,
      qty: accessoryQuantities[`${index}-${accessory.name_ar}`] || 0,
    })).filter(({ qty }) => qty > 0).map(({ acc, qty }) => ({
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
    window.setTimeout(() => setJustAdded(false), 3000);

    toast({
      title: 'تمت الإضافة إلى السلة',
      description: `${product.nameAr || product.name} × ${quantity}`,
    });
  };

  const handleBuyNow = () => {
    if (!validateSelection()) return;

    addCurrentProductToCart();
    navigate('/cart');
  };

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
      toast({ title: 'تم نسخ رابط المنتج' });
    } catch (error) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({ title: 'تم نسخ رابط المنتج' });
      } catch {
        toast({ title: 'تعذر مشاركة الرابط', variant: 'destructive' });
      }
    }
  };

  const nextImage = () => {
    setSelectedImage((current) => current === displayImages.length - 1 ? 0 : current + 1);
  };

  const prevImage = () => {
    setSelectedImage((current) => current === 0 ? displayImages.length - 1 : current - 1);
  };

  const goToImage = (index: number) => {
    setSelectedImage(index);
  };

  const defaultFeatures: ProductFeature[] = [
    { icon: 'truck', title: 'توصيل سريع', desc: '2 - 7 أيام' },
    { icon: 'rotate', title: 'إرجاع سهل', desc: 'حسب السياسة' },
    { icon: 'shield', title: 'منتج موثوق', desc: 'جودة مضمونة' },
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
    <div className="min-h-screen bg-[#f6f6f6]" dir="rtl">
      {/* ================================
          DESKTOP NAVBAR
      ================================= */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <CartDrawer />

      {/* ================================
          MOBILE TOP BAR
      ================================= */}
      <header className="sticky top-0 z-50 flex h-[52px] items-center justify-between border-b border-black/[0.055] bg-white px-2.5 md:hidden">
        <button onClick={() => navigate(-1)} aria-label="رجوع" className="flex h-10 w-10 items-center justify-center rounded-full text-[#181818] active:bg-black/[0.05]">
          <ChevronRight className="h-[22px] w-[22px]" strokeWidth={1.6} />
        </button>

        <div className="flex items-center">
          <button onClick={() => navigate('/cart')} aria-label="السلة" className="flex h-10 w-10 items-center justify-center rounded-full text-[#181818] active:bg-black/[0.05]">
            <ShoppingCart className="h-[20px] w-[20px]" strokeWidth={1.6} />
          </button>

          <button onClick={() => toggleFavorite(product as Product)} aria-label="المفضلة" className="flex h-10 w-10 items-center justify-center rounded-full text-[#181818] active:bg-black/[0.05]">
            <Heart className={`h-[20px] w-[20px] ${isLiked ? 'fill-[#d35864] text-[#d35864]' : ''}`} strokeWidth={1.6} />
          </button>

          <button onClick={handleShare} aria-label="مشاركة المنتج" className="flex h-10 w-10 items-center justify-center rounded-full text-[#181818] active:bg-black/[0.05]">
            <Share2 className="h-[19px] w-[19px]" strokeWidth={1.6} />
          </button>
        </div>
      </header>

      <main className="pb-[88px] md:pb-20 md:pt-20">
        <div className="mx-auto w-full max-w-[1440px] md:px-6 md:pt-6">
          {/* ================================
              DESKTOP BREADCRUMB
          ================================= */}
          <nav className="mb-5 hidden items-center gap-2 text-[11px] text-[#888] md:flex" aria-label="مسار التنقل">
            <button onClick={() => navigate('/home')} className="transition hover:text-[#222]">الرئيسية</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <button onClick={() => navigate(-1)} className="transition hover:text-[#222]">المنتجات</button>
            <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            <span className="max-w-[300px] truncate text-[#333]">{product.nameAr || product.name}</span>
          </nav>

          {/* ================================
              MAIN PRODUCT CARD
          ================================= */}
          <div className="grid grid-cols-1 bg-white md:overflow-hidden md:rounded-[18px] md:border md:border-black/[0.06] lg:grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)]">
            {/* ================================
                GALLERY
            ================================= */}
            <section className="min-w-0 bg-white lg:border-l lg:border-black/[0.06]">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="lg:sticky lg:top-[92px]">
                <div className="relative aspect-[1/1.05] w-full overflow-hidden bg-[#f2efeb] sm:aspect-[1/0.9] md:aspect-[1/0.92] lg:aspect-[4/5]">
                  <motion.div key={`${activeColorVariant?.name || 'default'}-${selectedQualityIdx ?? 'default'}-${selectedImage}`} initial={{ opacity: 0.55 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="h-full w-full">
                    <TransformWrapper minScale={1} maxScale={4} centerOnInit centerZoomedOut limitToBounds panning={{ disabled: true }} wheel={{ disabled: true }} doubleClick={{ disabled: true }}>
                      <TransformComponent wrapperClass="!h-full !w-full !overflow-hidden" contentClass="!h-full !w-full">
                        <img src={optimizeImage(displayImages[selectedImage] || displayImages[0], 1400, 84)} alt={product.nameAr || product.name} fetchPriority="high" decoding="async" onError={handleImageError} className="h-full w-full select-none object-cover object-center" draggable={false} />
                      </TransformComponent>
                    </TransformWrapper>
                  </motion.div>

                  {product.discount ? <span className="absolute right-3 top-3 rounded-[5px] bg-white/95 px-2 py-1 text-[10px] font-bold text-[#d44e57] shadow-sm md:right-5 md:top-5 md:text-[11px]">-{product.discount}%</span> : null}

                  <span className="absolute bottom-3 right-3 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-medium text-[#444] shadow-sm backdrop-blur-md md:bottom-5 md:right-5">{selectedImage + 1}/{displayImages.length}</span>

                  <button onClick={() => toggleFavorite(product as Product)} aria-label="المفضلة" className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm transition active:scale-95 md:bottom-5 md:left-5 md:h-10 md:w-10">
                    <Heart className={`h-[18px] w-[18px] ${isLiked ? 'fill-[#d35864] text-[#d35864]' : 'text-[#222]'}`} strokeWidth={1.55} />
                  </button>

                  {displayImages.length > 1 && (
                    <>
                      <button onClick={prevImage} aria-label="السابق" className="absolute right-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white md:flex">
                        <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
                      </button>

                      <button onClick={nextImage} aria-label="التالي" className="absolute left-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition hover:bg-white md:flex">
                        <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
                      </button>
                    </>
                  )}
                </div>

                {/* THUMBNAILS */}
                {displayImages.length > 1 && (
                  <div className="border-b border-black/[0.055] bg-white">
                    <div className="flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-2.5 md:px-5 md:py-4">
                      {displayImages.map((image, index) => (
                        <button key={`${image}-${index}`} onClick={() => goToImage(index)} aria-label={`عرض الصورة ${index + 1}`} className={`relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[7px] bg-[#f3f1ee] transition md:h-[72px] md:w-[72px] ${selectedImage === index ? 'ring-1 ring-[#ae7b62] ring-offset-1' : 'opacity-70 hover:opacity-100'}`}>
                          <img src={optimizeImage(image, 240, 80)} alt="" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover object-center" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </section>

            {/* ================================
                PRODUCT DETAILS
            ================================= */}
            <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="min-w-0 bg-white lg:px-6 lg:py-7">
              {/* TITLE / RATING / PRICE */}
              <div className="border-b border-black/[0.055] px-3.5 py-4 sm:px-5 lg:px-0 lg:pt-0">
                {product.brand && <p className="mb-1 text-[10px] font-semibold text-[#936b57] md:text-[11px]">{product.brand}</p>}

                <h1 className="text-[15px] font-semibold leading-[1.8] text-[#202020] sm:text-[16px] md:text-[19px] lg:text-[21px]">{product.nameAr || product.name}</h1>

                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex items-center gap-[1px]">
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-[13px] w-[13px] fill-[#e8a82d] text-[#e8a82d]" strokeWidth={1} />)}
                  </div>

                  <span className="text-[10px] font-semibold text-[#555]">4.7</span>
                  <span className="text-[10px] text-[#999]">(128 تقييم)</span>
                </div>

                <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="text-[22px] font-bold leading-none text-[#cf4149] md:text-[25px]">{formatCurrency(totalPrice * quantity)}</span>

                  {product.originalPrice && !activeQuality && <span className="text-[11px] text-[#999] line-through md:text-[12px]">{formatCurrency(product.originalPrice)}</span>}

                  {product.discount ? <span className="rounded-[4px] border border-[#efb8bc] bg-[#fff6f6] px-1.5 py-[2px] text-[9px] font-bold text-[#ce4c54]">خصم {product.discount}%</span> : null}
                </div>

                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${available ? lowStock ? 'bg-[#d8674d]' : 'bg-[#51936b]' : 'bg-[#d44949]'}`} />

                  <p className={`text-[10px] font-medium ${available ? lowStock ? 'text-[#c25943]' : 'text-[#47785a]' : 'text-[#c64040]'}`}>
                    {available ? typeof activeStock === 'number' ? `متوفر — ${activeStock} قطعة${lowStock ? ' فقط' : ''}` : 'متوفر الآن' : 'غير متوفر حالياً'}
                  </p>
                </div>
              </div>

              {/* QUALITY */}
              {product.hasQualityVariants && product.qualityVariants?.length > 0 && (
                <div className="border-b border-black/[0.055] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#222]">الجودة / الخامة</span>
                    <span className="text-[10px] text-[#777]">{activeQuality?.name || 'اختر'}</span>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {product.qualityVariants.map((variant, index) => {
                      const active = selectedQualityIdx === index;

                      return (
                        <button key={variant.id || index} onClick={() => { setSelectedQualityIdx(active ? null : index); setSelectedImage(0); }} className={`flex min-w-[150px] items-center gap-2 rounded-[7px] border p-2 text-right transition ${active ? 'border-[#a97860] bg-[#fbf7f4]' : 'border-black/[0.11] bg-white'}`}>
                          {variant.images?.[0] ? (
                            <img src={optimizeImage(variant.images[0], 160, 80)} alt={variant.name} loading="lazy" decoding="async" onError={handleImageError} className="h-10 w-10 shrink-0 rounded-[5px] object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-[#f4f4f4]">
                              <Package className="h-4 w-4 text-[#777]" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-semibold text-[#333]">{variant.name}</p>
                            <p className="mt-1 text-[10px] font-bold text-[#bc5055]">{formatCurrency(Number(variant.price))}</p>
                          </div>

                          {active && <Check className="h-4 w-4 shrink-0 text-[#8e6049]" strokeWidth={2} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COLORS */}
              {product.colorVariants?.length > 0 && (
                <div className="border-b border-black/[0.055] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-[#222]">اللون:</span>
                    <span className="text-[11px] text-[#666]">{selectedColorIdx !== null ? product.colorVariants[selectedColorIdx]?.name : 'اختر اللون'}</span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {product.colorVariants.map((variant, index) => (
                      <button key={`${variant.name}-${index}`} title={variant.name} aria-label={variant.name} onClick={() => { setSelectedColorIdx(index); setSelectedImage(0); setSelectedSize(null); }} className={`relative flex h-8 w-8 items-center justify-center rounded-full transition ${selectedColorIdx === index ? 'ring-1 ring-[#6f4b3c] ring-offset-[3px]' : 'ring-1 ring-black/[0.08]'}`}>
                        <span className="h-full w-full rounded-full border border-black/[0.08]" style={variant.hex2 ? { background: `linear-gradient(135deg, ${variant.hex} 50%, ${variant.hex2} 50%)` } : { backgroundColor: variant.hex }} />
                        {selectedColorIdx === index && <Check className="absolute h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SIZES */}
              {sizesToShow.length > 0 && (
                <div className="border-b border-black/[0.055] px-3.5 py-4 sm:px-5 lg:px-0">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#222]">المقاس</span>
                    {selectedSize && <span className="text-[10px] text-[#777]">المختار: {selectedSize}</span>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {sizesToShow.map((size: string) => (
                      <button key={size} onClick={() => setSelectedSize(size)} className={`min-w-[64px] rounded-[5px] border px-3.5 py-2 text-[10px] font-semibold transition ${selectedSize === size ? 'border-[#a67962] bg-[#fbf7f4] text-[#6d4a3a]' : 'border-black/[0.12] bg-white text-[#444]'}`}>{size}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* QUANTITY */}
              <div className="flex items-center justify-between border-b border-black/[0.055] px-3.5 py-3 sm:px-5 lg:px-0">
                <span className="text-[12px] font-semibold text-[#222]">الكمية</span>

                <div className="flex h-9 items-center overflow-hidden rounded-[5px] border border-black/[0.12]">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="إنقاص الكمية" className="flex h-full w-9 items-center justify-center active:bg-[#f3f3f3]">
                    <Minus className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>

                  <span className="flex h-full min-w-[38px] items-center justify-center border-x border-black/[0.08] text-[11px] font-semibold">{quantity}</span>

                  <button onClick={() => { if (typeof activeStock === 'number' && quantity >= activeStock) { toast({ title: 'الكمية غير متوفرة', description: `المتاح: ${activeStock} فقط`, variant: 'destructive' }); return; } setQuantity((current) => current + 1); }} aria-label="زيادة الكمية" className="flex h-full w-9 items-center justify-center active:bg-[#f3f3f3]">
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.7} />
                  </button>
                </div>
              </div>

              {/* TRUST */}
              <div className="grid grid-cols-3 border-b border-black/[0.055] bg-[#fffdfa]">
                {features.map((feature, index) => {
                  const Icon = getFeatureIcon(feature.icon);

                  return (
                    <div key={`${feature.title}-${index}`} className={`flex min-h-[84px] flex-col items-center justify-center px-1.5 py-3 text-center ${index !== features.length - 1 ? 'border-l border-black/[0.05]' : ''}`}>
                      <Icon className="mb-1.5 h-[17px] w-[17px] text-[#9c6c52]" strokeWidth={1.5} />
                      <span className="text-[9px] font-bold leading-4 text-[#333] sm:text-[10px]">{feature.title}</span>
                      <span className="mt-[1px] text-[8px] leading-4 text-[#777] sm:text-[9px]">{feature.desc}</span>
                    </div>
                  );
                })}
              </div>

              {/* ACCESSORIES */}
              {product.accessories?.length > 0 && (
                <div className="border-b border-black/[0.055] px-3.5 py-4 sm:px-5 lg:px-0">
                  <h2 className="mb-3 text-[12px] font-semibold text-[#222]">إضافات اختيارية</h2>

                  <div className="space-y-2">
                    {product.accessories.map((accessory, index) => {
                      const key = `${index}-${accessory.name_ar}`;

                      return <AccessoryCard key={key} accessory={accessory} quantity={accessoryQuantities[key] || 0} currency={currency} onQuantityChange={(delta) => updateAccessoryQuantity(key, delta)} />;
                    })}
                  </div>
                </div>
              )}

              {/* ACCORDIONS */}
              <div className="divide-y divide-black/[0.055]">
                <div>
                  <button onClick={() => setOpenSection(openSection === 'details' ? null : 'details')} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                    <span className="text-[12px] font-semibold text-[#222]">تفاصيل المنتج</span>
                    <ChevronDown className={`h-4 w-4 text-[#777] transition-transform ${openSection === 'details' ? 'rotate-180' : ''}`} strokeWidth={1.6} />
                  </button>

                  {openSection === 'details' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                      <div className="px-3.5 pb-4 sm:px-5 lg:px-0">
                        <p className="whitespace-pre-line text-[11px] leading-7 text-[#606060]">{effectiveDescription || 'منتج مختار بعناية من فلامنجو بارك.'}</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {product.specs?.length > 0 && (
                  <div>
                    <button onClick={() => setOpenSection(openSection === 'specs' ? null : 'specs')} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                      <span className="text-[12px] font-semibold text-[#222]">المواصفات</span>
                      <ChevronDown className={`h-4 w-4 text-[#777] transition-transform ${openSection === 'specs' ? 'rotate-180' : ''}`} strokeWidth={1.6} />
                    </button>

                    {openSection === 'specs' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <dl className="px-3.5 pb-4 sm:px-5 lg:px-0">
                          {product.specs.map((spec, index) => (
                            <div key={`${spec.label}-${index}`} className="flex items-start justify-between gap-4 border-b border-black/[0.04] py-2.5 last:border-0">
                              <dt className="text-[10px] text-[#777]">{spec.label}</dt>
                              <dd className="max-w-[65%] text-left text-[10px] font-semibold text-[#333]">{spec.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </motion.div>
                    )}
                  </div>
                )}

                <div>
                  <button onClick={() => setOpenSection(openSection === 'delivery' ? null : 'delivery')} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#92634c]" strokeWidth={1.5} />
                      <span className="text-[12px] font-semibold text-[#222]">الشحن والتوصيل</span>
                    </div>

                    <ChevronDown className={`h-4 w-4 text-[#777] transition-transform ${openSection === 'delivery' ? 'rotate-180' : ''}`} strokeWidth={1.6} />
                  </button>

                  {openSection === 'delivery' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                      <div className="px-3.5 pb-4 text-[11px] leading-7 text-[#626262] sm:px-5 lg:px-0">
                        <p>التوصيل داخل عدن يتم في نفس اليوم حسب توفر المنتج ووقت الطلب.</p>
                        <p>التوصيل إلى بقية المحافظات يستغرق عادة من 2 إلى 7 أيام حسب المنطقة وإجراءات الشحن.</p>
                      </div>
                    </motion.div>
                  )}
                </div>

                {effectiveReturnPolicy && (
                  <div>
                    <button onClick={() => setOpenSection(openSection === 'return' ? null : 'return')} className="flex w-full items-center justify-between px-3.5 py-4 text-right sm:px-5 lg:px-0">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-[#92634c]" strokeWidth={1.5} />
                        <span className="text-[12px] font-semibold text-[#222]">الإرجاع والاستبدال</span>
                      </div>

                      <ChevronDown className={`h-4 w-4 text-[#777] transition-transform ${openSection === 'return' ? 'rotate-180' : ''}`} strokeWidth={1.6} />
                    </button>

                    {openSection === 'return' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                        <div className="px-3.5 pb-4 sm:px-5 lg:px-0">
                          <p className="whitespace-pre-line text-[11px] leading-7 text-[#626262]">{effectiveReturnPolicy}</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* ADDED SUCCESS */}
              {justAdded && (
                <div className="mx-3.5 mb-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#8ebd9d]/40 bg-[#f1f8f3] px-3 py-2.5 sm:mx-5 lg:mx-0">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-[#4b8660]" strokeWidth={2} />
                    <div>
                      <p className="text-[10px] font-bold text-[#396d4a]">تمت الإضافة إلى السلة</p>
                      <p className="mt-[1px] text-[9px] text-[#60816a]">الكمية: {quantity}</p>
                    </div>
                  </div>

                  <button onClick={() => navigate('/cart')} className="text-[10px] font-bold text-[#396d4a] underline underline-offset-2">عرض السلة</button>
                </div>
              )}

              {/* DESKTOP ACTIONS */}
              <div className="hidden border-t border-black/[0.055] pt-5 lg:block">
                <div className="flex gap-2">
                  <button onClick={handleAddToCart} disabled={!available} className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#b98368] px-5 text-[12px] font-bold text-white transition hover:bg-[#a9755c] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">
                    <ShoppingBag className="h-[17px] w-[17px]" strokeWidth={1.6} />
                    أضف إلى السلة
                  </button>

                  <button onClick={handleBuyNow} disabled={!available} className="h-[48px] flex-1 rounded-[7px] bg-[#e5787e] px-5 text-[12px] font-bold text-white transition hover:bg-[#d96870] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">
                    اشتري الآن
                  </button>

                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="واتساب" className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[7px] border border-black/[0.1] bg-white text-[#398c58] transition hover:bg-[#f7f7f7]">
                    <FaWhatsapp className="h-[19px] w-[19px]" />
                  </a>
                </div>
              </div>
            </motion.section>
          </div>

          {/* ================================
              BELOW PRODUCT CONTENT
          ================================= */}
          <div className="mt-2 bg-white px-3.5 sm:px-5 md:mt-8 md:rounded-[18px] md:border md:border-black/[0.06] md:px-6">
            {/* STORE CARD */}
            <section className="flex items-center justify-between border-b border-black/[0.055] py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3e9e4] text-[#8d604a]">
                  <ShoppingBag className="h-[17px] w-[17px]" strokeWidth={1.5} />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[12px] font-bold text-[#252525]">Flamingo Park</p>
                    <Shield className="h-3.5 w-3.5 fill-[#a9775d]/10 text-[#a9775d]" strokeWidth={1.7} />
                  </div>

                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-[#e3a22e] text-[#e3a22e]" strokeWidth={1} />
                    <span className="text-[9px] font-semibold text-[#555]">4.8</span>
                    <span className="text-[9px] text-[#999]">متجر موثوق</span>
                  </div>
                </div>
              </div>

              <button onClick={() => navigate('/products')} className="rounded-[5px] border border-[#b88b75] px-3 py-2 text-[9px] font-bold text-[#95664f] transition active:bg-[#faf4f1]">عرض المتجر</button>
            </section>

            {/* QA */}
            <section className="py-5 md:py-8">
              <ProductQA productId={product.id} />
            </section>

            {/* REVIEWS */}
            <section className="border-t border-black/[0.055] py-5 md:py-8">
              <ProductReviews productId={product.id} productName={product.nameAr || product.name} />
            </section>
          </div>

          {/* ================================
              RELATED PRODUCTS
          ================================= */}
          {relatedProducts.length > 0 && (
            <section className="mt-2 bg-white px-3 py-5 md:mt-8 md:rounded-[18px] md:border md:border-black/[0.06] md:px-6 md:py-8">
              <div className="mb-4 flex items-end justify-between md:mb-6">
                <div>
                  <p className="mb-1 text-[9px] font-bold tracking-[0.16em] text-[#aa755b]">FOR YOU</p>
                  <h2 className="text-[16px] font-bold text-[#222] md:text-[22px]">قد يعجبك أيضاً</h2>
                </div>

                <button onClick={() => navigate('/products')} className="text-[10px] font-semibold text-[#777]">عرض الكل</button>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {relatedProducts.map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}
              </div>
            </section>
          )}

          {/* ================================
              RECENT PRODUCTS
          ================================= */}
          {recentItems.filter((item) => item.id !== product.id).length > 0 && (
            <section className="mt-2 bg-white px-3 py-5 md:mt-8 md:rounded-[18px] md:border md:border-black/[0.06] md:px-6 md:py-8">
              <div className="mb-4 md:mb-6">
                <p className="mb-1 text-[9px] font-bold tracking-[0.16em] text-[#aa755b]">RECENTLY VIEWED</p>
                <h2 className="text-[16px] font-bold text-[#222] md:text-[22px]">شاهدت مؤخراً</h2>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {recentItems.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* ================================
          MOBILE STICKY BUY BAR
      ================================= */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.08] bg-white/95 px-2.5 pt-2 shadow-[0_-4px_18px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        <div className="flex h-[50px] gap-2">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" aria-label="واتساب" className="flex h-full w-[48px] shrink-0 items-center justify-center rounded-[6px] border border-black/[0.1] bg-white text-[#398e59] active:bg-[#f4f4f4]">
            <FaWhatsapp className="h-[19px] w-[19px]" />
          </a>

          <button onClick={handleAddToCart} disabled={!available} className="flex h-full flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-[#c99578] px-2 text-[11px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40">
            <ShoppingBag className="h-[16px] w-[16px]" strokeWidth={1.7} />
            <span>{available ? 'أضف للسلة' : 'غير متوفر'}</span>
          </button>

          <button onClick={handleBuyNow} disabled={!available} className="h-full flex-1 rounded-[6px] bg-[#e57980] px-2 text-[11px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40">
            اشتري الآن
          </button>
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default ProductDetailPage;