import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type Campaign = { id: string; slug: string; title_ar: string; description_ar: string | null; image_url: string | null; mobile_image_url: string | null; badge_text: string | null; cta_label: string | null; cta_url: string | null; product_ids: string[]; starts_at: string | null; ends_at: string | null };

const CampaignPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: campaign, isLoading } = useQuery({ queryKey: ["campaign", slug], enabled: Boolean(slug), queryFn: async () => { const now = Date.now(); const { data, error } = await (supabase as any).from("campaign_pages").select("id,slug,title_ar,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,product_ids,starts_at,ends_at").eq("slug", slug).eq("is_active", true).maybeSingle(); if (error) throw error; if (!data) return null; if (data.starts_at && new Date(data.starts_at).getTime() > now) return null; if (data.ends_at && new Date(data.ends_at).getTime() < now) return null; return { ...data, product_ids: Array.isArray(data.product_ids) ? data.product_ids : [] } as Campaign; }, staleTime: 60_000 });
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ["campaign-products", campaign?.id], enabled: Boolean(campaign?.id && campaign.product_ids.length), queryFn: async () => { const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).in("id", campaign!.product_ids).eq("is_active", true); if (error) throw error; const map = new Map((data || []).map((row: any) => [row.id, row])); return campaign!.product_ids.map((id) => map.get(id)).filter(Boolean).map((row) => mapProductCard(row as any)); }, staleTime: 60_000 });
  if (!slug) return <Navigate to="/home" replace />;
  if (!isLoading && !campaign) return <Navigate to="/home" replace />;
  return <div className="min-h-screen bg-[#FFFDFC]" dir="rtl"><Navbar /><CartDrawer /><main className="pb-16 md:pt-24">{isLoading || !campaign ? <div className="min-h-[60vh] animate-pulse bg-muted/40" /> : <><section className="relative min-h-[340px] overflow-hidden bg-[#2E2927] md:min-h-[480px]">{campaign.image_url && <picture>{campaign.mobile_image_url && <source media="(max-width: 767px)" srcSet={campaign.mobile_image_url} />}<img src={campaign.image_url} alt={campaign.title_ar} className="absolute inset-0 h-full w-full object-cover" /></picture>}<div className="absolute inset-0 bg-black/45" /><div className="relative mx-auto flex min-h-[340px] max-w-[1400px] flex-col justify-end px-5 py-10 text-white md:min-h-[480px] md:px-8 md:py-14"><Link to="/home" className="mb-auto inline-flex w-fit items-center gap-1 text-[10px] text-white/80"><ArrowRight className="h-4 w-4" />الرئيسية</Link>{campaign.badge_text && <span className="mb-2 text-[8px] tracking-[0.18em] text-white/75">{campaign.badge_text}</span>}<h1 className="max-w-2xl text-[30px] font-semibold md:text-[48px]">{campaign.title_ar}</h1>{campaign.description_ar && <p className="mt-3 max-w-xl text-[11px] leading-7 text-white/85 md:text-[13px]">{campaign.description_ar}</p>}{campaign.cta_url && <Link to={campaign.cta_url} className="mt-5 inline-flex h-10 w-fit items-center bg-white px-5 text-[9px] font-semibold text-[#3B302E]">{campaign.cta_label || "تسوق الآن"}</Link>}</div></section><section className="mx-auto w-full max-w-[1400px] px-3 py-8 md:px-6 md:py-12"><h2 className="mb-5 text-[18px] font-semibold text-[#403633] md:text-[24px]">منتجات الحملة</h2>{productsLoading ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div> : products.length ? <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-4 md:gap-5">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="py-16 text-center text-[10px] text-muted-foreground">لا توجد منتجات مرتبطة بهذه الحملة حالياً.</p>}</section></>}</main><Footer /></div>;
};

export default CampaignPage;
