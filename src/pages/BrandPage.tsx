import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";

import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CARD_SELECT, mapProductCard } from "@/lib/productCardData";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

interface BrandRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  hero_image: string | null;
  description: string | null;
  is_active: boolean | null;
}

interface BrandPageRow {
  id: string;
  brand_id: string;
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
  sort_order: number;
}

interface SectionProductRow {
  section_id: string;
  product_id: string;
}

const BrandPage = () => {
  const { slug } = useParams<{ slug: string }>();

  /* =========================================================
     BRAND
  ========================================================= */

  const { data: brand, isLoading: brandLoading, error: brandError } = useQuery({
    queryKey: ["brand-by-slug", slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name,slug,logo_url,hero_image,description,is_active").eq("slug", slug).eq("is_active", true).maybeSingle();

      if (error) throw error;

      return data as BrandRow | null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     BRAND PAGE
     البانر الذي يتم رفعه من الأدمن موجود هنا
  ========================================================= */

  const { data: brandPage, isLoading: brandPageLoading } = useQuery({
    queryKey: ["brand-page", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_pages").select("id,brand_id,hero_image,title,description,is_active").eq("brand_id", brand!.id).eq("is_active", true).maybeSingle();

      if (error) throw error;

      return data as BrandPageRow | null;
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     BRAND SECTIONS
  ========================================================= */

  const { data: sections = [] } = useQuery({
    queryKey: ["brand-sections", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_sections").select("id,name,slug,image_url,description,sort_order").eq("brand_id", brand!.id).eq("is_active", true).order("sort_order", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandSectionRow[];
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["brand-products", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select(PRODUCT_CARD_SELECT).eq("brand_id", brand!.id).eq("is_active", true).order("created_at", { ascending: false }).limit(48);

      if (error) throw error;

      return (data || []).map(mapProductCard);
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SECTION PRODUCT RELATIONS
  ========================================================= */

  const { data: sectionProducts = [] } = useQuery({
    queryKey: ["brand-section-relations", brand?.id, sections.map((section) => section.id).join(",")],
    enabled: Boolean(brand?.id && sections.length),
    queryFn: async () => {
      const sectionIds = sections.map((section) => section.id);

      const { data, error } = await (supabase as any).from("brand_section_products").select("section_id,product_id").in("section_id", sectionIds);

      if (error) throw error;

      return (data || []) as SectionProductRow[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     SECTION COUNTS
  ========================================================= */

  const sectionsWithCount = useMemo(() => {
    const counts = new Map<string, number>();

    sectionProducts.forEach((relation) => {
      counts.set(relation.section_id, (counts.get(relation.section_id) || 0) + 1);
    });

    return sections.map((section) => ({
      ...section,
      count: counts.get(section.id) || 0,
    }));
  }, [sections, sectionProducts]);

  /* =========================================================
     BANNER
     الأولوية للصورة المرفوعة من صفحة الماركة في الأدمن
     ثم fallback للصورة القديمة لو وجدت
  ========================================================= */

  const bannerImage = useMemo(() => {
    const pageBanner = brandPage?.hero_image?.trim();
    const oldBanner = brand?.hero_image?.trim();

    if (pageBanner) return pageBanner;
    if (oldBanner) return oldBanner;

    return null;
  }, [brandPage?.hero_image, brand?.hero_image]);

  if (!slug) {
    return <Navigate to="/home" replace />;
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (brandLoading || (brand && brandPageLoading)) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="pb-14">
          <div className="mx-auto w-full max-w-[1400px] px-3 pt-3 md:px-6 md:pt-5">
            <div className="aspect-[16/6] w-full animate-pulse rounded-[16px] bg-muted/60 sm:aspect-[16/5] md:rounded-[22px]" />
          </div>

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

            <div className="mb-5 mt-10">
              <div className="h-2 w-20 animate-pulse rounded-full bg-muted" />
              <div className="mt-2 h-6 w-40 animate-pulse rounded-full bg-muted" />
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
              {Array.from({ length: 8 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

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

      <main className="flex-1">
        {/* =====================================================
            BRAND BANNER
        ===================================================== */}

        {bannerImage && (
          <section className="bg-background pt-3 md:pt-5">
            <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
              <div className="w-full overflow-hidden rounded-[16px] bg-muted/30 md:rounded-[22px]">
                <img src={bannerImage} alt={`${brand.name} banner`} loading="eager" decoding="async" fetchPriority="high" onError={handleImageError} className="block h-auto w-full object-contain object-center" />
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            SECTIONS
        ===================================================== */}

        {sectionsWithCount.length > 0 && (
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

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {sectionsWithCount.map((section) => (
                  <Link key={section.id} to={`/brands/${brandSlug}/sections/${encodeURIComponent(section.slug)}`} className="group block min-w-0">
                    <div className="relative aspect-[4/4.6] overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                      {section.image_url ? (
                        <img src={optimizeImage(section.image_url, 800, 82)} alt={section.name} loading="lazy" decoding="async" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={handleImageError} className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.025]" />
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
            </div>
          </section>
        )}

        {/* =====================================================
            PRODUCTS
        ===================================================== */}

        <section className="bg-background pb-10 pt-3 md:pb-14 md:pt-5">
          <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
            <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[8px] uppercase tracking-[0.2em] text-[#B86168] md:text-[9px]">PRODUCTS</span>
                </div>

                <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-foreground md:text-[26px]">منتجات {brand.name}</h2>
              </div>

              {products.length > 0 && (
                <Link to={`/brands/${brandSlug}/products`} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[11px] font-medium text-[#A95B61] transition-colors hover:text-[#B86168] md:text-[12px]">
                  عرض الكل
                  <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Link>
              )}
            </div>

            {productsLoading ? (
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex min-h-[190px] items-center justify-center rounded-[15px] border border-border/60 bg-background">
                <div className="text-center">
                  <p className="text-[13px] font-medium text-foreground">لا توجد منتجات حالياً</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">سيتم إضافة منتجات هذه الماركة قريبًا.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-3 md:grid-cols-4 md:gap-x-5 md:gap-y-7">
                {products.slice(0, 12).map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
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