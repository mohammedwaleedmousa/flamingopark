import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';

interface SearchSuggestion {
  id: string;
  name: string;
  image?: string;
  price?: number;
}

export const NavbarSearch = () => {
  const navigate = useNavigate();
  const { data: content } = useSiteContent('search_');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('search-history') || '[]');
    setSearchHistory(history.slice(0, 5));
  }, []);

  // Save search to history
  const saveSearch = (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    
    const updated = [clean, ...searchHistory.filter(h => h !== clean)].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem('search-history', JSON.stringify(updated));
  };

  // Fetch product suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.length < 2) return [];
      
      const { data } = await supabase
        .from('products')
        .select('id, name_ar, images, price')
        .ilike('name_ar', `%${query}%`)
        .limit(5);
      
      return (data || []).map(p => ({
        id: p.id,
        name: p.name_ar,
        image: p.images?.[0],
        price: p.price,
      }));
    },
    enabled: query.length >= 2,
  });

  // Get trending products (most viewed)
  const { data: trending = [] } = useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name_ar')
        .eq('is_active', true)
        .order('view_count', { ascending: false })
        .limit(5);
      
      return (data || []).map(p => ({
        id: p.id,
        name: p.name_ar,
      }));
    },
  });

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    saveSearch(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery('');
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displaySuggestions = query.length >= 2 ? suggestions : [];
  const displayHistory = query.length === 0 ? searchHistory : [];
  const displayTrending = query.length === 0 ? trending : [];

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={getSiteText(content, 'navbar_search_placeholder', 'ابحث عن منتجات...')}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (displaySuggestions.length > 0 || displayHistory.length > 0 || displayTrending.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* Product Suggestions */}
            {displaySuggestions.length > 0 && (
              <div className="border-b border-border">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  {getSiteText(content, 'navbar_suggestions', 'الاقتراحات')}
                </div>
                <div className="space-y-1">
                  {displaySuggestions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSearch(item.name)}
                      className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition"
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.name}</p>
                        {item.price && (
                          <p className="text-xs text-muted-foreground">
                            {Math.round(item.price)}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search History */}
            {displayHistory.length > 0 && displaySuggestions.length === 0 && (
              <div className="border-b border-border">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  {getSiteText(content, 'navbar_history', 'البحث السابق')}
                </div>
                <div className="space-y-1">
                  {displayHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearch(item)}
                      className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending */}
            {displayTrending.length > 0 && displaySuggestions.length === 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                  {getSiteText(content, 'navbar_trending', 'رائج الآن')}
                </div>
                <div className="space-y-1">
                  {displayTrending.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSearch(item.name)}
                      className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition"
                    >
                      <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavbarSearch;
