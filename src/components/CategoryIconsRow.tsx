import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Cat {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  image_url?: string | null;
}

const CategoryIconsRow = () => {
  const { data: categories = [] } = useQuery({
    queryKey: ["circle-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, name_ar, slug, image_url, parent_id, is_active, sort_order")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order")
        .limit(14);
      return (data || []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (categories.length === 0) return null;

  return (
    <section className="py-6 md:py-8 border-b border-border/40 bg-background" dir="rtl">
      <div className="container mx-auto px-3">
        <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-2">
          {categories.map((c: Cat, i) => (
            <Link
              key={c.id}
              to={`/products?category=${c.slug}`}
              className="flex-shrink-0 flex flex-col items-center gap-2 group animate-card-rise"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-muted ring-1 ring-border group-hover:ring-foreground transition-all duration-300 group-hover:scale-105">
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-heading text-foreground/40 text-lg">
                    {c.name_ar?.[0] || "•"}
                  </div>
                )}
              </div>
              <span className="text-[11px] md:text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors max-w-[80px] truncate text-center">
                {c.name_ar}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryIconsRow;