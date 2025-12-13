import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { country, addToCart } = useStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [accessoryQuantities, setAccessoryQuantities] = useState<Record<string, number>>({});

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
        originalPrice: data.original_price ? Number(data.original_price) : undefined,
        discount: data.discount || undefined,
        description: data.description || '',
        descriptionAr: data.description_ar || '',
        images: data.images || [],
        category: data.category,
        brand: data.brand,
        inStock: data.in_stock ?? true,
        countries: (data.countries || ['SA', 'YE']) as ('SA' | 'YE')[],
        isFeatured: data.is_featured,
        isBestSeller: data.is_best_seller,
        hasSizes: (data as any).has_sizes ?? false,
        sizes: (data as any).sizes || [],
        accessories: accessories as { name: string; name_ar: string; price: number; image_url?: string }[],
        features: ((data as any).features || []) as { icon: string; title: string; desc: string }[],
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
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || '',
        descriptionAr: p.description_ar || '',
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ['SA', 'YE']) as ('SA' | 'YE')[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: !!product && !!country,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-gold mx-auto" />
          <p className="text-muted-foreground font-body">جاري تحميل المنتج...</p>
        </div>
      </div>
    );
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

  // Calculate total with accessories
  const accessoriesTotal = product.accessories
    ? product.accessories.reduce((sum, acc) => {
        const qty = accessoryQuantities[acc.name_ar] || 0;
        return sum + (acc.price * qty);
      }, 0)
    : 0;

  const discountedPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const totalPrice = discountedPrice + accessoriesTotal;

  const currency = country === 'SA' ? 'ر.س' : 'ر.ي';

  const updateAccessoryQuantity = (accessoryName: string, delta: number) => {
    setAccessoryQuantities(prev => {
      const current = prev[accessoryName] || 0;
      const newQty = Math.max(0, current + delta);
      return { ...prev, [accessoryName]: newQty };
    });
  };

  const handleAddToCart = () => {
    // Prepare selected accessories with quantities
    const selectedAccs = product.accessories
      ? product.accessories
          .filter(acc => (accessoryQuantities[acc.name_ar] || 0) > 0)
          .map(acc => ({
            name: acc.name,
            name_ar: acc.name_ar,
            price: acc.price,
            quantity: accessoryQuantities[acc.name_ar],
            image_url: acc.image_url,
          }))
      : [];

    addToCart(
      product, 
      quantity, 
      selectedSize || undefined, 
      selectedAccs.length > 0 ? selectedAccs : undefined
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

      <main className="pt-20 pb-16">
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
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 border border-border/30">
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
                  className={`absolute top-4 left-4 z-10 p-3 rounded-full backdrop-blur-sm transition-all duration-300 ${
                    isLiked 
                      ? 'bg-gold text-secondary shadow-lg' 
                      : 'bg-background/80 text-foreground hover:bg-background'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                </button>

                {/* Image Loading State */}
                {!imageLoaded && product.images[selectedImage] && (
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
                    className="w-full h-full"
                  >
                    {product.images[selectedImage] ? (
                      <img
                        src={product.images[selectedImage]}
                        alt={product.nameAr}
                        onLoad={() => setImageLoaded(true)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${
                          imageLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <ShoppingBag className="w-16 h-16 opacity-30" />
                        <span className="text-sm">لا توجد صورة</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImage(prev => prev === 0 ? product.images.length - 1 : prev - 1)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background transition-all shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImage(prev => prev === product.images.length - 1 ? 0 : prev + 1)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background transition-all shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 justify-center">
                  {product.images.map((img, index) => (
                    <motion.button
                      key={index}
                      onClick={() => {
                        setSelectedImage(index);
                        setImageLoaded(false);
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
              {/* Brand & Category */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gold uppercase tracking-widest bg-gold/10 px-3 py-1.5 rounded-full">
                  {product.brand}
                </span>
                <span className="text-xs text-muted-foreground">
                  {product.category}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground leading-tight">
                {product.nameAr}
              </h1>
              
              {/* Price */}
              <div className="flex items-baseline gap-4 flex-wrap">
                <span className="font-heading text-4xl md:text-5xl text-gold">
                  {discountedPrice.toFixed(0)}
                  <span className="text-lg mr-1">{currency}</span>
                </span>
                {product.originalPrice && (
                  <div className="flex items-center gap-3">
                    <span className="text-xl text-muted-foreground line-through">
                      {product.originalPrice.toFixed(0)} {currency}
                    </span>
                    <span className="px-3 py-1 bg-destructive/10 text-destructive text-sm font-bold rounded-full">
                      وفر {(product.originalPrice - discountedPrice).toFixed(0)} {currency}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-px bg-gradient-to-r from-border via-gold/30 to-border" />

              {/* Description */}
              <div className="space-y-3">
                <h3 className="font-heading text-lg text-foreground">الوصف</h3>
                <p className="font-body text-foreground/70 leading-relaxed text-base">
                  {product.descriptionAr || 'منتج فاخر من ERMGOLD بجودة عالية وتصميم أنيق يناسب جميع المناسبات.'}
                </p>
              </div>

              {/* Stock Status */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                product.inStock 
                  ? 'bg-emerald-500/10 text-emerald-600' 
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {product.inStock ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">متوفر في المخزون</span>
                  </>
                ) : (
                  <span className="text-sm font-medium">غير متوفر حالياً</span>
                )}
              </div>

              {/* Size Selector */}
              {product.hasSizes && product.sizes && product.sizes.length > 0 && (
                <div className="space-y-3">
                  <span className="font-body text-foreground">الحجم:</span>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 rounded-lg border-2 transition-all font-medium ${
                          selectedSize === size
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-border hover:border-gold/50'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories Selector */}
              {product.accessories && product.accessories.length > 0 && (
                <div className="space-y-3">
                  <span className="font-body text-foreground">الملحقات الإضافية:</span>
                  <div className="space-y-2">
                    {product.accessories.map((acc) => {
                      const qty = accessoryQuantities[acc.name_ar] || 0;
                      return (
                        <div
                          key={acc.name_ar}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                            qty > 0
                              ? 'border-gold bg-gold/10'
                              : 'border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {acc.image_url && (
                              <img 
                                src={acc.image_url} 
                                alt={acc.name_ar} 
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <span className="font-medium block">{acc.name_ar}</span>
                              <span className="text-gold text-sm">+{acc.price} {currency}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateAccessoryQuantity(acc.name_ar, -1)}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-heading">{qty}</span>
                            <button
                              onClick={() => updateAccessoryQuantity(acc.name_ar, 1)}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="flex items-center gap-6">
                <span className="font-body text-foreground">الكمية:</span>
                <div className="flex items-center bg-muted rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-4 hover:bg-muted-foreground/10 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-heading text-xl">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-4 hover:bg-muted-foreground/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-muted-foreground">
                  الإجمالي: <span className="text-gold font-heading">{(totalPrice * quantity).toFixed(0)} {currency}</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  size="lg"
                  className="flex-1 btn-gold py-7 font-heading text-lg tracking-wider gap-3 rounded-xl disabled:opacity-50"
                >
                  <ShoppingBag className="w-6 h-6" />
                  إضافة للسلة
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  size="lg"
                  className="px-6 py-7 border-2 border-border hover:border-gold hover:text-gold hover:bg-gold/5 rounded-xl transition-all"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-3 gap-4 pt-6">
                {features.map((feature, index) => {
                  const IconComponent = getFeatureIcon(feature.icon);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="text-center p-4 rounded-xl bg-muted/50 border border-border/30 hover:border-gold/30 transition-colors"
                    >
                      <IconComponent className="w-6 h-6 text-gold mx-auto mb-2" />
                      <h4 className="font-heading text-sm text-foreground mb-1">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Product Reviews Section */}
          <ProductReviews productId={product.id} productName={product.nameAr} />

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
                  <ProductCard key={p.id} product={p} index={index} compact />
                ))}
              </div>
            </motion.section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;
