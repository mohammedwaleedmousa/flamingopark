import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";

interface BrandRow {
  id: string;
  name: string;
  logo_url: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface BrandViewModel {
  id: string;
  name: string;
}

const BrandsStrip = () => {
  const { country } = useStore();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startScrollLeft, setStartScrollLeft] = useState(0);

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name,logo_url,countries,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as BrandRow[];
    },
  });

  const visibleBrands = useMemo(() => {
    return brands.filter((b) => {
      if (!b.countries || b.countries.length === 0) return true;
      return b.countries.includes(country);
    });
  }, [brands, country]);

  const fallback: BrandViewModel[] = [
    { id: "fallback-1", name: "Louis Vuitton" },
    { id: "fallback-2", name: "Gucci" },
    { id: "fallback-3", name: "Dior" },
    { id: "fallback-4", name: "Prada" },
    { id: "fallback-5", name: "Chanel" },
    { id: "fallback-6", name: "Hermes" },
    { id: "fallback-7", name: "Burberry" },
    { id: "fallback-8", name: "Versace" },
    { id: "fallback-9", name: "Balenciaga" },
    { id: "fallback-10", name: "Bvlgari" },
  ];

  const dbBrands: BrandViewModel[] = visibleBrands.map((b) => ({
    id: b.id,
    name: b.name,
  }));

  const renderBrands: BrandViewModel[] = (() => {
    if (dbBrands.length === 0) return fallback;
    const existing = new Set(dbBrands.map((b) => b.name.trim().toLowerCase()));
    const missingFamous = fallback.filter((b) => !existing.has(b.name.trim().toLowerCase()));
    return [...dbBrands, ...missingFamous];
  })();

  const handlePointerDown = (clientX: number) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setStartX(clientX);
    setStartScrollLeft(trackRef.current.scrollLeft);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging || !trackRef.current) return;
    const delta = clientX - startX;
    trackRef.current.scrollLeft = startScrollLeft - delta;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <section className="py-6 md:py-8 bg-white overflow-hidden" dir="rtl">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 md:w-16 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 md:w-16 bg-gradient-to-l from-white to-transparent z-10" />

        <div
          ref={trackRef}
          className={`brands-strip-track flex items-center gap-3 md:gap-4 px-4 md:px-8 whitespace-nowrap overflow-x-auto no-scrollbar select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onMouseDown={(e) => handlePointerDown(e.clientX)}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
          onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={handlePointerUp}
        >
          {renderBrands.map((brand) => (
            <Link
              key={brand.id}
              to={`/products?brand=${encodeURIComponent(brand.name)}`}
              className="group inline-flex items-center min-w-fit border border-black/15 rounded-none px-4 md:px-5 py-2 text-black/65 hover:text-black hover:border-black/30 transition-colors duration-300"
              aria-label={`اذهب إلى ماركة ${brand.name}`}
            >
              <span className="font-heading text-sm md:text-base tracking-[0.18em] uppercase">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .brands-strip-track::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
      `}</style>
    </section>
  );
};

export default BrandsStrip;