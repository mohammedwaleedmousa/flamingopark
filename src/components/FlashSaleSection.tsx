import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import type { Product } from "@/store/useStore";

const useCountdown = (targetMs: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, targetMs - now);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s };
};

const Pill = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-foreground text-background min-w-[44px] py-1.5 px-2 text-center rounded-md font-mono text-base font-semibold tabular-nums">
      {String(value).padStart(2, "0")}
    </div>
    <span className="text-[9px] tracking-[0.3em] uppercase text-muted-foreground mt-1">
      {label}
    </span>
  </div>
);

const FlashSaleSection = () => {
  // 24h rolling timer
  const endOfDay = (() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();
  const { h, m, s } = useCountdown(endOfDay);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["flash-sale-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .not("discount", "is", null)
        .gt("discount", 0)
        .order("discount", { ascending: false })
        .limit(8);
      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "",
        descriptionAr: p.description_ar || "",
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["SA", "YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    staleTime: 60 * 1000,
  });

  if (!isLoading && products.length === 0) return null;

  return (
    <section
      className="py-10 md:py-16 bg-gradient-to-b from-background to-muted/40"
      dir="rtl"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6 md:mb-10">
          <div className="flex items-center gap-3">
            <span className="relative inline-flex w-10 h-10 rounded-full bg-foreground text-background items-center justify-center">
              <Flame className="w-5 h-5" />
              <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-red-500 animate-soft-pulse" />
            </span>
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
                Flash Sale
              </p>
              <h2 className="font-heading text-xl md:text-2xl text-foreground">
                عروض اليوم
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Pill value={h} label="س" />
            <span className="font-mono text-foreground -mb-3">:</span>
            <Pill value={m} label="د" />
            <span className="font-mono text-foreground -mb-3">:</span>
            <Pill value={s} label="ث" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            : products.map((p, i) => (
                <div
                  key={p.id}
                  className="animate-card-rise"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <ProductCard product={p} badge="LIMITED" />
                </div>
              ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 text-[11px] tracking-[0.35em] uppercase border-b border-foreground pb-1 hover:opacity-60 transition-opacity"
          >
            كل العروض <ArrowLeft className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FlashSaleSection;