import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Percent } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type Offer = {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  description_ar: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  badge_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  discount_percentage: number | null;
  product_ids: string[] | null;
  apply_to_all: boolean | null;
  offer_type: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number | null;
};

const PAGE_SIZE = 20;

const SeasonalOffersPage = () => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["managed-offers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("offers")
        .select("id,title_ar,subtitle_ar,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,discount_percentage,product_ids,apply_to_all,offer_type,start_date,end_date,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const now = Date.now();
      return (data || []).filter(
        (offer: Offer) =>
          (!offer.start_date || new Date(offer.start_date).getTime() <= now) &&
          (!offer.end_date || new Date(offer.end_date).getTime() >= now),
      ) as Offer[];
    },
    staleTime: 60_000,
  });

  const ids = useMemo(() => Array.from(new Set(offers.flatMap((offer) => offer.product_ids || []))), [offers]);
  const hasAll = offers.some((offer) => offer.apply_to_all);

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["managed-offer-products", ids.join(","), hasAll],
    enabled: offers.length > 0,
    queryFn: async () => {
      let query: any = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true);

      if (!hasAll && ids.length) query = query.in("id", ids);
      else if (!hasAll && !ids.length) return [];

      const { data, error } = await query.limit(120);
      if (error) throw error;

      const productMap = new Map((data || []).map((row: any) => [row.id, row]));
      const ordered = hasAll ? data || [] : ids.map((id) => productMap.get(id)).filter(Boolean);
      return ordered.map((row: any) => mapProductCard(row));
    },
    staleTime: 60_000,
  });

  const loading = isLoading || productsLoading;
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleProducts.length < products.length;

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        <section className="border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[7px] tracking-[0.25em] text-[#B75F66]">OFFERS</span>
                </div>
                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#403131] md:text-[36px]">العروض</h1>
                <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9B8984] md:max-w-md md:text-[10px]">اكتشف أفضل عروض فلامنجو والمنتجات المختارة بأسعار مميزة لفترة محدودة.</p>
              </div>

              {!loading && products.length > 0 && (
                <div className="shrink-0 text-left">
                  <span className="block text-[18px] font-semibold leading-none text-[#B85F66] md:text-[22px]">{products.length}</span>
                  <span className="mt-1 block text-[6px] text-[#A99A94] md:text-[7px]">منتج ضمن العروض</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="border-b border-[#EFE6E2] bg-white">
          <div className="mx-auto flex h-[42px] w-full max-w-[1500px] items-center justify-between px-3 md:h-[46px] md:px-6">
            <div className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 stroke-[1.5] text-[#C96F79]" />
              <span className="text-[8px] font-medium text-[#755F5E] md:text-[9px]">العروض المتاحة</span>
            </div>
            <span className="text-[7px] text-[#A89B95] md:text-[8px]">مختارة لك</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1500px] px-2.5 pt-4 md:px-6 md:pt-6">
          {loading ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : offers.length === 0 || products.length === 0 ? (
            <div className="flex min-h-[48vh] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FAECE9]">
                <Gift className="h-5 w-5 stroke-[1.4] text-[#C76D73]" />
              </div>
              <span className="mt-4 font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO PARK</span>
              <h2 className="mt-2 text-[15px] font-semibold text-[#493837]">لا توجد عروض نشطة حالياً</h2>
              <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9D8E89]">ترقب عروض فلامنجو القادمة والخصومات الجديدة قريباً.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
                {visibleProducts.map((product, index) => (
                  <div key={product.id} className="min-w-0">
                    <ProductCard product={product} index={index} badge="OFFER" />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-8">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className="flex h-11 min-w-[150px] items-center justify-center rounded-full border border-[#DFC4C0] bg-white px-6 text-[9px] font-semibold text-[#A95B61]"
                  >
                    عرض المزيد
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {!loading && products.length > 0 && (
          <section className="mx-auto w-full max-w-[1500px] px-3 py-9 md:px-6 md:py-12">
            <div className="border-t border-[#EADFDA] pt-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="h-px w-5 bg-[#D9B6B2]" />
                <span className="font-serif text-[6px] tracking-[0.24em] text-[#B86168]">FLAMINGO OFFERS</span>
                <span className="h-px w-5 bg-[#D9B6B2]" />
              </div>
              <p className="text-[9px] text-[#968783]">عروض متجددة واختيارات مميزة في انتظارك.</p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SeasonalOffersPage;
