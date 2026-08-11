import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { Autoplay } from "swiper/modules";
import { ArrowLeft } from "phosphor-react";
import { supabase } from "@/integrations/supabase/client";
import "swiper/css";

const fallbackSlides = [
  {
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70",
    title: "تسوق أحدث صيحات الموضة",
    desc: "اكتشف مجموعات مختارة من أفضل الماركات العالمية",
  },
  {
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=70",
    title: "أناقة تعكس شخصيتك",
    desc: "منتجات فاخرة بتصميم عصري وجودة عالية",
  },
  {
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",
    title: "تجربة تسوق مختلفة",
    desc: "كل ما تحتاجه في مكان واحد",
  },
];

export default function HeroSlider() {
  const { data: managedSlides = [] } = useQuery({
    queryKey: ["home-hero-banners"],

    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select(
          "image_url,title_ar,subtitle_ar,cta_text_ar,cta_link,page_slug"
        )
        .eq("is_active", true)
        .order("sort_order")
        .limit(3);

      if (error) throw error;

      return (data || [])
        .filter((slide: any) => slide.image_url)
        .map((slide: any) => ({
          image: slide.image_url,
          title: slide.title_ar,
          desc: slide.subtitle_ar || "",
          cta: slide.cta_text_ar || "اكتشف المجموعة",
          link: slide.page_slug
            ? `/banner/${slide.page_slug}`
            : slide.cta_link || "/products",
        }));
    },
  });

  const slides = managedSlides.length
    ? managedSlides
    : fallbackSlides.map((slide) => ({
        ...slide,
        cta: "اكتشف المجموعة",
        link: "/products",
      }));

  const [activeIndex, setActiveIndex] = useState(0);

  const [loadedSlides, setLoadedSlides] = useState(
    () => new Set([0])
  );

  const swiperRef = useRef<SwiperInstance | null>(null);

  return (
    <section
      dir="rtl"
      className="
        mx-auto
        w-full
        max-w-7xl
        px-4
        pt-4
        md:px-8
        md:pt-5
      "
    >
      <div
        className="
          relative
          overflow-hidden
          rounded-[24px]
          bg-[#FFF5F8]
          ring-1
          ring-[#F8DCE6]
        "
      >
        <Swiper
          modules={[Autoplay]}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          onSlideChange={(swiper) => {
            setActiveIndex(swiper.realIndex);

            setLoadedSlides(
              (loaded) => new Set(loaded).add(swiper.realIndex)
            );
          }}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
            waitForTransition: true,
          }}
          speed={400}
          loop={true}
          loopPreventsSliding={true}
          grabCursor={true}
          touchRatio={1}
          resistance={true}
          resistanceRatio={0.85}
          className="hero-slider"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <div
                className="
                  relative
                  h-[210px]
                  w-full
                  overflow-hidden
                  bg-[#FFF5F8]
                  sm:h-[255px]
                  md:h-[340px]
                  lg:h-[390px]
                "
              >
                {/* Image */}
                {loadedSlides.has(index) && (
                  <img
                    src={slide.image}
                    alt={slide.title || "فلامنجو"}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={index === 0 ? "high" : "auto"}
                    className="
                      absolute
                      inset-0
                      h-full
                      w-full
                      object-cover
                      object-center
                    "
                  />
                )}

                {/* Brand overlay */}
                <div
                  className="
                    absolute
                    inset-0
                    bg-gradient-to-l
                    from-[#FFF4F8]/95
                    via-[#FFF4F8]/75
                    to-[#FFF4F8]/10
                    sm:from-[#FFF4F8]/92
                    sm:via-[#FFF4F8]/58
                    sm:to-transparent
                  "
                />

                {/* Content */}
                <div className="absolute inset-0 flex items-center">
                  <div
                    className="
                      w-[64%]
                      px-5
                      pb-5
                      text-right
                      sm:w-[58%]
                      sm:px-7
                      md:w-[52%]
                      md:px-12
                      lg:px-14
                    "
                  >
                    <span
                      className="
                        mb-2
                        inline-flex
                        items-center
                        rounded-full
                        border
                        border-[#F4CDD9]
                        bg-white/95
                        px-2.5
                        py-1
                        text-[9px]
                        font-semibold
                        text-[#E85A91]
                        sm:text-[10px]
                        md:mb-3
                        md:px-3
                        md:text-[11px]
                      "
                    >
                      مختارات فلامنجو
                    </span>

                    <h1
                      className="
                        line-clamp-2
                        text-[21px]
                        font-bold
                        leading-[1.3]
                        tracking-[-0.02em]
                        text-[#2E2026]
                        sm:text-[27px]
                        md:text-[38px]
                        lg:text-[44px]
                      "
                    >
                      {slide.title}
                    </h1>

                    {slide.desc && (
                      <p
                        className="
                          mt-2
                          line-clamp-2
                          max-w-[230px]
                          text-[10px]
                          leading-[1.7]
                          text-[#6F5D65]
                          sm:text-xs
                          md:mt-3
                          md:max-w-sm
                          md:text-sm
                          md:leading-6
                        "
                      >
                        {slide.desc}
                      </p>
                    )}

                    <Link
                      to={slide.link}
                      className="
                        mt-3
                        inline-flex
                        h-9
                        items-center
                        gap-1.5
                        rounded-xl
                        bg-[#E85A91]
                        px-3.5
                        text-[10px]
                        font-semibold
                        text-white
                        hover:bg-[#DF4E86]
                        active:bg-[#D9477F]
                        sm:mt-4
                        sm:h-10
                        sm:px-4
                        sm:text-xs
                        md:mt-5
                        md:h-11
                        md:px-5
                        md:text-sm
                      "
                    >
                      {slide.cta}

                      <ArrowLeft
                        size={14}
                        weight="bold"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Pagination */}
        {slides.length > 1 && (
          <div
            className="
              absolute
              bottom-3
              left-1/2
              z-20
              flex
              -translate-x-1/2
              items-center
              gap-1.5
              md:bottom-4
            "
          >
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`الانتقال إلى العرض ${index + 1}`}
                onClick={() => {
                  swiperRef.current?.slideToLoop(index);
                }}
                className={`
                  h-[4px]
                  rounded-full
                  ${
                    activeIndex === index
                      ? "w-7 bg-[#E85A91]"
                      : "w-2.5 bg-[#E85A91]/25"
                  }
                `}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}