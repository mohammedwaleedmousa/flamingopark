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
      return data || [];
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
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-pink-500/5 via-purple-500/5 to-transparent py-12 md:py-16 border-b border-border">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex items-center gap-3 mb-4">
                <Search className="w-6 h-6 text-primary" />
                <h1 className="font-heading text-3xl md:text-4xl">
                  {getSiteText(content, 'search_page_title', 'نتائج البحث')}
                </h1>
              </div>
              
              {query && (
                <p className="text-muted-foreground text-lg mb-6">
                  وجدنا <span className="font-heading text-primary">{results.length}</span> نتيجة ل <span className="font-heading text-foreground">"{query}"</span>
                </p>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setSearchParams({ q: e.target.value });
                    setPage(1);
                  }}
                  placeholder={getSiteText(content, 'search_page_placeholder', 'ابحث عن منتجات...')}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
                {query && (
                  <button
                    onClick={handleClearQuery}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
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
              {/* Filter & Sort Bar */}
              <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn-unified gap-2 md:hidden"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {getSiteText(content, 'search_page_filter_btn', 'الفلاتر')}
                </motion.button>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {getSiteText(content, 'search_page_sort', 'الفرز:')}
                  </span>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleSortChange(e.target.value as SearchFilters['sortBy'])}
                    className="px-4 py-2 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                  >
                    <option value="relevance">{getSiteText(content, 'search_sort_relevance', 'الصلة')}</option>
                    <option value="newest">{getSiteText(content, 'search_sort_newest', 'الأحدث')}</option>
                    <option value="price_asc">{getSiteText(content, 'search_sort_price_low', 'السعر: منخفض')}</option>
                    <option value="price_desc">{getSiteText(content, 'search_sort_price_high', 'السعر: مرتفع')}</option>
                    <option value="rating">{getSiteText(content, 'search_sort_rating', 'الأعلى تقييمًا')}</option>
                  </select>
                </div>

                <div className="text-sm font-medium text-foreground ml-auto">
                  {results.length} {getSiteText(content, 'search_page_results_word', 'منتج')}
                </div>
              </div>

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
