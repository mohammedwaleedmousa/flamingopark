import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Crown, Percent, Star, ChevronDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/store/useStore';
import { Button } from '@/components/ui/button';

interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  filter_type: string;
  max_products: number;
  show_view_all: boolean;
  view_all_link: string | null;
}

interface DynamicSectionProps {
  section: HomepageSection;
  country: string;
  index: number;
}

const filterIcons: Record<string, typeof Sparkles> = {
  featured: Sparkles,
  best_seller: Crown,
  discounted: Percent,
  new: Star,
  all: Star,
};

const INITIAL_DISPLAY = 8;
const LOAD_MORE_COUNT = 8;

const DynamicSection = ({ section, country, index }: DynamicSectionProps) => {
  const Icon = filterIcons[section.filter_type] || Sparkles;
  const isDiscounted = section.filter_type === 'discounted';
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data: products = [], refetch } = useQuery({
    queryKey: ['section-products', section.id, country, displayCount],
    queryFn: async () => {
      // First try to get products assigned directly to this section
      const { data: directProducts, error: directError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country])
        .contains('section_ids', [section.id])
        .order('sort_order', { ascending: true })
        .limit(displayCount);

      // If there are directly assigned products, use them
      if (!directError && directProducts && directProducts.length > 0) {
        return directProducts.map((p) => ({
          id: p.id,
          name: p.name,
          nameAr: p.name_ar,
          slug: p.slug,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : undefined,
          discount: p.discount || undefined,
          description: p.description || '',
          descriptionAr: p.description_ar || '',
          images: p.images || [],
          category: p.category,
          brand: p.brand,
          inStock: p.in_stock ?? true,
          countries: (p.countries || ['SA', 'YE']) as ('SA' | 'YE')[],
          isFeatured: p.is_featured,
          isBestSeller: p.is_best_seller,
        })) as Product[];
      }

      // Otherwise, fall back to filter_type based filtering
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country]);

      switch (section.filter_type) {
        case 'featured':
          query = query.eq('is_featured', true);
          break;
        case 'best_seller':
          query = query.eq('is_best_seller', true);
          break;
        case 'discounted':
          query = query.gt('discount', 0).order('discount', { ascending: false });
          break;
        case 'new':
          query = query.order('created_at', { ascending: false });
          break;
        default:
          break;
      }

      // Always use sort_order as secondary sort
      query = query.order('sort_order', { ascending: true });

      const { data, error } = await query.limit(displayCount);
      if (error) throw error;

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || '',
        descriptionAr: p.description_ar || '',
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ['SA', 'YE']) as ('SA' | 'YE')[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: !!country,
  });

  // Check if there are more products available
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['section-products-count', section.id, country],
    queryFn: async () => {
      // First check for directly assigned products
      const { count: directCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .contains('countries', [country])
        .contains('section_ids', [section.id]);

      if (directCount && directCount > 0) {
        return directCount;
      }

      // Fall back to filter_type based count
      let query = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .contains('countries', [country]);

      switch (section.filter_type) {
        case 'featured':
          query = query.eq('is_featured', true);
          break;
        case 'best_seller':
          query = query.eq('is_best_seller', true);
          break;
        case 'discounted':
          query = query.gt('discount', 0);
          break;
        default:
          break;
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!country,
  });

  if (products.length === 0) return null;

  const isEven = index % 2 === 0;
  const hasMore = displayCount < totalCount;
  const remainingCount = totalCount - displayCount;

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
    await refetch();
    setIsLoadingMore(false);
  };

  return (
    <section
      className={`py-16 md:py-20 ${
        isEven ? '' : 'bg-gradient-to-b from-muted/50 to-muted'
      } ${isDiscounted ? 'relative overflow-hidden' : ''}`}
    >
      {isDiscounted && (
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5" />
      )}

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`flex items-center justify-between mb-10 ${
            !isEven ? 'flex-col text-center' : ''
          }`}
        >
          <div className={!isEven ? 'mb-6' : ''}>
            {!isEven ? (
              <>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/10 rounded-full mb-4">
                  <Icon className="w-4 h-4 text-gold" />
                  <span className="text-gold font-body text-sm">{section.title}</span>
                </div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                  {section.title_ar.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ? (
                      <span key={i} className="text-gold">
                        {word}
                      </span>
                    ) : (
                      <span key={i}>{word} </span>
                    )
                  )}
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${isDiscounted ? 'text-destructive' : 'text-gold'}`} />
                  <span
                    className={`font-body text-sm tracking-widest uppercase ${
                      isDiscounted ? 'text-destructive' : 'text-gold'
                    }`}
                  >
                    {section.title}
                  </span>
                </div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground">
                  {section.title_ar.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ? (
                      <span key={i} className="text-gold">
                        {word}
                      </span>
                    ) : (
                      <span key={i}>{word} </span>
                    )
                  )}
                </h2>
              </>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>

        {/* Load More Button - Always shows if there are more products */}
        {hasMore && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-8"
          >
            <Button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              className="gap-2 border-gold/30 text-gold hover:bg-gold hover:text-secondary px-8 py-6"
            >
              {isLoadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              عرض المزيد ({remainingCount > 0 ? remainingCount : ''} منتج)
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default DynamicSection;
