import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useRef, useState, useEffect, useMemo } from "react";
import { ArrowLeft, Truck, ShieldCheck, Sparkles, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import type { Product } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { useNearViewport } from "@/hooks/useNearViewport";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";

import "swiper/css";
import "swiper/css/free-mode";

type FeaturedCategoryItem = {
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

type EditorialItem = {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  image: string;
  reverse: boolean;
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
    link: "/products?category=women",
  },
  {
    title: "رجالي",
    subtitle: "Men",
    image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
    link: "/products?category=men",
  },
  {
    title: "أطفال",
    subtitle: "Kids",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
    link: "/products?category=kids",
  },
  {
    title: "حقائب",
    subtitle: "Bags",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
    link: "/products?category=bags",
  },
  {
    title: "أحذية",
    subtitle: "Shoes",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
    link: "/products?category=shoes",
  },
  {
    title: "تجميل",
    subtitle: "Beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
    link: "/products?category=beauty",
  },
];

// Inline Brands strip with auto-scroll, pause-on-hover and seamless loop
const BrandsStripInline = () => {
  // static placeholder brands as requested
  const brands = [
    "/brands/nike.svg",
    "/brands/adidas.svg",
    "/brands/zara.svg",
    "/brands/gucci.svg",
    "/brands/puma.svg",
    "/brands/lv.svg",
  ];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHover, setIsHover] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || brands.length === 0) return;

    let rafId: number | null = null;
    let last = performance.now();
    const speed = 22; // px/sec, slow premium feel

    // duplicate content by cloning children for seamless scroll
    // we'll rely on doubling the sequence in rendering
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!isHover) {
        el.scrollLeft += speed * dt;
        if (el.scrollLeft >= el.scrollWidth / 2) el.scrollLeft -= el.scrollWidth / 2;
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => { if (rafId) cancelAnimationFrame(rafId); };
  }, [isHover]);

  
};

// Category horizontal scroll carousel (replaces grid)

const CategoryCarousel = ({ items }: { items: FeaturedCategoryItem[] }) => {
  const [active, setActive] = useState(items[0]);

  return (
    <section className="categories-strip" dir="rtl" aria-label="الأقسام">
      <style>{`
        .categories-strip{
          --accent:#E8547C;
          --text:#1F1F1F;
          --muted:#777;
          --border:#ECECEC;
          --cream:#FCFAF8;

          background:#fff;
          padding:14px 0 18px;
        }

        .categories-strip .header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
        }

        .categories-strip .title{
          font-family:"Noto Kufi Arabic",sans-serif;
          font-size:18px;
          font-weight:700;
          color:var(--text);
          margin:0;
        }

        /* نفس تصميم قسم الماركات */

        .categories-strip .view-all{
          display:inline-flex;
          align-items:center;
          gap:6px;
          color:var(--muted);
          text-decoration:none;
          font-size:13px;
          font-weight:600;
          transition:all .25s ease;
        }

        .categories-strip .view-all svg{
          width:14px;
          height:14px;
          transition:transform .25s ease;
        }

        .categories-strip .view-all:hover{
          color:var(--accent);
        }

        .categories-strip .view-all:hover svg{
          transform:translateX(-3px);
        }

        .categories-strip .swiper{
          overflow:hidden;
          padding:6px 0;
          touch-action:pan-y;
        }

        .categories-strip .swiper-slide{
          width:150px;
        }

        .categories-strip .card{
          display:block;
          text-decoration:none;
          border-radius:22px;
          overflow:hidden;
          background:var(--cream);
          border:1px solid var(--border);
          transition:all .28s ease;
        }

        .categories-strip .image{
          aspect-ratio:1/1;
          overflow:hidden;
          background:#fff;
        }

        .categories-strip .image img{
          width:100%;
          height:100%;
          object-fit:cover;
          transition:transform .45s ease;
        }

        .categories-strip .content{
          padding:14px;
          text-align:center;
        }

        .categories-strip .name{
          font-size:14px;
          font-weight:600;
          color:var(--text);
          transition:.25s;
        }

        .categories-strip .card:hover{
          border-color:var(--accent);
        }

        .categories-strip .card:hover img{
          transform:scale(1.06);
        }

        .categories-strip .card:hover .name{
          color:var(--accent);
        }
      `}</style>

      <div className="container mx-auto px-4">

        <div className="header">
          <h2 className="title">الأقسام</h2>

          <Link to="/categories" className="view-all">
            عرض جميع الأقسام
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        </div>

        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={18}
          freeMode={{ enabled: true, momentum: true }}
          grabCursor
        >
          {items.map((item) => (
            <SwiperSlide key={item.title}>
              <Link
                to={item.link}
                className="card"
              >
                <div className="image">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                  />
                </div>

                <div className="content">
                  <div className="name">
                    {item.title}
                  </div>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

      </div>
    </section>
  );
};
const fallbackEditorial: EditorialItem[] = [
  {
    eyebrow: "Featured Collection",
    title: "أناقة تتجاوز الزمن",
    body: "قطع مختارة بعناية تجمع بين الرقي، الحرفية، والتصميم العصري لتمنحك حضوراً استثنائياً.",
    cta: "اكتشف المجموعة",
    href: "/products?filter=featured",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=960&q=70",
    reverse: false,
  },

  {
    eyebrow: "Flamingo Collection",
    title: "لغة خاصة من الأناقة",
    body: "تجربة تسوق فاخرة تقدم لك تصاميم مختارة بعناية لعشاق التفاصيل والجمال.",
    cta: "استكشف المتجر",
    href: "/store-info",
    image:
      "https://images.unsplash.com/photo-1496217590455-aa63a8350eea?w=960&q=70",
    reverse: true,
  },
];

const HomePage = () => {
  const { data: categories = [] } = useQuery({
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
    if (!categories.length) return fallbackFeaturedCategories;
    return categories.filter((category: any) => !category.parent_id).map((c: any) => ({
      title: c.name_ar || c.name || c.slug,
      subtitle: c.name || c.name_ar || c.slug,
      image: c.image_url || fallbackCategoryImages[c.slug] || fallbackFeaturedCategories[0].image,
      link: `/products?category=${c.slug}`,
    }));
  }, [categories]);

  const getHomeContent = (key: string, fallback: string) => homeContent[key] || fallback;

  const editorial = useMemo<EditorialItem[]>(() => {
    return [
      {
        eyebrow: getHomeContent("home_editorial_1_eyebrow", fallbackEditorial[0].eyebrow),
        title: getHomeContent("home_editorial_1_title", fallbackEditorial[0].title),
        body: getHomeContent("home_editorial_1_body", fallbackEditorial[0].body),
        cta: getHomeContent("home_editorial_1_cta", fallbackEditorial[0].cta),
        href: getHomeContent("home_editorial_1_href", fallbackEditorial[0].href),
        image: getHomeContent("home_editorial_1_image", fallbackEditorial[0].image),
        reverse: false,
      },
      {
        eyebrow: getHomeContent("home_editorial_2_eyebrow", fallbackEditorial[1].eyebrow),
        title: getHomeContent("home_editorial_2_title", fallbackEditorial[1].title),
        body: getHomeContent("home_editorial_2_body", fallbackEditorial[1].body),
        cta: getHomeContent("home_editorial_2_cta", fallbackEditorial[1].cta),
        href: getHomeContent("home_editorial_2_href", fallbackEditorial[1].href),
        image: getHomeContent("home_editorial_2_image", fallbackEditorial[1].image),
        reverse: true,
      },
    ];
  }, [homeContent]);

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
        .order("sort_order")
        .limit(20);
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
        .eq("is_best_seller", true)
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
        .eq("is_featured", true)
        .order("sort_order")
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
        {/* Hero — sits behind the navbar */}
        <HeroSlider />

        {/* Brands strip */}
        <div ref={brandsViewport.ref} style={{ minHeight: 96 }}>
          <BrandsStrip enabled={brandsViewport.isNearViewport} />
        </div>

        {/* Categories — replaced with horizontal CategoryCarousel for improved UX */}
        <CategoryCarousel items={featuredCategories} />

        {/* banner */}
        <section className="py-16 md:py-24 bg-background">
  <div className="container mx-auto px-6">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.25 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto text-center"
    >

      <h2 className="text-3xl md:text-6xl font-light leading-[1.25] tracking-tight text-foreground">
        الأناقة ليست ما ترتديه...
        <br />
        بل ما يبقى في الذاكرة بعد رحيلك.
      </h2>

      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: false, amount: 0.25 }}
        transition={{ duration: 0.7 }}
        className="w-20 h-px bg-zinc-300 mx-auto my-10"
      />

      <p className="max-w-xl mx-auto text-pink-500 leading-8 text-sm md:text-base">
        مختارات استثنائية صُممت لمن يقدّر التفاصيل،
        ويبحث عن الجودة قبل كل شيء.
      </p>

    </motion.div>
  </div>
</section>

        {/* Featured products */}
        <div ref={featuredViewport.ref} style={{ minHeight: 640 }}>
        {products.length > 0 && (
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-6">
              {/* Title */}
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="font-heading text-2xl md:text-5xl text-foreground">منتجات مختارة بعناية</h2>
                </div>
                <Link
                  to="/products?filter=featured"
                  className="text-[11px] tracking-[0.02em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
                >
                  عرض الكل <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>

              {/* Products */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                {products.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {/* CTA */}
              <div className="text-center mt-12">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.35em] uppercase border-b border-pink-500 pb-1 hover:opacity-60 transition text-pink-500"
                >
                  عرض جميع المنتجات <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>

            </div>
          </section>
        )}
        </div>

        {/* Editorial split — image left, text right (alternating) */}
        {editorial.map((e, i) => (
          <section
            key={e.title}
            className="
              bg-background
              py-1 md:py-28
              opacity-0
              translate-y-6
              animate-[fadeUp_0.8s_ease_forwards]
            "
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          >
            <div className="grid md:grid-cols-2 items-center">
              {/* IMAGE */}
              <div
                className={`relative aspect-[4/5] md:h-[680px] overflow-hidden ${
                  e.reverse ? "md:order-2" : ""
                }`}
              >
                <img
                  src={e.image}
                  alt={e.title}
                  loading="lazy"
                  decoding="async"
                  className="
                    w-full h-full object-cover
                    scale-105 hover:scale-110
                    transition duration-700
                  "
                />
                <div className="
                  absolute inset-0
                  bg-gradient-to-t from-black/40 via-transparent to-pink-500/5
                " />
              </div>
              {/* CONTENT */}
              <div className={`
                flex items-center justify-center px-8 md:px-24 py-12 md:py-0
                ${e.reverse ? "md:order-1" : ""}
              `}>
                <div className="max-w-md text-center md:text-right space-y-6">
                  <p className="
                    text-[10px]
                    tracking-[0.6em]
                    uppercase
                    text-pink-400
                  ">
                    {e.eyebrow}
                  </p>
                  <h3 className="text-3xl md:text-5xl font-medium leading-tight">
                    {e.title}
                  </h3>
                  <p className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
                    {e.body}
                  </p>
                  <Link
                    to={e.href}
                    className="
                      inline-flex items-center gap-3
                      text-[11px]
                      tracking-[0.08em]
                      uppercase
                      text-pink-500
                      border-b border-pink-300/40
                      pb-2
                      hover:opacity-60
                      transition
                    "
                  >
                    {e.cta}
                    <ArrowLeft className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* New Arrivals */}
        <div ref={newArrivalsViewport.ref} style={{ minHeight: 640 }}>
        {newArrivals.length > 0 && (
          <section className="py-10 md:py-28">
            <div className="container mx-auto px-6">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[10px] tracking-[0.02em] uppercase text-muted-foreground mb-3">وصل حديثاً</p>
                  <h2 className="font-heading text-3xl md:text-5xl text-foreground">جديد الموسم</h2>
                </div>
                <Link
                  to="/products?filter=featured"
                  className="text-[11px] tracking-[0.02em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
                >
                  عرض الكل <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                {newArrivals.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} badge="NEW IN" />
                ))}
              </div>
            </div>
          </section>
        )}
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
