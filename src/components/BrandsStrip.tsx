import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

import { supabase } from "@/integrations/supabase/client";

import "swiper/css";
import "swiper/css/free-mode";

interface BrandRow { id: string; name: string; slug: string | null; logo_url: string | null; countries: string[] | null; is_active: boolean | null; sort_order: number | null }
interface BrandViewModel { id: string; name: string; slug: string; logo_url: string | null }

const BrandsStrip = ({ enabled = true }: { enabled?: boolean }) => {
  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,logo_url,countries,is_active,sort_order,slug").eq("is_active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as BrandRow[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const renderBrands = useMemo<BrandViewModel[]>(() => brands.map((brand) => ({ id: brand.id, name: brand.name, slug: brand.slug || brand.name.toLowerCase().trim().replace(/\s+/g, "-"), logo_url: brand.logo_url })), [brands]);

  if (!enabled || renderBrands.length === 0) return null;

  return (
    <section className="w-full overflow-hidden bg-background py-4 md:py-6 lg:py-10" dir="rtl" aria-label="الماركات">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6 lg:max-w-[1500px] lg:px-10 xl:px-12">
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-4 lg:mb-7">
          <div>
            <div className="mb-1 flex items-center gap-2 lg:mb-2 lg:gap-3"><span className="h-[2px] w-4 rounded-full bg-[#D4777D] lg:w-7" /><span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px] lg:text-[9px]">BRANDS</span></div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground md:text-[20px] lg:text-[28px]">تسوق حسب الماركة</h2>
          </div>
          <Link to="/brands" className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px] lg:gap-2 lg:text-[12px]">عرض الكل<ArrowLeft className="h-3 w-3 lg:h-4 lg:w-4" strokeWidth={1.5} /></Link>
        </div>
        <Swiper modules={[FreeMode]} slidesPerView="auto" spaceBetween={10} breakpoints={{ 1024: { spaceBetween: 18 }, 1280: { spaceBetween: 20 } }} freeMode={{ enabled: true, momentum: true, momentumRatio: 0.65 }} grabCursor className="!overflow-visible">
          {renderBrands.map((brand) => (
            <SwiperSlide key={brand.id} className="!w-[78px] sm:!w-[90px] md:!w-[102px] lg:!w-[150px] xl:!w-[165px]">
              <Link to={`/brands/${brand.slug}`} aria-label={`عرض منتجات ${brand.name}`} className="group block w-full select-none [-webkit-tap-highlight-color:transparent]">
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[15px] border border-border/60 bg-white px-2.5 transition-all duration-300 md:rounded-[18px] md:px-3 lg:rounded-[22px] lg:px-5 lg:group-hover:-translate-y-1 lg:group-hover:border-[#E5D3CF] lg:group-hover:shadow-[0_16px_36px_rgba(70,45,38,0.08)]">
                  {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" decoding="async" className="max-h-[45%] max-w-[82%] object-contain object-center transition-transform duration-200 group-hover:scale-[1.04] lg:max-h-[42%] lg:max-w-[78%]" /> : <span className="max-w-full truncate text-center font-serif text-[10px] font-semibold text-[#403633] md:text-[12px] lg:text-[16px]">{brand.name}</span>}
                </div>
                <div className="mt-1.5 text-center lg:mt-3"><p className="truncate text-[8px] font-semibold text-foreground md:text-[9px] lg:text-[12px]">{brand.name}</p><p className="mt-0.5 font-serif text-[5px] uppercase tracking-[0.08em] text-muted-foreground md:text-[6px] lg:text-[8px]">BRAND</p></div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

export default BrandsStrip;
