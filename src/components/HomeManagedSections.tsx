import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type ManagedSection = { id: string; title: string; title_ar: string; filter_type: string | null; max_products: number | null; show_view_all: boolean | null; view_all_link: string | null; sort_order: number | null };
type ProductRow = Record<string, any> & { section_ids?: string[] | null; created_at?: string | null; sort_order?: number | null };
type BestSellerStat = { product_id: string; sold_quantity: number; order_count: number };
type HomeManagedSectionsProps = { betweenSections?: ReactNode; afterSections?: ReactNode };

const INITIAL_VISIBLE = 8;
const LOAD_MORE_STEP = 8;
const BEST_SELLER_LIMIT = 40;

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
    queryKey: ["home-managed-section-products", sectionIds.join(","), "dynamic-best-sellers-v1"],
    enabled: sectionIds.length > 0,
    queryFn: async () => {
      const [explicitResult, flaggedResult] = await Promise.all([
        (supabase as any).from("products").select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`).eq("is_active", true).eq("in_stock", true).overlaps("section_ids", sectionIds),
        (supabase as any).from("products").select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`).eq("is_active", true).eq("in_stock", true).or("is_featured.eq.true,is_best_seller.eq.true"),
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

  const { data: bestSellerStats = [] } = useQuery({
    queryKey: ["home-best-seller-stats", "confirmed-sales-v1"],
    enabled: sections.some((section) => section.filter_type === "best_seller"),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_best_seller_products", { p_limit: BEST_SELLER_LIMIT });
      if (error) throw error;
      return (data || []) as BestSellerStat[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const soldIds = useMemo(() => bestSellerStats.map((stat) => stat.product_id), [bestSellerStats]);

  const { data: soldRows = [] } = useQuery({
    queryKey: ["home-best-seller-products", soldIds.join(",")],
    enabled: soldIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`).eq("is_active", true).eq("in_stock", true).in("id", soldIds);
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const rendered = useMemo(() => sections.map((section) => {
    if (section.filter_type === "best_seller") {
      const soldById = new Map(soldRows.map((row) => [String(row.id), row]));
      const rankedSales = bestSellerStats.map((stat) => soldById.get(String(stat.product_id))).filter(Boolean) as ProductRow[];
      const fallback = rows.filter((row) => {
        const explicitlyIncluded = Array.isArray(row.section_ids) && row.section_ids.includes(section.id);
        return explicitlyIncluded || Boolean(row.is_best_seller);
      }).filter((row) => !soldById.has(String(row.id))).sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
      const source = [...rankedSales, ...fallback].slice(0, BEST_SELLER_LIMIT);
      return { section, products: source.map((row) => mapProductCard(row as any)) };
    }

    const source = rows.filter((row) => {
      const explicitlyIncluded = Array.isArray(row.section_ids) && row.section_ids.includes(section.id);
      return explicitlyIncluded || Boolean(row.is_featured);
    });
    const sorted = [...source].sort((a, b) => {
      const aOrder = Number(a.sort_order || 0);
      const bOrder = Number(b.sort_order || 0);
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(b.price || 0) - Number(a.price || 0);
    });
    return { section, products: sorted.map((row) => mapProductCard(row as any)) };
  }).filter(({ products }) => products.length > 0), [rows, sections, bestSellerStats, soldRows]);

  const loadMore = (sectionId: string, total: number) => setVisibleCounts((current) => ({ ...current, [sectionId]: Math.min((current[sectionId] || INITIAL_VISIBLE) + LOAD_MORE_STEP, total) }));

  const collapse = (sectionId: string, visibleCount: number) => {
    const nextCount = Math.max(INITIAL_VISIBLE, visibleCount - LOAD_MORE_STEP);
    setVisibleCounts((current) => ({ ...current, [sectionId]: nextCount }));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById(`home-section-${sectionId}-product-${nextCount - 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" })));
  };

  if (!rendered.length) return null;

  return <>
    {rendered.map(({ section, products }, sectionIndex) => {
      const visibleCount = Math.min(visibleCounts[section.id] || INITIAL_VISIBLE, products.length);
      const visibleProducts = products.slice(0, visibleCount);
      const hasMore = visibleCount < products.length;
      const canCollapse = visibleCount > INITIAL_VISIBLE;
      return <div key={section.id}>
        <section id={`home-section-${section.id}`} className={`scroll-mt-20 py-7 md:py-14 ${sectionIndex % 2 === 0 ? "bg-background" : "bg-[#FFF9F7]"}`}>
          <div className="mx-auto w-full max-w-[1500px] px-3 md:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-4 md:mb-8">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 md:mb-2"><span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D] md:w-6" /><span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[8px]">{section.title || "FLAMINGO EDIT"}</span></div>
                <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[29px]">{section.title_ar}</h2>
                <p className="mt-2 hidden text-[10px] text-[#9A8B86] md:block">مختارات منتقاة بعناية لتسهّل عليك اكتشاف الأفضل.</p>
              </div>
              {section.view_all_link && <a href={section.view_all_link} className="hidden items-center gap-2 border-b border-[#DFC9C4] pb-1 text-[10px] font-medium text-[#A95B61] md:flex">عرض المجموعة كاملة</a>}
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-8 xl:gap-x-6 xl:gap-y-10">
              {visibleProducts.map((product, productIndex) => <div key={product.id} id={`home-section-${section.id}-product-${productIndex}`} className="min-w-0"><ProductCard product={product} index={sectionIndex * INITIAL_VISIBLE + productIndex} /></div>)}
            </div>

            {(hasMore || canCollapse) && section.show_view_all !== false && <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:mt-10">
              {hasMore && <button type="button" onClick={() => loadMore(section.id, products.length)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#D8B5B2] bg-white px-6 text-[8px] font-semibold text-[#A95B61] transition-all hover:-translate-y-0.5 hover:bg-[#FFF7F5] hover:shadow-[0_10px_24px_rgba(83,56,49,0.07)] md:h-11 md:px-8 md:text-[9px]">عرض المزيد<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>}
              {canCollapse && <button type="button" onClick={() => collapse(section.id, visibleCount)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-[#E7DDD9] bg-[#FFFDFC] px-5 text-[8px] font-semibold text-[#786863] transition-colors hover:bg-[#FFF7F5] md:h-11 md:px-7 md:text-[9px]">تقليص<ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} /></button>}
              <span className="w-full text-center text-[7px] text-[#A0938E] md:text-[8px]">يظهر {visibleCount} من {products.length} منتج</span>
            </div>}
          </div>
        </section>
        {sectionIndex === 0 && rendered.length > 1 ? betweenSections : null}
      </div>;
    })}
    {afterSections}
  </>;
};

export default HomeManagedSections;
