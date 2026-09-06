import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

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

const CategoryCarousel = ({ items, loading = false }: { items: FeaturedCategoryItem[]; loading?: boolean }) => {
  if (!loading && items.length === 0) return null;

  return (
    <section className="w-full overflow-hidden bg-background py-4 md:py-6" dir="rtl" aria-label="الأقسام">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168]">CATEGORIES</span>
            </div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground md:text-[20px]">تسوق حسب القسم</h2>
          </div>
          <Link to="/categories" className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">
            عرض الكل
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:-mx-6 md:px-6">
          <div className="flex w-max gap-2.5 after:block after:w-3 after:shrink-0 after:content-[''] md:after:w-6">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="block w-[78px] shrink-0 sm:w-[90px] md:w-[102px]" aria-hidden="true">
                    <div className="aspect-square w-full animate-pulse rounded-[15px] bg-muted md:rounded-[18px]" />
                    <div className="mx-auto mt-2 h-2 w-10 animate-pulse rounded-full bg-muted" />
                    <div className="mx-auto mt-1 h-1.5 w-7 animate-pulse rounded-full bg-muted/70" />
                  </div>
                ))
              : items.map((item, index) => (
                  <Link key={`${item.title}-${item.link}`} to={item.link} className="group block w-[78px] shrink-0 select-none [-webkit-tap-highlight-color:transparent] sm:w-[90px] md:w-[102px]">
                    <div className="aspect-square w-full overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                      <img src={optimizeImage(item.image, 240, 76)} alt={item.title} loading={index < 5 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 2 ? "high" : "auto"} width={240} height={240} className="h-full w-full object-cover object-center" />
                    </div>
                    <div className="mt-1.5 text-center">
                      <p className="truncate text-[8px] font-semibold text-foreground md:text-[9px]">{item.title}</p>
                      <p className="mt-0.5 truncate font-serif text-[5px] uppercase tracking-[0.08em] text-muted-foreground md:text-[6px]">{item.subtitle}</p>
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

  return (
    <section className={`relative overflow-hidden ${hasImage ? "min-h-[360px] md:min-h-[470px]" : "bg-background px-4 py-11 md:py-20"}`}>
      {hasImage && (
        <>
          <img src={optimizeImage(banner!.image_url, 1200, 78)} alt="" loading="lazy" decoding="async" width={1200} height={900} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${Number(banner?.image_position_x ?? 50)}% ${Number(banner?.image_position_y ?? 50)}%`, transform: `scale(${Number(banner?.image_zoom ?? 1)})` }} />
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        </>
      )}
      <div className={`relative z-10 mx-auto flex max-w-[850px] flex-col items-center justify-center px-4 text-center ${hasImage ? "min-h-[360px] py-12 md:min-h-[470px] md:py-16" : ""}`}>
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <span className={`h-px w-6 ${hasImage ? "bg-white/55" : "bg-border"}`} />
          <span className={`font-serif text-[6px] uppercase tracking-[0.24em] ${hasImage ? "text-white/85" : "text-[#B86168]"}`}>FLAMINGO EDIT</span>
          <span className={`h-px w-6 ${hasImage ? "bg-white/55" : "bg-border"}`} />
        </div>
        <h2 className={`mx-auto max-w-[700px] whitespace-pre-line text-[21px] font-light leading-[1.8] tracking-[-0.025em] md:text-[36px] md:leading-[1.7] ${hasImage ? "text-white drop-shadow-sm" : "text-foreground"}`}>{title}</h2>
        <p className={`mx-auto mt-4 max-w-[450px] text-[8px] leading-6 md:text-[10px] md:leading-7 ${hasImage ? "text-white/85" : "text-muted-foreground"}`}>{subtitle}</p>
        <Link to={ctaLink} className={`mx-auto mt-5 inline-flex items-center gap-1.5 border-b pb-1 text-[7px] font-semibold md:text-[8px] ${hasImage ? "border-white/50 text-white" : "border-border text-[#A95B61]"}`}>{ctaText}<ArrowLeft className="h-3 w-3" strokeWidth={1.5} /></Link>
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: customerExperience } = useCustomerExperience();
  const showHomeSection = (section: string) => customerExperience?.homeSections[section] !== false;

  // Intentionally use the exact same query key/data shape as CategoriesPage.
  // The full category tree is small, so opening any category can reuse this cache instantly.
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

  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => {
    return categories
      .filter((category: any) => !category.parent_id && !isLingerieCategory(category))
      .map((category: any) => ({
        title: category.name_ar || category.name || category.slug,
        subtitle: category.name || category.name_ar || category.slug,
        image: category.image_url || "/placeholder.svg",
        link: `/categories?parent=${category.slug}`,
      }));
  }, [categories]);

  const brandsViewport = useNearViewport<HTMLDivElement>("120px");
  const imageBanner = showHomeSection("services") ? <div className="bg-background"><FlamingoServices /></div> : null;
  const textBanner = showHomeSection("editorial") ? <EditorialSection banner={editorialBanner} /> : null;

  return (
    <div className="relative min-h-screen bg-background" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="overflow-hidden bg-background">
        {showHomeSection("hero") && <HeroSlider />}
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