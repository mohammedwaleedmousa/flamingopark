import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import HeroSlider from '@/components/HeroSlider';
import BrandsStrip from '@/components/BrandsStrip';
import ProductCard from '@/components/ProductCard';
import ReviewsSection from '@/components/ReviewsSection';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useStore, Product } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const { country } = useStore();

  // Fetch featured products
  const { data: featuredProducts = [] } = useQuery({
    queryKey: ['featured-products', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
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
    enabled: !!country,
  });

  // Fetch best sellers
  const { data: bestSellers = [] } = useQuery({
    queryKey: ['best-sellers', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('is_best_seller', true)
        .contains('countries', [country])
        .limit(3);
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

  if (!country) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <HeroSlider />

        {/* Brands */}
        <BrandsStrip />

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                  <span className="text-gold">منتجات</span> مميزة
                </h2>
                <div className="w-20 h-px bg-gold mx-auto" />
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {featuredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} compact />
                ))}
              </div>

              <div className="text-center mt-10">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 font-heading text-sm text-gold hover:text-gold-dark transition-colors tracking-wider uppercase"
                >
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="section-beige">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                  <span className="text-gold">الأكثر</span> مبيعاً
                </h2>
                <div className="w-20 h-px bg-gold mx-auto" />
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {bestSellers.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} compact />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="py-16 md:py-24 bg-secondary text-gold-light relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }} />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-heading text-3xl md:text-5xl text-gold mb-6">
                انضم إلى عائلة ERMGOLD
              </h2>
              <p className="font-body text-lg opacity-80 mb-8 max-w-xl mx-auto">
                احصل على آخر العروض والمنتجات الحصرية
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300"
              >
                تسوق الآن
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Reviews */}
        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
