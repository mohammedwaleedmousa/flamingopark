import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { Link } from 'react-router-dom';

interface Banner {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string | null;
  subtitle_ar: string | null;
  image_url: string;
  cta_text: string | null;
  cta_text_ar: string | null;
  cta_link: string | null;
}

const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { country } = useStore();

  const { data: banners = [] } = useQuery({
    queryKey: ['banners', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country])
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Banner[];
    },
    enabled: !!country,
  });

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % banners.length);

  if (banners.length === 0) {
    return (
      <section className="relative h-[80vh] min-h-[600px] overflow-hidden bg-secondary flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-4xl md:text-6xl text-gold mb-4">ERMGOLD</h1>
          <p className="font-body text-gold-light/60">مجوهرات فاخرة</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-3 mt-8 px-8 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300"
          >
            تسوق الآن
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <section className="relative h-[80vh] min-h-[600px] overflow-hidden bg-secondary">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${currentBanner.image_url})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full container mx-auto px-4 flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-xl"
            >
              {currentBanner.subtitle_ar && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gold font-body text-sm tracking-[0.3em] uppercase mb-4"
                >
                  {currentBanner.subtitle_ar}
                </motion.p>
              )}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-heading text-4xl md:text-5xl lg:text-6xl text-gold-light leading-tight mb-6"
              >
                {currentBanner.title_ar}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Link
                  to={currentBanner.cta_link || '/products'}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300 shine-effect"
                >
                  {currentBanner.cta_text_ar || 'تسوق الآن'}
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-background/20 backdrop-blur-sm border border-gold/30 text-gold hover:bg-gold hover:text-secondary transition-all duration-300 rounded-full"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-background/20 backdrop-blur-sm border border-gold/30 text-gold hover:bg-gold hover:text-secondary transition-all duration-300 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-gold' 
                    : 'bg-gold/40 hover:bg-gold/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroSlider;
