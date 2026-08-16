import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Heart, Plus, ShoppingBag, SlidersHorizontal } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";

import { useFavorites } from "@/hooks/useFavorites";
import { useStore } from "@/store/useStore";
import { useSiteContent, getSiteText, formatSiteText } from "@/hooks/useSiteContent";
import { toast } from "@/hooks/use-toast";

type SortOption = "newest" | "priceLow" | "priceHigh" | "name";

const sortOptions: { value: SortOption; label: string; description: string }[] = [
  { value: "newest", label: "الأحدث", description: "الأحدث إضافة للمفضلة" },
  { value: "priceLow", label: "الأقل سعرًا", description: "من السعر الأقل للأعلى" },
  { value: "priceHigh", label: "الأعلى سعرًا", description: "من السعر الأعلى للأقل" },
  { value: "name", label: "الاسم", description: "ترتيب أبجدي" },
];

const FavoritesPage = () => {
  const { favorites } = useFavorites();
  const { addToCart } = useStore();
  const { data: content } = useSiteContent("favorites_");

  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [sortOpen, setSortOpen] = useState(false);

  const sortRef = useRef<HTMLDivElement | null>(null);

  const heroCountTemplate = getSiteText(content, "favorites_hero_with_count", "لديك {count} منتج في قائمة المفضلة");
  const heroText = favorites.length > 0 ? formatSiteText(heroCountTemplate, { count: favorites.length }) : getSiteText(content, "favorites_hero_empty", "لم تقم بإضافة أي منتجات للمفضلة بعد");

  const sortedFavorites = useMemo(() => {
    const items = [...favorites];

    if (sortBy === "priceLow") return items.sort((a, b) => a.price - b.price);
    if (sortBy === "priceHigh") return items.sort((a, b) => b.price - a.price);
    if (sortBy === "name") return items.sort((a, b) => (a.nameAr || "").localeCompare(b.nameAr || "", "ar"));

    return items;
  }, [favorites, sortBy]);

  const currentSort = useMemo(() => sortOptions.find((option) => option.value === sortBy) || sortOptions[0], [sortBy]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!sortRef.current || sortRef.current.contains(event.target as Node)) return;
      setSortOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleAddAllToCart = () => {
    let added = 0;
    let needsSelection = 0;
    let unavailable = 0;

    favorites.forEach((product) => {
      const colorVariants = Array.isArray(product.color_variants) ? product.color_variants : Array.isArray(product.colorVariants) ? product.colorVariants : [];
      const hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
      const hasVariantSizes = colorVariants.some((variant: any) => Array.isArray(variant?.sizes) && variant.sizes.length > 0);
      const hasColorChoice = colorVariants.length > 1;

      if (!product.inStock || (typeof product.stockQuantity === "number" && product.stockQuantity <= 0)) {
        unavailable += 1;
        return;
      }

      if (hasSizes || hasVariantSizes || hasColorChoice) {
        needsSelection += 1;
        return;
      }

      addToCart(product, 1, undefined, undefined, colorVariants[0]?.id, colorVariants[0]?.colorName || colorVariants[0]?.name);
      added += 1;
    });

    if (added > 0) toast({ title: "تمت الإضافة للسلة", description: `تمت إضافة ${added} منتج بدون خيارات إلزامية.` });
    if (needsSelection > 0) toast({ title: "بعض المنتجات تحتاج اختياراً", description: `${needsSelection} منتج يحتاج اختيار المقاس أو اللون من صفحة المنتج قبل إضافته للسلة.` });
    if (unavailable > 0) toast({ title: "منتجات غير متوفرة", description: `${unavailable} منتج غير متوفر حالياً ولم تتم إضافته.` });
  };

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        <section className="border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto w-full max-w-[1500px] px-4 pb-5 pt-6 md:px-6 md:pb-7 md:pt-8">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[7px] tracking-[0.24em] text-[#B86168]">FLAMINGO WISHLIST</span></div>
                <h1 className="text-[25px] font-semibold leading-tight tracking-[-0.035em] text-[#403131] md:text-[36px]">{getSiteText(content, "favorites_hero_title", "المنتجات المفضلة")}</h1>
                <p className="mt-1.5 max-w-[270px] text-[8px] leading-5 text-[#9B8984] md:max-w-md md:text-[10px]">{heroText}</p>
              </div>

              <div className="flex shrink-0 flex-col items-center">
                <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#FAE9E7] md:h-[48px] md:w-[48px]"><Heart className="h-[18px] w-[18px] fill-[#D4777D] stroke-[#D4777D] md:h-5 md:w-5" /></div>
                {favorites.length > 0 && <span className="mt-1.5 text-[7px] font-semibold text-[#B86168]">{favorites.length} قطعة</span>}
              </div>
            </div>
          </div>
        </section>

        {favorites.length > 0 && (
          <section className="border-b border-[#EFE6E2] bg-white">
            <div className="mx-auto flex h-[54px] w-full max-w-[1500px] items-center justify-between gap-3 px-3 md:h-[60px] md:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Heart className="h-4 w-4 shrink-0 fill-[#F4D5D6] stroke-[#C96F79]" />
                <div className="min-w-0"><span className="block truncate text-[8px] font-semibold leading-none text-[#645451] md:text-[9px]">قائمتك الخاصة</span><span className="mt-1 block text-[6px] leading-none text-[#A99A95]">{favorites.length} منتج محفوظ</span></div>
              </div>

              <button type="button" onClick={handleAddAllToCart} className="flex h-[36px] shrink-0 items-center gap-1.5 rounded-full bg-[#D4777D] px-4 text-[8px] font-semibold text-white active:bg-[#C96A71] md:h-[39px] md:px-5 md:text-[9px]"><Plus className="h-3 w-3 stroke-[1.8]" />إضافة الكل للسلة</button>
            </div>
          </section>
        )}

        <section className="mx-auto w-full max-w-[1500px]">
          {favorites.length > 0 ? (
            <>
              <div className="flex items-end justify-between gap-3 px-3 pb-3 pt-5 md:px-6 md:pb-5 md:pt-7">
                <div>
                  <div className="mb-1 flex items-center gap-2"><span className="h-[2px] w-4 rounded-full bg-[#D4777D]" /><span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">MY FLAMINGO</span></div>
                  <h2 className="text-[16px] font-semibold text-[#413432] md:text-[20px]">اختياراتك</h2>
                  <p className="mt-1 text-[7px] text-[#A29590]">{sortedFavorites.length} منتج</p>
                </div>

                <div ref={sortRef} className="relative shrink-0">
                  <button type="button" onClick={() => setSortOpen((current) => !current)} className={`flex h-[38px] min-w-[122px] items-center justify-between gap-3 rounded-[13px] border bg-white px-3 transition-colors md:h-[41px] md:min-w-[145px] ${sortOpen ? "border-[#DDB8B5]" : "border-[#E8DDD9]"}`}>
                    <div className="flex items-center gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5 stroke-[1.5] text-[#C96F79]" /><div className="text-right"><span className="block text-[6px] leading-none text-[#AA9C96]">ترتيب</span><span className="mt-1 block text-[8px] font-semibold leading-none text-[#655652] md:text-[9px]">{currentSort.label}</span></div></div>
                    <ChevronDown className={`h-3 w-3 shrink-0 stroke-[1.5] text-[#B26C70] transition-transform duration-150 ${sortOpen ? "rotate-180" : ""}`} />
                  </button>

                  {sortOpen && (
                    <div className="absolute left-0 top-[44px] z-50 w-[205px] overflow-hidden rounded-[15px] border border-[#E9DEDA] bg-white shadow-[0_10px_26px_rgba(64,45,40,.10)] md:top-[47px]">
                      <div className="p-1.5">
                        {sortOptions.map((option) => {
                          const active = sortBy === option.value;
                          return <button key={option.value} type="button" onClick={() => { setSortBy(option.value); setSortOpen(false); }} className={`flex min-h-[49px] w-full items-center justify-between rounded-[11px] px-3 text-right ${active ? "bg-[#FFF0EE]" : "bg-white active:bg-[#FAF7F5]"}`}><div><span className={`block text-[9px] font-semibold ${active ? "text-[#AD5C63]" : "text-[#594B47]"}`}>{option.label}</span><span className="mt-1 block text-[6px] text-[#A99B96]">{option.description}</span></div><span className={`flex h-[19px] w-[19px] items-center justify-center rounded-full border ${active ? "border-[#C96F79] bg-[#C96F79]" : "border-[#DDD3CF] bg-white"}`}>{active && <Check className="h-2.5 w-2.5 stroke-[2.2] text-white" />}</span></button>;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 px-2.5 pt-2 sm:gap-x-3 sm:gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 md:px-6 md:pt-4 lg:grid-cols-4 xl:grid-cols-5">
                {sortedFavorites.map((product, index) => <div key={product.id} className="min-w-0"><ProductCard product={product} index={index} /></div>)}
              </div>

              <div className="px-3 py-9 md:px-6 md:py-12">
                <div className="border-t border-[#EADFDA] pt-6 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2"><span className="h-px w-5 bg-[#D9B6B2]" /><span className="font-serif text-[6px] tracking-[0.24em] text-[#B86168]">FLAMINGO FAVORITES</span><span className="h-px w-5 bg-[#D9B6B2]" /></div>
                  <p className="text-[8px] text-[#968783]">احتفظ بالقطع التي تحبها وارجع إليها في أي وقت.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
              <div className="relative flex h-[82px] w-[82px] items-center justify-center"><span className="absolute inset-0 rounded-full border border-[#E8D4CF]" /><span className="absolute inset-[8px] rounded-full bg-[#FAECE9]" /><Heart className="relative h-7 w-7 stroke-[1.25] text-[#C76D73]" /></div>
              <span className="mt-5 font-serif text-[6px] tracking-[0.25em] text-[#B86168]">FLAMINGO PARK</span>
              <h2 className="mt-2 text-[18px] font-semibold text-[#493837]">{getSiteText(content, "favorites_empty_title", "قائمة المفضلة فارغة")}</h2>
              <p className="mt-2 max-w-[275px] text-[9px] leading-5 text-[#9D8E89]">{getSiteText(content, "favorites_empty_desc", "اضغط على أيقونة القلب في أي منتج لحفظه هنا والعودة إليه لاحقًا")}</p>
              <Link to="/products" className="mt-5 flex h-[44px] items-center justify-center gap-2 rounded-full bg-[#D4777D] px-7 text-[10px] font-semibold text-white active:bg-[#C96B72]"><ShoppingBag className="h-3.5 w-3.5 stroke-[1.6]" />{getSiteText(content, "favorites_browse_cta", "تصفح المنتجات")}</Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FavoritesPage;
