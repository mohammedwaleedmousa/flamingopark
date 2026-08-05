import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  sort_order: number | null;
}

const AllBrandsPage = () => {
    const [term, setTerm] = useState("");

    const { data: brands = [], isLoading } = useQuery({
        queryKey: ["all-brands"],
        queryFn: async () => {
        const { data, error } = await supabase
            .from("brands")
            .select("id,name,logo_url,sort_order,slug")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []) as BrandRow[];
        },
    });

    const list = useMemo(() => {
        const q = term.trim().toLowerCase();
        return brands
        .map((b) => ({
            id: b.id,
            name: b.name,
            slug: b.slug || b.name.toLowerCase().replace(/\s+/g, "-"),
            logo_url: b.logo_url,
        }))
        .filter((b) => (q ? b.name.toLowerCase().includes(q) : true));
    }, [brands, term]);

    return (
        <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="pt-24 md:pt-28 pb-16">
            <div className="container mx-auto px-4">
            <div className="text-center mb-8">
                <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">FLAMINGO</p>
                <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-foreground">جميع الماركات</h1>
            </div>

            <div className="max-w-md mx-auto mb-10">
                <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ابحث عن ماركة..."
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-200"
                dir="rtl"
                />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-3">
                    <div className="w-[82px] h-[82px] rounded-full bg-muted animate-pulse" />
                    <div className="h-3 w-14 rounded bg-muted animate-pulse" />
                    </div>
                ))}
                </div>
            ) : list.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-16">لا توجد ماركات مطابقة</p>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-6 md:gap-8">
                {list.map((brand) => (
                    <Link
                    key={brand.id}
                    to={`/brands/${brand.slug}`}
                    className="group flex flex-col items-center text-center"
                    >
                    <div className="w-[82px] h-[82px] rounded-full bg-white border border-border flex items-center justify-center overflow-hidden transition-colors duration-300 group-hover:border-pink-400">
                        {brand.logo_url ? (
                        <img
                            src={optimizeImage(brand.logo_url, 200, 80)}
                            alt={brand.name}
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                            className="max-w-[56%] max-h-[56%] object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                        ) : (
                        <span className="text-[11px] px-2">{brand.name}</span>
                        )}
                    </div>
                    <span className="mt-3 text-xs font-medium text-foreground line-clamp-1 transition-colors group-hover:text-pink-600">
                        {brand.name}
                    </span>
                    </Link>
                ))}
                </div>
            )}
            </div>
        </main>

        <Footer />
        </div>
    );
};

export default AllBrandsPage;