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
  images: p.images || [],
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
  const { data: categories = [] } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-16 md:pt-20">
        <HeroSlider />

        {/* Categories strip */}
        {categories.length > 0 && (
          <section className="py-10 bg-muted/40">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-4 md:gap-8 overflow-x-auto scrollbar-hide justify-start md:justify-center">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    to={`/products?category=${c.slug}`}
                    className="group flex flex-col items-center gap-2 flex-shrink-0"
                  >
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-border bg-card group-hover:border-primary transition-all">
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.name_ar} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted" />
                      )}
                    </div>
                    <span className="font-heading text-sm text-foreground group-hover:text-primary transition-colors">
                      {c.name_ar}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured Collections */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground leading-tight">
                  المجموعات المختارة
                </h2>
                <p className="font-body text-sm text-muted-foreground mt-1">منتقاة بعناية من فريق التحرير</p>
              </div>
              <Link to="/products" className="font-body text-sm text-primary hover:underline flex items-center gap-1">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x">
              {collections.map((c) => (
                <Link
                  key={c.title}
                  to={c.link}
                  className="relative flex-shrink-0 w-[80%] md:w-[45%] lg:w-[32%] aspect-[4/5] rounded-2xl overflow-hidden snap-start group"
                >
                  <img src={c.image} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-5 right-5 left-5 text-right">
                    <h3 className="font-heading text-2xl text-background mb-1">{c.title}</h3>
                    <p className="font-body text-xs text-background/85">{c.subtitle}</p>
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

        {/* New Arrivals */}
        <section className="py-14">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-heading text-3xl md:text-4xl text-foreground">وافد حديثاً</h2>
              <Link to="/products?filter=featured" className="font-body text-sm text-primary hover:underline flex items-center gap-1">
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
        <section className="py-16 bg-primary-container/20">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <p className="font-heading italic text-2xl md:text-3xl text-foreground leading-relaxed">
              «الأناقة ليست أن تُلاحَظ، بل أن تُتذكَّر.»
            </p>
            <div className="w-12 h-px bg-primary mx-auto my-5" />
            <p className="font-body text-sm text-secondary">Flamingo Maison</p>
          </div>
        </section>

        {/* About */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="logo-flamingo text-4xl text-primary mb-4">Flamingo</h2>
            <p className="font-body text-sm md:text-base text-secondary leading-relaxed">
              نحن نرتقي بأسلوب حياتك من خلال قطع منتقاة بعناية تجمع بين الحرفية والتصميم العصري. تجربة حصرية في كل تفصيلة.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;