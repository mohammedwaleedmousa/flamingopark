import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';

const IntroPage = () => {
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const navigate = useNavigate();
  const { country, setCountry } = useStore();

  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 500);
    const buttonTimer = setTimeout(() => setShowButton(true), 3500);
    return () => {
      clearTimeout(textTimer);
      clearTimeout(buttonTimer);
    };
  }, []);

  const handleEnter = () => {
    if (country) {
      navigate('/home');
    } else {
      navigate('/select-country');
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-3xl" />

      <div className="relative z-10 text-center">
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h1
                className="font-heading text-5xl md:text-7xl lg:text-8xl text-gold tracking-[0.3em] mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <span className="inline-block overflow-hidden">
                  {'ERMGOLD'.split('').map((char, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: i * 0.15,
                        ease: "easeOut"
                      }}
                      className="inline-block"
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              </motion.h1>

              <motion.div
                className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent mb-6"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 1.5 }}
              />

              <motion.p
                className="text-gold-light/60 font-body text-sm md:text-base tracking-[0.5em] uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
              >
                Luxury Jewelry
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showButton && (
            <motion.button
              onClick={handleEnter}
              className="mt-16 px-10 py-4 border border-gold/50 text-gold font-heading tracking-[0.2em] text-sm uppercase relative overflow-hidden group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 transition-colors duration-300 group-hover:text-secondary">
                تسوق الآن
              </span>
              <motion.div
                className="absolute inset-0 bg-gold"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom decorative line */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4, duration: 1 }}
      >
        <div className="w-16 h-px bg-gold/30" />
        <div className="w-2 h-2 rotate-45 border border-gold/50" />
        <div className="w-16 h-px bg-gold/30" />
      </motion.div>
    </div>
  );
};

export default IntroPage;
