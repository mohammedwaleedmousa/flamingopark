import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useRef, useState, useEffect, useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { motion } from "framer-motion";
import { useNearViewport } from "@/hooks/useNearViewport";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import FlamingoServices from "@/components/FlamingoServices";
import FlamingoCollections from "@/components/FlamingoCollections";
import { useCustomerExperience } from "@/hooks/useCustomerExperience";

import "swiper/css";
import "swiper/css/free-mode";

type FeaturedCategoryItem = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

const fallbackCategoryImages: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
};

const fallbackFeaturedCategories: FeaturedCategoryItem[] = [
  {
    title: "نسائي",
    subtitle: "Women",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",
    link: "/categories?parent=women",
  },
  {
    title: "رجالي",
    subtitle: "Men",
    image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
    link: "/categories?parent=men",
  },
  {
    title: "أطفال",
    subtitle: "Kids",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
    link: "/categories?parent=kids",
  },
  {
    title: "حقائب",
    subtitle: "Bags",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
    link: "/categories?parent=bags",
  },
  {
    title: "أحذية",
    subtitle: "Shoes",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
    link: "/categories?parent=shoes",
  },
  {
    title: "تجميل",
    subtitle: "Beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
    link: "/categories?parent=beauty",
  },
];

const CategoryCarousel = ({ items }: { items: FeaturedCategoryItem[] }) => {
  return (
    <section className="flamingo-categories" dir="rtl" aria-label="الأقسام">
      <style>{`
        .flamingo-categories{
          --pink:#E8547C;
          --text:#211D1F;
          --muted:#8B8588;
          --soft:#FFF5F6;

          width:100%;
          overflow:hidden;
          background:#fff;
          padding:10px 0 16px;
        }

        .flamingo-categories .category-header{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:12px;
        }

        .flamingo-categories .heading{
          display:flex;
          align-items:center;
          gap:7px;
        }

        .flamingo-categories .heading-mark{
          width:4px;
          height:20px;
          border-radius:999px;
          background:var(--pink);
        }

        .flamingo-categories .title{
          margin:0;
          color:var(--text);
          font-family:"Noto Kufi Arabic",sans-serif;
          font-size:16px;
          font-weight:700;
          line-height:1.2;
        }

        .flamingo-categories .view-all{
          display:inline-flex;
          align-items:center;
          gap:4px;
          color:var(--pink);
          text-decoration:none;
          font-size:11px;
          font-weight:600;
          white-space:nowrap;
        }

        .flamingo-categories .view-all svg{
          width:12px;
          height:12px;
        }

        .flamingo-categories .swiper{
          overflow:visible;
        }

        .flamingo-categories .swiper-slide{
          width:84px;
        }

        .flamingo-categories .category-item{
          display:block;
          width:84px;
          text-decoration:none;
          color:inherit;
          -webkit-tap-highlight-color:transparent;
        }

        .flamingo-categories .category-image{
          position:relative;
          width:84px;
          height:84px;
          overflow:hidden;
          border-radius:17px;
          background:#FFF3F5;
        }

        .flamingo-categories .category-image img{
          display:block;
          width:100%;
          height:100%;
          object-fit:cover;
        }

        .flamingo-categories .category-name{
          display:block;
          width:100%;
          margin-top:7px;
          color:var(--text);
          text-align:center;
          font-size:11px;
          font-weight:600;
          line-height:1.35;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        @media(min-width:641px){
          .flamingo-categories{
            padding:14px 0 20px;
          }

          .flamingo-categories .category-header{
            margin-bottom:14px;
          }

          .flamingo-categories .title{
            font-size:18px;
          }

          .flamingo-categories .heading-mark{
            height:22px;
          }

          .flamingo-categories .view-all{
            font-size:12px;
          }

          .flamingo-categories .swiper-slide{
            width:102px;
          }

          .flamingo-categories .category-item{
            width:102px;
          }

          .flamingo-categories .category-image{
            width:102px;
            height:102px;
            border-radius:19px;
          }

          .flamingo-categories .category-name{
            margin-top:8px;
            font-size:12px;
          }
        }

        @media(max-width:380px){
          .flamingo-categories .swiper-slide{
            width:76px;
          }

          .flamingo-categories .category-item{
            width:76px;
          }

          .flamingo-categories .category-image{
            width:76px;
            height:76px;
            border-radius:15px;
          }

          .flamingo-categories .category-name{
            font-size:10px;
          }
        }
      `}</style>

      <div className="container mx-auto px-4">
        <div className="category-header">
          <div className="heading">
            <span className="heading-mark" />
            <h2 className="title">الأقسام</h2>
          </div>

          <Link to="/categories" className="view-all">
            عرض الكل
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
        </div>

        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={10}
          freeMode={{
            enabled: true,
            momentum: true,
            momentumRatio: 0.65,
          }}
          grabCursor
        >
          {items.map((item) => (
            <SwiperSlide key={item.title}>
              <Link to={item.link} className="category-item">
                <div className="category-image">
                  <img src={item.image} alt={item.title} loading="lazy" decoding="async" />
                </div>

                <span className="category-name">{item.title}</span>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
};

const HomePage = () => {
  const { data: customerExperience } = useCustomerExperience();

  const showHomeSection = (section: string) =>
    customerExperience?.homeSections[section] !== false;

  const {
    data: categories = [],
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories-all-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name,name_ar,parent_id,image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: homeContent = {} } = useQuery({
    queryKey: ["home-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("key, content, content_ar")
        .like("key", "home_%");

      if (error) throw error;

      return (data || []).reduce((acc, row) => {
        acc[row.key] = row.content_ar || row.content || "";
        return acc;
      }, {} as Record<string, string>);
    },
  });

  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => {
    if (categoriesLoading) return [];

    if (!categories.length) return fallbackFeaturedCategories;

    return categories
      .filter((category: any) => !category.parent_id)
      .map((c: any) => ({
        title: c.name_ar || c.name || c.slug,
        subtitle: c.name || c.name_ar || c.slug,
        image:
          c.image_url ||
          fallbackCategoryImages[c.slug] ||
          fallbackFeaturedCategories[0].image,
        link: `/categories?parent=${c.slug}`,
      }));
  }, [categories, categoriesLoading]);

  const featuredViewport = useNearViewport<HTMLDivElement>();
  const bestSellersViewport = useNearViewport<HTMLDivElement>();
  const newArrivalsViewport = useNearViewport<HTMLDivElement>();
  const brandsViewport = useNearViewport<HTMLDivElement>();

  const { data: products = [] } = useQuery({
    queryKey: ["home-products"],
    enabled: featuredViewport.isNearViewport,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("is_active", true)
        .contains("home_collections", ["curated"] as any)
        .order("sort_order")
        .limit(8);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
  });

  const { data: bestSellers = [] } = useQuery({
    queryKey: ["home-best-sellers"],
    enabled: bestSellersViewport.isNearViewport,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("is_active", true)
        .contains("home_collections", ["best_sellers"] as any)
        .order("sort_order")
        .limit(8);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
  });

  const { data: newArrivals = [] } = useQuery({
    queryKey: ["home-new-arrivals"],
    enabled: newArrivalsViewport.isNearViewport,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("is_active", true)
        .contains("home_collections", ["new_season"] as any)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
  });

  return (
    <div className="min-h-screen relative bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main>
        {showHomeSection("hero") && <HeroSlider />}

        {showHomeSection("categories") && (
          <CategoryCarousel items={featuredCategories} />
        )}

        {showHomeSection("brands") && (
          <div ref={brandsViewport.ref} style={{ minHeight: 96 }}>
            <BrandsStrip enabled={brandsViewport.isNearViewport} />
          </div>
        )}

        {showHomeSection("featuredProducts") && (
          <div ref={featuredViewport.ref}>
            {products.length > 0 && (
              <section className="py-12 md:py-20 bg-background">
                <div className="container mx-auto px-4 md:px-6">

                  <div className="flex items-end justify-between gap-6 mb-8 md:mb-12">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-2 md:mb-3">
                        اختيارات فلامنجو
                      </p>

                      <h2 className="font-heading text-2xl md:text-5xl text-foreground">
                        منتجات مختارة بعناية
                      </h2>
                    </div>

                    <Link
                      to="/curated"
                      className="shrink-0 text-[11px] border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
                    >
                      عرض الكل
                      <ArrowLeft className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10">
                    {products.slice(0, 8).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                      />
                    ))}
                  </div>

                </div>
              </section>
            )}
          </div>
        )}

        {showHomeSection("editorial") && (
          <section className="py-16 md:py-28 bg-background overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: 35, filter: "blur(8px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 1.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="container mx-auto px-6"
            >
              <div className="max-w-5xl mx-auto text-center">

                <motion.h2
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="text-3xl md:text-6xl font-light leading-[1.35] tracking-tight text-foreground"
                >
                  الأناقة ليست ما ترتديه...
                  <br />
                  بل ما يبقى في الذاكرة بعد رحيلك.
                </motion.h2>

                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  whileInView={{ width: 80, opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.35,
                    ease: "easeOut",
                  }}
                  className="h-px bg-zinc-300 mx-auto my-8 md:my-10"
                />

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="max-w-xl mx-auto text-pink-500 leading-8 text-sm md:text-base"
                >
                  مختارات استثنائية صُممت لمن يقدّر التفاصيل،
                  ويبحث عن الجودة قبل كل شيء.
                </motion.p>

              </div>
            </motion.div>
          </section>
        )}

        {showHomeSection("bestSellers") && (
          <div
            ref={bestSellersViewport.ref}
            className={bestSellers.length > 0 ? "min-h-0" : "min-h-px"}
          >
            {bestSellers.length > 0 && (
              <section className="py-12 md:py-20 bg-background">
                <div className="container mx-auto px-4 md:px-6">

                  <div className="flex items-end justify-between gap-6 mb-8 md:mb-12">
                    <div>
                      <p className="text-[10px] tracking-[0.02em] uppercase text-muted-foreground mb-2 md:mb-3">
                        Best Sellers
                      </p>

                      <h2 className="font-heading text-2xl md:text-5xl text-foreground">
                        الأكثر مبيعاً
                      </h2>
                    </div>

                    <Link
                      to="/top-selling"
                      className="shrink-0 text-[11px] border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
                    >
                      عرض الكل
                      <ArrowLeft className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-10">
                    {bestSellers.slice(0, 8).map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        badge="BEST SELLER"
                      />
                    ))}
                  </div>

                </div>
              </section>
            )}
          </div>
        )}
        
        {showHomeSection("services") && (
          <FlamingoServices />
        )}

      </main>

      <Footer />
    </div>
  );
};

export default HomePage;