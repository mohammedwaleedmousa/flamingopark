import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { Award } from 'lucide-react';

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

  // Duplicate brands for infinite scroll effect
  const duplicatedBrands = [...brands, ...brands];

  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10" />
      </div>

      <div className="container mx-auto px-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gold/5 rounded-full mb-3 border border-gold/10">
            <Award className="w-4 h-4 text-gold" />
            <span className="text-gold font-body text-xs tracking-widest uppercase">شركاؤنا</span>
          </div>
          <h3 className="font-heading text-xl md:text-2xl text-foreground">
            علامات <span className="text-gold">تجارية موثوقة</span>
          </h3>
        </motion.div>
      </div>

      {/* Infinite Scroll Container */}
      <div className="relative">
        <motion.div
          className="flex gap-8 md:gap-16"
          animate={{
            x: [0, -50 * brands.length],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: brands.length * 4,
              ease: "linear",
            },
          }}
        >
          {duplicatedBrands.map((brand, index) => (
            <motion.div
              key={`${brand.id}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (index % brands.length) * 0.1 }}
              className="flex-shrink-0 group"
            >
              <div className="relative px-8 py-6 bg-card/50 backdrop-blur-sm rounded-2xl border border-border/30 hover:border-gold/30 transition-all duration-500 hover:shadow-[0_10px_40px_-10px_hsl(var(--gold)/0.15)] cursor-pointer">
                {/* Glow Effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {brand.logo_url ? (
                  <div className="relative">
                    <img 
                      src={brand.logo_url} 
                      alt={brand.name}
                      className="h-12 md:h-16 w-auto min-w-[100px] object-contain transition-all duration-500 grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 group-hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="h-12 md:h-16 min-w-[100px] flex items-center justify-center">
                    <span className="font-heading text-lg md:text-xl text-muted-foreground group-hover:text-gold transition-colors duration-300">
                      {brand.name}
                    </span>
                  </div>
                )}

                {/* Brand Name Tooltip */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs text-muted-foreground font-body tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {brand.name}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Static Version for Small Screens */}
      <div className="md:hidden container mx-auto px-4 mt-8">
        <div className="grid grid-cols-2 gap-4">
          {brands.slice(0, 4).map((brand, index) => (
            <motion.div
              key={brand.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <div className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border/30 hover:border-gold/30 transition-all duration-300 text-center">
                {brand.logo_url ? (
                  <img 
                    src={brand.logo_url} 
                    alt={brand.name}
                    className="h-10 w-auto mx-auto object-contain grayscale group-hover:grayscale-0 opacity-60 group-hover:opacity-100 transition-all duration-300"
                  />
                ) : (
                  <span className="font-heading text-sm text-muted-foreground group-hover:text-gold transition-colors">
                    {brand.name}
                  </span>
                )}
                <p className="text-[10px] text-muted-foreground font-body mt-2">{brand.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Accent */}
      <div className="container mx-auto px-4 mt-10">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>
    </section>
  );
};

export default BrandsStrip;
