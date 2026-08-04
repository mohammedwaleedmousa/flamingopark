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

const CampaignPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaign, isLoading } = useQuery({
    queryKey: ["campaign-page", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("campaign_pages").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      return data as { title: string; title_ar: string; description_ar: string | null; image_url: string | null; product_ids: string[]; page_type: string } | null;
    },
  });
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["campaign-products", slug, campaign?.product_ids],
    enabled: !!campaign,
    queryFn: async () => {
      if (!campaign!.product_ids?.length) return [];
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", campaign!.product_ids).eq("is_active", true);
      if (error) throw error;
      const byId = new Map((data || []).map((product) => [product.id, mapProductCard(product)]));
      return campaign!.product_ids.map((id) => byId.get(id)).filter(Boolean);
    },
  });

  if (!slug) return <Navigate to="/home" replace />;
  if (!isLoading && !campaign) return <Navigate to="/home" replace />;
  return <div className="min-h-screen bg-background" dir="rtl"><Navbar /><CartDrawer /><main className="pb-20 pt-16 md:pt-20">{isLoading ? <div className="min-h-[60vh] animate-pulse bg-muted" /> : <><section className="relative min-h-[48svh] overflow-hidden bg-neutral-900"><img src={campaign.image_url || "/icons/flamingo.jpeg"} alt={campaign.title_ar} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-black/55" /><div className="relative mx-auto flex min-h-[48svh] max-w-6xl flex-col justify-end px-5 py-12 text-white"><Link to="/home" className="mb-auto inline-flex w-fit items-center gap-1 text-sm text-white/80 hover:text-white"><ChevronRight className="h-4 w-4" />الرئيسية</Link><p className="text-xs tracking-[0.2em] text-white/70">{campaign.page_type === "service" ? "خدمات فلامنجو" : "مختارات فلامنجو"}</p><h1 className="mt-3 font-heading text-4xl md:text-6xl">{campaign.title_ar}</h1>{campaign.description_ar && <p className="mt-5 max-w-xl text-sm leading-7 text-white/85 md:text-base">{campaign.description_ar}</p>}</div></section><section className="container mx-auto px-4 py-12 md:px-6"><h2 className="font-heading text-2xl">المنتجات المختارة</h2>{productsLoading ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div> : products.length ? <div className="mt-7 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{products.map((product, index) => <ProductCard key={product.id} product={product as any} index={index} />)}</div> : <p className="py-16 text-center text-muted-foreground">ستُضاف منتجات هذه الصفحة قريبًا.</p>}</section></>}</main><Footer /></div>;
};

export default CampaignPage;