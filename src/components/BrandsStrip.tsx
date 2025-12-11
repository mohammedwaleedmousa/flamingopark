import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

const BrandsStrip = () => {
  const { country } = useStore();

  const { data: brands = [] } = useQuery({
    queryKey: ['brands-strip', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('is_active', true)
        .contains('countries', [country])
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Brand[];
    },
    enabled: !!country,
  });

  if (brands.length === 0) return null;

  return (
    <section className="py-12 bg-muted border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-8 md:gap-16 flex-wrap"
        >
          {brands.map((brand, index) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center group cursor-pointer"
            >
              {brand.logo_url ? (
                <img 
                  src={brand.logo_url} 
                  alt={brand.name}
                  className="h-12 md:h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-110 opacity-70 hover:opacity-100"
                />
              ) : (
                <div className="h-12 md:h-16 flex items-center justify-center">
                  <span className="font-heading text-lg md:text-xl text-muted-foreground group-hover:text-gold transition-colors">
                    {brand.name}
                  </span>
                </div>
              )}
              {brand.logo_url && (
                <p className="text-xs text-muted-foreground font-body tracking-wider mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {brand.name}
                </p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BrandsStrip;
