import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { Autoplay } from "swiper/modules";
import { ArrowLeft } from "phosphor-react";

import { supabase } from "@/integrations/supabase/client";

import "swiper/css";

type HeroSlide = {
  image: string;
  title: string;
  desc: string;
  cta: string;
  link: string;
  zoom: number;
  positionX: number;
  positionY: number;
};

const fallbackSlides: HeroSlide[] = [
  { image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=78", title: "تسوق أحدث صيحات الموضة", desc: "اكتشف مجموعات مختارة من أفضل الماركات العالمية", cta: "اكتشف المجموعة", link: "/products", zoom: 1, positionX: 50, positionY: 50 },
  { image: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1600&q=78", title: "أناقة تعكس شخصيتك", desc: "منتجات مختارة بتصميم عصري وجودة عالية", cta: "تسوق الآن", link: "/products", zoom: 1, positionX: 50, positionY: 50 },
  { image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=78", title: "تجربة تسوق مختلفة", desc: "مختارات عالمية في مكان واحد", cta: "استكشف فلامنجو", link: "/products", zoom: 1, positionX: 50, positionY: 50 },
];

const HeroSlider = () => {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(() => new Set([0]));

  const { data: managedSlides = [] } = useQuery({
    queryKey: ["home-hero-banners"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("banners").select("image_url,title_ar,subtitle_ar,cta_text_ar,cta_link,page_slug,image_zoom,image_position_x,image_position_y").eq("is_active", true).order("sort_order", { ascending: true }).limit(3);
      if (error) throw error;
      return (data || []).filter((slide: any) => Boolean(slide.image_url)).map((slide: any) => ({
        image: String(slide.image_url),
        title: String(slide.title_ar || ""),
        desc: String(slide.subtitle_ar || ""),
        cta: String(slide.cta_text_ar || "اكتشف المجموعة"),
        link: slide.page_slug ? `/banner/${slide.page_slug}` : slide.cta_link || "/products",
        zoom: Math.min(2.5, Math.max(1, Number(slide.image_zoom || 1))),
        positionX: Math.min(100, Math.max(0, Number(slide.image_position_x ?? 50))),
        positionY: Math.min(100, Math.max(0, Number(slide.image_position_y ?? 50))),
      })) as HeroSlide[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const slides = managedSlides.length > 0 ? managedSlides : fallbackSlides;

  return (
    <section dir="rtl" className="w-full bg-background px-3 pt-3 md:px-6 md:pt-5">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="relative overflow-hidden rounded-[18px] border border-border/60 bg-muted/30 md:rounded-[22px]">
          <Swiper modules={[Autoplay]} onSwiper={(swiper) => { swiperRef.current = swiper; }} onSlideChange={(swiper) => { setActiveIndex(swiper.realIndex); setLoadedSlides((current) => new Set(current).add(swiper.realIndex)); }} autoplay={{ delay: 5200, disableOnInteraction: false, pauseOnMouseEnter: true, waitForTransition: true }} speed={550} loop={slides.length > 1} loopPreventsSliding grabCursor touchRatio={1} resistance resistanceRatio={0.85} className="w-full">
            {slides.map((slide, index) => (
              <SwiperSlide key={`${slide.image}-${index}`}>
                <div className="relative h-[230px] w-full overflow-hidden bg-muted/30 sm:h-[285px] md:h-[390px] lg:h-[450px]">
                  {loadedSlides.has(index) && <img src={slide.image} alt={slide.title || "Flamingo Park"} loading={index === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={index === 0 ? "high" : "auto"} className="absolute inset-0 h-full w-full object-cover will-change-transform" style={{ objectPosition: `${slide.positionX}% ${slide.positionY}%`, transform: `scale(${slide.zoom})`, transformOrigin: `${slide.positionX}% ${slide.positionY}%` }} />}
                  <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/65 to-transparent sm:from-background/92 sm:via-background/52 md:via-background/42" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/[0.05] to-transparent" />
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-[70%] px-5 sm:w-[60%] sm:px-8 md:w-[54%] md:px-12 lg:w-[50%] lg:px-16">
                      <div className="mb-2 flex items-center gap-2 md:mb-3"><span className="h-[2px] w-5 rounded-full bg-[#D4777D]" /><span className="font-serif text-[6px] uppercase tracking-[0.22em] text-[#B86168] sm:text-[7px] md:text-[8px]">FLAMINGO EDIT</span></div>
                      <h1 className="line-clamp-2 max-w-[520px] text-[22px] font-semibold leading-[1.45] tracking-[-0.025em] text-foreground sm:text-[29px] md:text-[40px] lg:text-[48px]">{slide.title}</h1>
                      {slide.desc && <p className="mt-2 line-clamp-2 max-w-[350px] text-[8px] leading-5 text-muted-foreground sm:text-[10px] sm:leading-6 md:mt-3 md:text-[12px] md:leading-7">{slide.desc}</p>}
                      <Link to={slide.link} className="mt-4 inline-flex h-[36px] items-center justify-center gap-1.5 rounded-[9px] bg-[#D4777D] px-4 text-[8px] font-semibold text-white transition-colors hover:bg-[#C96B72] active:bg-[#B86168] sm:h-[40px] sm:px-5 sm:text-[9px] md:mt-5 md:h-[43px] md:px-6 md:text-[10px]">{slide.cta}<ArrowLeft size={13} weight="bold" /></Link>
                    </div>
                  </div>
                  {slides.length > 1 && <div className="absolute bottom-4 left-4 z-20 hidden items-center gap-1.5 text-[7px] font-medium text-white/90 sm:flex md:bottom-5 md:left-6"><span>{String(activeIndex + 1).padStart(2, "0")}</span><span className="h-px w-6 bg-white/60" /><span className="text-white/60">{String(slides.length).padStart(2, "0")}</span></div>}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
          {slides.length > 1 && <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 md:bottom-4">{slides.map((_, index) => <button key={index} type="button" aria-label={`الانتقال إلى العرض ${index + 1}`} onClick={() => swiperRef.current?.slideToLoop(index)} className={`h-[3px] rounded-full transition-all duration-300 ${activeIndex === index ? "w-7 bg-[#B86168]" : "w-2.5 bg-white/65"}`} />)}</div>}
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;
