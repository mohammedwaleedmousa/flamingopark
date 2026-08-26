import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { supabase } from "@/integrations/supabase/client";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

interface BrandPageRow {
  id: string;
  hero_image: string | null;
  title: string | null;
  description: string | null;
  is_active: boolean | null;
}

interface BrandSectionRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  hero_image: string | null;
  description: string | null;
  is_active: boolean | null;
  brand_pages: BrandPageRow | BrandPageRow[] | null;
  brand_sections: BrandSectionRow[] | null;
}

interface SectionProductRow {
  section_id: string;
  products: { id: string } | null;
}

const BrandPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: brand, isLoading: brandLoading, error: brandError } = useQuery({
    queryKey: ["brand-page-shell", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select(`
          id,
          name,
          slug,
          hero_image,
          description,
          is_active,
          brand_pages(id,hero_image,title,description,is_active),
          brand_sections(id,name,slug,image_url,description,sort_order,is_active)
        `)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as BrandRow | null;
    },
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const sections = useMemo(() => {
    return (brand?.brand_sections || [])
      .filter((section) => section.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [brand?.brand_sections]);

  const { data: sectionProducts = [] } = useQuery({
    queryKey: ["brand-section-counts", brand?.id, sections.map((section) => section.id).join(",")],
    enabled: Boolean(brand?.id && sections.length),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("brand_section_products")
        .select("section_id,products!inner(id)")
        .in("section_id", sections.map((section) => section.id))
        .eq("products.is_active", true)
        .eq("products.brand_id", brand!.id);

      if (error) throw error;
      return (data || []) as SectionProductRow[];
    },
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const sectionsWithCount = useMemo(() => {
    const counts = new Map<string, number>();

    sectionProducts.filter((relation) => relation.products).forEach((relation) => {
      counts.set(relation.section_id, (counts.get(relation.section_id) || 0) + 1);
    });

    return sections.map((section) => ({
      ...section,
      count: counts.get(section.id) || 0,
    }));
  }, [sections, sectionProducts]);

  if (!slug) return <Navigate to="/home" replace />;

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="pb-14">
          <div className="mx-auto w-full max-w-[1400px] px-3 py-7 md:px-6 md:py-10">
            <div className="mb-5">
              <div className="h-2 w-20 animate-pulse rounded-full bg-muted" />
              <div className="mt-2 h-6 w-40 animate-pulse rounded-full bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="aspect-[4/4.6] animate-pulse rounded-[15px] bg-muted md:rounded-[18px]" />
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (!brand || brandError) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="flex min-h-[65vh] items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[8px] uppercase tracking-[0.22em] text-[#B86168]">BRAND</span>
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
            </div>

            <h1 className="text-[22px] font-semibold text-foreground">الماركة غير موجودة</h1>
            <p className="mt-2 text-[12px] text-muted-foreground">قد تكون الماركة غير متاحة أو تم تغيير الرابط.</p>

            <Link to="/brands" className="mt-5 inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-background px-5 text-[12px] font-semibold text-[#A95B61]">
              العودة للماركات
              <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const brandSlug = brand.slug || slug;

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="flex-1 pb-12 md:pb-16">
        <section className="bg-background py-7 md:py-11">
          <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
            <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[8px] uppercase tracking-[0.2em] text-[#B86168] md:text-[9px]">COLLECTIONS</span>
                </div>

                <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">أقسام {brand.name}</h1>
              </div>
            </div>

            {sectionsWithCount.length === 0 ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-[15px] border border-border/60 bg-background text-center">
                <div>
                  <p className="text-[12px] font-semibold text-foreground">لا توجد أقسام متاحة حاليًا</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">سيتم عرض الأقسام هنا عند إضافتها للماركة.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {sectionsWithCount.map((section) => (
                  <Link key={section.id} to={`/brands/${brandSlug}/sections/${encodeURIComponent(section.slug)}`} className="group block min-w-0">
                    <div className="relative aspect-[4/4.6] overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                      {section.image_url ? (
                        <img
                          src={optimizeImage(section.image_url, 640, 82)}
                          alt={section.name}
                          loading="lazy"
                          decoding="async"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          onError={handleImageError}
                          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[#F3F0ED]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                        <h2 className="truncate text-[13px] font-semibold text-white md:text-[15px]">{section.name}</h2>
                        <p className="mt-1 text-[10px] text-white/75 md:text-[11px]">{section.count} منتج</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default BrandPage;
