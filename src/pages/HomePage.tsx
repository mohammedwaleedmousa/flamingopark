import { motion } from 'framer-motion';
import HeroSlider from '@/components/HeroSlider';
import BrandsStrip from '@/components/BrandsStrip';
import ProductCard from '@/components/ProductCard';
import ReviewsSection from '@/components/ReviewsSection';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useStore } from '@/store/useStore';
import { getFeaturedProducts, getBestSellers } from '@/data/products';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const { country } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!country) {
      navigate('/select-country');
    }
  }, [country, navigate]);

  if (!country) return null;

  const featuredProducts = getFeaturedProducts(country);
  const bestSellers = getBestSellers(country);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <HeroSlider />

        {/* Brands */}
        <BrandsStrip />

        {/* Featured Products */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                <span className="text-gold">منتجات</span> مميزة
              </h2>
              <div className="w-20 h-px bg-gold mx-auto" />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 font-heading text-sm text-gold hover:text-gold-dark transition-colors tracking-wider uppercase"
              >
                عرض الكل
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Best Sellers */}
        <section className="section-beige">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                <span className="text-gold">الأكثر</span> مبيعاً
              </h2>
              <div className="w-20 h-px bg-gold mx-auto" />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bestSellers.slice(0, 3).map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 md:py-24 bg-secondary text-gold-light relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }} />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-heading text-3xl md:text-5xl text-gold mb-6">
                انضم إلى عائلة ERMGOLD
              </h2>
              <p className="font-body text-lg opacity-80 mb-8 max-w-xl mx-auto">
                احصل على آخر العروض والمنتجات الحصرية
              </p>
              <Link
                to="/products"
                className="inline-flex items-center gap-3 px-10 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300"
              >
                تسوق الآن
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Reviews */}
        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
