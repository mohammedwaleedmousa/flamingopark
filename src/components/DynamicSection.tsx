import { motion } from 'framer-motion';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Sparkles, Crown, Percent, Star, ChevronDown, Loader2 } from 'lucide-react';
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

type ProductsCountInfo = {
  totalCount: number;
  useDirect: boolean;
};

const mapRowToProduct = (p: any): Product => ({
  id: p.id,
  name: p.name,
  nameAr: p.name_ar,
  slug: p.slug,
  price: Number(p.price),
  costPrice: p.cost_price ? Number(p.cost_price) : undefined,
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
});

const DynamicSection = ({ section, country, index }: DynamicSectionProps) => {
  const Icon = filterIcons[section.filter_type] || Sparkles;
  const isDiscounted = section.filter_type === 'discounted';

  const { data: countInfo } = useQuery<ProductsCountInfo>({
    queryKey: ['section-products-count', section.id, country, section.filter_type],
    queryFn: async () => {
      // First check for directly assigned products
      const { count: directCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .contains('countries', [country])
        .contains('section_ids', [section.id]);

      if ((directCount ?? 0) > 0) {
        return { totalCount: directCount ?? 0, useDirect: true };
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
      return { totalCount: count || 0, useDirect: false };
    },
    enabled: !!country,
  });

  const totalCount = countInfo?.totalCount ?? 0;
  const useDirect = countInfo?.useDirect ?? false;

  const productsQuery = useInfiniteQuery<Product[]>({
    queryKey: ['section-products', section.id, country, section.filter_type, useDirect],
    enabled: !!country && !!countInfo,
    initialPageParam: { offset: 0, limit: INITIAL_DISPLAY },
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as any)?.offset ?? 0;
      const limit = (pageParam as any)?.limit ?? INITIAL_DISPLAY;

      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country]);

      if (useDirect) {
        query = query.contains('section_ids', [section.id]);
        query = query.order('sort_order', { ascending: true });
      } else {
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
      }

      const { data, error } = await query.range(offset, offset + limit - 1);
      if (error) throw error;

      return (data || []).map(mapRowToProduct);
    },
    getNextPageParam: (_lastPage, allPages) => {
      const loaded = allPages.reduce((sum, page) => sum + page.length, 0);
      if (loaded >= totalCount) return undefined;
      return { offset: loaded, limit: LOAD_MORE_COUNT };
    },
  });

  const products = productsQuery.data?.pages.flat() ?? [];

  if (products.length === 0) return null;

  const isEven = index % 2 === 0;
  const hasMore = products.length < totalCount;
  const remainingCount = totalCount - products.length;

  const handleLoadMore = async () => {
    if (!productsQuery.hasNextPage || productsQuery.isFetchingNextPage) return;

    // Prevent the browser from "following" the focused button downward when items are appended
    const currentY = window.scrollY;
    await productsQuery.fetchNextPage();
    requestAnimationFrame(() => window.scrollTo({ top: currentY }));
  };

  return (
    <section
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
              عرض المزيد ({remainingCount > 0 ? remainingCount : ''} منتج)
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default DynamicSection;

