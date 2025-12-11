import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Menu, X, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { country, openCart, getCartCount } = useStore();
  const cartCount = getCartCount();
  const navigate = useNavigate();

  const navLinks = [
    { href: '/home', label: 'الرئيسية', labelEn: 'Home' },
    { href: '/products', label: 'المنتجات', labelEn: 'Products' },
    { href: '/offers', label: 'العروض', labelEn: 'Offers' },
    { href: '/about', label: 'من نحن', labelEn: 'About' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Main Navbar - Black background */}
      <div className="bg-secondary border-b border-gold/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Left: Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2.5 text-gold hover:text-gold-light transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Center: Logo */}
            <Link to="/home" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
              <span 
                className="text-2xl md:text-3xl tracking-[0.15em]"
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #C9A227 0%, #D4AF37 25%, #E8C547 50%, #D4AF37 75%, #C9A227 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ERMGOLD
              </span>
              {/* Chain Icon */}
              <svg 
                viewBox="0 0 36 12" 
                className="w-8 h-3 mt-0.5"
                style={{ color: '#D4AF37' }}
              >
                <ellipse cx="10" cy="6" rx="8" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <ellipse cx="26" cy="6" rx="8" ry="4.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            </Link>

            {/* Right: Search & Cart */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2.5 text-gold hover:text-gold-light transition-colors"
                aria-label="Search"
              >
                <Search className="w-6 h-6" />
              </button>

              <button
                onClick={openCart}
                className="relative p-2.5 text-gold hover:text-gold-light transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 text-[11px] font-bold rounded-full flex items-center justify-center bg-gold text-secondary"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar - Expandable */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-secondary border-b border-gold/10"
          >
            <div className="container mx-auto px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/50" />
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-gold/20 rounded-lg font-body text-sm text-gold-light placeholder:text-gold/40 focus:outline-none focus:border-gold transition-colors"
                  dir="rtl"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile/Desktop Menu - Slide Down */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden bg-secondary border-b border-gold/10 shadow-lg"
          >
            <nav className="container mx-auto px-4 py-6">
              {/* Navigation Links - Stacked vertically */}
              <div className="flex flex-col gap-2">
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block p-4 text-right font-body text-gold-light hover:text-gold hover:bg-gold/5 rounded-lg transition-all duration-200 border border-transparent hover:border-gold/20"
                    >
                      <span className="text-sm">{link.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
              
              {/* Country Selector */}
              <div className="mt-6 pt-4 border-t border-gold/20">
                <button
                  onClick={() => {
                    navigate('/select-country');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 text-gold/70 hover:text-gold transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="font-body text-sm">
                    {country === 'SA' ? '🇸🇦 السعودية' : country === 'YE' ? '🇾🇪 اليمن' : 'اختر الموقع'}
                  </span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
