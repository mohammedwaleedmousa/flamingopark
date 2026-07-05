import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import AccessoryCard from '@/components/AccessoryCard';
import FrequentlyBoughtTogether from '@/components/FrequentlyBoughtTogether';
import ProductDetailSkeleton from '@/components/ProductDetailSkeleton';
import ProductQA from '@/components/ProductQA';
import { Button } from '@/components/ui/button';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useStore, Product } from '@/store/useStore';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  ShoppingBag, 
  Share2, 
  ChevronLeft, 
  Minus, 
  Plus, 
  Check, 
  Loader2,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Star,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { country, addToCart } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items: recentItems, add: addRecent } = useRecentlyViewed();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
  const [accessoryChoiceMade, setAccessoryChoiceMade] = useState(false);
  const accessoriesSectionRef = useRef<HTMLDivElement>(null);
  
  // Touch swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Pinch zoom state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [initialCenter, setInitialCenter] = useState<{ x: number; y: number } | null>(null);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Fetch product by slug
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      
      // Parse accessories from JSON
      const accessories = (data as any).accessories || [];
      
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
        images: data.images || [],
        category: data.category,
        brand: data.brand,
        inStock: data.in_stock ?? true,
        countries: (data.countries || ['GLOBAL']) as Product['countries'],
        isFeatured: data.is_featured,
        isBestSeller: data.is_best_seller,
        hasSizes: (data as any).has_sizes ?? false,
        sizes: (data as any).sizes || [],
        accessories: accessories as { name: string; name_ar: string; price: number; image_url?: string; description?: string; description_ar?: string }[],
        features: ((data as any).features || []) as { icon: string; title: string; desc: string }[],
        colorVariants: ((data as any).color_variants || []) as { name: string; hex: string; images: string[] }[],
      };
    },
    enabled: !!slug,
  });

  // Fetch related products
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category, product?.id, country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category', product!.category)
        .neq('id', product!.id)
        .contains('countries', [country])
        .limit(4);
      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        costPrice: p.cost_price ? Number(p.cost_price) : undefined,
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || '',
        descriptionAr: p.description_ar || '',
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ['GLOBAL']) as Product['countries'],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: !!product && !!country,
  });

  // Track recently viewed (persisted in localStorage)
  useEffect(() => {
    if (product) {
      addRecent(product as Product);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Touch handlers for zoom and pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDistance(dist);
      setInitialCenter({
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      });
      setLastPosition(position);
    } else if (e.touches.length === 1) {
      if (scale > 1) {
        // Pan mode when zoomed
        setInitialCenter({ x: e.touches[0].clientX, y: e.touches[0].clientY });
        setLastPosition(position);
      } else {
        // Swipe mode when not zoomed
        setTouchEnd(null);
        setTouchStart(e.touches[0].clientX);
      }
    }
  }, [position, scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDistance && initialCenter) {
      // Pinch zoom
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(4, Math.max(1, scale * (dist / initialDistance)));
      setScale(newScale);
      setInitialDistance(dist);
      
      // Pan while zooming
      const currentCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
      const deltaX = currentCenter.x - initialCenter.x;
      const deltaY = currentCenter.y - initialCenter.y;
      setPosition({
        x: lastPosition.x + deltaX,
        y: lastPosition.y + deltaY,
      });
      setInitialCenter(currentCenter);
      setLastPosition({ x: lastPosition.x + deltaX, y: lastPosition.y + deltaY });
    } else if (e.touches.length === 1 && scale > 1 && initialCenter) {
      // Pan when zoomed
      const deltaX = e.touches[0].clientX - initialCenter.x;
      const deltaY = e.touches[0].clientY - initialCenter.y;
      setPosition({
        x: lastPosition.x + deltaX,
        y: lastPosition.y + deltaY,
      });
    } else if (e.touches.length === 1 && scale === 1) {
      // Swipe
      setTouchEnd(e.touches[0].clientX);
    }
  }, [initialDistance, initialCenter, scale, lastPosition]);

  const handleTouchEnd = useCallback(() => {
    setInitialDistance(null);
    setInitialCenter(null);
    
    if (scale === 1 && touchStart && touchEnd && product) {
      const distance = touchStart - touchEnd;
      const minSwipeDistance = 50;
      if (Math.abs(distance) > minSwipeDistance && product.images.length > 1) {
        if (distance > 0) {
          setSelectedImage(prev => prev === 0 ? product.images.length - 1 : prev - 1);
          setImageLoaded(false);
        } else {
          setSelectedImage(prev => prev === product.images.length - 1 ? 0 : prev + 1);
          setImageLoaded(false);
        }
      }
    }
    
    // Reset on double tap or when scale is close to 1
    if (scale < 1.1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [scale, touchStart, touchEnd, product]);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="font-heading text-2xl text-foreground">المنتج غير موجود</h1>
          <p className="text-muted-foreground font-body">عذراً، لم نتمكن من العثور على هذا المنتج</p>
          <Button onClick={() => navigate('/products')} className="btn-gold">
            تصفح المنتجات
          </Button>
        </div>
      </div>
    );
  }

  // Calculate total with accessories (key by index to avoid duplicate name collisions)
  const accessoriesTotal = product.accessories
    ? product.accessories.reduce((sum, acc, idx) => {
        const qty = accessoryQuantities[`${idx}-${acc.name_ar}`] || 0;
        return sum + (acc.price * qty);
      }, 0)
    : 0;

  const discountedPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  // Total price including accessories
  const totalPrice = discountedPrice + accessoriesTotal;

  const currency = 'ر.ي';

  // Effective images: swap gallery when a color variant with images is selected
  const activeColorVariant =
    selectedColorIdx !== null ? product.colorVariants?.[selectedColorIdx] : null;
  const displayImages =
    activeColorVariant && activeColorVariant.images.length > 0
      ? activeColorVariant.images
      : product.images;

  // Support new `variants` model when available (product.variants: Variant[])
  const activeVariantModel = selectedColorIdx !== null && (product as any).variants
    ? (product as any).variants[selectedColorIdx]
    : undefined;

  const sizesToShow = activeVariantModel?.sizes?.map((s: any) => s.size) || product.sizes || [];

  const getStockForSize = (size?: string) => {
    if (!size) return undefined;
    if (activeVariantModel?.sizes) {
      const s = activeVariantModel.sizes.find((x: any) => x.size === size);
      return s ? s.stock : undefined;
    }
    // fallback to product-level sizes array which may be strings (no stock info)
    return undefined;
  };

  const updateAccessoryQuantity = (accessoryKey: string, delta: number) => {
    setAccessoryQuantities(prev => {
      const current = prev[accessoryKey] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [accessoryKey]: newQty };
    });
    setAccessoryChoiceMade(true);
  };

  const hasAccessories = !!(product.accessories && product.accessories.length > 0);

  const handleAddToCart = () => {
    // If product has accessories and user hasn't decided yet, scroll to accessories first
    if (hasAccessories && !accessoryChoiceMade) {
      accessoriesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast({
        title: 'اختر الملحقات أولاً',
        description: 'يرجى اختيار الملحقات أو الضغط على "بدون ملحقات" للمتابعة',
      });
      return;
    }

    // Prepare selected accessories with quantities
    const selectedAccs = product.accessories
      ? product.accessories
          .map((acc, idx) => ({ acc, qty: accessoryQuantities[`${idx}-${acc.name_ar}`] || 0 }))
          .filter(({ qty }) => qty > 0)
          .map(({ acc, qty }) => ({
            name: acc.name,
            name_ar: acc.name_ar,
            price: acc.price,
            quantity: qty,
            image_url: acc.image_url,
          }))
      : [];


    // Determine active variant id and color (prefer explicit variant model if present)
    const activeVariant = selectedColorIdx !== null && (product as any).variants
      ? (product as any).variants[selectedColorIdx]
      : null;

    const variantId = activeVariant?.id ?? (activeColorVariant ? `${product.id}-color-${selectedColorIdx}` : undefined);
    const variantColor = activeVariant?.colorName ?? activeColorVariant?.name;

    addToCart(
      product,
      quantity,
      selectedSize || undefined,
      selectedAccs.length > 0 ? selectedAccs : undefined,
      variantId,
      variantColor
    );
    toast({
      title: 'تمت الإضافة بنجاح',
      description: `${product.nameAr} (${quantity}) أُضيف إلى السلة`,
    });
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.nameAr,
        text: product.descriptionAr,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رابط المنتج',
      });
    }
  };

  const isLiked = product ? isFavorite(product.id) : false;

  const handleLike = () => {
    if (!product) return;
    const nowLiked = toggleFavorite(product);
    toast({
      title: nowLiked ? 'تمت الإضافة' : 'تمت الإزالة',
      description: nowLiked ? 'تمت إضافة المنتج للمفضلة' : 'تمت إزالة المنتج من المفضلة',
    });
  };

  const defaultFeatures = [
    { icon: 'truck', title: 'شحن سريع', desc: 'توصيل خلال 2-5 أيام' },
    { icon: 'shield', title: 'ضمان الجودة', desc: 'منتجات أصلية 100%' },
    { icon: 'rotate', title: 'إرجاع سهل', desc: 'خلال 14 يوم' },
  ];

  const features = product.features && product.features.length > 0 
    ? product.features 
    : defaultFeatures;

  const getFeatureIcon = (iconName: string) => {
    switch (iconName) {
      case 'truck': return Truck;
      case 'shield': return Shield;
      case 'rotate': return RotateCcw;
      case 'star': return Star;
      case 'clock': return Loader2;
      case 'check': return Check;
      default: return Truck;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20 pb-32">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
              <button onClick={() => navigate('/home')} className="hover:text-gold transition-colors">
                الرئيسية
              </button>
              <ChevronLeft className="w-4 h-4" />
              <button onClick={() => navigate('/products')} className="hover:text-gold transition-colors">
                المنتجات
              </button>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-[150px] md:max-w-none">
                {product.nameAr}
              </span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Images Section */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div 
                ref={imageContainerRef}
                className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/30"
              >
                {/* Badges */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  {product.discount && (
                    <motion.span 
                      initial={{ scale: 0, rotate: -12 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="inline-flex items-center justify-center bg-gradient-to-r from-gold to-gold-light text-secondary text-sm font-bold px-4 py-2 rounded-full shadow-lg"
                    >
                      خصم {product.discount}%
                    </motion.span>
                  )}
                  {product.isBestSeller && (
                    <span className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1.5 rounded-full">
                      <Star className="w-3 h-3 fill-gold text-gold" />
                      الأكثر مبيعاً
                    </span>
                  )}
                </div>

                {/* Like Button */}
                <button
                  onClick={handleLike}
                  className={`absolute top-4 left-4 z-10 p-3 rounded-full transition-all duration-300 ${
                    isLiked 
                      ? 'bg-gold text-secondary shadow-lg' 
                      : 'bg-background/80 text-foreground hover:bg-background'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Image Loading State */}
                {!imageLoaded && displayImages[selectedImage] && (
                  <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gold/50" />
                  </div>
                )}


                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full touch-none select-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {displayImages[selectedImage] ? (
                      <img
                        src={displayImages[selectedImage]}
                        alt={product.nameAr}
                        onLoad={() => setImageLoaded(true)}
                        style={{ 
                          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                          transformOrigin: 'center center',
                        }}
                        className={`w-full h-full object-cover transition-opacity duration-200 ${
                          imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <ShoppingBag className="w-16 h-16 opacity-30" />
                        <span className="text-sm">لا توجد صورة</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Image dots indicator */}
                {displayImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {displayImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => { setSelectedImage(index); setImageLoaded(false); setScale(1); setPosition({ x: 0, y: 0 }); }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          selectedImage === index ? 'bg-gold w-4' : 'bg-background/60'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {displayImages.length > 1 && (
                <div className="flex gap-3 justify-center">
                  {displayImages.map((img, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setSelectedImage(index);
                        setImageLoaded(false);
                        setScale(1);
                        setPosition({ x: 0, y: 0 });
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                        selectedImage === index 
                          ? 'border-gold shadow-[0_0_15px_hsl(var(--gold)/0.3)]' 
                          : 'border-border/50 hover:border-gold/50'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {selectedImage === index && (
                        <div className="absolute inset-0 bg-gold/10" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details Section */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-6"
            >
              {/* Brand & Category - MOVED TO LEFT */}
              <div className="flex items-center justify-end gap-3">
                <span className="text-xs text-muted-foreground">
                  {product.category}
                </span>
                <span className="text-xs font-medium text-gold uppercase tracking-widest bg-gold/10 px-3 py-1.5 rounded-full">
                  {product.brand}
                </span>
              </div>

              {/* 1- Product Name - RIGHT ALIGNED */}
              <h1 className="font-heading text-2xl md:text-3xl lg:text-4xl text-foreground leading-tight text-right">
                {product.nameAr}
              </h1>

              {/* 2- Price - BELOW NAME - RIGHT ALIGNED */}
              <div className="flex flex-col items-start gap-1">
                <span className="font-heading text-3xl md:text-4xl text-gold">
                  {(totalPrice * quantity).toFixed(0)}
                  <span className="text-base mr-1">{currency}</span>
                </span>
                {(product.originalPrice || accessoriesTotal > 0) && (
                  <div className="flex items-center gap-2">
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {product.originalPrice.toFixed(0)} {currency}
                      </span>
                    )}
                    {accessoriesTotal > 0 && (
                      <span className="text-xs text-gold bg-gold/10 px-2 py-0.5 rounded">
                        +{accessoriesTotal} ملحقات
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Stock Status (variant + size aware) */}
              {(() => {
                const selectedStock = selectedSize ? getStockForSize(selectedSize) : undefined;
                let status: 'in' | 'low' | 'out' = 'in';
                if (selectedStock !== undefined) {
                  if (selectedStock <= 0) status = 'out';
                  else if (selectedStock <= 5) status = 'low';
                  else status = 'in';
                } else {
                  status = product.inStock ? 'in' : 'out';
                }

                return (
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    status === 'in' ? 'bg-emerald-500/10 text-emerald-600' : status === 'low' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {status === 'in' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">{status === 'in' ? 'متوفر في المخزون' : ''}</span>
                      </>
                    )}
                    {status === 'low' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">كمية محدودة</span>
                      </>
                    )}
                    {status === 'out' && <span className="text-sm font-medium">غير متوفر حالياً</span>}
                  </div>
                );
              })()}

              {/* 3- Description */}
              <div className="space-y-3">
                <h3 className="font-heading text-lg text-foreground">الوصف</h3>
                <p className="font-body text-foreground/70 leading-relaxed text-base">
                  {product.descriptionAr || 'منتج فاخر من فلامنجو بجودة عالية وتصميم أنيق يناسب جميع المناسبات.'}
                </p>
              </div>

              {/* gold Divider Line */}
              <div className="h-px bg-gradient-to-r from-border via-gold/50 to-border" />

              {/* 4- Accessories - SMALLER WITHOUT EFFECTS */}
              {product.accessories && product.accessories.length > 0 && (
                <div ref={accessoriesSectionRef} className="space-y-3 scroll-mt-24">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-heading text-lg text-foreground">الملحقات الإضافية</span>
                    <button
                      onClick={() => setAccessoryChoiceMade(true)}
                      className={`text-xs font-body px-3 py-1.5 rounded-full border transition-all ${
                        accessoryChoiceMade && Object.values(accessoryQuantities).every(q => !q)
                          ? 'bg-gold text-secondary border-gold'
                          : 'border-border text-muted-foreground hover:border-gold hover:text-gold'
                      }`}
                    >
                      {accessoryChoiceMade && Object.values(accessoryQuantities).every(q => !q)
                        ? '✓ بدون ملحقات'
                        : 'بدون ملحقات'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {product.accessories.map((acc, idx) => {
                      const key = `${idx}-${acc.name_ar}`;
                      return (
                        <AccessoryCard
                          key={key}
                          accessory={acc}
                          quantity={accessoryQuantities[key] || 0}
                          currency={currency}
                          onQuantityChange={(delta) => updateAccessoryQuantity(key, delta)}
                        />
                      );
                    })}

                  </div>
                </div>
              )}

              {/* 5- Size Selector */}
              {/* Color Variants */}
              {product.colorVariants && product.colorVariants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-foreground">اللون:</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedColorIdx !== null
                        ? product.colorVariants[selectedColorIdx].name
                        : 'اختر لوناً'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.colorVariants.map((cv, i) => {
                      const active = selectedColorIdx === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedColorIdx(active ? null : i);
                            setSelectedImage(0);
                            setImageLoaded(false);
                            setScale(1);
                            setPosition({ x: 0, y: 0 });
                          }}
                          title={cv.name}
                          className={`relative w-11 h-11 rounded-full border-2 transition-all ${
                            active ? 'border-primary scale-110 shadow-lg' : 'border-border hover:border-primary/60'
                          }`}
                          style={{ backgroundColor: cv.hex }}
                        >
                          {active && (
                            <span className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.hasSizes && sizesToShow && sizesToShow.length > 0 && (
                <div className="space-y-3">
                  <span className="font-body text-foreground">الحجم:</span>
                  <div className="flex flex-wrap gap-2">
                    {sizesToShow.map((size: string) => {
                      const stock = getStockForSize(size);
                      const disabled = stock !== undefined ? stock <= 0 : false;
                      return (
                        <button
                          key={size}
                          onClick={() => !disabled && setSelectedSize(size)}
                          disabled={disabled}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                            selectedSize === size
                              ? 'border-gold bg-gold/10 text-gold'
                              : 'border-border hover:border-gold/50'
                          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* gold Divider Line */}
              <div className="h-px bg-gradient-to-r from-border via-gold/50 to-border" />

              {/* 6- Total + Quantity Selector */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg text-foreground">الإجمالي:</span>
                  <span className="font-heading text-2xl text-gold">
                    {(totalPrice * quantity).toFixed(0)} {currency}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-body text-foreground">الكمية:</span>
                  <div className="flex items-center bg-muted rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-heading text-xl">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4">
                <button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="btn-unified w-full py-4 font-heading text-lg gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-6 h-6" />
                  إضافة للسلة
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set('id', product.id);
                      navigate(`/comparison?${params}`);
                    }}
                    className="flex-1 btn-unified py-3 gap-2 text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    مقارنة
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 px-6 py-3 border-2 border-border rounded-xl hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                  >
                    <Share2 className="w-5 h-5 mx-auto" />
                  </button>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {features.map((feature, index) => {
                  const IconComponent = getFeatureIcon(feature.icon);
                  return (
                    <div
                      key={index}
                      className="text-center p-4 rounded-xl bg-muted/50 border border-border/30"
                    >
                      <IconComponent className="w-6 h-6 text-gold mx-auto mb-2" />
                      <h4 className="font-heading text-sm text-foreground mb-1">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Product Reviews Section */}
          <ProductReviews productId={product.id} productName={product.nameAr} />

          {/* Frequently Bought Together */}
          {relatedProducts.length >= 2 && (
            <FrequentlyBoughtTogether
              current={product as Product}
              related={relatedProducts}
              currency={currency}
            />
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <motion.section 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-20"
            >
              <div className="text-center mb-10">
                <h2 className="font-heading text-3xl text-foreground mb-3">
                  منتجات <span className="text-gold">قد تعجبك</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((p, index) => (
                  <ProductCard key={p.id} product={p} index={index} />
                ))}
              </div>
            </motion.section>
          )}

          {/* Q&A Section */}
          {product && (
            <section className="mt-20 pt-12 border-t border-border animate-fade-in" dir="rtl">
              <div className="text-center mb-10">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  Questions & Answers
                </p>
                <h2 className="font-heading text-2xl md:text-3xl text-foreground">
                  الأسئلة والإجابات
                </h2>
              </div>
              <div className="max-w-4xl mx-auto">
                <ProductQA productId={product.id} />
              </div>
            </section>
          )}

          {/* Recently Viewed */}
          {recentItems.filter((p) => p.id !== product.id).length > 0 && (
            <section className="mt-20 pt-12 border-t border-border animate-fade-in" dir="rtl">
              <div className="text-center mb-10">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">
                  Recently Viewed
                </p>
                <h2 className="font-heading text-2xl md:text-3xl text-foreground">
                  شاهدت مؤخراً
                </h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {recentItems
                  .filter((p) => p.id !== product.id)
                  .slice(0, 8)
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
