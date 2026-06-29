import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  parent_id: string | null;
  image_url: string | null;
  sort_order: number;
}

const FALLBACK: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=900&q=85",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=900&q=85",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900&q=85",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=900&q=85",
};

const CategoriesPage = () => {
  const [search, setSearch] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const { data: brandCounts = {} } = useQuery({
    queryKey: ["categories-brand-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category").eq("is_active", true);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => { counts[p.category] = (counts[p.category] || 0) + 1; });
      return counts;
    },
  });

  const filtered = categories.filter((c) =>
    !search.trim() || c.name_ar.includes(search) || c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto px-4 md:px-6 pt-4 pb-6">
        <h1 className="text-center text-[17px] font-semibold text-foreground mb-4">الأقسام</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الأقسام..."
            className="w-full h-12 pr-11 pl-4 rounded-2xl bg-muted/60 border border-transparent focus:border-primary/40 focus:bg-white text-[13px] placeholder:text-muted-foreground/80 focus:outline-none transition"
          />
        </div>

        {/* Category rows */}
        <ul className="space-y-2.5">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                to={`/products?category=${c.slug}`}
                className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-border/60 px-4 py-3 hover:border-primary/40 hover:shadow-[0_4px_14px_-6px_rgba(236,44,124,0.25)] transition"
              >
                <span className="w-7 h-7 rounded-full bg-primary/10 grid place-items-center text-primary">
                  <ChevronLeft className="w-4 h-4" />
                </span>
                <div className="flex-1 text-right">
                  <p className="text-[15px] font-semibold text-foreground">{c.name_ar}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {brandCounts[c.slug] || 0} منتج
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={c.image_url || FALLBACK[c.slug] || FALLBACK.women}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
};

export default CategoriesPage;