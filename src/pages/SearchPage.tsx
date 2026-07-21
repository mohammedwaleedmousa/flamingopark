import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';
import { Product } from '@/store/useStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SearchFilters {
  minPrice: number;
  maxPrice: number;
  categories: string[];
  brands: string[];
  colors: string[];
  sizes: string[];
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  inStockOnly: boolean;
}

// Convert Supabase data to Product type
const convertToProduct = (data: any): Product => ({
  id: data.id,
  name: data.name || '',
  nameAr: data.name_ar || '',
  slug: data.slug || '',
  price: data.price || 0,
  costPrice: data.cost_price,
  discount: data.discount,
  description: data.description || '',
  descriptionAr: data.description_ar || '',
  images:
  data.images?.length > 0
    ? data.images
    : ((data as any).color_variants?.[0]?.images || []),
  category: data.category || '',
  brand: data.brand || '',
  inStock: data.in_stock || false,
  countries: data.countries,
  isBestSeller: data.is_best_seller,
  isFeatured: data.is_featured,
});

const SearchPage = () => {
  const { data: content } = useSiteContent('search_page_');
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [filters, setFilters] = useState<SearchFilters>({
    minPrice: 0,
    maxPrice: 10000,
    categories: [],
    brands: [],
    colors: [],
    sizes: [],
    sortBy: 'relevance',
    inStockOnly: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  // Fetch search results
  const { data: results = [], isLoading: isSearching } = useQuery({
    queryKey: ['search-products', query, filters, page],
    queryFn: async () => {
      if (!query.trim()) return [];

      let q = supabase
        .from('products')
        .select('*')
        .or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
        .eq('is_active', true);

      // Apply filters
      if (filters.minPrice > 0) q = q.gte('price', filters.minPrice);
      if (filters.maxPrice < 10000) q = q.lte('price', filters.maxPrice);
      if (filters.inStockOnly) q = q.eq('in_stock', true);
      if (filters.categories.length > 0) q = q.in('category', filters.categories);
      if (filters.brands.length > 0) q = q.in('brand', filters.brands);

      // Apply sorting
      switch (filters.sortBy) {
        case 'price_asc':
          q = q.order('price', { ascending: true });
          break;
        case 'price_desc':
          q = q.order('price', { ascending: false });
          break;
        case 'newest':
          q = q.order('created_at', { ascending: false });
          break;
        case 'rating':
          q = q.order('rating', { ascending: false });
          break;
        default:
          break;
      }

      // Pagination
      const from = (page - 1) * itemsPerPage;
      q = q.range(from, from + itemsPerPage - 1);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(convertToProduct);
    },
    enabled: query.trim().length > 0,
  });

  // Fetch facets (categories, brands, etc.)
  const { data: facets = {} } = useQuery({
    queryKey: ['search-facets', query],
    queryFn: async () => {
      if (!query.trim()) return {};

      const [categoriesRes, brandsRes] = await Promise.all([
        supabase
          .from('products')
          .select('category')
          .or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
          .not('category', 'is', null)
          .eq('is_active', true),
        supabase
          .from('products')
          .select('brand')
          .or(`name_ar.ilike.%${query}%,description_ar.ilike.%${query}%,name.ilike.%${query}%,description.ilike.%${query}%`)
          .not('brand', 'is', null)
          .eq('is_active', true),
      ]);

      const categories = [...new Set(categoriesRes.data?.map(p => p.category).filter(Boolean))];
      const brands = [...new Set(brandsRes.data?.map(p => p.brand).filter(Boolean))];

      return { categories, brands };
    },
    enabled: query.trim().length > 0,
  });

  const handleClearQuery = () => {
    setSearchParams({});
    setPage(1);
  };

  const handleSortChange = (sortBy: SearchFilters['sortBy']) => {
    setFilters({ ...filters, sortBy });
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-16">
        {/* Hero Section - Enhanced */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent">
          {/* Animated background elements */}
          <motion.div 
            className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
            animate={{ y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"
            animate={{ y: [0, -30, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 py-16 md:py-20 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              {/* Search Title with Icon */}
              <div className="flex items-center gap-3 mb-6 justify-center md:justify-start">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <Search className="w-6 h-6 text-primary" />
                </motion.div>
                <h1 className="font-heading text-4xl md:text-5xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {getSiteText(content, 'search_page_title', 'ابحث عن الأفضل')}
                </h1>
              </div>
              
              {/* Results Summary */}
              {query && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center md:text-right mb-8"
                >
                  <p className="text-lg text-muted-foreground mb-2">
                    البحث عن: <span className="font-heading text-primary text-xl">"{query}"</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isSearching ? (
                      <span className="flex items-center gap-2 justify-center md:justify-start">
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="inline-block">⟳</motion.span>
                        جاري البحث...
                      </span>
                    ) : (
                      <>
                        <span className="font-heading text-primary text-lg">{results.length}</span> نتيجة متاحة
                      </>
                    )}
                  </p>
                </motion.div>
              )}

              {/* Enhanced Search Bar */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100" />
                <div className="relative flex items-center gap-3 bg-card border-2 border-border rounded-2xl p-1 focus-within:border-primary transition-all shadow-lg">
                  <Search className="w-5 h-5 text-muted-foreground ml-4" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setSearchParams({ q: e.target.value });
                      setPage(1);
                    }}
                    placeholder={getSiteText(content, 'search_page_placeholder', 'ابحث عن منتجات، ماركات، فئات...')}
                    className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground/60 py-3 text-lg"
                  />
                  {query && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => {
                        setSearchParams({});
                        setPage(1);
                      }}
                      className="px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition mr-1"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>

              {/* Quick Search Tags */}
              {!query && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-8 flex flex-wrap gap-3 justify-center md:justify-start"
                >
                  <span className="text-sm text-muted-foreground">ابحث عن:</span>
                  {['مجوهرات', 'خواتم', 'أساور', 'قلائد'].map((tag) => (
                    <motion.button
                      key={tag}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSearchParams({ q: tag });
                        setPage(1);
                      }}
                      className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition text-sm"
                    >
                      {tag}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        {/* Results Section */}
        <section className="container mx-auto px-4 py-12">
          {!query.trim() ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <Search className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h2 className="font-heading text-2xl mb-2">ابدأ البحث</h2>
              <p className="text-muted-foreground text-lg">
                {getSiteText(content, 'search_page_empty', 'ابحث عن منتج لبدء التسوق')}
              </p>
            </motion.div>
          ) : isSearching ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4 animate-pulse">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">جاري البحث...</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
                <Search className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h2 className="font-heading text-2xl mb-2">لم نجد نتائج</h2>
              <p className="text-muted-foreground text-lg">
                {getSiteText(content, 'search_page_no_results', 'جرّب كلمات مفتاحية مختلفة')}
              </p>
            </motion.div>
          ) : (
            <>
              {/* Enhanced Filter & Sort Bar */}
              <motion.div
                layout
                className="mb-8 space-y-4"
              >
                {/* Top Controls */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition md:hidden font-medium"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {getSiteText(content, 'search_page_filter_btn', 'الفلاتر')}
                    {(filters.categories.length > 0 || filters.brands.length > 0 || filters.inStockOnly) && (
                      <span className="ml-2 px-2 py-1 rounded-full bg-primary text-white text-xs font-bold">
                        {(filters.categories.length || 0) + (filters.brands.length || 0) + (filters.inStockOnly ? 1 : 0)}
                      </span>
                    )}
                  </motion.button>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-2">
                    <span className="text-sm font-medium text-muted-foreground px-2">
                      {getSiteText(content, 'search_page_sort', 'الفرز:')}
                    </span>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => handleSortChange(e.target.value as SearchFilters['sortBy'])}
                      className="px-3 py-1.5 rounded-lg border-0 bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition cursor-pointer"
                    >
                      <option value="relevance">{getSiteText(content, 'search_sort_relevance', 'الصلة')}</option>
                      <option value="newest">{getSiteText(content, 'search_sort_newest', 'الأحدث')}</option>
                      <option value="price_asc">{getSiteText(content, 'search_sort_price_low', 'السعر: منخفض')}</option>
                      <option value="price_desc">{getSiteText(content, 'search_sort_price_high', 'السعر: مرتفع')}</option>
                      <option value="rating">{getSiteText(content, 'search_sort_rating', 'الأعلى تقييمًا')}</option>
                    </select>
                  </div>

                  {/* Results Counter */}
                  <motion.div 
                    layout
                    className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-4 py-2"
                  >
                    <span className="text-sm text-muted-foreground">النتائج:</span>
                    <span className="font-heading text-lg text-primary">{results.length}</span>
                    <span className="text-sm text-muted-foreground">{getSiteText(content, 'search_page_results_word', 'منتج')}</span>
                  </motion.div>
                </div>

                {/* Active Filters Display */}
                <AnimatePresence>
                  {(filters.categories.length > 0 || filters.brands.length > 0 || filters.inStockOnly) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 items-center"
                    >
                      <span className="text-xs text-muted-foreground">الفلاتر النشطة:</span>
                      
                      {filters.inStockOnly && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => setFilters({ ...filters, inStockOnly: false })}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/50 text-blue-700 text-xs hover:bg-blue-500/30 transition"
                        >
                          المتوفرة فقط <X className="w-3 h-3" />
                        </motion.button>
                      )}
                      
                      {filters.categories.map(cat => (
                        <motion.button
                          key={cat}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => setFilters({ ...filters, categories: filters.categories.filter(c => c !== cat) })}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-700 text-xs hover:bg-green-500/30 transition"
                        >
                          {cat} <X className="w-3 h-3" />
                        </motion.button>
                      ))}
                      
                      {filters.brands.map(brand => (
                        <motion.button
                          key={brand}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          onClick={() => setFilters({ ...filters, brands: filters.brands.filter(b => b !== brand) })}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-700 text-xs hover:bg-purple-500/30 transition"
                        >
                          {brand} <X className="w-3 h-3" />
                        </motion.button>
                      ))}
                      
                      <motion.button
                        onClick={() => setFilters({
                          minPrice: 0,
                          maxPrice: 10000,
                          categories: [],
                          brands: [],
                          colors: [],
                          sizes: [],
                          sortBy: 'relevance',
                          inStockOnly: false,
                        })}
                        className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition"
                      >
                        مسح الكل
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Products Grid */}
              <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
              >
                <AnimatePresence>
                  {results.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* Pagination */}
              {results.length === itemsPerPage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center mt-12"
                >
                  <button
                    onClick={() => {
                      setPage(page + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn-unified px-8 py-3 gap-2"
                  >
                    {getSiteText(content, 'search_page_load_more', 'تحميل المزيد')}
                  </button>
                </motion.div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SearchPage;
