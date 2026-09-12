import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { Autoplay } from "swiper/modules";
import { ArrowLeft } from "phosphor-react";

import { supabase } from "@/integrations/supabase/client";
import { isBannerCurrentlyVisible } from "@/lib/bannerSchedule";
import { handleImageError, optimizeImage } from "@/lib/imageUrl";

import "swiper/css";

type HeroSlide = { image: string; title: string; desc: string; cta: string; link: string; imageZoom: number; imagePositionX: number; imagePositionY: number; };

const HeroSlider = () => {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { data: managedSlides = [], isLoading } = useQuery({
    queryKey: ["home-hero-banners", "admin-only-v6-editorial-safe"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("banners").select("image_url,title,title_ar,subtitle_ar,cta_text_ar,cta_link,page_slug,image_zoom,image_position_x,image_position_y,starts_at,ends_at").eq("is_active", true).neq("title", "Between products banner").order("sort_order", { ascending: true }).limit(20);
      if (error) throw error;
      return (data || []).filter((slide: any) => String(slide.page_slug || "") !== "home-editorial").filter((slide: any) => Boolean(String(slide.image_url || "").trim()) && isBannerCurrentlyVisible(slide)).slice(0, 5).map((slide: any) => ({ image: String(slide.image_url), title: String(slide.title_ar || ""), desc: String(slide.subtitle_ar || ""), cta: String(slide.cta_text_ar || "اكتشف المجموعة"), link: slide.page_slug ? `/banner/${slide.page_slug}` : slide.cta_link || "/products", imageZoom: Number(slide.image_zoom ?? 1), imagePositionX: Number(slide.image_position_x ?? 50), imagePositionY: Number(slide.image_position_y ?? 50) })) as HeroSlide[];
    }, staleTime: 10 * 60 * 1000, gcTime: 30 * 60 * 1000, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const slides = managedSlides;
  const heroImageWidth = typeof window !== "undefined" && window.innerWidth < 768 ? 640 : 1920;

  return (
    <section dir="rtl" className="w-full bg-background px-3 pt-3 md:px-0 md:pt-0">
      <div className="mx-auto w-full md:max-w-none">
        <div className="relative overflow-hidden rounded-[18px] border border-border/60 bg-muted/30 md:rounded-none md:border-x-0 md:border-t-0 md:border-[#eadfdb]">
          {slides.length > 0 ? (
            <Swiper modules={[Autoplay]} onSwiper={(swiper) => { swiperRef.current = swiper; }} onSlideChange={(swiper) => { setActiveIndex(swiper.realIndex); }} autoplay={{ delay: 5200, disableOnInteraction: false, pauseOnMouseEnter: true, waitForTransition: true }} speed={650} loop={slides.length > 1} loopPreventsSliding grabCursor touchRatio={1} resistance resistanceRatio={0.85} className="w-full">
              {slides.map((slide, index) => (
                <SwiperSlide key={`${slide.image}-${index}`}>
                  <div className="relative h-[230px] w-full overflow-hidden bg-muted/30 sm:h-[285px] md:h-[500px] lg:h-[560px] xl:h-[620px] 2xl:h-[660px]">
                    <img src={optimizeImage(slide.image, heroImageWidth, index === 0 ? 78 : 72)} alt={slide.title || "Flamingo Park"} loading={index === 0 ? "eager" : "lazy"} decoding="async" fetchPriority={index === 0 ? "high" : "low"} width={heroImageWidth} height={1000} onError={handleImageError} className="absolute inset-0 h-full w-full object-cover object-center" style={{ objectPosition: `${slide.imagePositionX}% ${slide.imagePositionY}%`, transform: `scale(${slide.imageZoom})` }} />
                    <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/65 to-transparent sm:from-background/92 sm:via-background/52 md:bg-[linear-gradient(90deg,rgba(20,15,14,.08)_0%,rgba(20,15,14,.04)_38%,rgba(255,253,252,.15)_52%,rgba(255,253,252,.88)_76%,rgba(255,253,252,.98)_100%)]" />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/[0.08] to-transparent md:h-40" />
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-[70%] px-5 sm:w-[60%] sm:px-8 md:mr-[7vw] md:w-[38%] md:max-w-[590px] md:px-0">
                        <div className="mb-2 flex items-center gap-2 md:mb-5"><span className="h-[2px] w-5 rounded-full bg-[#D4777D] md:w-8" /><span className="font-serif text-[6px] uppercase tracking-[0.22em] text-[#B86168] sm:text-[7px] md:text-[10px]">FLAMINGO PARK</span></div>
                        <h1 className="line-clamp-2 text-[22px] font-semibold leading-[1.45] tracking-[-0.025em] text-foreground sm:text-[29px] md:text-[44px] lg:text-[54px] xl:text-[64px] xl:leading-[1.25]">{slide.title}</h1>
                        {slide.desc && <p className="mt-2 line-clamp-2 max-w-[440px] text-[8px] leading-5 text-muted-foreground sm:text-[10px] md:mt-5 md:text-[13px] md:leading-8 lg:text-[14px]">{slide.desc}</p>}
                        <div className="mt-4 flex items-center gap-3 md:mt-8 md:gap-5"><Link to={slide.link} className="inline-flex h-[36px] items-center justify-center gap-1.5 rounded-[9px] bg-[#D4777D] px-4 text-[8px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#C96B72] hover:shadow-[0_12px_30px_rgba(201,107,114,.28)] sm:h-[40px] md:h-[50px] md:rounded-full md:px-8 md:text-[11px]">{slide.cta}<ArrowLeft size={14} weight="bold" /></Link><Link to="/products" className="hidden h-[48px] items-center border-b border-[#cdbab5] px-1 text-[11px] font-medium text-[#594844] transition-colors hover:text-[#B86168] md:inline-flex">تصفح جميع المنتجات</Link></div>
                      </div>
                    </div>
                    {slides.length > 1 && <div className="absolute bottom-6 left-[4vw] z-20 hidden items-center gap-2 text-[9px] font-medium text-white md:flex"><span>{String(activeIndex + 1).padStart(2, "0")}</span><span className="h-px w-10 bg-white/70" /><span className="text-white/65">{String(slides.length).padStart(2, "0")}</span></div>}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : <div className="h-[230px] w-full bg-muted/30 sm:h-[285px] md:h-[500px] lg:h-[560px] xl:h-[620px]" aria-busy={isLoading} />}
          {!isLoading && slides.length > 1 && <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 md:bottom-7">{slides.map((_, index) => <button key={index} type="button" aria-label={`الانتقال إلى العرض ${index + 1}`} onClick={() => swiperRef.current?.slideToLoop(index)} className={`h-[3px] rounded-full transition-all duration-300 ${activeIndex === index ? "w-7 bg-[#B86168] md:w-12" : "w-2.5 bg-white/70 md:w-5"}`} />)}</div>}
        </div>
      </div>
    </section>
  );
};
export default HeroSlider;
