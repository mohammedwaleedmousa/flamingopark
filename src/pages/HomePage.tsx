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
  { title: "Women", subtitle: "نسائي", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85", link: "/products?category=women" },
  { title: "Men", subtitle: "رجالي", image: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=85", link: "/products?category=men" },
  { title: "Bags", subtitle: "حقائب", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85", link: "/products?category=bags" },
  { title: "Shoes", subtitle: "أحذية", image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85", link: "/products?category=shoes" },
  { title: "Beauty", subtitle: "جمال", image: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=900&q=85", link: "/products?category=beauty" },
];

const editorial = [
  {
    eyebrow: "The Autumn Edit",
    title: "حِرفةٌ تتجاوز الموسم",
    body: "قطعٌ صُممت لتُروى، حيث يلتقي القماش الفاخر بخطوط الكوتور الكلاسيكية لتشكّل لغة الأناقة الجديدة.",
    cta: "Discover the Edit",
    href: "/products?filter=featured",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1400&q=90",
    reverse: false,
  },
  {
    eyebrow: "Maison Heritage",
    title: "الميزون فلامنجو",
    body: "منذ التأسيس، تواصل دار فلامنجو رحلتها في صياغة قطعٍ تجمع بين الإرث الكلاسيكي والرؤية المعاصرة.",
    cta: "Explore the House",
    href: "/about",
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1400&q=90",
    reverse: true,
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
    <div className="min-h-screen relative bg-background">
      <Navbar />
      <CartDrawer />

      <main>
        {/* Hero — sits behind the navbar */}
        <HeroSlider />

        {/* Featured Categories — Dior-style large editorial cards */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">Shop by</p>
              <h2 className="font-heading text-3xl md:text-5xl text-foreground">Featured Categories</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-2">
              {featuredCategories.map((c) => (
                <Link key={c.title} to={c.link} className="group relative aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={c.image}
                    alt={c.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center text-white">
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-80">{c.subtitle}</p>
                    <h3 className="font-heading text-xl md:text-2xl mt-1">{c.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Editorial split — image left, text right (alternating) */}
        {editorial.map((e) => (
          <section key={e.title} className="bg-background">
            <div className={`grid md:grid-cols-2 ${e.reverse ? "" : ""}`}>
              <div className={`relative aspect-[4/5] md:aspect-auto md:h-[640px] overflow-hidden ${e.reverse ? "md:order-2" : ""}`}>
                <img src={e.image} alt={e.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className={`flex items-center justify-center px-8 md:px-20 py-16 md:py-0 ${e.reverse ? "md:order-1" : ""}`}>
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
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">Most Loved</p>
                <h2 className="font-heading text-3xl md:text-5xl text-foreground">Best Sellers</h2>
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
                  <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">Just In</p>
                  <h2 className="font-heading text-3xl md:text-5xl text-foreground">New Arrivals</h2>
                </div>
                <Link
                  to="/products?filter=featured"
                  className="text-[11px] tracking-[0.35em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition-opacity flex items-center gap-2"
                >
                  View All <ArrowLeft className="w-3 h-3" />
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
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative h-full flex items-center justify-center text-center px-6">
            <div className="text-white max-w-2xl">
              <p className="text-[10px] tracking-[0.4em] uppercase opacity-80 mb-4">Campaign 2026</p>
              <h2 className="font-heading text-4xl md:text-6xl leading-tight mb-8">
                Crafted to be Remembered
              </h2>
              <Link
                to="/products"
                className="inline-flex items-center justify-center bg-white text-black text-[11px] tracking-[0.35em] uppercase px-10 py-4 hover:bg-white/90 transition-colors"
              >
                Discover Now
              </Link>
            </div>
          </div>
        </section>

        {/* All products preview */}
        {products.length > 0 && (
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-6">
              <div className="text-center mb-14">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-3">The Selection</p>
                <h2 className="font-heading text-3xl md:text-5xl text-foreground">Curated Pieces</h2>
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
                  View All Products
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
