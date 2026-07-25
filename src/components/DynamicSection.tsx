import { motion } from 'framer-motion';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Sparkles, Crown, Percent, Star, ChevronDown, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/store/useStore';
import { PRODUCT_CARD_SELECT, mapProductCard } from '@/lib/productCardData';
import { useNearViewport } from '@/hooks/useNearViewport';
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

type ProductPage = {
  products: Product[];
  useDirect: boolean;
};

const DynamicSection = ({ section, country, index }: DynamicSectionProps) => {
  const Icon = filterIcons[section.filter_type] || Sparkles;
  const isDiscounted = section.filter_type === 'discounted';
  const { ref, isNearViewport } = useNearViewport<HTMLElement>();

  const productsQuery = useInfiniteQuery<ProductPage>({
    queryKey: ['section-products', section.id, country, section.filter_type],
    enabled: !!country && isNearViewport,
    initialPageParam: { offset: 0, limit: INITIAL_DISPLAY, useDirect: null as boolean | null },
    queryFn: async ({ pageParam }) => {
      const { offset, limit, useDirect } = pageParam as { offset: number; limit: number; useDirect: boolean | null };
      const baseQuery = () => supabase
        .from('products')
        .select(PRODUCT_CARD_SELECT)
        .eq('is_active', true)
        .contains('countries', [country]);

      const runFilterQuery = async () => {
        let query = baseQuery();
        switch (section.filter_type) {
          case 'featured': query = query.eq('is_featured', true); break;
          case 'best_seller': query = query.eq('is_best_seller', true); break;
          case 'discounted': query = query.gt('discount', 0).order('discount', { ascending: false }); break;
          case 'new': query = query.order('created_at', { ascending: false }); break;
        }
        return query.order('sort_order', { ascending: true }).range(offset, offset + limit - 1);
      };

      if (useDirect !== false) {
        const { data, error } = await baseQuery()
          .contains('section_ids', [section.id])
          .order('sort_order', { ascending: true })
          .range(offset, offset + limit - 1);
        if (error) throw error;
        if (useDirect || (data || []).length > 0) return { products: (data || []).map(mapProductCard), useDirect: true };
      }

      const { data, error } = await runFilterQuery();
      if (error) throw error;
      return { products: (data || []).map(mapProductCard), useDirect: false };
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.products.length, 0);
      if (lastPage.products.length < LOAD_MORE_COUNT) return undefined;
      return { offset: loaded, limit: LOAD_MORE_COUNT, useDirect: lastPage.useDirect };
    },
  });
  const products = productsQuery.data?.pages.flatMap((page) => page.products) ?? [];

  if (products.length === 0) return <section ref={ref} className="min-h-px" aria-hidden="true" />;

  const isEven = index % 2 === 0;
  const hasMore = productsQuery.hasNextPage;

  const handleLoadMore = async () => {
    if (!productsQuery.hasNextPage || productsQuery.isFetchingNextPage) return;

    // Prevent the browser from "following" the focused button downward when items are appended
    const currentY = window.scrollY;
    await productsQuery.fetchNextPage();
    requestAnimationFrame(() => window.scrollTo({ top: currentY }));
  };

  return (
    <section
      ref={ref}
      className={`py-16 md:py-20 ${isEven ? '' : 'bg-gradient-to-b from-muted/50 to-muted'} ${
        isDiscounted ? 'relative overflow-hidden' : ''
      }`}
    >
      {isDiscounted && <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/5" />}

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`flex items-center justify-between mb-10 ${!isEven ? 'flex-col text-center' : ''}`}
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

        {/* Load More Button */}
        {hasMore && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-8">
            <Button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                (e.currentTarget as HTMLButtonElement).blur();
                void handleLoadMore();
              }}
              disabled={productsQuery.isFetchingNextPage}
              variant="outline"
              className="gap-2 border-gold/30 text-gold hover:bg-gold hover:text-secondary px-8 py-6"
            >
              {productsQuery.isFetchingNextPage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              عرض المزيد
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default DynamicSection;

