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
              : items.map((item) => (
                  <Link key={`${item.title}-${item.link}`} to={item.link} className="group block w-[78px] shrink-0 select-none [-webkit-tap-highlight-color:transparent] sm:w-[90px] md:w-[102px]">
                    <div className="aspect-square w-full overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                      <img src={optimizeImage(item.image, 320, 82)} alt={item.title} loading="lazy" decoding="async" width={320} height={320} className="h-full w-full object-cover object-center" />
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

const EditorialSection = () => {
  return (
    <section className="bg-background px-4 py-11 md:py-20">
      <div className="mx-auto max-w-[850px] text-center">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <span className="h-px w-6 bg-border" />
          <span className="font-serif text-[6px] uppercase tracking-[0.24em] text-[#B86168]">FLAMINGO EDIT</span>
          <span className="h-px w-6 bg-border" />
        </div>

        <h2 className="mx-auto max-w-[700px] text-[21px] font-light leading-[1.8] tracking-[-0.025em] text-foreground md:text-[36px] md:leading-[1.7]">
          الأناقة ليست ما ترتديه،
          <br />
          بل ما يبقى في الذاكرة.
        </h2>

        <p className="mx-auto mt-4 max-w-[450px] text-[8px] leading-6 text-muted-foreground md:text-[10px] md:leading-7">مختارات منتقاة لمن يقدّر التفاصيل والجودة والتصميم الذي لا يحتاج إلى المبالغة.</p>

        <Link to="/products" className="mx-auto mt-5 inline-flex items-center gap-1.5 border-b border-border pb-1 text-[7px] font-semibold text-[#A95B61] md:text-[8px]">
          اكتشف المجموعة
          <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: customerExperience } = useCustomerExperience();
  const showHomeSection = (section: string) => customerExperience?.homeSections[section] !== false;

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-home-active-parents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).is("parent_id", null).order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => {
    return categories.map((category: any) => ({
      title: category.name_ar || category.name || category.slug,
      subtitle: category.name || category.name_ar || category.slug,
      image: category.image_url || "/placeholder.svg",
      link: `/categories?parent=${category.slug}`,
    }));
  }, [categories]);

  const brandsViewport = useNearViewport<HTMLDivElement>("120px");

  const imageBanner = showHomeSection("services") ? (
    <div className="bg-background">
      <FlamingoServices />
    </div>
  ) : null;

  const textBanner = showHomeSection("editorial") ? <EditorialSection /> : null;

  return (
    <div className="relative min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="overflow-hidden bg-background">
        {showHomeSection("hero") && <HeroSlider />}

        {showHomeSection("categories") && <CategoryCarousel items={featuredCategories} loading={categoriesLoading} />}

        {showHomeSection("brands") && (
          <div ref={brandsViewport.ref} className="bg-background" style={{ minHeight: 92 }}>
            <BrandsStrip enabled={brandsViewport.isNearViewport} />
          </div>
        )}

        <HomeManagedSections betweenSections={imageBanner} afterSections={textBanner} />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;