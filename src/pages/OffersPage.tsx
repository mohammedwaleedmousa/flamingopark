import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/useStore';
import { getProductsByCountry } from '@/data/products';
import { Percent, Clock } from 'lucide-react';

const OffersPage = () => {
  const { country } = useStore();
  const products = country ? getProductsByCountry(country) : [];
  const discountedProducts = products.filter(p => p.discount && p.discount > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-20 bg-secondary overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full mb-6"
            >
              <Percent className="w-4 h-4 text-gold" />
              <span className="font-body text-sm text-gold">عروض حصرية</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-4xl md:text-6xl text-gold mb-4"
            >
              العروض الخاصة
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-body text-lg text-gold-light/80 max-w-xl mx-auto"
            >
              اغتنم الفرصة واحصل على أفضل القطع بأسعار استثنائية
            </motion.p>
          </div>
        </section>

        {/* Timer Banner */}
        <section className="bg-gold py-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4">
              <Clock className="w-5 h-5 text-secondary" />
              <span className="font-body text-secondary">
                العروض متاحة لفترة محدودة
              </span>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            {discountedProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground font-body text-lg">
                  لا توجد عروض متاحة حالياً
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {discountedProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} compact />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;
