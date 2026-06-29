import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, ArrowLeft, Truck, ShieldCheck, Lock, RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

interface DbProduct {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  original_price: number | null;
  discount: number | null;
  description: string;
  description_ar: string;
  images: string[];
  category: string;
  brand: string;
  in_stock: boolean;
  countries: string[];
  is_featured: boolean;
  is_best_seller: boolean;
}

const FALLBACK_CAT: Record<string, string> = {
  women: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&q=85",
  men: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=400&q=85",
  kids: "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&q=85",
  bags: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=85",
  shoes: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&q=85",
  beauty: "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=400&q=85",
  perfumes: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=85",
  watches: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400&q=85",
  electronics: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=85",
  sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=85",
  accessories: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&q=85",
};

const trust = [
  { icon: Truck, title: "شحن سريع", note: "2-5 أيام" },
  { icon: ShieldCheck, title: "منتجات أصلية", note: "100%" },
  { icon: Lock, title: "دفع آمن", note: "تشفير كامل" },
  { icon: RotateCcw, title: "إرجاع سهل", note: "15 يوم" },
];

const stats = [
  { value: "500+", label: "ماركة عالمية" },
  { value: "20K+", label: "منتج أصلي" },
  { value: "15K+", label: "عميل سعيد" },
  { value: "99%", label: "تقييم إيجابي" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["home-cats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,slug,name,name_ar,image_url,sort_order,parent_id")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      return (data || []) as any[];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["home-brands"],
    queryFn: async () => {
      const { data } = await supabase
        .from("brands")
        .select("id,slug,name,logo_url,sort_order")
        .eq("is_active", true)
        .order("sort_order")
        .limit(8);
      return (data || []) as any[];
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    navigate(`/products?search=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="container mx-auto px-4 md:px-6 pb-6">
        {/* Search */}
        <form onSubmit={onSearch} className="mt-4 relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن منتجات، ماركات وأقسام..."
            className="w-full h-12 pr-11 pl-14 rounded-2xl bg-muted/60 border border-transparent focus:border-primary/40 focus:bg-white text-[13px] placeholder:text-muted-foreground/80 focus:outline-none transition"
          />
          <button
            type="submit"
            aria-label="بحث"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-9 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center hover:opacity-90 transition"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </button>
        </form>

        {/* Hero card */}
        <section className="mt-4 relative overflow-hidden rounded-3xl shadow-[0_10px_30px_-15px_rgba(236,44,124,0.35)]"
          style={{ background: "linear-gradient(135deg,#FDE7F0 0%, #FBC2D8 100%)" }}
        >
          <div className="relative grid grid-cols-[1.1fr_1fr] gap-2 px-5 pt-6 pb-7 min-h-[230px]">
            <div className="flex flex-col justify-center text-foreground">
              <p className="text-[11px] text-foreground/70 mb-1.5">أرقى الماركات العالمية</p>
              <h2 className="font-heading text-[26px] leading-[1.2] font-bold">
                تجربة تسوق
                <br />
                <span className="text-primary">استثنائية</span>
              </h2>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center gap-2 self-start bg-primary text-primary-foreground text-[12px] font-semibold px-5 py-2.5 rounded-full shadow-[0_8px_20px_-8px_rgba(236,44,124,0.6)] hover:opacity-95 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> تسوق الآن
              </Link>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=85"
                alt="Flamingo"
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                loading="eager"
              />
            </div>
          </div>
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === 0 ? "w-5 bg-primary" : "w-1.5 bg-primary/30"}`} />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section className="mt-4 grid grid-cols-4 gap-2.5">
          {trust.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="bg-white rounded-2xl px-2 py-3 text-center border border-border/60 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)]">
                <div className="mx-auto mb-1.5 w-9 h-9 rounded-full bg-primary/10 grid place-items-center">
                  <Icon className="w-[18px] h-[18px] text-primary" strokeWidth={2} />
                </div>
                <p className="text-[11px] font-semibold text-foreground leading-tight">{t.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.note}</p>
              </div>
            );
          })}
        </section>

        {/* Stats */}
        <section className="mt-3 bg-white rounded-2xl border border-border/60 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] grid grid-cols-4 divide-x divide-x-reverse divide-border/60 py-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-primary font-bold text-[18px] tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight px-1">{s.label}</p>
            </div>
          ))}
        </section>

        {/* Categories */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-foreground">تسوّق حسب الأقسام</h2>
            <Link to="/categories" className="text-[12px] text-primary font-semibold">عرض الكل</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
            {categories.slice(0, 8).map((c) => (
              <Link key={c.id} to={`/products?category=${c.slug}`} className="flex-shrink-0 w-[68px] text-center">
                <div className="w-[68px] h-[68px] rounded-2xl overflow-hidden bg-muted shadow-[0_3px_10px_-4px_rgba(0,0,0,0.10)]">
                  <img
                    src={c.image_url || FALLBACK_CAT[c.slug] || FALLBACK_CAT.women}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[11px] mt-1.5 text-foreground/90 line-clamp-1">{c.name_ar}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Brands */}
        {brands.length > 0 && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-bold text-foreground">أشهر الماركات</h2>
              <Link to="/products" className="text-[12px] text-primary font-semibold">عرض الكل</Link>
            </div>
            <div className="grid grid-cols-5 gap-2.5">
              {brands.slice(0, 5).map((b) => (
                <Link
                  key={b.id}
                  to={`/products?brand=${b.slug}`}
                  className="aspect-square bg-white rounded-2xl border border-border/60 grid place-items-center p-2 hover:border-primary/40 hover:shadow-[0_4px_14px_-6px_rgba(236,44,124,0.3)] transition"
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain" loading="lazy" />
                  ) : (
                    <span className="font-bold text-[12px] text-foreground/70">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default HomePage;
