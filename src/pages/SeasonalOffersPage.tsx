import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Flame, Gift, BarChart3 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { useStore, Product } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';

type FilterTab = 'all' | 'seasonal' | 'clearance' | 'flash';

const SeasonalOffersPage = () => {
  const { data: content } = useSiteContent('seasonal_offers_');
  const { country } = useStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Fetch seasonal offers
  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['seasonal-offers', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country])
        .gt('discount', 0)
        .order('discount', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || 0,
        description: p.description || '',
        descriptionAr: p.description_ar || '',
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ['GLOBAL']) as Product['countries'],
      })) as Product[];
    },
  });

  // Categorize offers by discount level
  const categorized = useMemo(() => {
    return {
      all: offers,
      seasonal: offers.filter(p => (p.discount || 0) >= 20 && (p.discount || 0) < 40),
      clearance: offers.filter(p => (p.discount || 0) >= 40),
      flash: offers.filter(p => (p.discount || 0) >= 50),
    };
  }, [offers]);

  const filtered = categorized[activeTab];
  const averageSavings = useMemo(() => {
    if (offers.length === 0) return 0;
    const total = offers.reduce((sum, p) => sum + (p.discount || 0), 0);
    return Math.round(total / offers.length);
  }, [offers]);

  const tabs: { id: FilterTab; label: string; icon: any; count: number }[] = [
    { id: 'all', label: getSiteText(content, 'tab_all', 'الكل'), icon: Gift, count: offers.length },
    { id: 'seasonal', label: getSiteText(content, 'tab_seasonal', 'موسمي'), icon: Calendar, count: categorized.seasonal.length },
    { id: 'clearance', label: getSiteText(content, 'tab_clearance', 'تصفية'), icon: BarChart3, count: categorized.clearance.length },
    { id: 'flash', label: getSiteText(content, 'tab_flash', 'فلاش'), icon: Flame, count: categorized.flash.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/10 py-12 md:py-16 mb-12 border-b border-border">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <Flame className="w-6 h-6 text-red-500" />
                <span className="text-sm font-medium text-primary">
                  {getSiteText(content, 'hero_badge', 'عروض حصرية')}
                </span>
              </div>
              <h1 className="font-heading text-3xl md:text-4xl mb-3">
                {getSiteText(content, 'hero_title', 'العروض الموسمية')}
              </h1>
              <p className="text-muted-foreground mb-6">
                {getSiteText(content, 'hero_subtitle', `توفر متوسط ${averageSavings}%`)}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-2xl font-heading text-primary">{offers.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {getSiteText(content, 'stat_products', 'منتجات')}
                  </p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-2xl font-heading text-primary">{averageSavings}%</p>
                  <p className="text-xs text-muted-foreground">
                    {getSiteText(content, 'stat_savings', 'توفير')}
                  </p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-2xl font-heading text-primary">{categorized.flash.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {getSiteText(content, 'stat_flash', 'فلاش')}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="container mx-auto px-4 mb-12">
          <div className="flex gap-3 overflow-x-auto pb-4">
            {tabs.map(tab => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'btn-unified'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
                <span className="text-xs opacity-75">({tab.count})</span>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">
                {getSiteText(content, 'empty_state', 'لا توجد عروض في هذه الفئة')}
              </p>
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
            >
              <AnimatePresence>
                {filtered.map(product => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SeasonalOffersPage;
