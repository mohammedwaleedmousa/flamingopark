import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import SmartImage from "@/components/SmartImage";
import StoreSectionHeader from "@/components/StoreSectionHeader";
import { supabase } from "@/integrations/supabase/client";
import "swiper/css";

interface BrandRow { id: string; name: string; slug: string | null; logo_url: string | null; is_active: boolean | null; sort_order: number | null }
interface BrandViewModel { id: string; name: string; slug: string; logo_url: string | null }

export default function BrandsStrip({ enabled = true }: { enabled?: boolean }) {
  const { data: brands = [] } = useQuery({ queryKey: ["home-brands"], enabled, queryFn: async () => { const { data, error } = await supabase.from("brands").select("id,name,logo_url,is_active,sort_order,slug").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; return (data || []) as BrandRow[]; } });
  const renderBrands = useMemo<BrandViewModel[]>(() => brands.map((brand) => ({ id: brand.id, name: brand.name, slug: brand.slug || brand.name.toLowerCase().replace(/\s+/g, "-"), logo_url: brand.logo_url })), [brands]);

  if (!renderBrands.length) return null;

  return <section className="border-b border-border bg-card py-10 sm:py-14" dir="rtl" aria-label="الماركات"><div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10"><StoreSectionHeader eyebrow="أسماء نثق بها" title="ماركاتك المفضلة" href="/brands" action="كل الماركات" /><Swiper modules={[FreeMode]} slidesPerView="auto" spaceBetween={12} freeMode={{ enabled: true, momentum: true }} grabCursor className="!overflow-visible"><>{renderBrands.map((brand) => <SwiperSlide key={brand.id} className="!w-[102px] sm:!w-[124px]"><Link to={`/brands/${brand.slug}`} className="group block text-center"><div className="grid aspect-square place-items-center rounded-2xl border border-border bg-background p-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/45 group-hover:shadow-sm">{brand.logo_url ? <SmartImage src={brand.logo_url} alt={brand.name} width={160} height={160} quality={84} responsiveWidths={[96, 160]} sizes="(max-width: 640px) 102px, 124px" className="max-h-full max-w-full object-contain grayscale-[.15] transition duration-200 group-hover:grayscale-0" /> : <span className="line-clamp-2 text-xs font-semibold text-foreground">{brand.name}</span>}</div><span className="mt-2 block truncate text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">{brand.name}</span></Link></SwiperSlide>)}</></Swiper></div></section>;
}
