import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStore, Product } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Percent, Clock, Loader2 } from 'lucide-react';

const OffersPage = () => {
  const { country } = useStore();

  // Fetch discounted products
  const { data: discountedProducts = [], isLoading } = useQuery({
    queryKey: ['discounted-products', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('discount', 0)
        .contains('countries', [country])
        .order('discount', { ascending: false });
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
    enabled: !!country,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-20 bg-secondary overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full mb-6"
            >
              <Percent className="w-4 h-4 text-gold" />
              <span className="font-body text-sm text-gold">عروض حصرية</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-4xl md:text-6xl text-gold mb-4"
            >
              العروض الخاصة
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-body text-lg text-gold-light/80 max-w-xl mx-auto"
            >
              اغتنم الفرصة واحصل على أفضل القطع بأسعار استثنائية
            </motion.p>
          </div>
        </section>

        {/* Timer Banner */}
        <section className="bg-gold py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4">
              <Clock className="w-5 h-5 text-secondary" />
              <span className="font-body text-secondary">
                العروض متاحة لفترة محدودة
              </span>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
              </div>
            ) : discountedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground font-body text-lg">
                  لا توجد عروض متاحة حالياً
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {discountedProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} compact />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;
