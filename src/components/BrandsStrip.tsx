import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

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

const BrandsStrip = () => {

  const trackRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],

    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,logo_url,countries,is_active,sort_order,slug")
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
  });


  const visibleBrands = useMemo(() => {
    return brands;
  }, [brands]);


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
    className="
      py-8
      md:py-24
      bg-white
      overflow-hidden
    "
    dir="rtl"
    aria-label="أبرز الماركات"
  >

    {/* Header */}

    <div
      className="
        max-w-6xl
        mx-auto
        px-4
        mb-12
        md:mb-16
        text-center
      "
    >

      <h2
        className="
          font-heading
          text-3xl
          md:text-5xl
          tracking-[0.02em]
          text-black
        "
      >
        أبرز الماركات
      </h2>


      <div
        className="
          mx-auto
          mt-6
          w-20
          h-px
          bg-pink-500
        "
      />

    </div>



    {/* Brands Slider */}


    <Swiper

      modules={[FreeMode]}

      slidesPerView="auto"

      spaceBetween={20}


      freeMode={{
        enabled:true,
        momentum:true,
        momentumRatio:0.8,
        momentumVelocityRatio:0.8,
      }}


      grabCursor={true}


      resistance={true}


      resistanceRatio={0.85}


      speed={700}


      touchRatio={1}


      className="
        brands-slider
        w-full
        px-4
      "

    >



      {renderBrands.map((brand)=>(


        <SwiperSlide

          key={brand.id}

          className="
            !w-[155px]
            md:!w-[210px]
            pr-2
            
          "

        >


          <Link

            to={`/brands/${brand.slug}`}

            className="
            
              group

              relative

              flex
              flex-col
              items-center
              justify-center


              w-full

              h-[130px]
              md:h-[165px]


              rounded-xl


              bg-white


              border
              border-black/[0.07]


              transition-colors

              duration-500


              hover:border-pink-300


              px-5
            "

          >



            {/* Logo Area */}

            <div

              className="
                h-16
                md:h-20

                w-full

                flex
                items-center
                justify-center
              "

            >


              {brand.logo_url ? (


                <img

                  src={brand.logo_url}

                  alt={brand.name}

                  loading="lazy"


                  className="
                    max-h-full

                    max-w-[120px]
                    md:max-w-[160px]


                    object-contain


                    opacity-70


                    grayscale


                    transition-all

                    duration-500


                    group-hover:opacity-100


                    group-hover:grayscale-0


                    group-hover:scale-[1.03]
                  "

                />


              ) : (


                <span

                  className="
                    font-heading

                    text-base
                    md:text-lg

                    tracking-[0.15em]

                    text-black/60
                  "

                >

                  {brand.name}

                </span>


              )}


            </div>





            {/* Brand Name */}


            <span

              className="
                mt-4

                text-[10px]
                md:text-xs

                tracking-[0.25em]

                uppercase


                text-black/45


                transition-colors

                duration-300


                group-hover:text-black
              "

            >

              {brand.name}

            </span>





            {/* Flamingo Line */}


            <span

              className="
                absolute

                bottom-3

                h-[2px]

                w-8

                rounded-full

                bg-pink-500


                transition-all

                duration-500


                group-hover:w-14
              "

            />


          </Link>


        </SwiperSlide>


      ))}



    </Swiper>



  </section>
);
};


export default BrandsStrip;