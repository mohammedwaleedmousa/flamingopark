import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStore, Product } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { Percent, Clock, Loader2, Sparkles, Tag, Flame, Gift, Zap } from 'lucide-react';

const OffersPage = () => {
  const { country } = useStore();
  const [timeLeft, setTimeLeft] = useState({
    days: 3,
    hours: 12,
    minutes: 45,
    seconds: 30,
  });

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        
        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            } else {
              hours = 23;
              if (days > 0) {
                days--;
              }
            }
          }
        }
        
        return { days, hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary rounded-xl flex items-center justify-center border border-gold/30 shadow-[0_0_20px_hsl(var(--gold)/0.2)]">
          <span className="font-heading text-2xl md:text-3xl text-gold">
            {value.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse" />
      </div>
      <span className="text-xs md:text-sm text-gold-light/70 mt-2 font-body">{label}</span>
    </div>
  );

  const features = [
    { icon: Tag, text: 'خصومات تصل إلى 50%', color: 'text-gold' },
    { icon: Gift, text: 'هدايا مجانية', color: 'text-emerald-400' },
    { icon: Zap, text: 'شحن سريع', color: 'text-blue-400' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-secondary via-secondary to-charcoal overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            {/* Gold Particles */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-gold rounded-full"
                  initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: Math.random() * 100 + '%',
                    opacity: 0 
                  }}
                  animate={{ 
                    y: [null, '-100%'],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2
                  }}
                />
              ))}
            </div>
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-5" style={{
              backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} />

            {/* Glowing Orbs */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold/20 to-gold/10 backdrop-blur-sm rounded-full mb-8 border border-gold/30"
              >
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="font-body text-sm text-gold">عروض محدودة المدة</span>
                <Sparkles className="w-4 h-4 text-gold" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-heading text-5xl md:text-7xl lg:text-8xl mb-6"
              >
                <span className="text-secondary-foreground">عروض</span>
                <br />
                <span className="text-gold-gradient">استثنائية</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-body text-lg md:text-xl text-gold-light/70 max-w-2xl mx-auto mb-12"
              >
                اغتنم الفرصة واحصل على أفخم القطع الذهبية بأسعار لا تُقاوم
              </motion.p>

              {/* Countdown Timer */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-12"
              >
                <p className="text-gold-light/60 text-sm mb-4 font-body flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  ينتهي العرض خلال
                </p>
                <div className="flex items-center justify-center gap-3 md:gap-6">
                  <TimeBox value={timeLeft.days} label="يوم" />
                  <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                  <TimeBox value={timeLeft.hours} label="ساعة" />
                  <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                  <TimeBox value={timeLeft.minutes} label="دقيقة" />
                  <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                  <TimeBox value={timeLeft.seconds} label="ثانية" />
                </div>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
              >
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-gold-light/80">
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    <span className="font-body text-sm">{feature.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Bottom Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M0 50L48 45.8C96 41.7 192 33.3 288 37.5C384 41.7 480 58.3 576 62.5C672 66.7 768 58.3 864 50C960 41.7 1056 33.3 1152 37.5C1248 41.7 1344 58.3 1392 66.7L1440 75V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" 
                fill="hsl(var(--background))"
              />
            </svg>
          </div>
        </section>

        {/* Promo Banner */}
        <section className="py-6 bg-gradient-to-r from-gold via-gold-light to-gold relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBtLTIgMGEyIDIgMCAxIDAgNCAwIDIgMiAwIDEgMC00IDB6IiBmaWxsPSJyZ2JhKDAsMCwwLDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4 md:gap-8">
              <Percent className="w-6 h-6 text-secondary animate-bounce" />
              <span className="font-heading text-secondary text-lg md:text-xl">
                استخدم كود GOLD50 للحصول على خصم إضافي 10%
              </span>
              <Percent className="w-6 h-6 text-secondary animate-bounce" />
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                جميع <span className="text-gold">العروض</span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-4" />
              <p className="text-muted-foreground font-body max-w-lg mx-auto">
                اكتشف تشكيلتنا الفاخرة من المجوهرات الذهبية بأسعار مخفضة
              </p>
            </motion.div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-gold" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-gold/20 rounded-full" />
                </div>
                <p className="text-muted-foreground font-body">جاري تحميل العروض...</p>
              </div>
            ) : discountedProducts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Tag className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-2xl text-foreground mb-3">لا توجد عروض حالياً</h3>
                <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
                  ترقبوا عروضنا القادمة! سنُعلمكم فور توفر عروض جديدة
                </p>
              </motion.div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
                  {[
                    { value: discountedProducts.length, label: 'منتج بالعرض' },
                    { value: Math.max(...discountedProducts.map(p => p.discount || 0)), label: '% أعلى خصم' },
                    { value: discountedProducts.filter(p => p.inStock).length, label: 'متوفر حالياً' },
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center p-4 rounded-xl bg-muted/50 border border-border/30"
                    >
                      <span className="font-heading text-3xl text-gold">{stat.value}</span>
                      <p className="text-sm text-muted-foreground font-body mt-1">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {discountedProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <Sparkles className="w-10 h-10 text-gold mx-auto mb-4" />
              <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-4">
                لا تفوت أي عرض!
              </h2>
              <p className="text-muted-foreground font-body mb-6">
                تابعنا على وسائل التواصل الاجتماعي لتكون أول من يعلم بالعروض الجديدة
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-gold transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-secondary-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-gold transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-secondary-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  </svg>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-gold transition-colors cursor-pointer">
                  <svg className="w-5 h-5 text-secondary-foreground" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;
