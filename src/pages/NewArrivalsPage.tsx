import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

const PAGE_SIZE = 36;

const NewArrivalsPage = () => {
  const { data: content } = useSiteContent("new_arrivals_");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["new-arrivals", visibleCount],
    queryFn: async () => {
      const { data: rows, error, count } = await supabase.from("products").select(PRODUCT_CARD_SELECT, { count: "exact" }).eq("is_active", true).order("created_at", { ascending: false }).limit(visibleCount);
      if (error) throw error;
      return { products: (rows || []).map(mapProductCard), total: count || 0 };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previous) => previous,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const hasMore = products.length < total;

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        <section className="border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[7px] tracking-[0.25em] text-[#B75F66]">{getSiteText(content, "new_arrivals_eyebrow", "NEW IN")}</span></div>
                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#403131] md:text-[36px]">{getSiteText(content, "new_arrivals_title", "وصل حديثاً")}</h1>
                <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9B8984] md:max-w-md md:text-[10px]">أحدث القطع التي وصلت إلى فلامنجو، مختارة لتكوني أول من يكتشفها.</p>
              </div>

              {!isLoading && total > 0 && <div className="shrink-0 text-left"><span className="block text-[18px] font-semibold leading-none text-[#B85F66] md:text-[22px]">{total}</span><span className="mt-1 block text-[6px] text-[#A99A94] md:text-[7px]">قطعة جديدة</span></div>}
            </div>
          </div>
        </section>

        <section className="border-b border-[#EFE6E2] bg-white">
          <div className="mx-auto flex h-[42px] w-full max-w-[1500px] items-center justify-between px-3 md:h-[46px] md:px-6">
            <div className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 stroke-[1.5] text-[#C96F79]" /><span className="text-[8px] font-medium text-[#755F5E] md:text-[9px]">أحدث الإضافات</span></div>
            <span className="text-[7px] text-[#A89B95] md:text-[8px]">مرتبة من الأحدث</span>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1500px] px-2.5 pt-4 md:px-6 md:pt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <ProductCardSkeleton key={index} />)}</div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[48vh] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FAECE9]"><Sparkles className="h-5 w-5 stroke-[1.4] text-[#C76D73]" /></div>
              <span className="mt-4 font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO PARK</span>
              <h2 className="mt-2 text-[15px] font-semibold text-[#493837]">لا توجد إضافات جديدة حالياً</h2>
              <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9D8E89]">ترقب أحدث القطع التي ستصل إلى فلامنجو قريبًا.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">{products.map((product) => <div key={product.id} className="min-w-0"><ProductCard product={product} badge="NEW IN" /></div>)}</div>
              {hasMore && <div className="flex justify-center pt-8"><button type="button" disabled={isFetching} onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-full border border-[#DFC4C0] bg-white px-6 text-[9px] font-semibold text-[#A95B61] disabled:opacity-50">{isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{isFetching ? "جارٍ التحميل" : "عرض المزيد"}</button></div>}
            </>
          )}
        </section>

        {!isLoading && products.length > 0 && <section className="mx-auto w-full max-w-[1500px] px-3 py-9 md:px-6 md:py-12"><div className="border-t border-[#EADFDA] pt-6 text-center"><div className="mb-2 flex items-center justify-center gap-2"><span className="h-px w-5 bg-[#D9B6B2]" /><span className="font-serif text-[6px] tracking-[0.24em] text-[#B86168]">FLAMINGO NEW EDIT</span><span className="h-px w-5 bg-[#D9B6B2]" /></div><p className="text-[9px] text-[#968783]">تتجدد اختياراتنا باستمرار لتكتشف كل جديد.</p></div></section>}
      </main>

      <Footer />
    </div>
  );
};

export default NewArrivalsPage;
