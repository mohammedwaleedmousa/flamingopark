import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Search, TrendingUp, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price?: number;
}

export const NavbarSearch = () => {
  const navigate = useNavigate();
  const { data: content } = useSiteContent('search_');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('search-history') || '[]');
    setSearchHistory(history.slice(0, 5));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const saveSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    const updated = [clean, ...searchHistory.filter((item) => item !== clean)].slice(0, 5);
    setSearchHistory(updated);
    localStorage.setItem('search-history', JSON.stringify(updated));
  };

  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions-v2', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];

      const { data: matches, error: matchError } = await (supabase as any).rpc('search_storefront_product_ids', {
        p_query: debouncedQuery,
        p_offset: 0,
        p_limit: 8,
      });
      if (matchError) throw matchError;

      const ids = (matches || []).map((row: any) => row.product_id).filter(Boolean);
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from('products')
        .select('id,name_ar,name,slug,images,price')
        .in('id', ids)
        .eq('is_active', true);
      if (error) throw error;

      const byId = new Map((data || []).map((product: any) => [product.id, product]));
      return ids
        .map((id: string) => byId.get(id))
        .filter(Boolean)
        .map((product: any) => ({
          id: product.id,
          name: product.name_ar || product.name || '',
          slug: product.slug,
          image: product.images?.[0],
          price: product.price,
        })) as SearchSuggestion[];
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: trending = [] } = useQuery({
    queryKey: ['trending-products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id,name_ar')
        .eq('is_active', true)
        .order('view_count', { ascending: false })
        .limit(5);
      return (data || []).map((product) => ({ id: product.id, name: product.name_ar }));
    },
    enabled: isOpen && query.length === 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleSearch = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    saveSearch(clean);
    navigate(`/search?q=${encodeURIComponent(clean)}`);
    setQuery('');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displaySuggestions = query.length >= 2 ? suggestions : [];
  const displayHistory = query.length === 0 ? searchHistory : [];
  const displayTrending = query.length === 0 ? trending : [];

  return (
    <div ref={searchRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch(query);
            if (event.key === 'Escape') setIsOpen(false);
          }}
          placeholder={getSiteText(content, 'navbar_search_placeholder', 'ابحث عن منتجات أو ماركات...')}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-border bg-background text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (displaySuggestions.length > 0 || displayHistory.length > 0 || displayTrending.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {displaySuggestions.length > 0 && (
              <div className="border-b border-border">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">{getSiteText(content, 'navbar_suggestions', 'الاقتراحات')}</div>
                {displaySuggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      saveSearch(query);
                      navigate(`/product/${item.slug}`);
                      setQuery('');
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition"
                  >
                    {item.image && <img src={item.image} alt={item.name} loading="lazy" className="w-8 h-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.name}</p>
                      {item.price !== undefined && <p className="text-xs text-muted-foreground">{Math.round(item.price)}</p>}
                    </div>
                  </button>
                ))}
                <button type="button" onClick={() => handleSearch(query)} className="w-full px-4 py-3 text-sm font-medium text-primary hover:bg-muted/50 text-center">
                  عرض كل النتائج لـ “{query}”
                </button>
              </div>
            )}

            {displayHistory.length > 0 && displaySuggestions.length === 0 && (
              <div className="border-b border-border">
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">{getSiteText(content, 'navbar_history', 'البحث السابق')}</div>
                {displayHistory.map((item, index) => (
                  <button key={`${item}-${index}`} type="button" onClick={() => handleSearch(item)} className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{item}</span>
                  </button>
                ))}
              </div>
            )}

            {displayTrending.length > 0 && displaySuggestions.length === 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase">{getSiteText(content, 'navbar_trending', 'رائج الآن')}</div>
                {displayTrending.map((item) => (
                  <button key={item.id} type="button" onClick={() => handleSearch(item.name || '')} className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center gap-3 transition">
                    <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavbarSearch;
