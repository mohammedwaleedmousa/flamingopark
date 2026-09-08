import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgePercent, Sparkles, TrendingUp } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import BrandsStrip from "@/components/BrandsStrip";
import FlamingoServices from "@/components/FlamingoServices";
import HomeManagedSections from "@/components/HomeManagedSections";

import { supabase } from "@/integrations/supabase/client";
import { useNearViewport } from "@/hooks/useNearViewport";
import { useCustomerExperience } from "@/hooks/useCustomerExperience";
import { optimizeImage } from "@/lib/imageUrl";

type FeaturedCategoryItem = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

type EditorialBanner = {
  image_url: string;
  title_ar: string | null;
  subtitle_ar: string | null;
  cta_text_ar: string | null;
  cta_link: string | null;
  image_zoom: number | null;
  image_position_x: number | null;
  image_position_y: number | null;
};

const isLingerieCategory = (category: { slug?: string | null; name?: string | null; name_ar?: string | null }) => {
  const value = `${category.slug || ""} ${category.name || ""} ${category.name_ar || ""}`
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ");
  return /lingerie|لانجري|لانجيري|لانجيرى|ملابس داخليه|ملابس داخلية/.test(value);
};

const DesktopDiscovery = () => (
  <section className="hidden bg-background md:block" dir="rtl" aria-label="اكتشف فلامنجو">
    <div className="mx-auto grid w-full max-w-[1500px] grid-cols-3 gap-3 px-6 pb-3 pt-5 lg:px-8">
      <Link to="/new-arrivals" className="group flex min-h-[86px] items-center gap-4 rounded-[20px] border border-[#EEE3DF] bg-[#FFF9F7] px-5 transition-all hover:-translate-y-0.5 hover:border-[#E4C9C5] hover:shadow-[0_14px_34px_rgba(96,64,57,0.08)]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#C5666F] shadow-sm"><Sparkles className="h-5 w-5" strokeWidth={1.5} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#493A36]">وصل حديثاً</span><span className="mt-1 block text-[9px] text-[#9B8B86]">اكتشف أحدث القطع فور وصولها</span></span>
        <ArrowLeft className="h-4 w-4 text-[#B78B86] transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
      </Link>
      <Link to="/seasonal-offers" className="group flex min-h-[86px] items-center gap-4 rounded-[20px] border border-[#EEE3DF] bg-white px-5 transition-all hover:-translate-y-0.5 hover:border-[#E4C9C5] hover:shadow-[0_14px_34px_rgba(96,64,57,0.08)]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFF5F3] text-[#C5666F]"><BadgePercent className="h-5 w-5" strokeWidth={1.5} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#493A36]">العروض</span><span className="mt-1 block text-[9px] text-[#9B8B86]">اختيارات مميزة بأسعار أفضل</span></span>
        <ArrowLeft className="h-4 w-4 text-[#B78B86] transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
      </Link>
      <Link to="/best-sellers" className="group flex min-h-[86px] items-center gap-4 rounded-[20px] border border-[#EEE3DF] bg-[#FFF9F7] px-5 transition-all hover:-translate-y-0.5 hover:border-[#E4C9C5] hover:shadow-[0_14px_34px_rgba(96,64,57,0.08)]">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#C5666F] shadow-sm"><TrendingUp className="h-5 w-5" strokeWidth={1.5} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-[#493A36]">الأكثر مبيعاً</span><span className="mt-1 block text-[9px] text-[#9B8B86]">القطع التي يختارها عملاؤنا أكثر</span></span>
        <ArrowLeft className="h-4 w-4 text-[#B78B86] transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
      </Link>
    </div>
  </section>
);

const CategoryCarousel = ({ items, loading = false }: { items: FeaturedCategoryItem[]; loading?: boolean }) => {
  if (!loading && items.length === 0) return null;

  return (
    <section className="w-full overflow-hidden bg-background py-5 md:py-10" dir="rtl" aria-label="الأقسام">
      <div className="mx-auto w-full max-w-[1500px] px-3 md:px-6 lg:px-8">
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-7">
          <div>
            <div className="mb-1 flex items-center gap-2 md:mb-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D] md:w-6" />
              <span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[8px]">CATEGORIES</span>
            </div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground md:text-[27px]">تسوق حسب القسم</h2>
            <p className="mt-2 hidden text-[10px] text-[#9A8B86] md:block">ابدأ من القسم المناسب واختصر طريقك إلى ما تبحث عنه.</p>
          </div>
          <Link to="/categories" className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:gap-2 md:text-[10px]">
            عرض كل الأقسام
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:mx-0 md:overflow-visible md:px-0">
          <div className="flex w-max gap-2.5 after:block after:w-3 after:shrink-0 after:content-[''] md:grid md:w-full md:grid-cols-4 md:gap-4 md:after:hidden lg:grid-cols-6 xl:grid-cols-8">
            {loading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="block w-[78px] shrink-0 sm:w-[90px] md:w-auto" aria-hidden="true">
                    <div className="aspect-square w-full animate-pulse rounded-[15px] bg-muted md:aspect-[4/5] md:rounded-[20px]" />
                    <div className="mx-auto mt-2 h-2 w-10 animate-pulse rounded-full bg-muted" />
                  </div>
                ))
              : items.slice(0, 8).map((item, index) => (
                  <Link key={`${item.title}-${item.link}`} to={item.link} className="group block w-[78px] shrink-0 select-none [-webkit-tap-highlight-color:transparent] sm:w-[90px] md:w-auto">
                    <div className="relative aspect-square w-full overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:aspect-[4/5] md:rounded-[20px] md:border-[#EDE3DF]">
                      <img src={optimizeImage(item.image, 360, 78)} alt={item.title} loading={index < 5 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 2 ? "high" : "auto"} width={360} height={450} className="h-full w-full object-cover object-center transition-transform duration-500 md:group-hover:scale-[1.045]" />
                      <div className="absolute inset-x-0 bottom-0 hidden h-2/5 bg-gradient-to-t from-black/45 to-transparent md:block" />
                      <div className="absolute inset-x-0 bottom-0 hidden p-3 text-white md:block">
                        <p className="truncate text-[11px] font-semibold">{item.title}</p>
                        <p className="mt-0.5 truncate font-serif text-[6px] uppercase tracking-[0.12em] text-white/75">{item.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-1.5 text-center md:hidden">
                      <p className="truncate text-[8px] font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 truncate font-serif text-[5px] uppercase tracking-[0.08em] text-muted-foreground">{item.subtitle}</p>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const EditorialSection = ({ banner }: { banner: EditorialBanner | null }) => {
  const title = banner?.title_ar?.trim() || "الأناقة ليست ما ترتديه، بل ما يبقى في الذاكرة.";
  const subtitle = banner?.subtitle_ar?.trim() || "مختارات منتقاة لمن يقدّر التفاصيل والجودة والتصميم الذي لا يحتاج إلى المبالغة.";
  const ctaText = banner?.cta_text_ar?.trim() || "اكتشف المجموعة";
  const ctaLink = banner?.cta_link?.trim() || "/products";
  const hasImage = Boolean(banner?.image_url?.trim());

  if (hasImage) {
    return (
      <section className="bg-[#FFF9F7] py-6 md:py-14">
        <div className="mx-auto max-w-[1500px] px-0 md:px-6 lg:px-8">
          <div className="relative min-h-[360px] overflow-hidden md:grid md:min-h-[500px] md:grid-cols-[1.35fr_0.85fr] md:rounded-[28px] md:border md:border-[#EDE3DF] md:bg-white md:shadow-[0_24px_70px_rgba(83,56,49,0.07)]">
            <div className="absolute inset-0 md:relative md:inset-auto">
              <img src={optimizeImage(banner!.image_url, 1400, 80)} alt="" loading="lazy" decoding="async" width={1400} height={900} className="h-full w-full object-cover" style={{ objectPosition: `${Number(banner?.image_position_x ?? 50)}% ${Number(banner?.image_position_y ?? 50)}%`, transform: `scale(${Number(banner?.image_zoom ?? 1)})` }} />
              <div className="absolute inset-0 bg-black/35 md:bg-gradient-to-l md:from-black/10 md:via-transparent md:to-black/5" />
            </div>
            <div className="relative z-10 flex min-h-[360px] flex-col items-center justify-center px-5 py-12 text-center md:min-h-[500px] md:items-start md:px-12 md:text-right lg:px-16">
              <div className="mb-4 flex items-center justify-center gap-2 md:justify-start">
                <span className="h-px w-6 bg-white/55 md:bg-[#D7B3AF]" />
                <span className="font-serif text-[6px] uppercase tracking-[0.24em] text-white/85 md:text-[8px] md:text-[#B86168]">FLAMINGO EDIT</span>
              </div>
              <h2 className="max-w-[700px] whitespace-pre-line text-[21px] font-light leading-[1.8] tracking-[-0.025em] text-white drop-shadow-sm md:text-[34px] md:leading-[1.65] md:text-[#3F302D] md:drop-shadow-none">{title}</h2>
              <p className="mt-4 max-w-[450px] text-[8px] leading-6 text-white/85 md:text-[11px] md:leading-8 md:text-[#8F7E79]">{subtitle}</p>
              <Link to={ctaLink} className="mt-5 inline-flex items-center gap-1.5 border-b border-white/50 pb-1 text-[7px] font-semibold text-white md:mt-7 md:gap-2 md:border-[#D9BBB6] md:text-[10px] md:text-[#A95B61]">{ctaText}<ArrowLeft className="h-3 w-3 md:h-4 md:w-4" strokeWidth={1.5} /></Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-background px-4 py-11 md:py-20">
      <div className="relative z-10 mx-auto flex max-w-[850px] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2"><span className="h-px w-6 bg-border" /><span className="font-serif text-[6px] uppercase tracking-[0.24em] text-[#B86168]">FLAMINGO EDIT</span><span className="h-px w-6 bg-border" /></div>
        <h2 className="mx-auto max-w-[700px] whitespace-pre-line text-[21px] font-light leading-[1.8] tracking-[-0.025em] text-foreground md:text-[36px] md:leading-[1.7]">{title}</h2>
        <p className="mx-auto mt-4 max-w-[450px] text-[8px] leading-6 text-muted-foreground md:text-[10px] md:leading-7">{subtitle}</p>
        <Link to={ctaLink} className="mx-auto mt-5 inline-flex items-center gap-1.5 border-b border-border pb-1 text-[7px] font-semibold text-[#A95B61] md:text-[8px]">{ctaText}<ArrowLeft className="h-3 w-3" strokeWidth={1.5} /></Link>
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: customerExperience } = useCustomerExperience();
  const showHomeSection = (section: string) => customerExperience?.homeSections[section] !== false;

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-all-active-v4"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: editorialBanner = null } = useQuery({
    queryKey: ["home-editorial-banner-v1"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("banners").select("image_url,title_ar,subtitle_ar,cta_text_ar,cta_link,image_zoom,image_position_x,image_position_y").eq("page_slug", "home-editorial").eq("is_active", true).maybeSingle();
      if (error) throw error;
      return (data || null) as EditorialBanner | null;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => categories
    .filter((category: any) => !category.parent_id && !isLingerieCategory(category))
    .map((category: any) => ({
      title: category.name_ar || category.name || category.slug,
      subtitle: category.name || category.name_ar || category.slug,
      image: category.image_url || "/placeholder.svg",
      link: `/categories?parent=${category.slug}`,
    })), [categories]);

  const brandsViewport = useNearViewport<HTMLDivElement>("120px");
  const imageBanner = showHomeSection("services") ? <div className="bg-background"><FlamingoServices /></div> : null;
  const textBanner = showHomeSection("editorial") ? <EditorialSection banner={editorialBanner} /> : null;

  return (
    <div className="relative min-h-screen bg-background" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="overflow-hidden bg-background">
        {showHomeSection("hero") && <HeroSlider />}
        <DesktopDiscovery />
        {showHomeSection("categories") && <CategoryCarousel items={featuredCategories} loading={categoriesLoading} />}
        {showHomeSection("brands") && (
          <div ref={brandsViewport.ref} className="bg-background" style={{ minHeight: 92 }}><BrandsStrip enabled={brandsViewport.isNearViewport} /></div>
        )}
        <HomeManagedSections betweenSections={imageBanner} afterSections={textBanner} />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
