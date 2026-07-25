import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

const BestSellersPage = () => {
  const { data: content } = useSiteContent("best_sellers_");
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["best-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_SELECT)
        .eq("is_active", true)
        .eq("is_best_seller", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProductCard);
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <section className="container mx-auto px-6 mb-10 text-center">
          <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground mb-3">{getSiteText(content, "best_sellers_eyebrow", "Most Loved")}</p>
          <h1 className="font-heading text-4xl md:text-6xl">{getSiteText(content, "best_sellers_title", "الأكثر مبيعاً")}</h1>
        </section>
        <section className="container mx-auto px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">{getSiteText(content, "best_sellers_empty", "لا توجد منتجات حالياً")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
              {products.map((p) => <ProductCard key={p.id} product={p} badge="BEST SELLER" />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BestSellersPage;