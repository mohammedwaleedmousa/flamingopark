import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStore, Product } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ShoppingBag, Share2, ChevronLeft, Minus, Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { country, addToCart } = useStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

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
      } as Product;
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
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl text-foreground mb-4">المنتج غير موجود</h1>
          <Button onClick={() => navigate('/products')} variant="outline">
            العودة للمنتجات
          </Button>
        </div>
      </div>
    );
  }

  const discountedPrice = product.discount
    ? product.price * (1 - product.discount / 100)
    : product.price;

  const currency = country === 'SA' ? 'ريال' : 'ريال';

  const handleAddToCart = () => {
    addToCart(product, quantity);
    toast({
      title: 'تمت الإضافة',
      description: `${product.nameAr} أُضيف إلى السلة`,
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-body text-muted-foreground mb-8">
            <button onClick={() => navigate('/home')} className="hover:text-gold transition-colors">
              الرئيسية
            </button>
            <ChevronLeft className="w-4 h-4" />
            <button onClick={() => navigate('/products')} className="hover:text-gold transition-colors">
              المنتجات
            </button>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-foreground">{product.nameAr}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Images */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                {product.images[selectedImage] ? (
                  <img
                    src={product.images[selectedImage]}
                    alt={product.nameAr}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    لا توجد صورة
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                        selectedImage === index ? 'border-gold' : 'border-transparent'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div>
                <p className="text-sm text-gold font-body mb-2">{product.brand}</p>
                <h1 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                  {product.nameAr}
                </h1>
                
                <div className="flex items-center gap-4">
                  <span className="font-heading text-3xl text-gold">
                    {discountedPrice.toFixed(2)} {currency}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xl text-muted-foreground line-through">
                      {product.originalPrice.toFixed(2)} {currency}
                    </span>
                  )}
                  {product.discount && (
                    <span className="px-3 py-1 bg-gold/10 text-gold text-sm font-body rounded-full">
                      وفر {product.discount}%
                    </span>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              <p className="font-body text-foreground/80 leading-relaxed">
                {product.descriptionAr}
              </p>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.inStock ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-body text-green-600">متوفر في المخزون</span>
                  </>
                ) : (
                  <span className="text-sm font-body text-destructive">غير متوفر</span>
                )}
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <span className="font-body text-sm text-muted-foreground">الكمية:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-body">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={handleAddToCart}
                  disabled={!product.inStock}
                  className="flex-1 btn-gold py-6 font-heading tracking-wider"
                >
                  <ShoppingBag className="w-5 h-5 ml-2" />
                  إضافة للسلة
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="px-6 py-6 border-border hover:border-gold hover:text-gold"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <section className="mt-20">
              <h2 className="font-heading text-2xl text-foreground mb-8 text-center">
                منتجات <span className="text-gold">مشابهة</span>
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {relatedProducts.map((p, index) => (
                  <ProductCard key={p.id} product={p} index={index} compact />
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
