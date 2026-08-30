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

const BrandsStrip = ({ enabled = true }: { enabled?: boolean }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,logo_url,countries,is_active,sort_order,slug").eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  const renderBrands = useMemo<BrandViewModel[]>(() => {
    return brands.map((brand) => ({
      id: brand.id,
      name: brand.name,
      slug: brand.slug || brand.name.toLowerCase().trim().replace(/\s+/g, "-"),
      logo_url: brand.logo_url,
    }));
  }, [brands]);

  useLayoutEffect(() => {
    if (!enabled || renderBrands.length === 0 || !scrollerRef.current) return;

    try {
      const saved = window.sessionStorage.getItem(BRAND_STRIP_POSITION_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as { scrollLeft?: number };
      if (typeof parsed.scrollLeft === "number" && Number.isFinite(parsed.scrollLeft)) {
        scrollerRef.current.scrollLeft = parsed.scrollLeft;
      }
    } catch {
      // Ignore unavailable or malformed session storage and keep the default position.
    }
  }, [enabled, renderBrands.length]);

  const saveStripPosition = (brandId: string) => {
    if (!scrollerRef.current) return;

    try {
      window.sessionStorage.setItem(
        BRAND_STRIP_POSITION_KEY,
        JSON.stringify({ scrollLeft: scrollerRef.current.scrollLeft, brandId }),
      );
    } catch {
      // Navigation must still work even if session storage is unavailable.
    }
  };

  if (!enabled || renderBrands.length === 0) {
    return null;
  }

  return (
    <section className="w-full overflow-hidden bg-background py-4 md:py-6" dir="rtl" aria-label="الماركات">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">BRANDS</span>
            </div>

            <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-foreground md:text-[20px]">تسوق حسب الماركة</h2>
          </div>

          <Link to="/brands" className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">
            عرض الكل
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
          </Link>
        </div>

        <div ref={scrollerRef} className="-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden md:-mx-6 md:px-6">
          <div className="flex w-max gap-2.5 after:block after:w-3 after:shrink-0 after:content-[''] md:after:w-6">
            {renderBrands.map((brand) => (
              <Link key={brand.id} to={`/brands/${brand.slug}`} onClick={() => saveStripPosition(brand.id)} aria-label={`عرض منتجات ${brand.name}`} className="group block w-[78px] shrink-0 select-none [-webkit-tap-highlight-color:transparent] sm:w-[90px] md:w-[102px]">
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[15px] border border-border/60 bg-white px-2.5 md:rounded-[18px] md:px-3">
                  {brand.logo_url ? (
                    <img src={optimizeImage(brand.logo_url, 180, 72)} alt={brand.name} loading="lazy" decoding="async" width={180} height={180} className="max-h-[45%] max-w-[82%] object-contain object-center" />
                  ) : (
                    <span className="max-w-full truncate text-center font-serif text-[10px] font-semibold text-[#403633] md:text-[12px]">{brand.name}</span>
                  )}
                </div>

                <div className="mt-1.5 text-center">
                  <p className="truncate text-[8px] font-semibold text-foreground md:text-[9px]">{brand.name}</p>
                  <p className="mt-0.5 font-serif text-[5px] uppercase tracking-[0.08em] text-muted-foreground md:text-[6px]">BRAND</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandsStrip;