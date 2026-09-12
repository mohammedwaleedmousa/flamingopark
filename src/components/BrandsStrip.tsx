import { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { optimizeImage } from "@/lib/imageUrl";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface BrandViewModel {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const BRAND_STRIP_POSITION_KEY = "flamingo-home-brand-strip-position";

const normalizeBrandName = (value: string) => value.trim().toLocaleLowerCase();

const BrandsStrip = ({ enabled = true }: { enabled?: boolean }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,logo_url,countries,is_active,sort_order,slug")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as BrandRow[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const renderBrands = useMemo<BrandViewModel[]>(() => {
    const seen = new Set<string>();

    return brands.reduce<BrandViewModel[]>((result, brand) => {
      const key = normalizeBrandName(brand.name);
      if (!key || seen.has(key)) return result;

      seen.add(key);
      result.push({
        id: brand.id,
        name: brand.name,
        slug: brand.slug || brand.name.toLowerCase().trim().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      });

      return result;
    }, []);
  }, [brands]);

  useLayoutEffect(() => {
    if (!enabled || !renderBrands.length || !scrollerRef.current) return;

    try {
      const saved = sessionStorage.getItem(BRAND_STRIP_POSITION_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (typeof parsed.scrollLeft === "number") {
        scrollerRef.current.scrollLeft = parsed.scrollLeft;
      }
    } catch {
      // Ignore malformed session state.
    }
  }, [enabled, renderBrands.length]);

  const saveStripPosition = (id: string) => {
    if (!scrollerRef.current) return;

    try {
      sessionStorage.setItem(
        BRAND_STRIP_POSITION_KEY,
        JSON.stringify({ scrollLeft: scrollerRef.current.scrollLeft, brandId: id }),
      );
    } catch {
      // Browsers can block session storage; navigation should still work.
    }
  };

  if (!enabled || !renderBrands.length) return null;

  return (
    <section className="w-full overflow-hidden border-y border-[#eee5e1] bg-white py-5 md:py-10" dir="rtl" aria-label="الماركات">
      <div className="mx-auto w-full max-w-[1600px] px-3 md:px-8 lg:px-12">
        <div className="mb-3 flex items-end justify-between md:mb-6">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-[2px] w-4 bg-[#D4777D] md:w-7" />
              <span className="font-serif text-[6px] tracking-[.2em] text-[#B86168] md:text-[9px]">BRANDS</span>
            </div>
            <h2 className="text-[16px] font-semibold md:text-[28px]">أشهر الماركات</h2>
          </div>

          <Link to="/brands" className="flex items-center gap-2 text-[7px] font-medium text-[#A95B61] md:text-[10px]">
            جميع الماركات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div
          ref={scrollerRef}
          className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0"
        >
          <div className="flex w-max gap-2.5 pl-6 md:gap-3 md:pl-8">
            {renderBrands.map((brand) => (
              <Link
                key={brand.id}
                to={`/brands/${brand.slug}`}
                onClick={() => saveStripPosition(brand.id)}
                className="group flex w-[94px] shrink-0 snap-start flex-col items-center md:w-[128px]"
              >
                <div className="flex aspect-square w-full items-center justify-center rounded-[16px] border border-[#eee6e2] bg-white px-3 md:rounded-[18px] md:px-4">
                  {brand.logo_url ? (
                    <img
                      src={optimizeImage(brand.logo_url, 240, 78)}
                      alt={brand.name}
                      loading="lazy"
                      decoding="async"
                      className="max-h-[45%] max-w-[82%] object-contain transition-transform duration-300 group-hover:scale-105 md:max-h-[38px]"
                    />
                  ) : (
                    <span className="text-center font-serif text-[10px] font-semibold md:text-[13px]">{brand.name}</span>
                  )}
                </div>

                <p className="mt-1.5 max-w-full truncate text-[8px] font-semibold text-[#3F3532] md:mt-2 md:text-[9px]">
                  {brand.name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;
