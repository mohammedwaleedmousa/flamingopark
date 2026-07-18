import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/store/useStore";
import { ChevronRight } from "lucide-react";

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

const BrandSectionPage = () => {
  const { slug, sectionSlug } = useParams<{ slug: string; sectionSlug: string }>();

  const { data: brand } = useQuery({
    queryKey: ["brand-by-slug-sec", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("id,name,slug")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; slug: string } | null;
    },
  });

  const { data: section, isLoading: secLoading } = useQuery({
    queryKey: ["brand-section", brand?.id, sectionSlug],
    enabled: !!brand?.id && !!sectionSlug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_sections")
        .select("id,name,slug,image_url,description")
        .eq("brand_id", brand!.id)
        .eq("slug", sectionSlug)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; slug: string; image_url: string | null; description: string | null } | null;
    },
  });

  const { data: products = [], isLoading: prodLoading } = useQuery({
    queryKey: ["brand-section-products", brand?.name, section?.slug],
    enabled: !!brand?.name && !!section?.slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("brand", brand!.name)
        .eq("category", section!.slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProduct);
    },
  });

  if (!slug || !sectionSlug) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="flex-1">
        {secLoading ? (
          <div className="h-[40vh] flex items-center justify-center text-muted-foreground">جاري التحميل...</div>
        ) : !section ? (
          <div className="max-w-3xl mx-auto py-24 px-4 text-center">
            <h1 className="text-2xl font-heading mb-3">القسم غير موجود</h1>
            <Link to={`/brands/${slug}`} className="text-gold hover:underline">العودة لصفحة الماركة</Link>
          </div>
        ) : (
          <>
            <section className="relative w-full h-[36vh] md:h-[50vh] bg-neutral-100 overflow-hidden">
              {section.image_url && (
                <img src={section.image_url} alt={section.name} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
              <div className="relative z-10 h-full max-w-6xl mx-auto px-4 flex flex-col items-center justify-end pb-10 text-center text-white">
                <p className="text-xs tracking-widest opacity-80 mb-2">
                  <Link to={`/brands/${slug}`} className="hover:text-gold">{brand?.name}</Link>
                </p>
                <h1 className="font-heading text-3xl md:text-5xl tracking-[0.25em] uppercase">{section.name}</h1>
                {section.description && (
                  <p className="mt-4 max-w-2xl text-sm md:text-base text-white/85">{section.description}</p>
                )}
                <p className="mt-3 text-xs text-white/70 tracking-widest">{products.length} منتج</p>
              </div>
            </section>

            <section className="max-w-6xl mx-auto px-4 py-10 md:py-14">
              <div className="mb-6">
                <Link to={`/brands/${slug}`} className="text-sm text-black/60 hover:text-gold inline-flex items-center gap-1">
                  <ChevronRight className="w-4 h-4" /> العودة إلى {brand?.name}
                </Link>
              </div>
              {prodLoading ? (
                <div className="py-16 text-center text-muted-foreground">جاري التحميل...</div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">لا توجد منتجات في هذا القسم بعد</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((p, i) => (<ProductCard key={p.id} product={p} index={i} />))}
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

export default BrandSectionPage;