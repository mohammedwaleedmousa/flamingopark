import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/store/useStore";
import { motion } from "framer-motion";
import { useState } from "react";

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

const collections = [
  {
    title: "طريق الحرير",
    subtitle: "انسيابية لا تُقاوم لسهرات الجالا",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=900&q=80",
    link: "/products?category=clothing",
  },
  {
    title: "الإطلالة الحضرية",
    subtitle: "قطع عصرية ليومك المثالي",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
    link: "/products?category=accessories",
  },
  {
    title: "ليلة الجالا",
    subtitle: "إكسسوارات تكمل أناقتك",
    image: "https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=900&q=80",
    link: "/products?category=watches",
  },
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

      console.log("PRODUCTS:", data); // 👈 مهم للتشخيص

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
  const [showAllProducts, setShowAllProducts] = useState(false);
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*");

      if (error) throw error;
      return data || [];
    },
  });
  return (
    <div className="min-h-screen relative">
      <Navbar />
      <HeroSlider />
      <CartDrawer />

      <main className="pt-16 md:pt-20">
        {/* Categories strip */}
        {categories.length > 0 && (
          <section className="py-10 bg-muted/30">
            <div className="container mx-auto px-4">
              {/* 🔥 Hide scrollbar completely */}
              <div className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 hide-scrollbar">
                {categories.map((c) => (
                  <Link key={c.id} to={`/category/${c.slug}`} className="flex-shrink-0 w-40 snap-center group">
                    <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition">
                      <div className="aspect-square overflow-hidden">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.name_ar}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>

                      <div className="p-2 text-center">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary">
                          {c.name_ar}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Collections */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {/* HEADER */}
            <div className="flex items-end justify-between mb-5">
              <div>
                <h2 className="font-heading text-2xl md:text-3xl text-foreground">المجموعات المختارة</h2>
                <p className="font-body text-xs md:text-sm text-muted-foreground mt-1">تصاميم منتقاة بعناية</p>
              </div>

              <Link to="/products" className="text-sm text-primary hover:opacity-70 transition flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            {/* CAROUSEL */}
            <div className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-2">
              {collections.map((c) => (
                <Link
                  key={c.title}
                  to={c.link}
                  className="relative flex-shrink-0 w-[70%] sm:w-[55%] md:w-[38%] lg:w-[28%] aspect-[3/4] rounded-2xl overflow-hidden snap-center group shadow-sm hover:shadow-lg transition"
                >
                  {/* IMAGE */}
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />

                  {/* OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* TEXT */}
                  <div className="absolute bottom-4 right-4 left-4 text-right">
                    <h3 className="font-heading text-lg md:text-xl text-white mb-1">{c.title}</h3>
                    <p className="font-body text-[11px] md:text-xs text-white/80">{c.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Best Sellers */}
        <section className="py-14 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <span className="inline-block bg-primary-container/40 text-primary text-[10px] tracking-[0.25em] font-bold px-3 py-1 rounded-full">
                الأكثر طلباً
              </span>
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mt-3">الأكثر مبيعاً</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {bestSellers.map((p) => (
                <ProductCard key={p.id} product={p} badge="BEST SELLER" />
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-24 overflow-hidden bg-background">
          {/* خلفية فخمة متحركة */}
          <div className="absolute inset-0">
            <div className="absolute w-[600px] h-[600px] bg-pink-500/10 blur-[180px] rounded-full top-[-200px] right-[-200px]" />
            <div className="absolute w-[500px] h-[500px] bg-primary/10 blur-[180px] rounded-full bottom-[-200px] left-[-200px]" />
          </div>

          {/* خطوط موضة خفيفة */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.15)_50%,transparent_100%)] animate-pulse" />
          </div>

          <div className="container mx-auto px-4 relative z-10 text-center">
            {/* عنوان موضوي قوي */}
            <motion.h2
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1 }}
              className="text-3xl md:text-6xl font-heading tracking-wide text-foreground"
            >
              الموضة ليست ما تلبسه…
            </motion.h2>

            <motion.h2
              initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1, delay: 0.2 }}
              className="text-2xl md:text-5xl font-heading mt-3 text-primary"
            >
              بل ما يسبق حضورك بخطوة
            </motion.h2>

            {/* وصف مجلات أزياء */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="max-w-2xl mx-auto mt-8 text-sm md:text-base text-muted-foreground leading-relaxed"
            >
              في فلامنجو لا نعرض منتجات… نحن نصنع لغة بصرية للأناقة، حيث تتحول القطعة إلى بيان، والستايل إلى هوية لا
              تُنسى.
            </motion.p>

            {/* كلمات موضة متحركة */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-14 flex flex-wrap justify-center gap-3"
            >
              {["أناقة", "تألق", "جرأة", "تميز", "فخامة", "إبداع", "رقي", "تفرّد", "سحر", "جاذبية"].map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.1 }}
                  className="px-4 py-2 text-xs tracking-[0.3em] border border-border rounded-full bg-card/40 backdrop-blur-xl text-foreground"
                >
                  {word}
                </motion.span>
              ))}
            </motion.div>

            {/* خط فخم */}
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 160 }}
              transition={{ duration: 1 }}
              className="h-[2px] bg-primary mx-auto mt-14 rounded-full"
            />
          </div>
        </section>

        {/* New Arrivals */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground">وصل حديثاً</h2>
              <Link
                to="/products?filter=featured"
                className="font-body text-sm text-primary hover:underline flex items-center gap-1"
              >
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {newArrivals.map((p) => (
                <ProductCard key={p.id} product={p} badge="NEW IN" />
              ))}
            </div>
          </div>
        </section>

        {/* Quote */}

        <section className="relative py-28 overflow-hidden bg-gradient-to-b from-primary-container/10 via-background to-primary-container/5">
          {/*  moving light aura */}
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              background:
                "radial-gradient(circle at center, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 40%, rgba(255,0,100,0.08) 60%, rgba(0,0,0,0) 80%)",
            }}
          />

          {/* glow blob */}
          <motion.div
            className="absolute top-1/2 left-1/2 w-[650px] h-[650px] -translate-x-1/2 -translate-y-1/2 bg-primary/20 blur-[150px] rounded-full"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 6, repeat: Infinity }}
          />

          <div className="relative container mx-auto px-4 text-center">
            {/* top line reveal */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              whileInView={{ width: 80, opacity: 1 }}
              transition={{ duration: 1 }}
              className="h-[2px] bg-primary mx-auto mb-12 rounded-full"
            />

            {/* MAIN TEXT (type + glow feel) */}
            <motion.p
              initial={{ opacity: 0, letterSpacing: "0.6em", filter: "blur(10px)" }}
              whileInView={{ opacity: 1, letterSpacing: "0.02em", filter: "blur(0px)" }}
              transition={{ duration: 1.2 }}
              className="font-heading text-2xl md:text-5xl text-foreground leading-snug tracking-wide"
            >
              الأناقة ليست ما ترتديه… بل ما يترك أثراً لا يُنسى
            </motion.p>

            {/* underline sweep */}
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: 140 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="h-[2px] bg-primary mx-auto mt-10 rounded-full"
            />

            {/* brand reveal */}
            <motion.div
              initial={{ opacity: 0, y: 20, letterSpacing: "0.5em" }}
              whileInView={{ opacity: 1, y: 0, letterSpacing: "0.3em" }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-10 text-xs uppercase text-muted-foreground tracking-[0.3em]"
            >
              Flamingo Park
            </motion.div>
          </div>
        </section>
        {/* Products Section (Luxury Preview) */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            {/* HEADER */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground">منتجات مختارة</h2>
                <p className="text-sm text-muted-foreground mt-1">تجربة تسوق سريعة لأفضل ما لدينا</p>
              </div>

              <Link to="/products" className="text-sm text-primary hover:opacity-70 transition">
                عرض جميع المنتجات →
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {products?.length > 0 ? (
                products
                  .slice(0, showAllProducts ? products.length : 8)
                  .map((p) => <ProductCard key={p.id} product={p} badge="HOT" />)
              ) : (
                <p className="text-center col-span-full text-gray-500">لا توجد منتجات</p>
              )}
            </div>

            {/* SHOW MORE BUTTON */}
            {products.length > 8 && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setShowAllProducts(!showAllProducts)}
                  className="px-6 py-3 rounded-full bg-primary text-white hover:opacity-90 transition"
                >
                  {showAllProducts ? "إظهار أقل" : "عرض المزيد"}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
