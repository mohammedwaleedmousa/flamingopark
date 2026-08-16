import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import ProductListFilters, { type ProductListFilterValues } from "@/components/ProductListFilters";

export type HomeCollectionKey = "curated" | "new_season" | "best_sellers";

interface CollectionPageProps {
  collection: HomeCollectionKey;
  eyebrow: string;
  title: string;
  description?: string;
  badge?: "NEW IN" | "LIMITED" | "BEST SELLER" | "HOT";
}

const CollectionPage = ({ collection, eyebrow, title, description, badge }: CollectionPageProps) => {
  const [filters, setFilters] = useState<ProductListFilterValues>({
    query: "",
    brand: "all",
    sort: "new",
    inStockOnly: false,
    minPrice: "",
    maxPrice: "",
  });
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["home-collection", collection],
    queryFn: async () => {
      const base = () => supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true);

      const { data: assigned, error } = await base()
        .contains("home_collections", [collection])
        .order("sort_order", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (assigned || []).map(mapProductCard);
    },
  });

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand?.trim()).filter(Boolean))) as string[],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    const minPrice = Number(filters.minPrice) || 0;
    const maxPrice = Number(filters.maxPrice) || Number.POSITIVE_INFINITY;
    const list = products.filter((product) => {
      const searchable = `${product.nameAr || ""} ${product.name || ""} ${product.descriptionAr || ""}`.toLowerCase();
      return (!term || searchable.includes(term))
        && (filters.brand === "all" || product.brand?.trim() === filters.brand)
        && (!filters.inStockOnly || product.inStock)
        && product.price >= minPrice
        && product.price <= maxPrice;
    });
    if (filters.sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    if (filters.sort === "name") return [...list].sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name, "ar"));
    return list;
  }, [filters, products]);

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
          {!isLoading && products.length > 0 && (
            <ProductListFilters values={filters} brands={brands} resultCount={visibleProducts.length} onChange={setFilters} />
          )}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : visibleProducts.length === 0 ? (
            <p className="text-center text-muted-foreground py-20">لا توجد منتجات في هذه المجموعة حالياً</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 animate-fade-in">
              {visibleProducts.map((p) => <ProductCard key={p.id} product={p} badge={badge} />)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CollectionPage;
