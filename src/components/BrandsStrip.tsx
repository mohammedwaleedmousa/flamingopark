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
    return brands.filter((brand) => {
      if (!brand.countries || brand.countries.length === 0) {
        return true;
      }
      if (!country || country === "GLOBAL") {
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
    className="
      py-8
      md:py-24
      bg-white
      overflow-x-hidden
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



    <div className="relative w-full">


      {/* Left Fade */}

      <div
        className="
          absolute
          inset-y-0
          left-0
          w-12
          md:w-32
          bg-gradient-to-r
          from-white
          to-transparent
          z-10
          pointer-events-none
        "
      />


      {/* Right Fade */}

      <div
        className="
          absolute
          inset-y-0
          right-0
          w-12
          md:w-32
          bg-gradient-to-l
          from-white
          to-transparent
          z-10
          pointer-events-none
        "
      />



      {/* Brands Slider */}

      <div
        ref={trackRef}

        className="
          brands-strip-track

          flex
          items-center

          gap-5
          md:gap-8

          px-4

          w-full

          overflow-x-auto

          overflow-y-hidden

          scroll-smooth

          snap-x
          snap-mandatory

          touch-pan-x

          whitespace-nowrap

          no-scrollbar

          select-none
        "

        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >



        {renderBrands.map((brand)=>(

          <Link
            key={brand.id}

            to={`/brands/${brand.slug}`}

            className="
              group

              relative

              shrink-0

              snap-center

              w-[155px]
              md:w-[210px]

              h-[130px]
              md:h-[165px]


              flex
              flex-col
              items-center
              justify-center


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



            {/* Logo Box */}

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

        ))}




        {renderBrands.length === 0 && (

          <p className="text-sm text-black/40">
            لا توجد ماركات متاحة حالياً
          </p>

        )}



      </div>


    </div>




    <style>{`
      .brands-strip-track::-webkit-scrollbar {
        display:none;
      }

      .brands-strip-track {
        scroll-behavior: smooth;
        -webkit-overflow-scrolling: touch;
      }
    `}</style>


  </section>
);
};


export default BrandsStrip;