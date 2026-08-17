import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";

type ManagedSection = { id: string; title: string; title_ar: string; filter_type: string | null; max_products: number | null; show_view_all: boolean | null; view_all_link: string | null; sort_order: number | null };
type ProductRow = Record<string, any> & { section_ids?: string[] | null; created_at?: string | null; sort_order?: number | null };

const HomeManagedSections = () => {
  const { data: sections = [] } = useQuery({ queryKey: ["home-managed-sections"], queryFn: async () => { const { data, error } = await supabase.from("homepage_sections").select("id,title,title_ar,filter_type,max_products,show_view_all,view_all_link,sort_order").eq("is_active", true).order("sort_order", { ascending: true }); if (error) throw error; return (data || []) as ManagedSection[]; }, staleTime: 60_000, refetchOnWindowFocus: false });
  const { data: rows = [] } = useQuery({ queryKey: ["home-managed-section-products"], enabled: sections.length > 0, queryFn: async () => { const { data, error } = await (supabase as any).from("products").select(`${PRODUCT_CARD_SELECT},section_ids,created_at,sort_order`).eq("is_active", true).limit(120); if (error) throw error; return (data || []) as ProductRow[]; }, staleTime: 60_000, refetchOnWindowFocus: false });

  const rendered = useMemo(() => sections.map((section) => {
    const explicit = rows.filter((row) => Array.isArray(row.section_ids) && row.section_ids.includes(section.id));
    let source = explicit.length ? explicit : rows.filter((row) => {
      if (section.filter_type === "featured") return Boolean(row.is_featured);
      if (section.filter_type === "best_seller") return Boolean(row.is_best_seller);
      if (section.filter_type === "discounted") return Number(row.discount || 0) > 0;
      return true;
    });
    if (section.filter_type === "new") source = [...source].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    else source = [...source].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    return { section, products: source.slice(0, Math.max(1, Number(section.max_products || 8))).map((row) => mapProductCard(row as any)) };
  }), [rows, sections]);

  if (!sections.length) return null;

  return <>{rendered.map(({ section, products }) => products.length > 0 ? <section key={section.id} className="bg-background py-7 md:py-12"><div className="mx-auto w-full max-w-[1400px] px-3 md:px-6"><div className="mb-4 flex items-end justify-between gap-3 md:mb-7"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" /><span className="truncate font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">{section.title || "FLAMINGO EDIT"}</span></div><h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">{section.title_ar}</h2></div>{section.show_view_all !== false && <Link to={section.view_all_link || "/products"} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">عرض الكل<ArrowLeft className="h-3 w-3" strokeWidth={1.5} /></Link>}</div><div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section> : null)}</>;
};

export default HomeManagedSections;
