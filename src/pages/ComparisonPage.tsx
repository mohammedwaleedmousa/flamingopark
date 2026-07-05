import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useStore, Product } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';

const ComparisonPage = () => {
  const { data: content } = useSiteContent('comparison_page_');
  const { addToCart } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const productIds = searchParams.getAll('id');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['comparison-products', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);
      if (error) throw error;
      return data || [];
    },
    enabled: productIds.length > 0,
  });

  const specifications = useMemo(() => {
    if (products.length === 0) return [];
    
    const allKeys = new Set<string>();
    products.forEach(p => {
      if (p.specifications) {
        Object.keys(p.specifications).forEach(k => allKeys.add(k));
      }
    });
    
    return Array.from(allKeys);
  }, [products]);

  const handleAddToCart = (product: any) => {
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
  };

  const handleRemoveProduct = (id: string) => {
    const newIds = productIds.filter(pid => pid !== id);
    if (newIds.length === 0) {
      navigate('/comparison');
    } else {
      setSearchParams({ id: newIds });
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
                {getSiteText(content, 'comparison_page_subtitle', `قارن بين منتجاتك المفضلة`)}
              </p>
            </motion.div>
          </div>
        </section>

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
            {/* Scrollable Comparison Table */}
            <div className="overflow-x-auto mb-8">
              <motion.div
                layout
                className="grid gap-4 min-w-full"
                style={{ gridTemplateColumns: `250px repeat(${products.length}, minmax(280px, 1fr))` }}
              >
                {/* Specs Column Header */}
                <div className="sticky left-0 z-10 bg-background">
                  <div className="font-heading text-foreground p-4">
                    {getSiteText(content, 'comparison_specs_label', 'المواصفات')}
                  </div>
                </div>

                {/* Product Cards */}
                {products.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col">
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
                      <div className="aspect-square bg-muted mb-4 overflow-hidden mx-3 rounded-lg">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.name_ar}
                            className="w-full h-full object-cover hover:scale-105 transition"
                          />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="px-4 py-2 flex-1 flex flex-col">
                        <h3 className="font-heading text-base line-clamp-2 mb-1">{product.name_ar}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{product.brand}</p>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-4 mt-auto">
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
                              متوفر
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                              غير متوفر
                            </span>
                          )}
                        </div>

                        {/* Add to Cart */}
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.in_stock}
                          className="btn-unified w-full text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          {getSiteText(content, 'comparison_add_to_cart', 'أضف للسلة')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Specifications Comparison */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="font-heading text-2xl mb-6">المقارنة التفصيلية</h2>

              {/* Basic Info */}
              {[
                { key: 'brand', label: 'الماركة' },
                { key: 'category', label: 'الفئة' },
                { key: 'in_stock', label: 'الحالة' },
              ].map(spec => (
                <motion.div key={spec.key} layout>
                  <div
                    className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                    style={{ gridTemplateColumns: `250px repeat(${products.length}, minmax(280px, 1fr))` }}
                  >
                    <div className="font-heading text-foreground">{spec.label}</div>
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

              {/* Custom Specifications */}
              {specifications.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-heading text-lg mb-4">المواصفات الإضافية</h3>
                  <div className="space-y-4">
                    {specifications.map(spec => (
                      <motion.div key={spec} layout>
                        <div
                          className="grid gap-4 bg-card rounded-lg p-6 border border-border"
                          style={{ gridTemplateColumns: `250px repeat(${products.length}, minmax(280px, 1fr))` }}
                        >
                          <div className="font-heading text-foreground capitalize">{spec}</div>
                          {products.map(product => (
                            <div key={product.id} className="text-sm text-muted-foreground">
                              {product.specifications?.[spec as keyof typeof product.specifications]?.toString() || '-'}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default ComparisonPage;
