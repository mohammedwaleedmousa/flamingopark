import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { supabase } from "@/integrations/supabase/client";

import "swiper/css";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface BrandViewModel {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const BrandsStrip = ({ enabled = true }: { enabled?: boolean }) => {
  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,logo_url,countries,is_active,sort_order,slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
  });

  const renderBrands: BrandViewModel[] = useMemo(
    () =>
      brands.map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      })),
    [brands]
  );

  return (
    <section className="py-12 bg-white" dir="rtl" aria-label="الماركات">
      <div className="container mx-auto px-4">
        <div className="text-center mb-3">
          <p className="mt-0 text-sm text-muted-foreground">اختر ماركتك المفضلة.</p>
        </div>

        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={14}
          freeMode={{ enabled: true, momentum: true }}
          grabCursor
          className="w-full"
        >
          {renderBrands.map((brand) => (
            <SwiperSlide key={brand.id} className="!w-[90px] md:!w-[105px]">

              <Link to={`/brands/${brand.slug}`} className="group flex flex-col items-center">

                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-gray-200 bg-white flex items-center justify-center shadow-sm transition-all duration-300 group-hover:border-pink-500 group-hover:shadow-lg group-hover:-translate-y-1">

                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} loading="lazy" className="max-w-[58%] max-h-[58%] object-contain transition-transform duration-300 group-hover:scale-110" />
                  ) : (
                    <span className="text-[11px] font-medium text-center px-2">{brand.name}</span>
                  )}

                </div>

                <span className="mt-3 text-[12px] font-medium text-center text-gray-700 line-clamp-1 transition-colors duration-300 group-hover:text-pink-600">
                  {brand.name}
                </span>

              </Link>

            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </section>
  );
};

export default BrandsStrip;