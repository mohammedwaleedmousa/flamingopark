import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import SmartImage from "@/components/SmartImage";
import StoreSectionHeader from "@/components/StoreSectionHeader";
import { supabase } from "@/integrations/supabase/client";
import "swiper/css";
import "swiper/css/free-mode";

const fallbackServices = [
  { title: "مساعد التسوق الخاص", description: "نساعدك في اختيار القطعة المناسبة حسب ذوقك ومناسبتك بكل سهولة.", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80", link: "/contact" },
  { title: "هدايا فلامنجو", description: "اختيارات مميزة للمناسبات الخاصة مع عناية بكل التفاصيل.", image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80", link: "/gifts" },
  { title: "إلهام الإطلالات", description: "اكتشف تنسيقات الموسم واختياراتنا التي تناسب كل مناسبة.", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80", link: "/collections" },
];

export default function FlamingoServices() {
  const { data: managedServices = [] } = useQuery({ queryKey: ["home-services"], queryFn: async () => { const { data, error } = await (supabase as any).from("campaign_pages").select("slug,title_ar,description_ar,image_url").eq("page_type", "service").eq("is_active", true).order("sort_order"); if (error) throw error; return (data || []).map((service: any) => ({ title: service.title_ar, description: service.description_ar || "", image: service.image_url || "/icons/flamingo.jpeg", link: `/campaigns/${service.slug}` })); } });
  const services = managedServices.length ? managedServices : fallbackServices;

  return <section className="border-t border-border bg-muted/45 py-12 sm:py-16 lg:py-20" dir="rtl"><div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10"><StoreSectionHeader align="center" eyebrow="تجربة فلامنجو" title="أكثر من مجرد عملية شراء" description="خدمات صغيرة تجعل التجربة أبسط وأجمل." /><Swiper modules={[FreeMode]} slidesPerView="auto" spaceBetween={14} freeMode={{ enabled: true, momentum: true }} breakpoints={{ 768: { slidesPerView: 3, spaceBetween: 20 } }} className="!overflow-visible"><>{services.map((service) => <SwiperSlide key={service.title} className="!w-[268px] md:!w-auto"><article className="h-full overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-[4/3] overflow-hidden bg-muted"><SmartImage src={service.image} alt={service.title} width={720} height={540} quality={78} responsiveWidths={[320, 480, 720]} sizes="(max-width: 768px) 268px, 33vw" className="h-full w-full object-cover" /></div><div className="p-5"><h3 className="text-base font-semibold text-foreground">{service.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{service.description}</p><Link to={service.link} className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">اكتشف المزيد</Link></div></article></SwiperSlide>)}</></Swiper></div></section>;
}
