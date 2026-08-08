import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { RotateCcw, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { FreeMode } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import HeroSlider from "@/components/HeroSlider";
import ProductCard from "@/components/ProductCard";
import BrandsStrip from "@/components/BrandsStrip";
import FlamingoServices from "@/components/FlamingoServices";
import FlamingoCollections from "@/components/FlamingoCollections";
import SmartImage from "@/components/SmartImage";
import StoreSectionHeader from "@/components/StoreSectionHeader";
import { useNearViewport } from "@/hooks/useNearViewport";
import { useCustomerExperience } from "@/hooks/useCustomerExperience";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import type { Product } from "@/store/useStore";
import "swiper/css";
import "swiper/css/free-mode";

type FeaturedCategoryItem = { title: string; subtitle: string; image: string; link: string };

const fallbackCategoryImages: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
};

const fallbackFeaturedCategories: FeaturedCategoryItem[] = [
  { title: "نسائي", subtitle: "إطلالات الموسم", image: fallbackCategoryImages.women, link: "/categories?parent=women" },
  { title: "رجالي", subtitle: "قطع مختارة", image: fallbackCategoryImages.men, link: "/categories?parent=men" },
  { title: "أطفال", subtitle: "أناقة صغيرة", image: fallbackCategoryImages.kids, link: "/categories?parent=kids" },
  { title: "حقائب", subtitle: "تفاصيل تكتمل", image: fallbackCategoryImages.bags, link: "/categories?parent=bags" },
  { title: "أحذية", subtitle: "خطوتك القادمة", image: fallbackCategoryImages.shoes, link: "/categories?parent=shoes" },
  { title: "تجميل", subtitle: "عناية يومية", image: fallbackCategoryImages.beauty, link: "/categories?parent=beauty" },
];

const trustItems = [
  { icon: ShieldCheck, title: "تسوق بثقة", text: "منتجات مختارة بعناية" },
  { icon: Truck, title: "توصيل مرن", text: "نرتّب وصول طلبك بسهولة" },
  { icon: RotateCcw, title: "خدمة بعد الشراء", text: "نساعدك في الاستبدال والإرجاع" },
  { icon: Sparkles, title: "مختارات جديدة", text: "يصل الجديد إلى واجهتك أولاً" },
];

function TrustRail() {
  return <section className="border-b border-border bg-card" aria-label="مزايا التسوق"><div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-x-reverse divide-border px-4 sm:px-6 md:grid-cols-4 lg:px-10">{trustItems.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 px-3 py-4 sm:px-5 md:py-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span><strong className="block text-xs font-semibold text-foreground">{title}</strong><span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">{text}</span></span></div>)}</div></section>;
}

function CategoryCarousel({ items }: { items: FeaturedCategoryItem[] }) {
  return <section className="border-b border-border bg-card py-10 sm:py-14" dir="rtl" aria-label="الأقسام"><div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10"><StoreSectionHeader eyebrow="تسوّق حسب ذوقك" title="ابدأ من القسم المناسب" href="/categories" action="كل الأقسام" /><Swiper modules={[FreeMode]} slidesPerView="auto" spaceBetween={12} freeMode={{ enabled: true, momentum: true }} grabCursor className="!overflow-visible"><>{items.map((item) => <SwiperSlide key={item.title} className="!w-[148px] sm:!w-[176px]"><Link to={item.link} className="group block overflow-hidden rounded-2xl border border-border bg-background"><div className="aspect-[4/5] overflow-hidden bg-muted"><SmartImage src={item.image} alt={item.title} width={480} height={600} quality={78} responsiveWidths={[240, 360, 480]} sizes="(max-width: 640px) 148px, 176px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" /></div><div className="p-3.5"><h3 className="text-sm font-semibold text-foreground">{item.title}</h3><p className="mt-1 text-[11px] text-muted-foreground">{item.subtitle}</p></div></Link></SwiperSlide>)}</></Swiper></div></section>;
}

function ProductSkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card"><div className="aspect-[3/4] animate-pulse bg-muted" /><div className="space-y-2 p-4"><div className="h-3 w-2/5 animate-pulse rounded bg-muted" /><div className="h-3 w-4/5 animate-pulse rounded bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /></div></div>)}</div>;
}

function ProductSection({ eyebrow, title, description, href, action, products, loading, badge }: { eyebrow: string; title: string; description: string; href: string; action: string; products: Product[]; loading: boolean; badge?: string }) {
  if (!loading && products.length === 0) return null;
  return <section className="py-12 sm:py-16 lg:py-20"><div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10"><StoreSectionHeader eyebrow={eyebrow} title={title} description={description} href={href} action={action} />{loading ? <ProductSkeleton /> : <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 lg:gap-7">{products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} badge={badge} />)}</div>}<div className="mt-8 text-center sm:mt-10"><Link to={href} className="inline-flex min-h-11 items-center justify-center rounded-full border border-foreground px-6 text-sm font-medium text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground">{action}</Link></div></div></section>;
}

export default function HomePage() {
  const { data: customerExperience } = useCustomerExperience();
  const showHomeSection = (section: string) => customerExperience?.homeSections[section] !== false;
  const featuredViewport = useNearViewport<HTMLDivElement>();
  const bestSellersViewport = useNearViewport<HTMLDivElement>();
  const newArrivalsViewport = useNearViewport<HTMLDivElement>();
  const brandsViewport = useNearViewport<HTMLDivElement>();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ["categories-all-active"], queryFn: async () => { const { data, error } = await supabase.from("categories").select("id,slug,name,name_ar,parent_id,image_url,sort_order").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; return data || []; } });
  const { data: homeContent = {} } = useQuery({ queryKey: ["home-content"], queryFn: async () => { const { data, error } = await supabase.from("site_content").select("key, content, content_ar").like("key", "home_%"); if (error) throw error; return (data || []).reduce((all, row) => ({ ...all, [row.key]: row.content_ar || row.content || "" }), {} as Record<string, string>); } });
  const featuredCategories = useMemo<FeaturedCategoryItem[]>(() => { if (categoriesLoading) return []; if (!categories.length) return fallbackFeaturedCategories; return categories.filter((category: any) => !category.parent_id).map((category: any) => ({ title: category.name_ar || category.name || category.slug, subtitle: category.name || category.name_ar || "اكتشف المجموعة", image: category.image_url || fallbackCategoryImages[category.slug] || fallbackFeaturedCategories[0].image, link: `/categories?parent=${category.slug}` })); }, [categories, categoriesLoading]);
  const { data: products = [], isLoading: productsLoading } = useQuery({ queryKey: ["home-products"], enabled: featuredViewport.isNearViewport, queryFn: async () => { const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("home_collections", ["curated"] as any).order("sort_order").limit(8); if (error) throw error; return (data || []).map(mapProductCard); } });
  const { data: bestSellers = [], isLoading: bestSellersLoading } = useQuery({ queryKey: ["home-best-sellers"], enabled: bestSellersViewport.isNearViewport, queryFn: async () => { const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("home_collections", ["best_sellers"] as any).order("sort_order").limit(8); if (error) throw error; return (data || []).map(mapProductCard); } });
  const { data: newArrivals = [], isLoading: newArrivalsLoading } = useQuery({ queryKey: ["home-new-arrivals"], enabled: newArrivalsViewport.isNearViewport, queryFn: async () => { const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("home_collections", ["new_season"] as any).order("created_at", { ascending: false }).limit(8); if (error) throw error; return (data || []).map(mapProductCard); } });
  const content = (key: string, fallback: string) => homeContent[key] || fallback;

  return <div className="min-h-screen bg-background" dir="rtl"><Navbar /><CartDrawer /><main className="overflow-hidden">{showHomeSection("hero") && <HeroSlider />}<TrustRail />{showHomeSection("brands") && <div ref={brandsViewport.ref}><BrandsStrip enabled={brandsViewport.isNearViewport} /></div>}{showHomeSection("categories") && <CategoryCarousel items={featuredCategories} />}{showHomeSection("editorial") && <section className="bg-muted/55 py-14 sm:py-20"><div className="mx-auto max-w-[900px] px-6 text-center"><p className="text-[10px] font-semibold tracking-[0.16em] text-primary">فلامنجو بارك</p><h1 className="mt-4 font-heading text-3xl leading-[1.35] text-foreground sm:text-4xl md:text-5xl">{content("home_editorial_title", "تفاصيل هادئة، حضور لا يُنسى.")}</h1><p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">{content("home_editorial_body", "مختارات أصلية لأسلوبك اليومي، تُعرض لك ببساطة وتصل إليك بعناية.")}</p><Link to="/products" className="mt-7 inline-flex min-h-11 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary">اكتشف المجموعة</Link></div></section>}<div ref={featuredViewport.ref}>{showHomeSection("featuredProducts") && <ProductSection eyebrow="اختيار فلامنجو" title="منتجات مختارة بعناية" description="قطع لافتة اخترناها لتبدأ منها." href="/curated" action="كل المختارات" products={products} loading={productsLoading && featuredViewport.isNearViewport} />}</div>{showHomeSection("collections") && <FlamingoCollections />}<div ref={newArrivalsViewport.ref}>{showHomeSection("newArrivals") && <ProductSection eyebrow="وصل حديثًا" title="جديد الموسم" description="إضافات جديدة تصل إلى واجهة المتجر أولاً." href="/new-season" action="كل الجديد" products={newArrivals} loading={newArrivalsLoading && newArrivalsViewport.isNearViewport} badge="NEW IN" />}</div><div ref={bestSellersViewport.ref}>{showHomeSection("bestSellers") && <ProductSection eyebrow="اختيارات العملاء" title="الأكثر مبيعًا" description="القطع التي يعود إليها عملاؤنا باستمرار." href="/top-selling" action="كل الأكثر مبيعًا" products={bestSellers} loading={bestSellersLoading && bestSellersViewport.isNearViewport} badge="BEST SELLER" />}</div>{showHomeSection("services") && <FlamingoServices />}</main><Footer /></div>;
}
