import { useQuery } from "@tanstack/react-query";
import { Heart, Sparkles } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

const BestSellersPage = () => {
  const { data: content } = useSiteContent("best_sellers_");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["best-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).eq("is_best_seller", true).order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        {/* =========================================================
            HEADER
        ========================================================= */}
        <section className="border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[7px] tracking-[0.25em] text-[#B75F66]">{getSiteText(content, "best_sellers_eyebrow", "MOST LOVED")}</span>
                </div>

                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#403131] md:text-[36px]">{getSiteText(content, "best_sellers_title", "الأكثر مبيعاً")}</h1>

                <p className="mt-1.5 max-w-[275px] text-[8px] leading-5 text-[#9B8984] md:max-w-md md:text-[10px]">القطع التي اختارها عملاء فلامنجو أكثر من غيرها.</p>
              </div>

              {!isLoading && products.length > 0 && (
                <div className="shrink-0 text-left">
                  <span className="block text-[18px] font-semibold leading-none text-[#B85F66] md:text-[22px]">{products.length}</span>
                  <span className="mt-1 block text-[6px] text-[#A99A94] md:text-[7px]">قطعة مميزة</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================
            BEST SELLERS BAR
        ========================================================= */}
        <section className="border-b border-[#EFE6E2] bg-white">
          <div className="mx-auto flex h-[42px] w-full max-w-[1500px] items-center justify-between px-3 md:h-[46px] md:px-6">
            <div className="flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 fill-[#F7DCDD] stroke-[1.5] text-[#C96F79]" />
              <span className="text-[8px] font-medium text-[#755F5E] md:text-[9px]">الأكثر طلبًا</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 stroke-[1.4] text-[#C96F79]" />
              <span className="text-[7px] text-[#A89B95] md:text-[8px]">مختارات العملاء</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            PRODUCTS
        ========================================================= */}
        <section className="mx-auto w-full max-w-[1500px] px-2.5 pt-4 md:px-6 md:pt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-[48vh] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-[#FAECE9]">
                <Heart className="h-5 w-5 stroke-[1.4] text-[#C76D73]" />
              </div>

              <span className="mt-4 font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO PARK</span>

              <h2 className="mt-2 text-[15px] font-semibold text-[#493837]">{getSiteText(content, "best_sellers_empty", "لا توجد منتجات حالياً")}</h2>

              <p className="mt-1.5 max-w-[260px] text-[8px] leading-5 text-[#9D8E89]">ستظهر هنا المنتجات الأكثر طلبًا عند توفرها.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <div key={product.id} className="min-w-0">
                  <ProductCard product={product} badge="BEST SELLER" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================================================
            SIMPLE END
        ========================================================= */}
        {!isLoading && products.length > 0 && (
          <section className="mx-auto w-full max-w-[1500px] px-3 py-9 md:px-6 md:py-12">
            <div className="border-t border-[#EADFDA] pt-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2">
                <span className="h-px w-5 bg-[#D9B6B2]" />
                <span className="font-serif text-[6px] tracking-[0.24em] text-[#B86168]">FLAMINGO MOST LOVED</span>
                <span className="h-px w-5 bg-[#D9B6B2]" />
              </div>

              <p className="text-[9px] text-[#968783]">اختيارات أحبها عملاء فلامنجو واستمرت ضمن الأكثر طلبًا.</p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BestSellersPage;