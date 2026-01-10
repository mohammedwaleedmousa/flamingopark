import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { Link } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

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
  image_zoom: number | null;
  image_position_x: number | null;
  image_position_y: number | null;
}

const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { country } = useStore();

  const autoplayPlugin = Autoplay({ delay: 6000, stopOnInteraction: false });

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, direction: 'rtl' },
    [autoplayPlugin]
  );

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

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
    setImageLoaded(false);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const goTo = (index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  };

  // Default Hero when no banners
  if (banners.length === 0) {
    return (
      <section className="relative h-[90vh] min-h-[700px] overflow-hidden bg-gradient-to-b from-secondary via-secondary to-charcoal">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Floating Particles */}
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-gold rounded-full"
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: `${Math.random() * 100}%`,
                opacity: 0,
                scale: 0
              }}
              animate={{ 
                y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
                opacity: [0, 0.6, 0],
                scale: [0, 1.5, 0]
              }}
              transition={{ 
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 3
              }}
            />
          ))}
          
          {/* Radial Gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--gold)/0.1)_0%,_transparent_70%)]" />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative h-full flex items-center justify-center">
          <div className="text-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-gold/10 flex items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-gold" />
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="font-heading text-6xl md:text-8xl text-gold-gradient mb-6"
            >
              ERMGOLD
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-body text-xl md:text-2xl text-gold-light/70 mb-10"
            >
              مجوهرات ذهبية فاخرة
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Link
                to="/products"
                className="inline-flex items-center gap-3 px-10 py-5 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300 rounded-lg hover:shadow-[0_10px_40px_-10px_hsl(var(--gold)/0.5)]"
              >
                تسوق الآن
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Bottom Gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>
    );
  }

  const currentBanner = banners[currentIndex];

  return (
    <section className="relative h-[90vh] min-h-[700px] overflow-hidden bg-secondary">
      {/* Embla Carousel Container */}
      <div className="absolute inset-0" ref={emblaRef}>
        <div className="flex h-full">
          {banners.map((banner, index) => (
            <div key={banner.id} className="flex-[0_0_100%] min-w-0 h-full relative">
              {/* Background Image */}
              <div className="absolute inset-0">
                <img
                  src={banner.image_url}
                  alt={banner.title_ar}
                  onLoad={() => index === currentIndex && setImageLoaded(true)}
                  className="w-full h-full object-cover"
                  style={{
                    transform: `scale(${banner.image_zoom || 1})`,
                    objectPosition: `${banner.image_position_x ?? 50}% ${banner.image_position_y ?? 50}%`,
                  }}
                />
                
                {/* Multi-layer Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-transparent to-transparent" />
              </div>

              {/* Animated Gold Particles */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-gold rounded-full"
                    initial={{ 
                      x: `${20 + Math.random() * 30}%`, 
                      y: `${Math.random() * 100}%`,
                      opacity: 0 
                    }}
                    animate={{ 
                      y: [null, '-100%'],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{ 
                      duration: 4 + Math.random() * 3,
                      repeat: Infinity,
                      delay: Math.random() * 2
                    }}
                  />
                ))}
              </div>

              {/* Content - Positioned at bottom */}
              <div className="relative h-full container mx-auto px-4 flex items-end justify-center pb-28 md:pb-32">
                <AnimatePresence mode="wait">
                  {index === currentIndex && (
                    <motion.div
                      key={banner.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="max-w-2xl text-center flex flex-col items-center justify-center"
                    >
                      {/* Subtitle Badge */}
                      {banner.subtitle_ar && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 backdrop-blur-sm rounded-full mb-4 border border-gold/20"
                        >
                          <Sparkles className="w-4 h-4 text-gold" />
                          <span className="text-gold font-body text-sm tracking-[0.2em] uppercase">
                            {banner.subtitle_ar}
                          </span>
                        </motion.div>
                      )}

                      {/* Title */}
                      <motion.h1
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="font-heading text-4xl md:text-5xl lg:text-6xl text-secondary-foreground leading-[1.1] mb-4 text-center"
                      >
                        {banner.title_ar.split(' ').map((word, idx) => (
                          <span key={idx}>
                            {idx === 0 ? (
                              <span className="text-gold-gradient">{word}</span>
                            ) : (
                              <span> {word}</span>
                            )}
                          </span>
                        ))}
                      </motion.h1>

                      {/* Decorative Line - Centered */}
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="w-20 h-0.5 bg-gradient-to-r from-gold to-gold-light mb-6"
                      />

                      {/* CTA Buttons - Centered */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col sm:flex-row items-center gap-3"
                      >
                        <Link
                          to={banner.cta_link || '/products'}
                          className="group relative inline-flex items-center justify-center gap-3 px-8 py-3 bg-gold text-secondary font-heading tracking-wider text-sm uppercase overflow-hidden rounded-lg transition-all duration-300 hover:shadow-[0_10px_40px_-10px_hsl(var(--gold)/0.5)] min-w-[180px]"
                        >
                          {/* Shine Effect */}
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          
                          <span className="relative">{banner.cta_text_ar || 'تسوق الآن'}</span>
                          <ArrowLeft className="w-4 h-4 relative group-hover:-translate-x-1 transition-transform" />
                        </Link>

                        {/* Secondary Link */}
                        <Link
                          to="/about"
                          className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gold/10 backdrop-blur-sm border border-gold/30 text-gold font-heading tracking-wider text-sm uppercase hover:bg-gold/20 transition-all duration-300 rounded-lg min-w-[180px]"
                        >
                          اعرف المزيد
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar & Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-4">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                className="relative group"
              >
                <div className={`w-12 h-1 rounded-full overflow-hidden transition-all duration-300 ${
                  index === currentIndex ? 'bg-gold/30' : 'bg-gold/10 hover:bg-gold/20'
                }`}>
                  {index === currentIndex && (
                    <motion.div
                      className="h-full bg-gold"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 6, ease: 'linear' }}
                      key={`progress-${currentIndex}`}
                    />
                  )}
                </div>
                
                {/* Tooltip */}
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-gold/70 font-body opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {index + 1} / {banners.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, y: { repeat: Infinity, duration: 1.5 } }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 hidden md:block z-10"
      >
        <div className="w-6 h-10 border-2 border-gold/30 rounded-full flex items-start justify-center p-2">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-1.5 bg-gold rounded-full"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSlider;
