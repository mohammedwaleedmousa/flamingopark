import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isBannerCurrentlyVisible } from "@/lib/bannerSchedule";
import { optimizeImage } from "@/lib/imageUrl";

const FlamingoServices = () => {
  const { data: banner } = useQuery({
    queryKey: ["between-products-banner", "scheduled-v2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("banners")
        .select("title_ar,subtitle_ar,image_url,cta_text_ar,cta_link,image_zoom,image_position_x,image_position_y,starts_at,ends_at")
        .eq("title", "Between products banner")
        .is("page_slug", null)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      if (!data || !isBannerCurrentlyVisible(data)) return null;
      return data;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (!banner?.image_url) return null;

  return (
    <section className="w-full bg-white py-5 md:py-14" dir="rtl">
      <div className="relative h-[360px] w-full overflow-hidden bg-[#EAE4DE] sm:h-[420px] md:mx-auto md:h-[500px] md:max-w-[1500px] md:rounded-[28px] md:border md:border-[#E9DEDA] md:shadow-[0_22px_60px_rgba(77,51,45,0.08)] lg:h-[560px]">
        <img
          src={optimizeImage(String(banner.image_url), 1700, 82)}
          alt={String(banner.title_ar || "Flamingo luxury brands")}
          loading="lazy"
          decoding="async"
          width={1500}
          height={560}
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ objectPosition: `${Number(banner.image_position_x ?? 50)}% ${Number(banner.image_position_y ?? 50)}%`, transform: `scale(${Number(banner.image_zoom ?? 1)})` }}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/[0.03] to-black/[0.03] md:bg-gradient-to-l md:from-black/55 md:via-black/15 md:to-transparent" />

        <span dir="ltr" className="absolute left-4 top-4 z-10 text-[7px] font-medium tracking-[0.38em] text-white/80 md:left-8 md:top-7 md:text-[9px]">FLAMINGO PARK</span>

        <div className="absolute bottom-5 right-4 z-10 max-w-[560px] md:bottom-auto md:right-10 md:top-1/2 md:-translate-y-1/2 lg:right-16">
          <div className="mb-3 hidden items-center gap-2 md:flex"><span className="h-px w-7 bg-white/60" /><span className="font-serif text-[8px] tracking-[0.2em] text-white/80">CURATED FOR YOU</span></div>
          <h2 className="font-heading text-[22px] font-light leading-[1.55] tracking-[-0.025em] text-white sm:text-[25px] md:text-[40px] lg:text-[46px]">
            {String(banner.title_ar || "علامات تعرفها.")}
            {banner.subtitle_ar && <><br /><span className="text-white/72">{String(banner.subtitle_ar)}</span></>}
          </h2>

          <Link to={String(banner.cta_link || "/brands")} className="group mt-3 inline-flex items-center gap-1.5 text-[8px] font-medium text-white/90 md:mt-6 md:h-11 md:rounded-[11px] md:bg-white md:px-6 md:text-[10px] md:font-semibold md:text-[#5D4B46] md:transition-all md:hover:-translate-y-0.5 md:hover:shadow-[0_12px_28px_rgba(0,0,0,0.16)]">
            {String(banner.cta_text_ar || "اكتشف الماركات")}
            <ArrowLeft className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FlamingoServices;
