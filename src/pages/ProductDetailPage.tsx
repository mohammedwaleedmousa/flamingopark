import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import AccessoryCard from '@/components/AccessoryCard';
import ProductDetailSkeleton from '@/components/ProductDetailSkeleton';
import { Button } from '@/components/ui/button';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useStore, Product } from '@/store/useStore';
import { useFavorites } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useCurrency } from '@/lib/currency';
import {
  ShoppingBag, Share2, ChevronLeft, ChevronRight, Minus, Plus, Check, Heart,
  Truck, Shield, RotateCcw, Star, Package, ChevronDown,
} from 'lucide-react';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { country, addToCart } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { items: recentItems, add: addRecent } = useRecentlyViewed();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColorIdx, setSelectedColorIdx] = useState<number | null>(null);
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});
  const [justAdded, setJustAdded] = useState(false);
  const [selectedQualityIdx, setSelectedQualityIdx] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<'specs' | 'return' | 'delivery' | null>(null);
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency();
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select(`*,color_variants`).eq('slug', slug).eq('is_active', true).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const accessories = (data as any).accessories || [];
      return {
        id: data.id, name: data.name, nameAr: data.name_ar, slug: data.slug,
        price: Number(data.price), costPrice: data.cost_price ? Number(data.cost_price) : undefined,
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        discount: data.discount || undefined, description: data.description || '',
        descriptionAr: data.description_ar || '', images:
  data.images?.length > 0
    ? data.images
    : ((data as any).color_variants?.[0]?.images || []),
        category: data.category, brand: data.brand, inStock: data.in_stock ?? true,
        stockQuantity: typeof (data as any).stock_quantity === "number" ? (data as any).stock_quantity : undefined,
        countries: (data.countries || ['GLOBAL']) as Product['countries'],
        isFeatured: data.is_featured, isBestSeller: data.is_best_seller,
        hasSizes: (data as any).has_sizes ?? false, sizes: (data as any).sizes || [],
        accessories: accessories as { name: string; name_ar: string; price: number; image_url?: string; description?: string; description_ar?: string }[],
        features: ((data as any).features || []) as { icon: string; title: string; desc: string }[],
        colorVariants: ((data as any).color_variants || []) as { name: string; hex: string; hex2?: string; images: string[] }[],
        specs: ((data as any).specs || []) as { label: string; value: string }[],
        returnPolicy: (data as any).return_policy as string | null,
        hasQualityVariants: (data as any).has_quality_variants ?? false,
        qualityVariants: ((data as any).quality_variants || []) as { id?: string; name: string; price: number; description?: string; images?: string[]; in_stock?: boolean }[],
      };
    },
    enabled: !!slug,
  });

    useEffect(() => {
      if (
        product?.colorVariants &&
        product.colorVariants.length > 0 &&
        selectedColorIdx === null
      ) {
        setSelectedColorIdx(0);
      }
    }, [product, selectedColorIdx]);

  // Default return policy from site settings
  const { data: defaultReturnPolicy } = useQuery({
    queryKey: ['default-return-policy'],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('site_settings').select('value').eq('key', 'default_return_policy').maybeSingle();
      const v = data?.value;
      return (typeof v === 'string' ? v : v ?? null) as string | null;
    },
  });

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category, product?.id, country],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select(`*,color_variants`).eq('is_active', true).eq('category', product!.category).neq('id', product!.id).contains('countries', [country]).limit(4);
      if (error) throw error;
      return data.map((p) => ({
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
        images:
          p.images?.length > 0
            ? p.images
            : ((p as any).color_variants?.[0]?.images || []),
        colorVariants: (p as any).color_variants || [],
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

  useEffect(() => { if (product) addRecent(product as Product); /* eslint-disable-next-line */ }, [product?.id]);

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground" />
        <h1 className="font-heading text-2xl">المنتج غير موجود</h1>
        <Button onClick={() => navigate('/products')} className="btn-gold">تصفح المنتجات</Button>
      </div>
    </div>
  );

  const accessoriesTotal = product.accessories?.reduce((sum, acc, idx) => sum + acc.price * (accessoryQuantities[`${idx}-${acc.name_ar}`] || 0), 0) || 0;
  // Quality variant swap: overrides price/description/images when selected
  const activeQuality = product.hasQualityVariants && selectedQualityIdx !== null
    ? product.qualityVariants?.[selectedQualityIdx] : null;
  const effectivePrice = activeQuality ? Number(activeQuality.price) : product.price;
  const effectiveDescription = activeQuality?.description || product.descriptionAr;
  const discountedPrice = product.discount ? effectivePrice * (1 - product.discount / 100) : effectivePrice;
  const totalPrice = discountedPrice + accessoriesTotal;
  const currency = currencySymbol;
  const activeColorVariant = selectedColorIdx !== null ? product.colorVariants?.[selectedColorIdx] : null;
  const qualityImages = activeQuality?.images && activeQuality.images.length > 0 ? activeQuality.images : null;
  const displayImages = qualityImages
    ? qualityImages
    : (activeColorVariant && activeColorVariant.images.length > 0 ? activeColorVariant.images : product.images);
  const sizesToShow = product.sizes || [];
  const effectiveReturnPolicy = product.returnPolicy || defaultReturnPolicy;

  const updateAccessoryQuantity = (key: string, delta: number) => {
    setAccessoryQuantities((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }));
  };

  const handleAddToCart = () => {
    if (product.hasSizes && sizesToShow.length > 0 && !selectedSize) {
      toast({ title: 'اختر المقاس أولاً', variant: 'destructive' }); return;
    }
    const selectedAccs = product.accessories?.map((acc, idx) => ({ acc, qty: accessoryQuantities[`${idx}-${acc.name_ar}`] || 0 }))
      .filter(({ qty }) => qty > 0).map(({ acc, qty }) => ({ name: acc.name, name_ar: acc.name_ar, price: acc.price, quantity: qty, image_url: acc.image_url })) || [];
    addToCart(product, quantity, selectedSize || undefined, selectedAccs.length ? selectedAccs : undefined);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 3500);
    toast({ title: '✓ تمت الإضافة إلى السلة', description: `${product.nameAr} × ${quantity}` });
  };

  const handleShare = async () => {
    try { await navigator.share({ title: product.nameAr, text: product.descriptionAr, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast({ title: 'تم نسخ الرابط' }); }
  };

  const isLiked = isFavorite(product.id);
  console.log("PRODUCT CARD:", product);
  const nextImage = () => {
    setSelectedImage((i) =>
      i === displayImages.length - 1 ? 0 : i + 1
    );
  };
  const prevImage = () => {
    setSelectedImage((i) =>
      i === 0 ? displayImages.length - 1 : i - 1
    );
  };
  
  const defaultFeatures = [
    { icon: 'truck', title: 'شحن سريع', desc: '2-5 أيام' },
    { icon: 'shield', title: 'ضمان أصلي', desc: 'منتجات 100%' },
    { icon: 'rotate', title: 'إرجاع سهل', desc: 'خلال 14 يوم' },
  ];
  const features = product.features?.length ? product.features : defaultFeatures;
  const getFeatureIcon = (n: string) => ({ truck: Truck, shield: Shield, rotate: RotateCcw, star: Star, check: Check } as any)[n] || Truck;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar /><CartDrawer />

      <main className="pt-16 md:pt-20 pb-24">
        {/* Minimal breadcrumb */}
        <div className="container mx-auto px-4 pt-6">
          <nav className="text-xs text-muted-foreground flex items-center gap-2">
            <button onClick={() => navigate('/home')} className="hover:text-foreground transition">الرئيسية</button>
            <ChevronLeft className="w-3 h-3" />
            <button onClick={() => navigate('/products')} className="hover:text-foreground transition">المنتجات</button>
            <ChevronLeft className="w-3 h-3" />
            <span className="text-foreground truncate max-w-[180px]">{product.nameAr}</span>
          </nav>
        </div>

        <div className="container mx-auto px-4 pt-8 lg:pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            {/* Gallery — dominant, Apple-style */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="lg:col-span-7 lg:sticky lg:top-24 lg:self-start">
              <div
                className="relative bg-muted/30 rounded-3xl overflow-hidden aspect-[4/5] group touch-pan-y"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={selectedImage}
                    src={displayImages[selectedImage] || '/placeholder.svg'}
                    alt={product.nameAr}
                    initial={{ opacity: 0, x: -80 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80 }}
                    transition={{ 
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
                    draggable={false}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -50) {
                        nextImage();
                      }
                      if (info.offset.x > 50) {
                        prevImage();
                      }
                    }}
                  />
                </AnimatePresence>

                {/* Nav arrows — subtle */}
                {displayImages.length > 1 && (
                  <>
                    <button onClick={prevImage} aria-label="السابق" className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-background/70 hover:bg-background shadow-md items-center justify-center hidden md:flex opacity-0 group-hover:opacity-100 transition-all">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button onClick={nextImage} aria-label="التالي" className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-background/70 hover:bg-background shadow-md items-center justify-center hidden md:flex opacity-0 group-hover:opacity-100 transition-all">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Wishlist */}
                <button onClick={() => { toggleFavorite(product); }}
                  className={`absolute top-4 left-4 w-11 h-11 rounded-full flex items-center justify-center transition-all ${isLiked ? 'bg-gold text-white' : 'bg-background/80 hover:bg-background'}`}>
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Discount tag */}
                {product.discount && (
                  <span className="absolute top-4 right-4 bg-gold text-white text-xs font-medium px-3 py-1.5 rounded-full">-{product.discount}%</span>
                )}

                {/* Counter */}
                {displayImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm text-xs px-3 py-1 rounded-full">
                    {selectedImage + 1} / {displayImages.length}
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {displayImages.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-none">
                  {displayImages.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImage(i)}
                      className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? 'border-gold' : 'border-transparent hover:border-border'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details — spacious, refined */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lg:col-span-5 space-y-8">
              {/* Brand tag */}
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{product.brand}</p>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl leading-tight text-foreground">{product.nameAr}</h1>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{product.descriptionAr || 'منتج فاخر من فلامنجو'}</p>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl md:text-4xl font-heading text-foreground">{formatCurrency(totalPrice * quantity)}</span>
                {product.originalPrice && !activeQuality && (
                  <span className="text-base text-muted-foreground line-through">{formatCurrency(product.originalPrice)}</span>
                )}
              </div>

              {/* Stock pill */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${product.inStock ? 'bg-emerald-500/10 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                <span className={`w-2 h-2 rounded-full ${product.inStock ? 'bg-emerald-500' : 'bg-destructive'}`} />
                {product.inStock ? 'متوفر الآن' : 'غير متوفر'}
              </div>

              {/* Quality / Material variants — swaps images, description, price */}
              {product.hasQualityVariants && product.qualityVariants && product.qualityVariants.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">اختر الجودة / الخامة</span>
                    <span className="text-xs text-muted-foreground">
                      {activeQuality ? activeQuality.name : 'اختر'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {product.qualityVariants.map((qv, i) => {
                      const isActive = selectedQualityIdx === i;
                      return (
                        <button
                          key={i}
                          onClick={() => { setSelectedQualityIdx(isActive ? null : i); setSelectedImage(0); }}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${isActive ? 'border-gold bg-gold/5' : 'border-border hover:border-muted-foreground'}`}
                        >
                          {qv.images && qv.images[0] ? (
                            <img src={qv.images[0]} alt={qv.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-sm truncate">{qv.name}</span>
                              <span className="text-sm font-heading text-gold whitespace-nowrap">{formatCurrency(Number(qv.price))}</span>
                            </div>
                            {qv.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{qv.description}</p>
                            )}
                          </div>
                          {isActive && <Check className="w-5 h-5 text-gold shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color */}
              {product.colorVariants && product.colorVariants.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">اللون</span>
                    <span className="text-xs text-muted-foreground">{selectedColorIdx !== null ? product.colorVariants[selectedColorIdx].name : 'اختر'}</span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {product.colorVariants.map((cv, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedColorIdx(selectedColorIdx === i ? null : i);
                          setSelectedImage(0);
                        }}
                        className={`relative w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColorIdx === i
                            ? 'border-gold scale-110'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                        style={
                          cv.hex2
                            ? {
                                background: `linear-gradient(135deg, ${cv.hex} 50%, ${cv.hex2} 50%)`,
                              }
                            : {
                                backgroundColor: cv.hex,
                              }
                        }
                        title={cv.name}
                      >
                        {selectedColorIdx === i && (
                          <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size */}
              {product.hasSizes && sizesToShow.length > 0 && (
                <div className="space-y-3">
                  <span className="text-sm font-medium">المقاس</span>
                  <div className="flex flex-wrap gap-2">
                    {sizesToShow.map((s: string) => (
                      <button key={s} onClick={() => setSelectedSize(s)}
                        className={`px-4 py-2 rounded-lg border transition-all font-medium text-sm ${selectedSize === s ? 'border-gold bg-gold/10 text-gold' : 'border-border hover:border-muted-foreground'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">الكمية</span>
                <div className="flex items-center bg-muted rounded-xl">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-muted-foreground/10 rounded-r-xl transition"><Minus className="w-4 h-4" /></button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => {
                      const stock = (product as any)?.stockQuantity;
                      if (typeof stock === "number" && quantity >= stock) {
                        toast({ title: "الكمية غير متوفرة", description: `المتاح: ${stock} فقط`, variant: "destructive" });
                        return;
                      }
                      setQuantity(quantity + 1);
                    }}
                    className="p-3 hover:bg-muted-foreground/10 rounded-l-xl transition"
                  ><Plus className="w-4 h-4" /></button>                
                  </div>
              </div>

              {/* Accessories — collapsible feel */}
              {product.accessories && product.accessories.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <span className="text-sm font-medium">إضافات اختيارية</span>
                  <div className="space-y-2">
                    {product.accessories.map((acc, idx) => {
                      const key = `${idx}-${acc.name_ar}`;
                      return (
                        <AccessoryCard key={key} accessory={acc} quantity={accessoryQuantities[key] || 0} currency={currency}
                          onQuantityChange={(delta) => updateAccessoryQuantity(key, delta)} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="space-y-3 pt-4">
                {justAdded && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 text-emerald-800 text-sm">
                      <Check className="w-4 h-4" />
                      <span>تمت الإضافة إلى السلة ({quantity})</span>
                    </div>
                    <Button size="sm" onClick={() => navigate('/cart')} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                      عرض السلة
                    </Button>
                  </div>
                )}
                <Button onClick={handleAddToCart} disabled={!product.inStock}
                  className="w-full h-14 rounded-2xl bg-gold hover:bg-gold/90 text-white font-heading text-base gap-3">
                  <ShoppingBag className="w-5 h-5" /> إضافة للسلة
                </Button>
                <Button onClick={handleShare} variant="outline" className="w-full h-12 rounded-2xl gap-2">
                  <Share2 className="w-4 h-4" /> مشاركة
                </Button>
              </div>

              
            </motion.div>
          </div>

          {/* Specifications + Return Policy — collapsible */}
          {((product.specs && product.specs.length > 0) || effectiveReturnPolicy) && (
            <section className="mt-16 max-w-3xl mx-auto space-y-3">
              {product.specs && product.specs.length > 0 && (
                <div className="border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenSection(openSection === 'specs' ? null : 'specs')}
                    className="w-full flex items-center justify-between px-6 py-4 text-right hover:bg-muted/40 transition"
                  >
                    <span className="font-heading text-lg">المواصفات</span>
                    <ChevronDown className={`w-5 h-5 transition-transform ${openSection === 'specs' ? 'rotate-180' : ''}`} />
                  </button>
                  {openSection === 'specs' && (
                    <div className="px-6 pb-5 border-t border-border">
                      <dl className="divide-y divide-border">
                        {product.specs.map((s, i) => (
                          <div key={i} className="flex items-start justify-between py-3 gap-4">
                            <dt className="text-sm text-muted-foreground">{s.label}</dt>
                            <dd className="text-sm font-medium text-right">{s.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              )}
              <div className="border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenSection(openSection === 'delivery' ? null : 'delivery')}
                  className="w-full flex items-center justify-between px-6 py-4 text-right hover:bg-muted/40 transition"
                >
                  <span className="font-heading text-lg">
                    التوصيل
                  </span>

                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      openSection === 'delivery' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSection === 'delivery' && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-8">
                    <p>
                      التوصيل داخل عدن يتم في نفس اليوم.
                    </p>

                    <p>
                      التوصيل إلى بقية المحافظات يستغرق من 2 - 7 أيام حسب إجراءات الجمارك.
                    </p>
                  </div>
                )}
              </div>
              {effectiveReturnPolicy && (
                <div className="border border-border rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenSection(openSection === 'return' ? null : 'return')}
                    className="w-full flex items-center justify-between px-6 py-4 text-right hover:bg-muted/40 transition"
                  >
                    <span className="font-heading text-lg">سياسة الإرجاع والاستبدال</span>

                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${
                        openSection === 'return' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {openSection === 'return' && (
                    <div className="px-6 pb-5 text-sm text-muted-foreground leading-8">
                      <p>
                        يمكنك إرجاع هذا المنتج خلال 10 أيام في عدن.
                      </p>

                      <p>
                        يمكنك إرجاع هذا المنتج خلال 20 أيام في بقية المحافظات.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Reviews */}
          <div className="mt-24">
            <ProductReviews productId={product.id} productName={product.nameAr} />
          </div>

          {/* Related */}
          {relatedProducts.length > 0 && (
            <section className="mt-24">
              <div className="text-center mb-10">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">You may also like</p>
                <h2 className="font-heading text-3xl md:text-4xl">منتجات مشابهة</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {relatedProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
            </section>
          )}

          {/* Recently viewed */}
          {recentItems.filter((p) => p.id !== product.id).length > 0 && (
            <section className="mt-24">
              <div className="text-center mb-10">
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Recently Viewed</p>
                <h2 className="font-heading text-3xl md:text-4xl">شاهدت مؤخراً</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {recentItems.filter((p) => p.id !== product.id).slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
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
