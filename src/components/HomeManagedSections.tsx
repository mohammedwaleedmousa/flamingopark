import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type ManagedSection = {
  id: string;
  title: string;
  title_ar: string;
  filter_type: string | null;
  max_products: number | null;
  show_view_all: boolean | null;
  view_all_link: string | null;
  sort_order: number | null;
};

type ProductRow = Record<string, any> & {
  section_ids?: string[] | null;
  created_at?: string | null;
  sort_order?: number | null;
};

type BestSellerStat = {
  product_id: string;
  sold_quantity: number;
  order_count: number;
};

type HomeManagedSectionsProps = {
  betweenSections?: ReactNode;
  afterSections?: ReactNode;
};

const INITIAL_VISIBLE = 8;
const LOAD_MORE_STEP = 8;
const BEST_SELLER_LIMIT = 40;
const DEFAULT_SECTION_FETCH_LIMIT = 48;
const MAX_SECTION_FETCH_LIMIT = 64;
const HOME_CACHE_MS = 5 * 60 * 1000;

const getSectionFetchLimit = (section: ManagedSection) => {
  const configured = Number(section.max_products || 0);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SECTION_FETCH_LIMIT;
  return Math.min(Math.max(configured, INITIAL_VISIBLE), MAX_SECTION_FETCH_LIMIT);
};

const HomeManagedSections = ({ betweenSections, afterSections }: HomeManagedSectionsProps) => {
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});

  const { data: sections = [] } = useQuery({
    queryKey: ["home-managed-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("id,title,title_ar,filter_type,max_products,show_view_all,view_all_link,sort_order")
        .eq("is_active", true)
        .in("filter_type", ["featured", "best_seller"])
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return (data || []) as ManagedSection[];
    },
    staleTime: HOME_CACHE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sectionSignature = useMemo(
    () => sections.map((section) => `${section.id}:${getSectionFetchLimit(section)}`).join(","),
    [sections],
  );

  const { data: rows = [] } = useQuery({
    queryKey: ["home-managed-section-products", sectionSignature, "bounded-v2"],
    enabled: sections.length > 0,
    queryFn: async () => {
      const requests = sections.map(async (section) => {
        const limit = getSectionFetchLimit(section);
        let query = (supabase as any)
          .from("products")
          .select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`)
          .eq("is_active", true)
          .eq("in_stock", true);

        if (section.filter_type === "best_seller") {
          query = query.or(`section_ids.cs.{${section.id}},is_best_seller.eq.true`);
        } else {
          query = query.or(`section_ids.cs.{${section.id}},is_featured.eq.true`);
        }

        const { data, error } = await query
          .order("sort_order", { ascending: true, nullsFirst: false })
          .limit(limit);

        if (error) throw error;
        return (data || []) as ProductRow[];
      });

      const results = await Promise.all(requests);
      const merged = new Map<string, ProductRow>();
      results.flat().forEach((row) => merged.set(String(row.id), row));
      return Array.from(merged.values());
    },
    staleTime: HOME_CACHE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: bestSellerStats = [] } = useQuery({
    queryKey: ["home-best-seller-stats", "confirmed-sales-v2"],
    enabled: sections.some((section) => section.filter_type === "best_seller"),
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_best_seller_products", {
        p_limit: BEST_SELLER_LIMIT,
      });
      if (error) throw error;
      return (data || []) as BestSellerStat[];
    },
    staleTime: HOME_CACHE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const soldIds = useMemo(() => bestSellerStats.map((stat) => stat.product_id), [bestSellerStats]);

  const { data: soldRows = [] } = useQuery({
    queryKey: ["home-best-seller-products", soldIds.join(",")],
    enabled: soldIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`)
        .eq("is_active", true)
        .eq("in_stock", true)
        .in("id", soldIds)
        .limit(BEST_SELLER_LIMIT);

      if (error) throw error;
      return (data || []) as ProductRow[];
    },
    staleTime: HOME_CACHE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const rendered = useMemo(
    () =>
      sections
        .map((section) => {
          if (section.filter_type === "best_seller") {
            const soldById = new Map(soldRows.map((row) => [String(row.id), row]));
            const ranked = bestSellerStats
              .map((stat) => soldById.get(String(stat.product_id)))
              .filter(Boolean) as ProductRow[];

            const fallback = rows
              .filter(
                (row) =>
                  (Array.isArray(row.section_ids) && row.section_ids.includes(section.id)) ||
                  Boolean(row.is_best_seller),
              )
              .filter((row) => !soldById.has(String(row.id)))
              .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

            return {
              section,
              products: [...ranked, ...fallback]
                .slice(0, getSectionFetchLimit(section))
                .map((row) => mapProductCard(row as any)),
            };
          }

          const source = rows.filter(
            (row) =>
              (Array.isArray(row.section_ids) && row.section_ids.includes(section.id)) ||
              Boolean(row.is_featured),
          );
          const sorted = [...source].sort(
            (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || Number(b.price || 0) - Number(a.price || 0),
          );

          return {
            section,
            products: sorted.slice(0, getSectionFetchLimit(section)).map((row) => mapProductCard(row as any)),
          };
        })
        .filter((entry) => entry.products.length > 0),
    [rows, sections, bestSellerStats, soldRows],
  );

  const loadMore = (id: string, total: number) =>
    setVisibleCounts((current) => ({
      ...current,
      [id]: Math.min((current[id] || INITIAL_VISIBLE) + LOAD_MORE_STEP, total),
    }));

  const collapse = (id: string, count: number) => {
    const next = Math.max(INITIAL_VISIBLE, count - LOAD_MORE_STEP);
    setVisibleCounts((current) => ({ ...current, [id]: next }));
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() =>
        document
          .getElementById(`home-section-${id}-product-${next - 1}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      ),
    );
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
            <section
              id={`home-section-${section.id}`}
              className={`scroll-mt-20 py-7 md:py-16 ${sectionIndex % 2 === 0 ? "bg-background" : "bg-[#fffaf8]"}`}
            >
              <div className="mx-auto w-full max-w-[1600px] px-3 md:px-8 lg:px-12">
                <div className="mb-4 flex items-end justify-between gap-4 md:mb-9">
                  <div>
                    <div className="mb-1 flex items-center gap-2 md:mb-2">
                      <span className="h-[2px] w-4 rounded-full bg-[#D4777D] md:w-7" />
                      <span className="font-serif text-[6px] uppercase tracking-[.2em] text-[#B86168] md:text-[9px]">
                        {section.title || "FLAMINGO EDIT"}
                      </span>
                    </div>
                    <h2 className="text-[17px] font-semibold text-foreground md:text-[32px] lg:text-[36px]">
                      {section.title_ar}
                    </h2>
                    <p className="mt-2 hidden text-[11px] text-[#94847f] md:block">
                      اختيارات مميزة، مرتبة لتصل إلى ما يناسبك بسرعة.
                    </p>
                  </div>

                  {section.view_all_link && (
                    <Link
                      to={section.view_all_link}
                      className="hidden items-center gap-2 rounded-full border border-[#e3d3ce] bg-white px-5 py-2.5 text-[10px] font-semibold text-[#A95B61] transition hover:border-[#d5ada8] hover:shadow-sm md:flex"
                    >
                      عرض الكل
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-4 md:gap-y-9 lg:grid-cols-4 xl:grid-cols-4 xl:gap-x-5">
                  {visibleProducts.map((product, index) => (
                    <div
                      key={product.id}
                      id={`home-section-${section.id}-product-${index}`}
                      className="min-w-0"
                    >
                      <ProductCard product={product} index={sectionIndex * INITIAL_VISIBLE + index} />
                    </div>
                  ))}
                </div>

                {(hasMore || canCollapse) && section.show_view_all !== false && (
                  <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:mt-12">
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => loadMore(section.id, products.length)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#D8B5B2] bg-white px-6 text-[8px] font-semibold text-[#A95B61] hover:bg-[#FFF7F5] md:h-12 md:px-9 md:text-[10px]"
                      >
                        عرض المزيد
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    )}

                    {canCollapse && (
                      <button
                        type="button"
                        onClick={() => collapse(section.id, visibleCount)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#E7DDD9] bg-white px-5 text-[8px] font-semibold text-[#786863] md:h-12 md:px-8 md:text-[10px]"
                      >
                        تقليص
                        <ChevronUp className="h-4 w-4" />
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
