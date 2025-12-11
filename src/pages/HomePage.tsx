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
import { ArrowLeft, Sparkles, Crown, Gem, Shield, Truck, Star, Percent } from 'lucide-react';
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

  // Fetch discounted products
  const { data: discountedProducts = [] } = useQuery({
    queryKey: ['discounted-home', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .gt('discount', 0)
        .contains('countries', [country])
        .order('discount', { ascending: false })
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

  if (!country) return null;

  const categories = [
    { name: 'خواتم', icon: '💍', link: '/products?category=rings' },
    { name: 'قلائد', icon: '📿', link: '/products?category=necklaces' },
    { name: 'أساور', icon: '⌚', link: '/products?category=bracelets' },
    { name: 'أقراط', icon: '✨', link: '/products?category=earrings' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-16 md:pt-18">
        {/* Hero Slider */}
        <HeroSlider />
        
        {/* Brands Strip - Right after banner */}
        <BrandsStrip />

        {/* Categories Section - Horizontal scrolling */}
        <section className="py-10 md:py-14 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
          <div className="container mx-auto px-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <span className="text-gold font-body text-sm tracking-widest uppercase">تصفح</span>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mt-2">
                الفئات <span className="text-gold">الرئيسية</span>
              </h2>
            </motion.div>
          </div>

          {/* Animated Categories Strip */}
          <div className="relative overflow-hidden px-4">
            <motion.div
              className="flex items-center gap-5 md:gap-8"
              animate={{
                x: ['0%', '-25%'],
              }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 20,
                  ease: 'linear',
                },
              }}
            >
              {[...categories, ...categories, ...categories, ...categories].map((category, index) => (
                <Link
                  key={`${category.name}-${index}`}
                  to={category.link}
                  className="group flex-shrink-0 p-5 md:p-8 bg-card rounded-2xl border-2 border-gold/30 hover:border-gold transition-all duration-300 hover:shadow-[0_15px_50px_-10px_hsl(var(--gold)/0.4)] text-center min-w-[140px] md:min-w-[180px]"
                >
                  <span className="text-4xl md:text-5xl block mb-4 group-hover:scale-110 transition-transform duration-300">
                    {category.icon}
                  </span>
                  <h3 className="font-heading text-lg md:text-xl text-foreground group-hover:text-gold transition-colors">
                    {category.name}
                  </h3>
                </Link>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="py-16 md:py-20">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-10"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-gold" />
                    <span className="text-gold font-body text-sm tracking-widest uppercase">مختارات</span>
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl text-foreground">
                    منتجات <span className="text-gold">مميزة</span>
                  </h2>
                </div>
                <Link
                  to="/products"
                  className="hidden md:inline-flex items-center gap-2 px-6 py-3 border border-gold/30 text-gold font-heading text-sm tracking-wider uppercase hover:bg-gold hover:text-secondary transition-all duration-300 rounded-lg"
                >
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {featuredProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>

              <div className="text-center mt-8 md:hidden">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gold/30 text-gold font-heading text-sm tracking-wider uppercase hover:bg-gold hover:text-secondary transition-all duration-300 rounded-lg"
                >
                  عرض الكل
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Best Sellers with different layout */}
        {bestSellers.length > 0 && (
          <section className="py-16 md:py-20 bg-gradient-to-b from-muted/50 to-muted">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 rounded-full mb-4">
                  <Crown className="w-4 h-4 text-gold" />
                  <span className="text-gold font-body text-sm">الأكثر طلباً</span>
                </div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                  الأكثر <span className="text-gold">مبيعاً</span>
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {bestSellers.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Offers Section */}
        {discountedProducts.length > 0 && (
          <section className="py-16 md:py-20 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5" />
            
            <div className="container mx-auto px-4 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex items-center justify-between mb-10"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-5 h-5 text-destructive" />
                    <span className="text-destructive font-body text-sm tracking-widest uppercase">عروض حصرية</span>
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl text-foreground">
                    خصومات <span className="text-gold">مميزة</span>
                  </h2>
                </div>
                <Link
                  to="/offers"
                  className="hidden md:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-secondary font-heading text-sm tracking-wider uppercase hover:shadow-lg transition-all duration-300 rounded-lg"
                >
                  جميع العروض
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {discountedProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>

              <div className="text-center mt-8 md:hidden">
                <Link
                  to="/offers"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-gold-light text-secondary font-heading text-sm tracking-wider uppercase rounded-lg"
                >
                  جميع العروض
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Banner */}
        <section className="py-20 md:py-28 bg-secondary text-gold-light relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            {/* Floating Particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-gold rounded-full"
                initial={{ 
                  x: `${Math.random() * 100}%`, 
                  y: `${Math.random() * 100}%`,
                  opacity: 0 
                }}
                animate={{ 
                  y: [null, '-50%'],
                  opacity: [0, 0.5, 0]
                }}
                transition={{ 
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2
                }}
              />
            ))}
            
            {/* Pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />

            {/* Glowing Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 mx-auto mb-8 rounded-full bg-gold/10 flex items-center justify-center"
              >
                <Gem className="w-10 h-10 text-gold" />
              </motion.div>

              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl mb-6">
                <span className="text-secondary-foreground">انضم إلى عائلة</span>
                <br />
                <span className="text-gold-gradient">ERMGOLD</span>
              </h2>

              <p className="font-body text-lg md:text-xl text-gold-light/70 mb-10 max-w-xl mx-auto">
                احصل على آخر العروض والمنتجات الحصرية واستمتع بتجربة تسوق فريدة
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-3 px-10 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300 rounded-lg hover:shadow-[0_10px_30px_-10px_hsl(var(--gold)/0.5)]"
                >
                  تسوق الآن
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-3 px-10 py-4 border border-gold/30 text-gold font-heading tracking-wider text-sm uppercase hover:bg-gold/10 transition-all duration-300 rounded-lg"
                >
                  اعرف المزيد
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 md:gap-10 mt-12 pt-12 border-t border-gold/10">
                {[
                  { icon: Shield, text: 'دفع آمن' },
                  { icon: Truck, text: 'شحن مجاني' },
                  { icon: Star, text: '+5000 عميل' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-gold-light/60">
                    <item.icon className="w-4 h-4 text-gold" />
                    <span className="text-xs font-body">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Reviews Section */}
        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
