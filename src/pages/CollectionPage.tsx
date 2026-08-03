import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

export type HomeCollectionKey = "curated" | "new_season" | "best_sellers";

interface CollectionPageProps {
  collection: HomeCollectionKey;
  eyebrow: string;
  title: string;
  description?: string;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT";
}

const CollectionPage = ({ collection, eyebrow, title, description, badge }: CollectionPageProps) => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["home-collection", collection],
    queryFn: async () => {
      const base = () => supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true);

      const { data: assigned, error } = await base()
        .contains("home_collections", [collection] as any)
        .order("sort_order", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (assigned || []).map(mapProductCard);
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <section className="container mx-auto px-6 mb-10 text-center">
          <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground mb-3">{eyebrow}</p>
          <h1 className="font-heading text-4xl md:text-6xl">{title}</h1>
          {description && (
            <p className="mt-4 max-w-xl mx-auto text-sm text-muted-foreground leading-7">{description}</p>
          )}
        </section>

        <section className="container mx-auto px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">لا توجد منتجات في هذه المجموعة حالياً</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
              {products.map((p) => <ProductCard key={p.id} product={p} badge={badge} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CollectionPage;
