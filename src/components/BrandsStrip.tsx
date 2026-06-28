import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";
import { useRef, useState } from "react";

interface Brand {
  id: string;
  name: string;
}

const BrandsStrip = () => {
  const { country } = useStore();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [moved, setMoved] = useState(0); // لمسافة السحب

  const { data: brands = [] } = useQuery({
    queryKey: ["brands-strip", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .eq("is_active", true)
        .contains("countries", [country])
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Brand[];
    },
    enabled: !!country,
  });

  if (brands.length === 0) return null;

  const handleBrandClick = (brandName: string) => {
    // السماح بالنقر إذا السحب أقل من 5px
    if (moved <= 5) {
      navigate(`/products?brand=${encodeURIComponent(brandName)}`);
    }
    setMoved(0); // إعادة تعيين
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(false);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    setMoved(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || startX === null) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
    if (Math.abs(x - startX) > 5) setIsDragging(true);
    setMoved(Math.abs(x - startX));
  };

  const handleMouseUp = () => {
    setTimeout(() => setIsDragging(false), 10);
    setMoved(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    setIsDragging(false);
    setStartX(e.touches[0].pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    setMoved(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || startX === null) return;
    const x = e.touches[0].pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
    if (Math.abs(x - startX) > 5) setIsDragging(true);
    setMoved(Math.abs(x - startX));
  };

  return (
    <section className="bg-secondary py-4 md:py-5 overflow-hidden border-y border-gold/10">
      <div
        ref={containerRef}
        className="flex items-center overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none scroll-smooth"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollBehavior: "smooth" }}
      >
        {brands.map((brand, index) => (
          <button
            key={brand.id}
            onClick={() => handleBrandClick(brand.name)}
            className="px-6 md:px-10 whitespace-nowrap transition-all duration-300 hover:scale-105 flex-shrink-0"
            style={{
              fontFamily: "'Playfair Display', 'Cormorant Garamond', serif",
              fontStyle: index % 2 === 0 ? "italic" : "normal",
              fontWeight: 500,
              fontSize: "16px",
              color: "#D4AF37",
              letterSpacing: "0.08em",
            }}
          >
            {brand.name}
          </button>
        ))}
      </div>
    </section>
  );
};

export default BrandsStrip;
