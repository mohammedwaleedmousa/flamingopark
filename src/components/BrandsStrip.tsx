import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';

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

  return (
    <section className="bg-black">
      <div className="container mx-auto px-2">
        <div className="flex items-center justify-center gap-2 md:gap-6 h-11 md:h-12 overflow-x-auto scrollbar-hide">
          {brands.map((brand, index) => (
            <button
              key={brand.id}
              onClick={() => handleBrandClick(brand.name)}
              className="px-2 md:px-4 py-1.5 whitespace-nowrap transition-all duration-200 hover:opacity-80"
              style={{
                fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
                fontStyle: index === 0 ? 'italic' : 'normal',
                fontWeight: 500,
                fontSize: '14px',
                color: '#D4AF37',
                letterSpacing: '0.05em',
              }}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;
