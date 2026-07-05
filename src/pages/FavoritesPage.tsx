import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Filter, Trash2, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCardMinimal from '@/components/ProductCardMinimal';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { useSiteContent, getSiteText, formatSiteText } from '@/hooks/useSiteContent';
import { useStore } from '@/store/useStore';

const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const { addToCart } = useStore();
  const { data: content } = useSiteContent('favorites_');
  const [sortBy, setSortBy] = useState<'newest' | 'priceLow' | 'priceHigh' | 'name'>('newest');
  
  const heroCountTemplate = getSiteText(content, 'favorites_hero_with_count', 'لديك {count} منتج في قائمة المفضلة');
  const heroText =
    favorites.length > 0
      ? formatSiteText(heroCountTemplate, { count: favorites.length })
      : getSiteText(content, 'favorites_hero_empty', 'لم تقم بإضافة أي منتجات للمفضلة بعد');

  // Sort favorites based on selected option
  const sortedFavorites = [...favorites].sort((a, b) => {
    switch (sortBy) {
      case 'priceLow':
        return a.price - b.price;
      case 'priceHigh':
        return b.price - a.price;
      case 'name':
        return (a.nameAr || '').localeCompare(b.nameAr || '');
      case 'newest':
      default:
        return 0;
    }
  });

  const handleAddAllToCart = () => {
    favorites.forEach(product => {
      addToCart(product, 1);
    });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative bg-gradient-to-b from-gold/5 via-muted/30 to-background border-b border-border/50 overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-16 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-pink-400/20 to-gold/20 border-2 border-gold/30"
              >
                <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
              </motion.div>
              <h1 className="font-heading text-3xl md:text-5xl text-foreground">
                {getSiteText(content, 'favorites_hero_title', 'المنتجات المفضلة')}
              </h1>
              <p className="font-body text-muted-foreground max-w-lg mx-auto text-lg">
                {heroText}
              </p>

              {/* Action Buttons - For non-empty favorites */}
              {favorites.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-3 justify-center pt-4"
                >
                  <Button
                    onClick={handleAddAllToCart}
                    className="btn-gold gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    إضافة الكل للسلة
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.section>

        <div className="container mx-auto px-4 py-8">
          {favorites.length > 0 ? (
            <>
              {/* Sorting Bar */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 pb-6 border-b border-border/50"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Filter className="w-5 h-5" />
                  <span className="font-body">ترتيب حسب:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'newest' as const, label: 'الأحدث' },
                    { value: 'priceLow' as const, label: 'السعر: الأقل أولاً' },
                    { value: 'priceHigh' as const, label: 'السعر: الأعلى أولاً' },
                    { value: 'name' as const, label: 'الاسم' },
                  ].map(option => (
                    <motion.button
                      key={option.value}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSortBy(option.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-gold text-white shadow-lg'
                          : 'bg-muted text-foreground hover:bg-muted/80 border border-border/50'
                      }`}
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Products Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  layout
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                >
                  <AnimatePresence mode="popLayout">
                    {sortedFavorites.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <ProductCardMinimal 
                          product={product} 
                          index={index}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-20 space-y-8"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-gold/10 to-pink/10 border-2 border-border/50 flex items-center justify-center"
              >
                <Heart className="w-16 h-16 text-muted-foreground/30" />
              </motion.div>
              <div className="space-y-3">
                <h2 className="font-heading text-2xl text-foreground">
                  {getSiteText(content, 'favorites_empty_title', 'قائمة المفضلة فارغة')}
                </h2>
                <p className="font-body text-muted-foreground max-w-md mx-auto text-lg">
                  {getSiteText(content, 'favorites_empty_desc', 'اضغط على أيقونة القلب في أي منتج لإضافته إلى قائمة المفضلة')}
                </p>
              </div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link to="/products">
                  <Button className="btn-gold gap-2 px-8 py-6 text-lg rounded-xl">
                    <ShoppingBag className="w-6 h-6" />
                    {getSiteText(content, 'favorites_browse_cta', 'تصفح المنتجات')}
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FavoritesPage;
