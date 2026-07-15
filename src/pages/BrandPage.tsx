import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/store/useStore";
import { ChevronLeft } from "lucide-react";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  hero_image: string | null;
  description: string | null;
  is_active: boolean | null;
}

interface BrandSectionRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
}

const mapProduct = (p: any): Product => ({
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
  countries: (p.countries || ["GLOBAL"]) as Product["countries"],
  isFeatured: p.is_featured,
  isBestSeller: p.is_best_seller,
});

const BrandPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: brand, isLoading: brandLoading, error } = useQuery({
    queryKey: ["brand-by-slug", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,slug,logo_url,hero_image,description,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as BrandRow | null;
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["brand-sections", brand?.id],
    enabled: !!brand?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_sections")
        .select("id,name,slug,image_url,description,sort_order")
        .eq("brand_id", brand!.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as BrandSectionRow[];
    },
  });

  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["brand-products", brand?.name],
    enabled: !!brand?.name,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("brand", brand!.name)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
  });

  const productCount = products.length;

  const sectionsWithCount = useMemo(
    () => sections.map((s) => ({ ...s, count: products.filter((p) => p.category === s.slug).length })),
    [sections, products]
  );

  if (!slug) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        {brandLoading ? (
          <div className="h-[50vh] flex items-center justify-center text-muted-foreground">جاري التحميل...</div>
        ) : !brand || error ? (
          <div className="max-w-3xl mx-auto py-24 px-4 text-center">
            <h1 className="text-2xl font-heading mb-3">الماركة غير موجودة</h1>
            <Link to="/home" className="text-gold hover:underline">العودة للرئيسية</Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <section
              className="relative w-full h-[46vh] md:h-[62vh] bg-neutral-100 overflow-hidden"
              aria-label={`${brand.name} hero`}
            >
              {brand.hero_image && (
                <img
                  src={brand.hero_image}
                  alt={brand.name}
                  loading="eager"
                  fetchPriority="high"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="relative z-10 h-full max-w-6xl mx-auto px-4 flex flex-col items-center justify-end pb-10 text-center text-white">
                {brand.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt={`${brand.name} logo`}
                    className="h-16 md:h-20 object-contain mb-4 bg-white/95 rounded-lg px-6 py-2"
                  />
                )}
                <h1 className="font-heading text-3xl md:text-5xl tracking-[0.25em] uppercase">{brand.name}</h1>
                {brand.description && (
                  <p className="mt-4 max-w-2xl text-sm md:text-base text-white/85 leading-relaxed">
                    {brand.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-white/70 tracking-widest">{productCount} منتج</p>
              </div>
            </section>

            {/* Sections */}
            {sectionsWithCount.length > 0 && (
              <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
                <h2 className="text-center font-heading text-xl md:text-2xl tracking-widest uppercase mb-8">
                  الأقسام
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  {sectionsWithCount.map((s) => (
                    <Link
                      key={s.id}
                      to={`/products?brand=${encodeURIComponent(brand.name)}&category=${encodeURIComponent(s.slug)}`}
                      className="group relative aspect-[4/5] overflow-hidden bg-neutral-100 border border-black/5 hover:border-gold transition-colors"
                    >
                      {s.image_url && (
                        <img
                          src={s.image_url}
                          alt={s.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                        <h3 className="font-heading text-lg tracking-widest uppercase">{s.name}</h3>
                        <p className="text-xs opacity-80 mt-1">{s.count} منتج</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Products */}
            <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl md:text-2xl tracking-widest uppercase">المنتجات</h2>
                <Link
                  to={`/products?brand=${encodeURIComponent(brand.name)}`}
                  className="text-sm text-black/60 hover:text-gold inline-flex items-center gap-1"
                >
                  عرض الكل <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>
              {prodLoading ? (
                <div className="py-16 text-center text-muted-foreground">جاري التحميل...</div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">لا توجد منتجات حالياً</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.slice(0, 12).map((p, i) => (
                    <ProductCard key={p.id} product={p} index={i} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default BrandPage;