import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Gift, Megaphone } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type Offer = {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  badge_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  discount_percentage: number;
  apply_to_all: boolean;
  product_ids: string[];
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};

type Campaign = {
  id: string;
  slug: string;
  title_ar: string;
  description_ar: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  badge_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  product_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
};

type OffersSettings = {
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
};

const isLive = (start: string | null, end: string | null) => {
  const now = Date.now();
  if (start && new Date(start).getTime() > now) return false;
  if (end && new Date(end).getTime() < now) return false;
  return true;
};

const SeasonalOffersPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["storefront-managed-offers"],
    queryFn: async () => {
      const [{ data: offerRows, error: offersError }, { data: campaignRows, error: campaignsError }, { data: settingsRow, error: settingsError }] = await Promise.all([
        (supabase as any).from("offers").select("id,title_ar,subtitle_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,discount_percentage,apply_to_all,product_ids,start_date,end_date,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
        (supabase as any).from("campaign_pages").select("id,slug,title_ar,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,product_ids,starts_at,ends_at,sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
        (supabase as any).from("offers_settings").select("page_title,page_subtitle,countdown_end_date,promo_banner_text,show_countdown,show_promo_banner").limit(1).maybeSingle(),
      ]);

      if (offersError) throw offersError;
      if (campaignsError) throw campaignsError;
      if (settingsError) throw settingsError;

      const offers = ((offerRows || []) as Offer[]).filter((offer) => isLive(offer.start_date, offer.end_date));
      const campaigns = ((campaignRows || []) as Campaign[]).filter((campaign) => isLive(campaign.starts_at, campaign.ends_at));
      const applyAll = offers.some((offer) => offer.apply_to_all);
      const productIds = Array.from(new Set([...offers.flatMap((offer) => offer.product_ids || []), ...campaigns.flatMap((campaign) => campaign.product_ids || [])]));

      let productQuery = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).order("sort_order", { ascending: true }).limit(60);
      if (!applyAll && productIds.length > 0) productQuery = productQuery.in("id", productIds);
      if (!applyAll && productIds.length === 0) return { offers, campaigns, settings: settingsRow as OffersSettings | null, products: [] };

      const { data: productRows, error: productsError } = await productQuery;
      if (productsError) throw productsError;

      const discountByProduct = new Map<string, number>();
      for (const offer of offers) {
        const discount = Number(offer.discount_percentage || 0);
        if (offer.apply_to_all) {
          for (const row of productRows || []) discountByProduct.set(row.id, Math.max(discountByProduct.get(row.id) || 0, discount));
        } else {
          for (const id of offer.product_ids || []) discountByProduct.set(id, Math.max(discountByProduct.get(id) || 0, discount));
        }
      }

      const products = (productRows || []).map((row) => ({ product: mapProductCard(row), managedDiscount: discountByProduct.get(row.id) || Number((row as any).discount || 0) }));
      return { offers, campaigns, settings: settingsRow as OffersSettings | null, products };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const offers = data?.offers || [];
  const campaigns = data?.campaigns || [];
  const products = data?.products || [];
  const settings = data?.settings;

  const highestDiscount = useMemo(() => offers.reduce((max, offer) => Math.max(max, Number(offer.discount_percentage || 0)), 0), [offers]);

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="md:pt-24">
        <section className="border-b border-[#F0E6E2] bg-[#FFF7F5]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-5">
              <div><div className="mb-2 flex items-center gap-2"><span className="h-[2px] w-4 bg-[#D4777D]" /><span className="text-[7px] font-medium tracking-[0.22em] text-[#B56167]">FLAMINGO SALE</span></div><h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#3E3030] md:text-[36px]">{settings?.page_title || "العروض الموسمية"}</h1><p className="mt-1.5 max-w-[420px] text-[9px] leading-5 text-[#9A8580] md:text-[11px]">{settings?.page_subtitle || "العروض والحملات التي يديرها فريق فلامنجو متاحة هنا مباشرة."}</p></div>
              {highestDiscount > 0 && <div className="shrink-0 text-left"><span className="block text-[23px] font-semibold leading-none text-[#C5686F] md:text-[30px]">{highestDiscount}%</span><span className="mt-1 block text-[6px] text-[#AB9690] md:text-[7px]">أعلى خصم</span></div>}
            </div>
          </div>
        </section>

        {settings?.show_promo_banner && settings.promo_banner_text && <section className="border-b border-[#EEE5E1] bg-white"><div className="mx-auto max-w-[1500px] px-4 py-3 text-center text-[9px] font-medium text-[#A95B61] md:text-[10px]">{settings.promo_banner_text}</div></section>}

        {offers.length > 0 && <section className="mx-auto w-full max-w-[1500px] px-3 pb-2 pt-5 md:px-6 md:pt-8"><div className="mb-3 flex items-center gap-2"><Gift className="h-4 w-4 text-[#C5686F]" /><h2 className="text-[15px] font-semibold md:text-[19px]">العروض النشطة</h2></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{offers.map((offer) => <article key={offer.id} className="overflow-hidden rounded-[16px] border border-[#EFE3DF] bg-white"><div className="relative aspect-[16/7] bg-[#F6EFEC]">{(offer.mobile_image_url || offer.image_url) && <picture><source media="(max-width: 767px)" srcSet={offer.mobile_image_url || offer.image_url || ""} /><img src={offer.image_url || offer.mobile_image_url || ""} alt={offer.title_ar} className="h-full w-full object-cover" /></picture>}<div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/15 to-transparent" /><div className="absolute inset-0 flex items-center p-4 text-white"><div className="max-w-[75%]">{offer.badge_text && <span className="mb-2 inline-block rounded-full bg-white/15 px-2 py-1 text-[7px] backdrop-blur">{offer.badge_text}</span>}<h3 className="text-[16px] font-semibold md:text-[20px]">{offer.title_ar}</h3>{offer.subtitle_ar && <p className="mt-1 line-clamp-2 text-[8px] text-white/85 md:text-[9px]">{offer.subtitle_ar}</p>}{offer.cta_url && <Link to={offer.cta_url} className="mt-3 inline-flex border-b border-white/70 pb-0.5 text-[8px] font-semibold">{offer.cta_label || "تسوق الآن"}</Link>}</div></div></div></article>)}</div></section>}

        {campaigns.length > 0 && <section className="mx-auto w-full max-w-[1500px] px-3 pb-2 pt-6 md:px-6"><div className="mb-3 flex items-center gap-2"><Megaphone className="h-4 w-4 text-[#8B6AA8]" /><h2 className="text-[15px] font-semibold md:text-[19px]">الحملات الحالية</h2></div><div className="grid grid-cols-1 gap-3 md:grid-cols-2">{campaigns.map((campaign) => <article key={campaign.id} className="flex min-h-[150px] overflow-hidden rounded-[16px] border border-[#E9E2EF] bg-white"><div className="w-[42%] bg-[#F1EDF4]">{(campaign.mobile_image_url || campaign.image_url) && <picture><source media="(max-width: 767px)" srcSet={campaign.mobile_image_url || campaign.image_url || ""} /><img src={campaign.image_url || campaign.mobile_image_url || ""} alt={campaign.title_ar} className="h-full w-full object-cover" /></picture>}</div><div className="flex flex-1 flex-col justify-center p-4">{campaign.badge_text && <span className="mb-2 text-[7px] font-semibold tracking-[0.1em] text-[#8B6AA8]">{campaign.badge_text}</span>}<h3 className="text-[14px] font-semibold md:text-[18px]">{campaign.title_ar}</h3>{campaign.description_ar && <p className="mt-1 line-clamp-2 text-[8px] leading-5 text-[#8D8184] md:text-[9px]">{campaign.description_ar}</p>}{campaign.cta_url && <Link to={campaign.cta_url} className="mt-3 w-fit border-b border-[#8B6AA8] pb-0.5 text-[8px] font-semibold text-[#7C5D98]">{campaign.cta_label || "اكتشف الحملة"}</Link>}</div></article>)}</div></section>}

        <section className="mx-auto w-full max-w-[1500px] px-3 pb-4 pt-7 md:px-6 md:pt-9">
          <div className="mb-4 flex items-end justify-between"><div><div className="mb-1 flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-[#C5686F]" /><span className="text-[7px] font-medium tracking-[0.18em] text-[#B56167]">LIVE SELECTION</span></div><h2 className="text-[16px] font-semibold md:text-[21px]">منتجات العروض والحملات</h2></div><span className="text-[8px] text-[#A0948F]">{products.length} منتج</span></div>
          {isLoading ? <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-[14px] bg-[#F2ECE9]" />)}</div> : products.length === 0 ? <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><Gift className="h-6 w-6 text-[#C76D73]" /><h3 className="mt-3 text-[15px] font-semibold">لا توجد عروض نشطة حالياً</h3><p className="mt-1 text-[8px] text-[#9D8E89]">ستظهر هنا تلقائيًا عند تفعيلها من لوحة الإدارة.</p></div> : <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">{products.map(({ product, managedDiscount }) => <div key={product.id} className="min-w-0"><ProductCard product={product} badge={managedDiscount > 0 ? `-${managedDiscount}%` : undefined} /></div>)}</div>}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SeasonalOffersPage;
