import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type ManagedSection = { id: string; title: string; title_ar: string; filter_type: string | null; max_products: number | null; show_view_all: boolean | null; view_all_link: string | null; sort_order: number | null };
type ProductRow = Record<string, any> & { section_ids?: string[] | null; created_at?: string | null; sort_order?: number | null };
type HomeManagedSectionsProps = { betweenSections?: ReactNode; afterSections?: ReactNode };

const INITIAL_VISIBLE = 8;
const LOAD_MORE_STEP = 8;

const HomeManagedSections = ({ betweenSections, afterSections }: HomeManagedSectionsProps) => {
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const { data: sections = [] } = useQuery({
    queryKey: ["home-managed-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("homepage_sections").select("id,title,title_ar,filter_type,max_products,show_view_all,view_all_link,sort_order").eq("is_active", true).in("filter_type", ["featured", "best_seller"]).order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ManagedSection[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const { data: rows = [] } = useQuery({
    queryKey: ["home-managed-section-products", sectionIds.join(","), "expandable-v2"],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const [explicitResult, flaggedResult] = await Promise.all([
        (supabase as any)
          .from("products")
          .select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`)
          .eq("is_active", true)
          .eq("in_stock", true)
          .overlaps("section_ids", sectionIds),
        (supabase as any)
          .from("products")
          .select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`)
          .eq("is_active", true)
          .eq("in_stock", true)
          .or("is_featured.eq.true,is_best_seller.eq.true"),
      ]);

      if (explicitResult.error) throw explicitResult.error;
      if (flaggedResult.error) throw flaggedResult.error;

      const merged = new Map<string, ProductRow>();
      [...(explicitResult.data || []), ...(flaggedResult.data || [])].forEach((row: ProductRow) => merged.set(String(row.id), row));
      return Array.from(merged.values());
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const rendered = useMemo(() => sections.map((section) => {
    const source = rows.filter((row) => {
      const explicitlyIncluded = Array.isArray(row.section_ids) && row.section_ids.includes(section.id);
      if (section.filter_type === "featured") return explicitlyIncluded || Boolean(row.is_featured);
      if (section.filter_type === "best_seller") return explicitlyIncluded || Boolean(row.is_best_seller);
      return explicitlyIncluded;
    });

    const sorted = [...source].sort((a, b) => {
      const aOrder = Number(a.sort_order || 0);
      const bOrder = Number(b.sort_order || 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(b.price || 0) - Number(a.price || 0);
    });

    return { section, products: sorted.map((row) => mapProductCard(row as any)) };
  }).filter(({ products }) => products.length > 0), [rows, sections]);

  const loadMore = (sectionId: string, total: number) => {
    setVisibleCounts((current) => ({
      ...current,
      [sectionId]: Math.min((current[sectionId] || INITIAL_VISIBLE) + LOAD_MORE_STEP, total),
    }));
  };

  const collapse = (sectionId: string, visibleCount: number) => {
    const nextCount = Math.max(INITIAL_VISIBLE, visibleCount - LOAD_MORE_STEP);

    setVisibleCounts((current) => ({ ...current, [sectionId]: nextCount }));

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(`home-section-${sectionId}-product-${nextCount - 1}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
    });
  };

  if (!rendered.length) return null;

  return (
    <>
      {rendered.map(({ section, products }, sectionIndex) => {
        const visibleCount = Math.min(visibleCounts[section.id] || INITIAL_VISIBLE, products.length);
        const visibleProducts = products.slice(0, visibleCount);
        const hasMore = visibleCount < products.length;
        const canCollapse = visibleCount > INITIAL_VISIBLE;

        return (
          <div key={section.id}>
            <section id={`home-section-${section.id}`} className="scroll-mt-20 bg-background py-7 md:py-12">
              <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
                <div className="mb-4 md:mb-7">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" />
                      <span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">{section.title || "FLAMINGO EDIT"}</span>
                    </div>
                    <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">{section.title_ar}</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
                  {visibleProducts.map((product, productIndex) => (
                    <div key={product.id} id={`home-section-${section.id}-product-${productIndex}`}>
                      <ProductCard product={product} index={sectionIndex * INITIAL_VISIBLE + productIndex} />
                    </div>
                  ))}
                </div>

                {(hasMore || canCollapse) && section.show_view_all !== false && (
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:mt-9">
                    {hasMore && (
                      <button type="button" onClick={() => loadMore(section.id, products.length)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#D8B5B2] bg-white px-6 text-[8px] font-semibold text-[#A95B61] transition-colors hover:bg-[#FFF7F5] md:h-11 md:px-8 md:text-[9px]">
                        عرض المزيد
                        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}

                    {canCollapse && (
                      <button type="button" onClick={() => collapse(section.id, visibleCount)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7DDD9] bg-[#FFFDFC] px-5 text-[8px] font-semibold text-[#786863] transition-colors hover:bg-[#FFF7F5] md:h-11 md:px-7 md:text-[9px]">
                        تقليص
                        <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    )}

                    <span className="w-full text-center text-[7px] text-[#A0938E] md:text-[8px]">
                      يظهر {visibleCount} من {products.length} منتج
                    </span>
                  </div>
                )}
              </div>
            </section>

            {sectionIndex === 0 && rendered.length > 1 ? betweenSections : null}
          </div>
        );
      })}

      {afterSections}
    </>
  );
};

export default HomeManagedSections;
