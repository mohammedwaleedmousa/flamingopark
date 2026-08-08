import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { Autoplay } from "swiper/modules";
import { supabase } from "@/integrations/supabase/client";
import "swiper/css";

const fallbackSlides = [
  {
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=70",
    title: "تسوق أحدث صيحات الموضة",
    desc: "اكتشف مجموعات مختارة من أفضل الماركات العالمية",
  },
  {
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=70",
    title: "أناقة تعكس شخصيتك",
    desc: "منتجات فاخرة بتصميم عصري وجودة عالية",
  },
  {
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=70",
    title: "تجربة تسوق مختلفة",
    desc: "كل ما تحتاجه في مكان واحد",
  },
];

export default function HeroSlider() {
  const { data: managedSlides = [] } = useQuery({
    queryKey: ["home-hero-banners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("banners").select("image_url,title_ar,subtitle_ar,cta_text_ar,cta_link,page_slug").eq("is_active", true).order("sort_order").limit(3);
      if (error) throw error;
      return (data || []).filter((slide: any) => slide.image_url).map((slide: any) => ({ image: slide.image_url, title: slide.title_ar, desc: slide.subtitle_ar || "", cta: slide.cta_text_ar || "اكتشف المجموعة", link: slide.page_slug ? `/banner/${slide.page_slug}` : slide.cta_link || "/products" }));
    },
  });
  const slides = managedSlides.length ? managedSlides : fallbackSlides.map((slide) => ({ ...slide, cta: "اكتشف المجموعة", link: "/products" }));
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState(() => new Set([0]));
  const swiperRef = useRef<SwiperInstance | null>(null);

  return (
    <section
      dir="rtl"
      className="relative h-[40svh] min-h-[300px] overflow-hidden"
    >
      <Swiper
        modules={[Autoplay]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex);
          setLoadedSlides((loaded) => new Set(loaded).add(swiper.realIndex));
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          pauseOnMouseEnter: true,
          waitForTransition: true,
        }}
        speed={800}
        loop={true}
        loopPreventsSliding={true}
        grabCursor={true}
        touchRatio={1}
        resistance={true}
        resistanceRatio={0.85}
        className="hero-slider h-full"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="relative h-full w-full overflow-hidden bg-neutral-900">
              {loadedSlides.has(index) && (
                <img
                  src={slide.image}
                  alt=""
                  aria-hidden="true"
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-black/75 via-black/40 to-transparent" />
              <div className="absolute inset-0">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 px-6 pt-32 sm:px-10 md:px-20 max-w-lg text-right text-white">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
                    {slide.title}
                  </h1>
                  <p className="mt-5 text-sm sm:text-base text-white/80 leading-7 max-w-sm">
                    {slide.desc}
                  </p>
                  <Link
                    to={slide.link}
                    className="inline-flex mt-8 text-sm border-b border-white pb-2 hover:opacity-70 transition"
                  >
                    {slide.cta}
                  </Link>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
        <div className=" absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
        <button
          key={index}
          onClick={() => {
            swiperRef.current?.slideToLoop(index);
          }}
          className={`
            h-[3px]
            rounded-full
            transition-all
            duration-300
            ${
              activeIndex === index
                ? "w-[45px] bg-white"
                : "w-[18px] bg-white/40"
            }
          `}
        />
        ))}
        </div>
    </section>
  );
}
