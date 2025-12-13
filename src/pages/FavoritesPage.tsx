import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCardMinimal from '@/components/ProductCardMinimal';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';

const FavoritesPage = () => {
  const { favorites } = useFavorites();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-muted/50 to-background border-b border-border/50">
          <div className="container mx-auto px-4 py-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 mb-4">
                <Heart className="w-8 h-8 text-gold fill-gold" />
              </div>
              <h1 className="font-heading text-3xl md:text-4xl text-foreground">
                المنتجات المفضلة
              </h1>
              <p className="font-body text-muted-foreground max-w-lg mx-auto">
                {favorites.length > 0 
                  ? `لديك ${favorites.length} منتج في قائمة المفضلة`
                  : 'لم تقم بإضافة أي منتجات للمفضلة بعد'
                }
              </p>
            </motion.div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {favorites.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              {favorites.map((product, index) => (
                <ProductCardMinimal 
                  key={product.id} 
                  product={product} 
                  index={index}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center py-16 space-y-6"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Heart className="w-12 h-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h2 className="font-heading text-xl text-foreground">
                  قائمة المفضلة فارغة
                </h2>
                <p className="font-body text-muted-foreground max-w-md mx-auto">
                  اضغط على أيقونة القلب في أي منتج لإضافته إلى قائمة المفضلة
                </p>
              </div>
              <Link to="/products">
                <Button className="btn-gold gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  تصفح المنتجات
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FavoritesPage;
