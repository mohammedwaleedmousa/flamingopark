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
    <section className="py-10 md:py-14 bg-background">
      <div className="container mx-auto px-6">

        {/* Header */}
        <div className="mb-10 text-center md:text-right">
  
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
            فلامنجو
          </p>

          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            عوالم فلامنجو
          </h2>

          <div className="mt-4 h-[1px] w-16 bg-[#E91E63] mx-auto md:mx-0" />

          <p className="mt-4 text-sm text-muted-foreground max-w-md">
            اكتشف تشكيلات مختارة بعناية تجمع بين الأناقة العصرية والهوية الفاخرة
          </p>

        </div>

        {/* Layout */}
        <div className="grid md:grid-cols-12 gap-8 items-start">

          {/* LEFT: Navigation */}
          <div className="md:col-span-7">

            <div className="flex flex-wrap gap-x-6 gap-y-3 border-b border-gray-200 pb-4">

              {items.map((item) => {
                const isActive = active.title === item.title;

                return (
                  <button
                    key={item.title}
                    onClick={() => setActive(item)}
                    className={`
                      relative text-sm md:text-[15px]
                      transition-colors duration-200
                      ${isActive ? "text-black" : "text-muted-foreground hover:text-black"}
                    `}
                  >
                    {item.title}

                    <span
                      className={`
                        absolute left-0 -bottom-2 h-[2px] bg-black transition-all duration-300
                        ${isActive ? "w-full" : "w-0"}
                      `}
                    />
                  </button>
                );
              })}

            </div>

            {/* description */}
            <div className="mt-6 max-w-md">
              <p className="text-sm text-muted-foreground leading-relaxed">
                اكتشف تشكيلات فلامنجو المختارة بعناية لتجربة تسوق فاخرة تجمع بين الأناقة والبساطة والهوية العصرية.
              </p>
            </div>

          </div>

          {/* RIGHT: Preview */}
          <div className="md:col-span-5">

            <AnimatePresence mode="wait">
              <motion.div
                key={active.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >

                <div className="rounded-2xl overflow-hidden border bg-white shadow-sm">

                  {/* image */}
                  <div className="h-[280px] overflow-hidden">
                    <img
                      src={active.image}
                      className="w-full h-full object-cover hover:scale-105 transition duration-500"
                    />
                  </div>

                  {/* content */}
                  <div className="p-4 text-right">

                    <p className="text-[10px] tracking-[0.35em] uppercase text-[#E91E63]">
                      فلامنجو
                    </p>

                    <h3 className="text-lg font-medium mt-1">
                      {active.title}
                    </h3>

                    <p className="text-sm text-muted-foreground mt-2">
                      {active.subtitle}
                    </p>

                    <Link
                      to={active.link}
                      className="
                        inline-flex mt-4 text-sm
                        text-black border-b border-black pb-1
                        hover:opacity-60 transition
                      "
                    >
                      تسوّق الآن
                    </Link>

                  </div>

                </div>

              </motion.div>
            </AnimatePresence>

          </div>

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
        {products.length > 0 && (
          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-6">

              {/* Title */}
              <div className="text-center mb-12">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
                  مختارات فلامنجو
                </p>

                <h2 className="text-3xl md:text-4xl font-semibold mt-2">
                  قطع مختارة بعناية
                </h2>

                <div className="mt-4 h-[2px] w-16 bg-[#E91E63] mx-auto" />

                <p className="text-sm text-muted-foreground mt-4 max-w-md mx-auto">
                  مجموعة من أفضل القطع المختارة لتجربة تسوق فاخرة
                </p>
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
                  className="inline-flex items-center gap-2 text-[11px] tracking-[0.35em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition"
                >
                  عرض جميع المنتجات <ArrowLeft className="w-3 h-3" />
                </Link>
              </div>

            </div>
          </section>
        )}

        {/* Editorial split — image left, text right (alternating) */}

        {editorial.map((e, i) => (
  <section
    key={e.title}
    className="
      bg-background
      py-16 md:py-28

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
              tracking-[0.2em]
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
        
        <section className="relative h-[75vh] md:h-[85vh] min-h-[520px] overflow-hidden">

          {/* BACKGROUND IMAGE */}
          <motion.img
            src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1800&q=90"
            alt="Flamingo campaign"
            loading="lazy"
            initial={{ scale: 1.15 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="
              absolute inset-0 w-full h-full object-cover
            "
          />

          {/* OVERLAY */}
          <div className="
            absolute inset-0
            bg-gradient-to-t
            from-black/75
            via-black/35
            to-pink-500/5
          " />

          {/* CONTENT */}
          <div className="
            relative h-full flex items-center justify-center
            text-center px-6
          ">

            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-2xl space-y-7"
            >

              {/* EYEBROW */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="
                  text-[10px]
                  tracking-[0.75em]
                  uppercase
                  text-pink-300
                  opacity-90
                "
              >
                Flamingo · Campaign 2026
              </motion.p>

              {/* TITLE */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="
                  text-4xl md:text-6xl lg:text-7xl
                  font-medium
                  leading-tight
                  text-white
                "
              >
                صُممت لتُروى
              </motion.h2>

              {/* SUB TEXT */}
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="
                  text-sm md:text-[15px]
                  text-white/70
                  leading-relaxed
                  max-w-md mx-auto
                "
              >
                تجربة مختارة بعناية تعكس هوية فلامنجو في الأناقة والبساطة والتميّز
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-10 pt-5"
              >

                <Link
                  to="/products"
                  className="
                    px-8 py-3

                    text-[11px]
                    tracking-[0.55em]
                    uppercase

                    bg-white
                    text-black

                    rounded-full
                    hover:bg-pink-500
                    hover:text-white

                    transition
                  "
                >
                  تسوق الآن
                </Link>

                <Link
                  to="/about"
                  className="
                    text-[11px]
                    tracking-[0.55em]
                    uppercase

                    text-white/80
                    hover:text-white

                    border-b border-white/30
                    pb-1

                    transition
                  "
                >
                  قصة فلامنجو
                </Link>

              </motion.div>

            </motion.div>

          </div>

        </section>

      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
