import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import FlamingoServices from "@/components/FlamingoServices";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useNearViewport } from "@/hooks/useNearViewport";
import { useCustomerExperience } from "@/hooks/useCustomerExperience";

import "swiper/css";
import "swiper/css/free-mode";

type FeaturedCategoryItem = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

type HomeProduct = ReturnType<typeof mapProductCard>;

const fallbackCategoryImages: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=70",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=70",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=70",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=70",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=70",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=70",
};

const fallbackFeaturedCategories: FeaturedCategoryItem[] = [
  {
    title: "نسائي",
    subtitle: "Women",
    image: fallbackCategoryImages.women,
    link: "/categories?parent=women",
  },
  {
    title: "رجالي",
    subtitle: "Men",
    image: fallbackCategoryImages.men,
    link: "/categories?parent=men",
  },
  {
    title: "أطفال",
    subtitle: "Kids",
    image: fallbackCategoryImages.kids,
    link: "/categories?parent=kids",
  },
  {
    title: "حقائب",
    subtitle: "Bags",
    image: fallbackCategoryImages.bags,
    link: "/categories?parent=bags",
  },
  {
    title: "أحذية",
    subtitle: "Shoes",
    image: fallbackCategoryImages.shoes,
    link: "/categories?parent=shoes",
  },
  {
    title: "تجميل",
    subtitle: "Beauty",
    image: fallbackCategoryImages.beauty,
    link: "/categories?parent=beauty",
  },
];

/* =========================================================
   CATEGORY CAROUSEL
========================================================= */

const CategoryCarousel = ({ items }: { items: FeaturedCategoryItem[] }) => {
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

        <Swiper modules={[FreeMode]} slidesPerView="auto" spaceBetween={10} freeMode={{ enabled: true, momentum: true, momentumRatio: 0.65 }} grabCursor className="!overflow-visible">
          {items.map((item) => (
            <SwiperSlide key={`${item.title}-${item.link}`} className="!w-[78px] sm:!w-[90px] md:!w-[102px]">
              <Link to={item.link} className="group block w-full select-none [-webkit-tap-highlight-color:transparent]">
                <div className="aspect-square w-full overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                  <img src={item.image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.025]" />
                </div>

                <div className="mt-1.5 text-center">
                  <p className="truncate text-[8px] font-semibold text-foreground md:text-[9px]">{item.title}</p>
                  <p className="mt-0.5 truncate font-serif text-[5px] uppercase tracking-[0.08em] text-muted-foreground md:text-[6px]">{item.subtitle}</p>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

/* =========================================================
   PRODUCT SECTION
========================================================= */

const ProductSection = ({
  eyebrow,
  title,
  products,
  link,
  badge,
}: {
  eyebrow: string;
  title: string;
  products: HomeProduct[];
  link: string;
  badge?: string;
}) => {
  if (products.length === 0) return null;

  return (
    <section className="bg-background py-7 md:py-12">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
        <div className="mb-4 flex items-end justify-between gap-3 md:mb-7">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" />
              <span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">{eyebrow}</span>
            </div>

            <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">{title}</h2>
          </div>

          <Link to={link} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">
            عرض الكل
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} badge={badge} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   EDITORIAL
========================================================= */

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

/* =========================================================
   HOME PAGE
========================================================= */

const HomePage = () => {
  const { data: customerExperience } = useCustomerExperience();

  const showHomeSection = (section: string) => customerExperience?.homeSections[section] !== false;

  /* =========================================================
     CATEGORIES
  ========================================================= */

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return data || [];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => {
    if (categoriesLoading) {
      return fallbackFeaturedCategories;
    }

    const parentCategories = categories.filter((category) => !category.parent_id);

    if (parentCategories.length === 0) {
      return fallbackFeaturedCategories;
    }

    return parentCategories.map((category) => ({
      title: category.name_ar || category.name || category.slug,
      subtitle: category.name || category.name_ar || category.slug,
      image: category.image_url || fallbackCategoryImages[category.slug] || fallbackFeaturedCategories[0].image,
      link: `/categories?parent=${category.slug}`,
    }));
  }, [categories, categoriesLoading]);

  /* =========================================================
     VIEWPORTS
  ========================================================= */

  const featuredViewport = useNearViewport<HTMLDivElement>();
  const bestSellersViewport = useNearViewport<HTMLDivElement>();
  const brandsViewport = useNearViewport<HTMLDivElement>();

  /* =========================================================
     FLAMINGO PICKS
  ========================================================= */

  const { data: products = [] } = useQuery({
    queryKey: ["home-products"],
    enabled: showHomeSection("featuredProducts") && featuredViewport.isNearViewport,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("home_collections", ["curated"]).order("sort_order", { ascending: true }).limit(8);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     BEST SELLERS
  ========================================================= */

  const { data: bestSellers = [] } = useQuery({
    queryKey: ["home-best-sellers"],
    enabled: showHomeSection("bestSellers") && bestSellersViewport.isNearViewport,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("home_collections", ["best_sellers"]).order("sort_order", { ascending: true }).limit(8);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="relative min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="overflow-hidden bg-background">
        {/* =====================================================
            HERO
        ===================================================== */}

        {showHomeSection("hero") && <HeroSlider />}

        {/* =====================================================
            CATEGORIES
        ===================================================== */}

        {showHomeSection("categories") && <CategoryCarousel items={featuredCategories} />}

        {/* =====================================================
            BRANDS
        ===================================================== */}

        {showHomeSection("brands") && (
          <div ref={brandsViewport.ref} className="bg-background" style={{ minHeight: 92 }}>
            <BrandsStrip enabled={brandsViewport.isNearViewport} />
          </div>
        )}

        {/* =====================================================
            FLAMINGO PICKS
        ===================================================== */}

        {showHomeSection("featuredProducts") && (
          <div ref={featuredViewport.ref} className="min-h-px bg-background">
            <ProductSection eyebrow="FLAMINGO PICKS" title="مختارات فلامنجو" products={products} link="/curated" />
          </div>
        )}

        {/* =====================================================
            SERVICES
        ===================================================== */}

        {showHomeSection("services") && (
          <div className="bg-background">
            <FlamingoServices />
          </div>
        )}

        {/* =====================================================
            BEST SELLERS
        ===================================================== */}

        {showHomeSection("bestSellers") && (
          <div ref={bestSellersViewport.ref} className="min-h-px bg-background">
            <ProductSection eyebrow="BEST SELLERS" title="الأكثر مبيعاً" products={bestSellers} link="/top-selling" badge="BEST SELLER" />
          </div>
        )}

        {/* =====================================================
            EDITORIAL
        ===================================================== */}

        {showHomeSection("editorial") && <EditorialSection />}
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
