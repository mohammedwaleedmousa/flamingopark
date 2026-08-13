import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search, X } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { supabase } from "@/integrations/supabase/client";
import { handleImageError } from "@/lib/imageUrl";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  sort_order: number | null;
}

interface BrandViewModel {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const AllBrandsPage = () => {
  const [term, setTerm] = useState("");

  /* =========================================================
     BRANDS
  ========================================================= */

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["all-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,logo_url,sort_order,slug").eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandRow[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     FILTER
  ========================================================= */

  const list = useMemo<BrandViewModel[]>(() => {
    const query = term.trim().toLowerCase();

    return brands
      .map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug || brand.name.toLowerCase().trim().replace(/\s+/g, "-"),
        logo_url: brand.logo_url,
      }))
      .filter((brand) => {
        if (!query) return true;

        return brand.name.toLowerCase().includes(query);
      });
  }, [brands, term]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-16 pt-5 md:pb-20 md:pt-8">
        <div className="mx-auto w-full max-w-[1200px] px-3 md:px-6">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <header className="mb-5 md:mb-7">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] uppercase tracking-[0.22em] text-[#B86168] md:text-[7px]">BRANDS</span>
            </div>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-foreground md:text-[28px]">جميع الماركات</h1>

                <p className="mt-1 text-[8px] text-muted-foreground md:text-[9px]">اكتشف الماركات واختر علامتك المفضلة.</p>
              </div>

              {!isLoading && brands.length > 0 && <span className="shrink-0 text-[7px] text-muted-foreground">{brands.length} ماركة</span>}
            </div>
          </header>

          {/* =====================================================
              SEARCH
          ===================================================== */}

          <div className="mb-6 md:mb-8">
            <div className="relative w-full">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9E918C]" strokeWidth={1.5} />

              <input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="ابحث عن ماركة..." autoComplete="off" className="h-[50px] w-full rounded-[14px] border border-border bg-white pr-11 pl-11 text-[11px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#D9AEAA] md:h-[52px] md:text-[12px]" />

              {term && (
                <button type="button" onClick={() => setTerm("")} aria-label="مسح البحث" className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground active:bg-muted">
                  <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* =====================================================
              LOADING
          ===================================================== */}

          {isLoading && (
            <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 md:gap-x-4 md:gap-y-9">
              {Array.from({ length: 18 }).map((_, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="aspect-square w-full animate-pulse rounded-[15px] border border-border/50 bg-muted/60 md:rounded-[18px]" />
                  <div className="mt-2.5 h-2.5 w-14 animate-pulse rounded-full bg-muted" />
                  <div className="mt-1.5 h-1.5 w-8 animate-pulse rounded-full bg-muted/80" />
                </div>
              ))}
            </div>
          )}

          {/* =====================================================
              EMPTY
          ===================================================== */}

          {!isLoading && list.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white">
                <Search className="h-4 w-4 text-[#A0938E]" strokeWidth={1.5} />
              </span>

              <h2 className="mt-3 text-[11px] font-semibold text-foreground">لا توجد ماركة مطابقة</h2>

              <p className="mt-1.5 text-[7px] text-muted-foreground">جرّب البحث باسم مختلف.</p>

              {term && (
                <button type="button" onClick={() => setTerm("")} className="mt-4 flex items-center gap-1 border-b border-border pb-1 text-[7px] font-medium text-[#A95B61]">
                  عرض جميع الماركات
                  <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}

          {/* =====================================================
              BRANDS GRID
          ===================================================== */}

          {!isLoading && list.length > 0 && (
            <div className="grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 md:gap-x-4 md:gap-y-9">
              {list.map((brand) => (
                <Link key={brand.id} to={`/brands/${brand.slug}`} aria-label={`عرض منتجات ${brand.name}`} className="group block min-w-0 select-none text-center [-webkit-tap-highlight-color:transparent]">
                  {/* LOGO CARD */}

                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[15px] border border-border/70 bg-white p-5 transition-all duration-200 group-hover:border-[#D7C8C2] group-hover:shadow-[0_8px_24px_rgba(52,40,34,0.045)] md:rounded-[18px] md:p-7">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} loading="lazy" decoding="async" onError={handleImageError} className="block h-full w-full object-contain object-center transition-transform duration-200 group-hover:scale-[1.025]" />
                    ) : (
                      <span className="max-w-full truncate px-1 font-serif text-[11px] font-semibold text-[#403633] md:text-[13px]">{brand.name}</span>
                    )}
                  </div>

                  {/* NAME */}

                  <div className="mt-2.5">
                    <p className="truncate text-[8px] font-semibold text-foreground transition-colors group-hover:text-[#A95B61] md:text-[9px]">{brand.name}</p>

                    <p className="mt-1 font-serif text-[5px] uppercase tracking-[0.1em] text-muted-foreground md:text-[6px]">BRAND</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* =====================================================
              RESULTS
          ===================================================== */}

          {!isLoading && term && list.length > 0 && (
            <div className="mt-9 border-t border-border/60 pt-3 text-center">
              <p className="text-[6px] text-muted-foreground">تم العثور على {list.length} {list.length === 1 ? "ماركة" : "ماركات"}</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllBrandsPage;