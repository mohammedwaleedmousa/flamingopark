import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Calendar, Flame, Gift } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";

type FilterTab = "all" | "seasonal" | "clearance" | "flash";

const SeasonalOffersPage = () => {
  const { data: content } = useSiteContent("seasonal_offers_");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["seasonal-offers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).gt("discount", 0).order("discount", { ascending: false }).limit(50);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const categorized = useMemo(() => {
    return {
      all: offers,
      seasonal: offers.filter((product) => (product.discount || 0) >= 20 && (product.discount || 0) < 40),
      clearance: offers.filter((product) => (product.discount || 0) >= 40),
      flash: offers.filter((product) => (product.discount || 0) >= 50),
    };
  }, [offers]);

  const filtered = categorized[activeTab];

  const averageSavings = useMemo(() => {
    if (!offers.length) return 0;

    const total = offers.reduce((sum, product) => sum + (product.discount || 0), 0);

    return Math.round(total / offers.length);
  }, [offers]);

  const tabs: { id: FilterTab; label: string; icon: typeof Gift; count: number }[] = [
    { id: "all", label: getSiteText(content, "tab_all", "الكل"), icon: Gift, count: offers.length },
    { id: "seasonal", label: getSiteText(content, "tab_seasonal", "موسمي"), icon: Calendar, count: categorized.seasonal.length },
    { id: "clearance", label: getSiteText(content, "tab_clearance", "تصفية"), icon: BarChart3, count: categorized.clearance.length },
    { id: "flash", label: getSiteText(content, "tab_flash", "فلاش"), icon: Flame, count: categorized.flash.length },
  ];

  const activeTabLabel = activeTab === "seasonal" ? "العروض الموسمية" : activeTab === "clearance" ? "عروض التصفية" : activeTab === "flash" ? "عروض فلاش" : "جميع العروض";

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="md:pt-24">
        {/* =========================================================
            LIGHT HERO
        ========================================================= */}
        <section className="border-b border-[#F0E6E2] bg-[#FFF7F5]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-5">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-[2px] w-4 bg-[#D4777D]" />
                  <span className="text-[7px] font-medium tracking-[0.22em] text-[#B56167]">FLAMINGO SALE</span>
                </div>

                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#3E3030] md:text-[36px]">{getSiteText(content, "hero_title", "العروض الموسمية")}</h1>

                <p className="mt-1.5 max-w-[260px] text-[9px] leading-5 text-[#9A8580] md:max-w-md md:text-[11px]">{getSiteText(content, "hero_subtitle", "مختارات فلامنجو بأسعار خاصة لفترة محدودة")}</p>
              </div>

              <div className="shrink-0 text-left">
                <span className="block text-[23px] font-semibold leading-none text-[#C5686F] md:text-[30px]">{averageSavings}%</span>
                <span className="mt-1 block text-[6px] text-[#AB9690] md:text-[7px]">متوسط الخصم</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            SIMPLE TABS
        ========================================================= */}
        <section className="border-b border-[#EEE5E1] bg-[#FFFDFC]">
          <div className="mx-auto w-full max-w-[1500px] px-3 md:px-6">
            <div className="flex items-center gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-9">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;

                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex shrink-0 items-center gap-1.5 py-3.5 text-[9px] font-medium md:text-[10px] ${active ? "text-[#B45F66]" : "text-[#887B76]"}`}>
                    <tab.icon className={`h-3.5 w-3.5 stroke-[1.5] ${active ? "text-[#D4777D]" : "text-[#B5AAA5]"}`} />

                    <span>{tab.label}</span>

                    <span className={`text-[7px] ${active ? "text-[#C5797D]" : "text-[#B1A5A0]"}`}>{tab.count}</span>

                    {active && <span className="absolute bottom-0 right-0 h-[2px] w-full bg-[#D4777D]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================
            HEADER
        ========================================================= */}
        <section className="mx-auto w-full max-w-[1500px] px-3 pb-3 pt-5 md:px-6 md:pb-5 md:pt-7">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[#413432] md:text-[20px]">{activeTabLabel}</h2>
              <p className="mt-1 text-[8px] text-[#A0948F]">اكتشف أفضل التخفيضات المتاحة الآن</p>
            </div>

            <span className="text-[9px] font-medium text-[#B7676D]">{filtered.length} منتج</span>
          </div>
        </section>

        {/* =========================================================
            PRODUCTS
        ========================================================= */}
        <section className="mx-auto w-full max-w-[1500px] px-2.5 md:px-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index}>
                  <div className="aspect-[4/5] animate-pulse rounded-[14px] bg-[#F2ECE9]" />
                  <div className="mt-2.5 h-2.5 w-[70%] animate-pulse rounded-full bg-[#EFE8E5]" />
                  <div className="mt-2 h-2.5 w-[36%] animate-pulse rounded-full bg-[#EFE8E5]" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[42vh] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#F9ECE9]">
                <Gift className="h-5 w-5 stroke-[1.4] text-[#C76D73]" />
              </div>

              <h3 className="mt-4 text-[15px] font-semibold text-[#453837]">{getSiteText(content, "empty_state", "لا توجد عروض في هذه الفئة")}</h3>

              <p className="mt-1.5 text-[8px] text-[#9D8E89]">جرّب مشاهدة بقية عروض فلامنجو.</p>

              <button onClick={() => setActiveTab("all")} className="mt-4 border-b border-[#B86168] pb-1 text-[8px] font-medium text-[#B86168]">عرض جميع العروض</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product) => (
                <div key={product.id} className="min-w-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* =========================================================
            SIMPLE END
        ========================================================= */}
        {!isLoading && offers.length > 0 && (
          <section className="mx-auto w-full max-w-[1500px] px-3 py-8 md:px-6 md:py-12">
            <div className="border-t border-[#E9DDD8] pt-6 text-center">
              <span className="text-[7px] tracking-[0.22em] text-[#C06B71]">FLAMINGO PARK</span>

              <h3 className="mt-2 text-[16px] font-semibold text-[#5B4141] md:text-[20px]">اختيارات مميزة بأسعار أفضل</h3>

              <p className="mx-auto mt-1.5 max-w-[300px] text-[8px] leading-5 text-[#A18C87] md:text-[10px]">العروض متاحة لفترة محدودة وقد تختلف حسب توفر المنتجات.</p>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SeasonalOffersPage;