import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { motion } from 'framer-motion';

interface Brand {
  id: string;
  name: string;
}

const BrandsStrip = () => {
  const { country } = useStore();
  const navigate = useNavigate();

  const { data: brands = [] } = useQuery({
    queryKey: ['brands-strip', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .eq('is_active', true)
        .contains('countries', [country])
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as Brand[];
    },
    enabled: !!country,
  });

  if (brands.length === 0) return null;

  const handleBrandClick = (brandName: string) => {
    navigate(`/products?brand=${encodeURIComponent(brandName)}`);
  };

  // Duplicate brands for seamless infinite scroll
  const duplicatedBrands = [...brands, ...brands, ...brands, ...brands];

  return (
    <section className="bg-secondary py-5 md:py-6 overflow-hidden border-y border-gold/10">
      <div className="relative">
        <motion.div
          className="flex items-center"
          animate={{
            x: ['0%', '-25%'],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 25,
              ease: 'linear',
            },
          }}
        >
          {duplicatedBrands.map((brand, index) => (
            <button
              key={`${brand.id}-${index}`}
              onClick={() => handleBrandClick(brand.name)}
              className="px-8 md:px-12 whitespace-nowrap transition-all duration-300 hover:scale-105 flex-shrink-0"
              style={{
                fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
                fontStyle: index % 2 === 0 ? 'italic' : 'normal',
                fontWeight: 500,
                fontSize: '20px',
                color: '#D4AF37',
                letterSpacing: '0.1em',
              }}
            >
              {brand.name}
            </button>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default BrandsStrip;
