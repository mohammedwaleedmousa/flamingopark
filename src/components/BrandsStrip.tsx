import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";

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

const BrandsStrip = () => {
  const { country } = useStore();

  const trackRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands", country],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(
          "id,name,logo_url,countries,is_active,sort_order,slug" as any
        )
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
  });


  const visibleBrands = useMemo(() => {
    return brands.filter((brand) => {
      if (!brand.countries || brand.countries.length === 0) {
        return true;
      }

      return brand.countries.includes(country);
    });
  }, [brands, country]);


  const renderBrands: BrandViewModel[] = visibleBrands.map(
    (brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, "-"),
      logo_url: brand.logo_url,
    })
  );


  const handlePointerDown = (clientX: number) => {
    if (!trackRef.current) return;

    setIsDragging(true);
    setStartX(clientX);
    setStartScrollLeft(trackRef.current.scrollLeft);
  };


  const handlePointerMove = (clientX: number) => {
    if (!isDragging || !trackRef.current) return;

    const delta = clientX - startX;

    trackRef.current.scrollLeft =
      startScrollLeft - delta;
  };


  const handlePointerUp = () => {
    setIsDragging(false);
  };


  return (
    <section
      className="py-10 md:py-16 bg-white overflow-hidden"
      dir="rtl"
      aria-label="أبرز الماركات"
    >
      <div className="max-w-6xl mx-auto px-4 mb-8 md:mb-10 text-center">
        <p className="text-[11px] md:text-xs tracking-[0.35em] uppercase text-black/50 mb-2">Maison</p>
        <h2 className="font-heading text-2xl md:text-3xl tracking-[0.25em] uppercase text-black">
          أبرز الماركات
        </h2>
        <div className="mx-auto mt-4 h-px w-16 bg-gold/60" />
      </div>

      <div className="relative">

        <div
          className="
          pointer-events-none
          absolute inset-y-0 left-0
          w-12 md:w-16
          bg-gradient-to-r
          from-white
          to-transparent
          z-10
          "
        />


        <div
          className="
          pointer-events-none
          absolute inset-y-0 right-0
          w-12 md:w-16
          bg-gradient-to-l
          from-white
          to-transparent
          z-10
          "
        />


        <div
          ref={trackRef}
          className={`
            brands-strip-track
            flex
            items-center
            gap-4
            md:gap-6
            px-4
            md:px-8
            whitespace-nowrap
            overflow-x-auto
            no-scrollbar
            select-none
            ${
              isDragging
                ? "cursor-grabbing"
                : "cursor-grab"
            }
          `}
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}

          onMouseDown={(e) =>
            handlePointerDown(e.clientX)
          }

          onMouseMove={(e) =>
            handlePointerMove(e.clientX)
          }

          onMouseUp={handlePointerUp}

          onMouseLeave={handlePointerUp}

          onTouchStart={(e) =>
            handlePointerDown(
              e.touches[0].clientX
            )
          }

          onTouchMove={(e) =>
            handlePointerMove(
              e.touches[0].clientX
            )
          }

          onTouchEnd={handlePointerUp}
        >


          {renderBrands.map((brand) => (
            <Link
              key={brand.id}
              to={`/brands/${brand.slug}`}
              className="group inline-flex flex-col items-center justify-center min-w-[140px] md:min-w-[180px] h-[110px] md:h-[140px] bg-white border border-black/10 hover:border-gold/70 hover:shadow-[0_10px_30px_-15px_rgba(0,0,0,0.25)] transition-all duration-500 px-5"
              aria-label={`اذهب إلى ماركة ${brand.name}`}
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  loading="lazy"
                  className="max-h-14 md:max-h-16 max-w-[130px] md:max-w-[150px] object-contain grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition duration-500"
                />
              ) : (
                <span className="font-heading text-sm md:text-base tracking-[0.2em] uppercase text-black/70 group-hover:text-black transition-colors">
                  {brand.name}
                </span>
              )}
              <span className="mt-3 text-[10px] md:text-[11px] tracking-[0.25em] uppercase text-black/45 group-hover:text-gold transition-colors">
                {brand.name}
              </span>
            </Link>
          ))}


          {renderBrands.length === 0 && (
            <p className="text-sm text-muted-foreground px-4">
              لا توجد ماركات متاحة حالياً
            </p>
          )}


        </div>

      </div>


      <style>{`
        .brands-strip-track::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>

    </section>
  );
};


export default BrandsStrip;