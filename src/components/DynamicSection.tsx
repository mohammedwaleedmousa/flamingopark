import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Crown, Percent, Star } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/store/useStore';

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

const DynamicSection = ({ section, country, index }: DynamicSectionProps) => {
  const Icon = filterIcons[section.filter_type] || Sparkles;
  const isDiscounted = section.filter_type === 'discounted';

  const { data: products = [] } = useQuery({
    queryKey: ['section-products', section.id, country],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country]);

      // Apply filter based on type
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

      const { data, error } = await query.limit(section.max_products);
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

  if (products.length === 0) return null;

  const isEven = index % 2 === 0;

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

          {section.show_view_all && section.view_all_link && isEven && (
            <Link
              to={section.view_all_link}
              className={`hidden md:inline-flex items-center gap-2 px-6 py-3 font-heading text-sm tracking-wider uppercase transition-all duration-300 rounded-lg ${
                isDiscounted
                  ? 'bg-gradient-to-r from-gold to-gold-light text-secondary hover:shadow-lg'
                  : 'border border-gold/30 text-gold hover:bg-gold hover:text-secondary'
              }`}
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>

        {section.show_view_all && section.view_all_link && (
          <div className={`text-center mt-8 ${isEven ? 'md:hidden' : ''}`}>
            <Link
              to={section.view_all_link}
              className={`inline-flex items-center gap-2 px-6 py-3 font-heading text-sm tracking-wider uppercase transition-all duration-300 rounded-lg ${
                isDiscounted
                  ? 'bg-gradient-to-r from-gold to-gold-light text-secondary'
                  : 'border border-gold/30 text-gold hover:bg-gold hover:text-secondary'
              }`}
            >
              عرض الكل
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default DynamicSection;
