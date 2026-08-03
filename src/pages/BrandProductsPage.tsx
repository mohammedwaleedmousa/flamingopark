import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { ChevronRight } from "lucide-react";

const BrandProductsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey: ["brand-products-page", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name,slug").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; slug: string } | null;
    },
  });
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["brand-products-page-list", brand?.id],
    enabled: !!brand?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("brand_id", brand!.id).eq("is_active", true).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProductCard);
    },
  });

  if (!slug) return <Navigate to="/brands" replace />;
  return <div className="min-h-screen bg-background" dir="rtl"><Navbar /><CartDrawer /><main className="pt-24 pb-20"><section className="container mx-auto px-4 md:px-6"><Link to={`/brands/${slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ChevronRight className="h-4 w-4" /> العودة إلى الماركة</Link><p className="mt-10 text-xs tracking-[0.2em] text-muted-foreground">المجموعة الكاملة</p><h1 className="mt-2 font-heading text-4xl md:text-6xl">{brand?.name || "المنتجات"}</h1><p className="mt-4 text-sm text-muted-foreground">كل منتجات {brand?.name || "هذه الماركة"} المتاحة حاليًا.</p></section><section className="container mx-auto px-4 md:px-6 mt-10">{brandLoading || productsLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div> : products.length === 0 ? <p className="py-20 text-center text-muted-foreground">لا توجد منتجات متاحة لهذه الماركة حاليًا.</p> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">{products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>}</section></main><Footer /></div>;
};

export default BrandProductsPage;