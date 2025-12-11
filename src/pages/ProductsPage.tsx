import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { useStore } from '@/store/useStore';
import { getProductsByCountry, brands } from '@/data/products';
import { Search, SlidersHorizontal, X } from 'lucide-react';

const categories = [
  { id: 'all', name: 'الكل', nameEn: 'All' },
  { id: 'necklaces', name: 'القلائد', nameEn: 'Necklaces' },
  { id: 'rings', name: 'الخواتم', nameEn: 'Rings' },
  { id: 'bracelets', name: 'الأساور', nameEn: 'Bracelets' },
  { id: 'earrings', name: 'الأقراط', nameEn: 'Earrings' },
  { id: 'sets', name: 'الأطقم', nameEn: 'Sets' },
];

const ProductsPage = () => {
  const { country } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const products = country ? getProductsByCountry(country) : [];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.nameAr.includes(searchQuery) || 
                           product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 bg-muted border-b border-border">
          <div className="container mx-auto px-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-4xl md:text-5xl text-foreground mb-4"
            >
              <span className="text-gold">مجموعتنا</span> الفاخرة
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-body text-muted-foreground max-w-xl mx-auto"
            >
              اكتشف تشكيلة حصرية من أرقى المجوهرات الذهبية
            </motion.p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg font-body text-sm focus:outline-none focus:border-gold transition-colors"
                dir="rtl"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg font-body text-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              الفلاتر
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Filters */}
            <motion.aside
              initial={false}
              animate={{ 
                height: showFilters ? 'auto' : 0,
                opacity: showFilters ? 1 : 0 
              }}
              className={`md:w-64 shrink-0 overflow-hidden md:overflow-visible md:h-auto md:opacity-100`}
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-lg text-foreground">الفلاتر</h3>
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedBrand('all');
                    }}
                    className="text-xs text-gold hover:underline font-body"
                  >
                    إعادة تعيين
                  </button>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="font-heading text-sm text-foreground mb-3">التصنيفات</h4>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-gold text-secondary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h4 className="font-heading text-sm text-foreground mb-3">الماركات</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedBrand('all')}
                      className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                        selectedBrand === 'all'
                          ? 'bg-gold text-secondary'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      الكل
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => setSelectedBrand(brand.name)}
                        className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                          selectedBrand === brand.name
                            ? 'bg-gold text-secondary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        {brand.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Results Count */}
              <p className="text-sm text-muted-foreground font-body mb-6">
                عرض {filteredProducts.length} منتج
              </p>

              {filteredProducts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground font-body">لا توجد منتجات مطابقة</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;
