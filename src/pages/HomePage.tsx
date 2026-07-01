import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import { ArrowLeft, Truck, ShieldCheck, Sparkles, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/store/useStore";
import { motion, AnimatePresence } from "framer-motion";

interface DbProduct {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount: number | null;
  description: string;
  description_ar: string;
  images: string[];
  category: string;
  brand: string;
  in_stock: boolean;
  countries: string[];
  is_featured: boolean;
  is_best_seller: boolean;
}

const toProduct = (p: DbProduct): Product => ({
  id: p.id,
  name: p.name,
  nameAr: p.name_ar,
  slug: p.slug,
  price: Number(p.price),
  originalPrice: p.original_price ? Number(p.original_price) : undefined,
  discount: p.discount ?? undefined,
  description: p.description,
  descriptionAr: p.description_ar,
  images: Array.isArray(p.images) ? p.images : [],
  category: p.category,
  brand: p.brand,
  inStock: p.in_stock,
  countries: (p.countries || ["YE"]) as Product["countries"],
  isFeatured: p.is_featured,
  isBestSeller: p.is_best_seller,
});

const featuredCategories = [
  {
    title: "نسائي",
    subtitle: "Women",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85",
    link: "/products?category=women",
  },
  {
    title: "رجالي",
    subtitle: "Men",
    image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=85",
    link: "/products?category=men",
  },
  {
    title: "أطفال",
    subtitle: "Kids",
    image: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=900&q=85",
    link: "/products?category=kids",
  },
  {
    title: "حقائب",
    subtitle: "Bags",
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
    link: "/products?category=bags",
  },
  {
    title: "أحذية",
    subtitle: "Shoes",
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85",
    link: "/products?category=shoes",
  },
  {
    title: "تجميل",
    subtitle: "Beauty",
    image: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=900&q=85",
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

const CategoryCarousel = ({ items }: { items: typeof featuredCategories }) => {
  const [active, setActive] = useState(items[0]);

  return (
    <section className="relative py-20 overflow-hidden">

      {/* Dynamic Background (core idea) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active.title}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          <img
            src={active.image}
            className="w-full h-full object-cover blur-[2px] scale-110"
          />
          <div className="absolute inset-0 bg-black/60" />
        </motion.div>
      </AnimatePresence>

      <div className="relative container mx-auto px-6 grid md:grid-cols-12 gap-10 items-center">

        {/* LEFT: Category list */}
        <div className="md:col-span-4 space-y-4 z-10">
          <p className="text-[11px] tracking-[0.4em] uppercase text-white/60">
            Explore Categories
          </p>

          <h2 className="text-white text-3xl md:text-5xl font-semibold font-heading">
            اكتشف العوالم
          </h2>

          <div className="space-y-2 mt-8">
            {items.map((item) => {
              const isActive = active.title === item.title;

              return (
                <button
                  key={item.title}
                  onClick={() => setActive(item)}
                  className={`
                    w-full text-right px-4 py-3 rounded-xl transition
                    border backdrop-blur-md
                    ${
                      isActive
                        ? "bg-white text-black border-white"
                        : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                    }
                  `}
                >
                  <div className="text-sm font-medium">{item.title}</div>
                  <div className="text-[11px] opacity-70">{item.subtitle}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Hero Experience */}
        <div className="md:col-span-8 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="relative h-[500px] md:h-[650px] rounded-3xl overflow-hidden shadow-2xl"
            >

              <img
                src={active.image}
                className="w-full h-full object-cover"
              />

              {/* cinematic layers */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-0 backdrop-blur-[1px]" />

              {/* floating content */}
              <div className="absolute bottom-10 right-10 left-10 text-white">
                <p className="text-[11px] tracking-[0.4em] uppercase text-white/70">
                  {active.subtitle}
                </p>

                <h3 className="text-4xl md:text-6xl font-semibold mt-2">
                  {active.title}
                </h3>

                <p className="text-white/70 mt-4 max-w-md leading-relaxed">
                  اكتشف مجموعة {active.title} بتجربة تسوق فاخرة تجمع بين التصميم الحديث والهوية البصرية القوية.
                </p>

                <Link
                  to={active.link}
                  className="
                    inline-flex mt-6
                    px-10 py-4
                    rounded-full
                    bg-white text-black
                    text-[11px] tracking-[0.35em] uppercase
                    hover:scale-105 transition
                  "
                >
                  استكشف الآن
                </Link>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
};

const editorial = [
  {
    eyebrow: "Featured Collection",
    title: "أناقة تدوم",
    body: "اكتشف مجموعة مختارة بعناية من القطع العصرية المصممة لتمنحك إطلالة متجددة تجمع بين الجودة والتفاصيل الراقية.",
    cta: "اكتشف اختياراتنا المميزة",
    href: "/products?filter=featured",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1400&q=90",
    reverse: false,
  },

  {
    eyebrow: "Flamingo Collection",
    title: "متجر فلامنجو",
    body: "نقدم مجموعة مختارة من الأزياء والإكسسوارات التي تجمع بين الأناقة العصرية والجودة العالية لتمنحك تجربة تسوق مميزة في كل موسم.",
    cta: "استكشف المتجر",
    href: "/about",
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1400&q=90",
    reverse: true,
  }

];

const HomePage = () => {
  const { data: products = [] } = useQuery({
    queryKey: ["home-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .limit(20);
      if (error) throw error;
      return (data || []).map(toProduct);
    },
  });

  const { data: bestSellers = [] } = useQuery({
    queryKey: ["home-best-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_best_seller", true)
        .order("sort_order")
        .limit(8);
      if (error) throw error;
      return (data as DbProduct[]).map(toProduct);
    },
  });

  const { data: newArrivals = [] } = useQuery({
    queryKey: ["home-new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order")
        .limit(8);
      if (error) throw error;
      return (data as DbProduct[]).map(toProduct);
    },
  });
  return (
    <div className="min-h-screen relative bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main>
        {/* Hero — sits behind the navbar */}
        <HeroSlider />

        {/* Brands strip below hero */}
        <BrandsStripInline />

        {/* Categories — replaced with horizontal CategoryCarousel for improved UX */}
        <CategoryCarousel items={featuredCategories} />

        {/* Editorial split — image left, text right (alternating) */}
        {editorial.map((e) => (
          <section key={e.title} className="bg-background">
            <div className={`grid md:grid-cols-2 ${e.reverse ? "" : ""}`}>
              <div
                className={`relative aspect-[4/5] md:aspect-auto md:h-[640px] overflow-hidden ${e.reverse ? "md:order-2" : ""}`}
              >
                <img src={e.image} alt={e.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div
                className={`flex items-center justify-center px-8 md:px-20 py-16 md:py-0 ${e.reverse ? "md:order-1" : ""}`}
              >
                <div className="max-w-md text-center md:text-right">
                  <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-5">{e.eyebrow}</p>
                  <h3 className="font-heading text-3xl md:text-5xl leading-tight text-foreground mb-6">{e.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-10">{e.body}</p>
                  <Link
                    to={e.href}
                    className="inline-flex items-center gap-2 text-[11px] tracking-[0.35em] uppercase border-b border-foreground pb-2 hover:opacity-60 transition-opacity"
                  >
                    {e.cta} <ArrowLeft className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="py-20 md:py-28 bg-muted">
            <div className="container mx-auto px-6">
              <div className="text-center mb-14">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">الأكثر طلباً</p>
                <h2 className="font-heading text-3xl md:text-5xl text-foreground">الأكثر مبيعاً</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                {bestSellers.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} badge="BEST SELLER" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* New Arrivals */}
        {newArrivals.length > 0 && (
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-6">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">وصل حديثاً</p>
                  <h2 className="font-heading text-3xl md:text-5xl text-foreground">جديد الموسم</h2>
                </div>
                <Link
                  to="/products?filter=featured"
                  className="text-[11px] tracking-[0.35em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
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

        {/* Full-width campaign banner */}
        <section className="relative h-[60vh] min-h-[420px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1800&q=90"
            alt="Flamingo campaign"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="relative h-full flex items-center justify-center text-center px-6">
            <div className="text-white max-w-2xl">
              <p className="text-[10px] tracking-[0.4em] uppercase opacity-80 mb-4">حملة 2026</p>
              <h2 className="font-heading text-4xl md:text-6xl leading-tight mb-8">صُممت لتُروى</h2>
              <Link
                to="/products"
                className="btn-luxury text-[11px] tracking-[0.35em] uppercase px-10 py-4"
              >
                تسوق الآن
              </Link>
            </div>
          </div>
        </section>

        {/* All products preview */}
        {products.length > 0 && (
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-6">
              <div className="text-center mb-14">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">المختارات</p>
                <h2 className="font-heading text-3xl md:text-5xl text-foreground">قطع مختارة بعناية</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
                {products.slice(0, 8).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <div className="text-center mt-14">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center border border-foreground text-foreground text-[11px] tracking-[0.35em] uppercase px-10 py-4 hover:bg-foreground hover:text-background transition-colors"
                >
                  عرض جميع المنتجات
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
