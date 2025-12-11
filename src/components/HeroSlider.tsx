import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Sparkles, ArrowLeft } from 'lucide-react';
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
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
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
    if (banners.length === 0 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
      setImageLoaded(false);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length, isHovered]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    setImageLoaded(false);
  };
  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setImageLoaded(false);
  };
  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setImageLoaded(false);
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
    <section 
      className="relative h-[90vh] min-h-[700px] overflow-hidden bg-secondary"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0"
        >
          {/* Background Image with Parallax Effect */}
          <motion.div 
            className="absolute inset-0"
            animate={{ scale: isHovered ? 1.02 : 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Image Skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-secondary animate-pulse" />
            )}
            
            <img
              src={currentBanner.image_url}
              alt={currentBanner.title_ar}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            
            {/* Multi-layer Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-transparent to-transparent" />
          </motion.div>

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

          {/* Content - Centered */}
          <div className="relative h-full container mx-auto px-4 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="max-w-2xl text-center"
            >
              {/* Subtitle Badge */}
              {currentBanner.subtitle_ar && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold/10 backdrop-blur-sm rounded-full mb-6 border border-gold/20"
                >
                  <Sparkles className="w-4 h-4 text-gold" />
                  <span className="text-gold font-body text-sm tracking-[0.2em] uppercase">
                    {currentBanner.subtitle_ar}
                  </span>
                </motion.div>
              )}

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="font-heading text-5xl md:text-6xl lg:text-7xl text-secondary-foreground leading-[1.1] mb-6"
              >
                {currentBanner.title_ar.split(' ').map((word, idx) => (
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
                transition={{ delay: 0.7, duration: 0.6 }}
                className="w-24 h-1 bg-gradient-to-r from-gold to-gold-light mb-8 mx-auto"
              />

              {/* CTA Buttons - Stacked vertically */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-start gap-3"
              >
                <Link
                  to={currentBanner.cta_link || '/products'}
                  className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase overflow-hidden rounded-lg transition-all duration-300 hover:shadow-[0_10px_40px_-10px_hsl(var(--gold)/0.5)] min-w-[200px]"
                >
                  {/* Shine Effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  <span className="relative">{currentBanner.cta_text_ar || 'تسوق الآن'}</span>
                  <ArrowLeft className="w-5 h-5 relative group-hover:-translate-x-1 transition-transform" />
                </Link>

                {/* Secondary Link - Now with background */}
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-gold/10 backdrop-blur-sm border border-gold/30 text-gold font-heading tracking-wider text-sm uppercase hover:bg-gold/20 transition-all duration-300 rounded-lg min-w-[200px]"
                >
                  اعرف المزيد
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows - Hidden on mobile */}

      {/* Progress Bar & Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
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
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 1.5, y: { repeat: Infinity, duration: 1.5 } }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 hidden md:block"
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
