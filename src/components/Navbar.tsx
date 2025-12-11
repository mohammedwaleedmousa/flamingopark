import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Search, Menu, X, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/home" className="flex items-center">
            <span className="font-heading text-2xl md:text-3xl text-gold tracking-[0.2em]">
              ERMGOLD
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="font-body text-sm text-foreground/80 hover:text-gold transition-colors duration-300 gold-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {/* Country Selector */}
            <button
              onClick={() => navigate('/select-country')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-border rounded-full text-xs font-body text-muted-foreground hover:border-gold hover:text-gold transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {country === 'SA' ? '🇸🇦' : country === 'YE' ? '🇾🇪' : '🌍'}
            </button>

            {/* Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-foreground/70 hover:text-gold transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-foreground/70 hover:text-gold transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-secondary text-xs font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-foreground/70"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={false}
          animate={{ height: isSearchOpen ? 'auto' : 0, opacity: isSearchOpen ? 1 : 0 }}
          className="overflow-hidden"
        >
          <div className="py-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg font-body text-sm focus:outline-none focus:border-gold transition-colors"
                dir="rtl"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={{ 
          height: isMenuOpen ? 'auto' : 0,
          opacity: isMenuOpen ? 1 : 0 
        }}
        className="md:hidden overflow-hidden bg-background border-t border-border"
      >
        <nav className="container mx-auto px-4 py-6 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="block font-body text-foreground/80 hover:text-gold transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              navigate('/select-country');
              setIsMenuOpen(false);
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors py-2"
          >
            <MapPin className="w-4 h-4" />
            تغيير الموقع
          </button>
        </nav>
      </motion.div>
    </header>
  );
};

export default Navbar;
