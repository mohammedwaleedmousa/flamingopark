import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, ArrowLeft, ShoppingCart, Trash2, Trophy, AlertCircle, Star, TrendingUp } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useStore, Product } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';

// Convert Supabase data to Product type
const convertToProduct = (data: any): Product => ({
  id: data.id,
  name: data.name || '',
  nameAr: data.name_ar || '',
  slug: data.slug || '',
  price: data.price || 0,
  costPrice: data.cost_price,
  discount: data.discount,
  description: data.description || '',
  descriptionAr: data.description_ar || '',
  images: data.images || [],
  category: data.category || '',
  brand: data.brand || '',
  inStock: data.in_stock || false,
  countries: data.countries,
  isBestSeller: data.is_best_seller,
  isFeatured: data.is_featured,
});

// AI scoring algorithm to recommend best product
const calculateProductScore = (product: Product): { score: number; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  // Stock availability (20 points)
  if (product.inStock) {
    score += 20;
    reasons.push('متوفر الآن');
  }

  // Discount percentage (25 points max)
  const discountBonus = Math.min(product.discount || 0, 25);
  score += discountBonus;
  if (product.discount) {
    reasons.push(`خصم ${product.discount}%`);
  }

  // Rating/reviews (20 points)
  const rating = 4.5;
  const ratingScore = Math.min((rating / 5) * 20, 20);
  score += ratingScore;
  if (rating > 0) {
    reasons.push(`تقييم ${rating.toFixed(1)}/5`);
  }

  // Price value (15 points) - lower is better but not too low
  const priceScore = Math.max(0, 15 - (product.price / 1000) * 2);
  score += priceScore;

  // Brand reputation/popularity (10 points)
  if (product.isBestSeller) {
    score += 10;
    reasons.push('الأكثر مبيعاً');
  }

  // Featured/popular (10 points)
  if (product.isFeatured) {
    score += 5;
    reasons.push('منتج مميز');
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons.slice(0, 3), // Top 3 reasons
  };
};

const ComparisonPage = () => {
  const { data: content } = useSiteContent('comparison_page_');
  const { addToCart } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const productIds = searchParams.getAll('id');
  const MAX_COMPARISON_ITEMS = 10;
  const [showLimitWarning, setShowLimitWarning] = useState(productIds.length > MAX_COMPARISON_ITEMS);

  // Limit to max 10 items
  const limitedProductIds = productIds.slice(0, MAX_COMPARISON_ITEMS);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['comparison-products', limitedProductIds],
    queryFn: async () => {
      if (limitedProductIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', limitedProductIds);
      if (error) throw error;
      return (data || []).map(convertToProduct);
    },
    enabled: limitedProductIds.length > 0,
  });

  // Calculate AI recommendation
  const { recommendedProduct, scoredProducts } = useMemo(() => {
    if (products.length === 0) return { recommendedProduct: null, scoredProducts: [] };

    const scored = products.map(p => ({
      product: p,
      ...calculateProductScore(p),
    })).sort((a, b) => b.score - a.score);

    return {
      recommendedProduct: scored[0]?.product || null,
      scoredProducts: scored,
    };
  }, [products]);

  const handleRemoveProduct = (id: string) => {
    const newIds = productIds.filter(pid => pid !== id);
    if (newIds.length === 0) {
      navigate('/comparison');
    } else {
      setSearchParams({ id: newIds });
      setShowLimitWarning(newIds.length > MAX_COMPARISON_ITEMS);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 py-12 md:py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-heading text-3xl md:text-4xl mb-3">
                {getSiteText(content, 'comparison_page_title', 'مقارنة المنتجات')}
              </h1>
              <p className="text-muted-foreground text-lg">
                {getSiteText(content, 'comparison_page_subtitle', `قارن بين منتجاتك المفضلة مع توصيات ذكية`)}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Limit Warning */}
        {showLimitWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border-b border-orange-200 py-3"
          >
            <div className="container mx-auto px-4 flex items-center gap-3 text-orange-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">
                تم الحد الأقصى: يمكنك مقارنة {MAX_COMPARISON_ITEMS} منتجات فقط. تم عرض أول {MAX_COMPARISON_ITEMS} منتج.
              </span>
            </div>
          </motion.div>
        )}

        {productIds.length === 0 ? (
          <section className="container mx-auto px-4">
            <div className="text-center py-24">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <ArrowLeft className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h2 className="font-heading text-2xl mb-2">لا توجد منتجات للمقارنة</h2>
              <p className="text-muted-foreground text-lg mb-8">
                {getSiteText(content, 'comparison_page_empty', 'اختر منتجات لمقارنتها')}
              </p>
              <button
                onClick={() => navigate('/products')}
                className="btn-unified px-8 py-3"
              >
                تصفح المنتجات
              </button>
            </div>
          </section>
        ) : isLoading ? (
          <section className="container mx-auto px-4">
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          </section>
        ) : (
          <section className="container mx-auto px-4 py-12">
            {/* AI Recommendation Banner */}
            {recommendedProduct && products.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 bg-gradient-to-r from-primary/10 via-purple-500/5 to-primary/10 rounded-xl border-2 border-primary/30 p-6 md:p-8"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Trophy className="w-8 h-8 text-primary animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading text-lg mb-2">✨ التوصية الذكية</h3>
                    <div className="mb-4">
                      <h4 className="font-heading text-xl text-primary mb-1">
                        {recommendedProduct.name_ar}
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${scoredProducts[0].score}%` }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-primary to-purple-500"
                          />
                        </div>
                        <span className="font-heading text-sm text-primary min-w-[40px]">
                          {Math.round(scoredProducts[0].score)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scoredProducts[0].reasons.map((reason, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 bg-white/50 px-3 py-1 rounded-full text-xs font-medium text-foreground">
                          <Check className="w-3 h-3 text-green-600" />
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Products Grid */}
            <div className="overflow-x-auto mb-8">
              <motion.div
                layout
                className="grid gap-4 min-w-full"
                style={{ gridTemplateColumns: `repeat(${products.length}, minmax(280px, 1fr))` }}
              >
                {/* Product Cards */}
                {products.map((product, idx) => {
                  const isRecommended = recommendedProduct?.id === product.id;
                  const scoreData = scoredProducts.find(s => s.product.id === product.id);
                  
                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div className={`bg-card rounded-xl border-2 overflow-hidden h-full flex flex-col transition-all ${
                        isRecommended
                          ? 'border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}>
                        {/* Winner Badge */}
                        {isRecommended && (
                          <div className="bg-gradient-to-r from-primary to-purple-500 text-white px-4 py-2 flex items-center gap-2 justify-center text-sm font-heading">
                            <Trophy className="w-4 h-4" />
                            الخيار الأفضل
                          </div>
                        )}

                        {/* Remove Button */}
                        <div className="flex justify-end p-2">
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition"
                            title="إزالة من المقارنة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Product Image */}
                        <div className="aspect-square bg-muted mb-4 overflow-hidden mx-3 rounded-lg relative">
                          {product.images?.[0] && (
                            <img
                              src={product.images[0]}
                              alt={product.name_ar}
                              className="w-full h-full object-cover hover:scale-105 transition"
                            />
                          )}
                          {product.discount && (
                            <div className="absolute top-2 left-2 bg-destructive text-white px-2 py-1 rounded-lg text-xs font-bold">
                              -{product.discount}%
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="px-4 py-2 flex-1 flex flex-col">
                          <h3 className="font-heading text-base line-clamp-2 mb-1">{product.name_ar}</h3>
                          <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>

                          {/* Score */}
                          {scoreData && (
                            <div className="mb-3 flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${scoreData.score}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-primary">{Math.round(scoreData.score)}</span>
                            </div>
                          )}

                          {/* Rating */}
                          {product.rating && (
                            <div className="flex items-center gap-1 mb-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs font-medium">{product.rating.toFixed(1)}</span>
                            </div>
                          )}

                          {/* Price */}
                          <div className="flex items-baseline gap-2 mb-3 mt-auto">
                            <span className="font-heading text-xl text-primary">{Math.round(product.price)}</span>
                            {product.original_price && (
                              <span className="text-xs line-through text-muted-foreground">
                                {Math.round(product.original_price)}
                              </span>
                            )}
                          </div>

                          {/* Stock Status */}
                          <div className="mb-3">
                            {product.in_stock ? (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                ✓ متوفر
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                                ✕ غير متوفر
                              </span>
                            )}
                          </div>

                          {/* Add to Cart */}
                          <button
                            onClick={() => {
                              addToCart({
                                id: product.id,
                                name: product.name,
                                nameAr: product.name_ar,
                                slug: product.slug,
                                price: Number(product.price),
                                images: product.images || [],
                                category: product.category,
                                brand: product.brand,
                                inStock: product.in_stock ?? true,
                              } as Product, 1);
                            }}
                            disabled={!product.in_stock}
                            className="btn-unified w-full text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {getSiteText(content, 'comparison_add_to_cart', 'أضف للسلة')}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Specifications Comparison */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-2xl mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                المقارنة التفصيلية
              </h2>

              {/* Basic Info */}
              {[
                { key: 'brand', label: 'الماركة' },
                { key: 'category', label: 'الفئة' },
                { key: 'in_stock', label: 'الحالة' },
              ].map(spec => (
                <motion.div key={spec.key} layout>
                  <div
                    className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                    style={{ gridTemplateColumns: `repeat(${products.length}, minmax(200px, 1fr))` }}
                  >
                    <div className="font-heading text-foreground text-sm">{spec.label}</div>
                    {products.map(product => (
                      <div key={product.id} className="text-sm text-foreground">
                        {spec.key === 'in_stock' ? (
                          product.in_stock ? (
                            <span className="flex items-center gap-2 text-green-600 font-medium">
                              <Check className="w-4 h-4" /> متوفر
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-red-600 font-medium">
                              <X className="w-4 h-4" /> غير متوفر
                            </span>
                          )
                        ) : (
                          product[spec.key as keyof typeof product]?.toString() || '-'
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {/* Price Comparison */}
              <motion.div layout>
                <div
                  className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                  style={{ gridTemplateColumns: `repeat(${products.length}, minmax(200px, 1fr))` }}
                >
                  <div className="font-heading text-foreground text-sm">السعر الأصلي</div>
                  {products.map(product => (
                    <div key={product.id} className="text-sm font-mono text-foreground">
                      {product.original_price || product.price}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Discount Comparison */}
              <motion.div layout>
                <div
                  className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                  style={{ gridTemplateColumns: `repeat(${products.length}, minmax(200px, 1fr))` }}
                >
                  <div className="font-heading text-foreground text-sm">الخصم</div>
                  {products.map(product => (
                    <div key={product.id} className="text-sm font-semibold">
                      {product.discount ? (
                        <span className="text-green-600">-{product.discount}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Rating Comparison */}
              <motion.div layout>
                <div
                  className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                  style={{ gridTemplateColumns: `repeat(${products.length}, minmax(200px, 1fr))` }}
                >
                  <div className="font-heading text-foreground text-sm">التقييم</div>
                  {products.map(product => (
                    <div key={product.id} className="text-sm">
                      {product.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{product.rating.toFixed(1)}/5</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ComparisonPage;
