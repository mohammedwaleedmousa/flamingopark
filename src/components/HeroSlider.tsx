import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { banners } from '@/data/products';
import { useStore } from '@/store/useStore';
import { Link } from 'react-router-dom';

const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { country } = useStore();

  const countryBanners = banners.filter(b => 
    country ? b.countries.includes(country) : true
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % countryBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [countryBanners.length]);

  const goTo = (index: number) => setCurrentIndex(index);
  const goPrev = () => setCurrentIndex((prev) => (prev - 1 + countryBanners.length) % countryBanners.length);
  const goNext = () => setCurrentIndex((prev) => (prev + 1) % countryBanners.length);

  if (countryBanners.length === 0) return null;

  return (
    <section className="relative h-[80vh] min-h-[600px] overflow-hidden bg-secondary">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${countryBanners[currentIndex].image})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/60 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative h-full container mx-auto px-4 flex items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="max-w-xl"
            >
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-gold font-body text-sm tracking-[0.3em] uppercase mb-4"
              >
                {countryBanners[currentIndex].subtitleAr}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-heading text-4xl md:text-5xl lg:text-6xl text-gold-light leading-tight mb-6"
              >
                {countryBanners[currentIndex].titleAr}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Link
                  to="/products"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300 shine-effect"
                >
                  {countryBanners[currentIndex].ctaAr}
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
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
        {countryBanners.map((_, index) => (
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
    </section>
  );
};

export default HeroSlider;
