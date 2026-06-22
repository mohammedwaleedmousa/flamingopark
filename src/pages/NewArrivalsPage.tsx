import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/store/useStore";

const NewArrivalsPage = () => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(36);
      if (error) throw error;
      return (data || []).map((p: any): Product => ({
        id: p.id, name: p.name, nameAr: p.name_ar, slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "", descriptionAr: p.description_ar || "",
        images: p.images || [], category: p.category, brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured, isBestSeller: p.is_best_seller,
      }));
    },
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <section className="container mx-auto px-6 mb-10 text-center">
          <p className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground mb-3">Just Arrived</p>
          <h1 className="font-heading text-4xl md:text-6xl">وصل حديثاً</h1>
        </section>
        <section className="container mx-auto px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
              {products.map((p) => <ProductCard key={p.id} product={p} badge="NEW IN" />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NewArrivalsPage;