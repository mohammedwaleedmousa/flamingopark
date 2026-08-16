import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Crown, Percent, Sparkles, Star } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { useNearViewport } from "@/hooks/useNearViewport";

export interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  filter_type: string;
  max_products: number;
  show_view_all: boolean;
  view_all_link: string | null;
}

interface DynamicSectionProps {
  section: HomepageSection;
  country?: string;
  index: number;
}

const filterIcons: Record<string, typeof Sparkles> = {
  featured: Sparkles,
  best_seller: Crown,
  discounted: Percent,
  new: Star,
  all: Star,
};

const DynamicSection = ({ section, country = "GLOBAL", index }: DynamicSectionProps) => {
  const Icon = filterIcons[section.filter_type] || Sparkles;
  const { ref, isNearViewport } = useNearViewport<HTMLElement>();
  const maxProducts = Math.min(60, Math.max(1, Number(section.max_products || 8)));

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["section-products", section.id, country, maxProducts],
    enabled: isNearViewport,
    queryFn: async () => {
      let query = supabase.from("products").select(PRODUCT_CARD_SELECT).eq("is_active", true).contains("section_ids", [section.id]).order("sort_order", { ascending: true }).limit(maxProducts);
      if (country) query = query.contains("countries", [country]);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapProductCard);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  if (!isLoading && products.length === 0) return <section ref={ref} className="min-h-px" aria-hidden="true" />;

  return (
    <section ref={ref} className={index % 2 === 0 ? "bg-background py-7 md:py-12" : "bg-muted/20 py-7 md:py-12"} dir="rtl">
      <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
        <div className="mb-4 flex items-end justify-between gap-3 md:mb-7">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Icon className="h-3 w-3 shrink-0 text-[#B86168]" strokeWidth={1.6} />
              <span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">{section.title || "FLAMINGO EDIT"}</span>
            </div>
            <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">{section.title_ar}</h2>
          </div>

          {section.show_view_all && (
            <Link to={section.view_all_link || "/products"} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">
              عرض الكل
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
            {Array.from({ length: Math.min(maxProducts, 8) }).map((_, itemIndex) => <div key={itemIndex} className="aspect-[4/5] animate-pulse rounded-[14px] bg-muted" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
            {products.map((product, productIndex) => <ProductCard key={product.id} product={product} index={productIndex} />)}
          </div>
        )}
      </div>
    </section>
  );
};

export default DynamicSection;
