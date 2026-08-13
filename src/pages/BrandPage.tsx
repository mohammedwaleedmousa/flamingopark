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

  const productCount = products.length;

  if (!slug) {
    return <Navigate to="/home" replace />;
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (brandLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Navbar />
        <CartDrawer />

        <main className="pb-16">
          <div className="h-[260px] w-full animate-pulse bg-muted/60 sm:h-[300px] md:h-[360px]" />

          <div className="mx-auto max-w-[1400px] px-3 py-7 md:px-6 md:py-10">
            <div className="mb-5 h-5 w-32 animate-pulse rounded-full bg-muted" />

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
            <p className="font-serif text-[6px] uppercase tracking-[0.24em] text-[#B86168]">BRAND</p>

            <h1 className="mt-2 text-[20px] font-semibold text-foreground">الماركة غير موجودة</h1>

            <p className="mt-1.5 text-[8px] text-muted-foreground">قد تكون الماركة غير متاحة أو تم تغيير الرابط.</p>

            <Link to="/brands" className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-[9px] border border-border bg-white px-4 text-[8px] font-semibold text-[#A95B61]">
              العودة للماركات
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="flex-1">
        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="bg-background px-3 pt-3 md:px-6 md:pt-5">
          <div className="relative mx-auto h-[255px] w-full max-w-[1400px] overflow-hidden rounded-[18px] border border-border/60 bg-[#F4F1EE] sm:h-[300px] md:h-[360px] md:rounded-[22px] lg:h-[400px]">
            {brand.hero_image ? (
              <img src={optimizeImage(brand.hero_image, 1800, 82)} alt={brand.name} loading="eager" decoding="async" fetchPriority="high" sizes="100vw" onError={handleImageError} className="absolute inset-0 h-full w-full object-cover object-center" />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#F7F4F1_0%,#EEE8E4_100%)]" />
            )}

            {brand.hero_image && <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/5" />}

            <div className={`absolute inset-0 flex flex-col items-center justify-end px-4 pb-7 text-center md:pb-9 ${brand.hero_image ? "text-white" : "text-foreground"}`}>
              {brand.logo_url && (
                <div className="mb-3 flex min-h-[58px] min-w-[110px] max-w-[180px] items-center justify-center rounded-[10px] bg-white/95 px-4 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.05)] md:min-h-[66px] md:min-w-[130px] md:max-w-[210px]">
                  <img src={brand.logo_url} alt={`${brand.name} logo`} loading="eager" decoding="async" onError={handleImageError} className="block max-h-[46px] max-w-full object-contain object-center md:max-h-[52px]" />
                </div>
              )}

              <h1 className="text-[22px] font-semibold tracking-[-0.025em] md:text-[32px]">{brand.name}</h1>

              {brand.description && <p className={`mt-2 line-clamp-2 max-w-[560px] text-[8px] leading-5 md:text-[10px] md:leading-6 ${brand.hero_image ? "text-white/80" : "text-muted-foreground"}`}>{brand.description}</p>}

              <div className={`mt-3 flex items-center gap-2 text-[6px] md:text-[7px] ${brand.hero_image ? "text-white/70" : "text-muted-foreground"}`}>
                <span>{productCount} منتج</span>

                <span className={`h-1 w-1 rounded-full ${brand.hero_image ? "bg-white/50" : "bg-[#D4777D]"}`} />

                <span>Flamingo Park</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            SECTIONS
        ===================================================== */}

        {sectionsWithCount.length > 0 && (
          <section className="bg-background py-7 md:py-11">
            <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
              <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                    <span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">COLLECTIONS</span>
                  </div>

                  <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[24px]">أقسام {brand.name}</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
                {sectionsWithCount.map((section) => (
                  <Link key={section.id} to={`/brands/${brand.slug || slug}/sections/${encodeURIComponent(section.slug)}`} className="group block min-w-0">
                    <div className="relative aspect-[4/4.6] overflow-hidden rounded-[15px] border border-border/60 bg-muted/40 md:rounded-[18px]">
                      {section.image_url ? (
                        <img src={optimizeImage(section.image_url, 800, 80)} alt={section.name} loading="lazy" decoding="async" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" onError={handleImageError} className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.025]" />
                      ) : (
                        <div className="absolute inset-0 bg-[#F3F0ED]" />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

                      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                        <h3 className="truncate text-[10px] font-semibold text-white md:text-[12px]">{section.name}</h3>

                        <p className="mt-1 text-[6px] text-white/70 md:text-[7px]">{section.count} منتج</p>
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

        <section className="bg-background py-7 md:py-11">
          <div className="mx-auto w-full max-w-[1400px] px-3 md:px-6">
            <div className="mb-4 flex items-end justify-between gap-3 md:mb-6">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[6px] uppercase tracking-[0.2em] text-[#B86168] md:text-[7px]">PRODUCTS</span>
                </div>

                <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-foreground md:text-[24px]">منتجات {brand.name}</h2>
              </div>

              {products.length > 0 && (
                <Link to={`/brands/${brand.slug || slug}/products`} className="flex shrink-0 items-center gap-1 border-b border-border pb-0.5 text-[7px] font-medium text-[#A95B61] transition-opacity active:opacity-60 md:text-[8px]">
                  عرض الكل
                  <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
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
              <div className="flex min-h-[200px] items-center justify-center rounded-[14px] border border-border/60 bg-white">
                <div className="text-center">
                  <p className="text-[10px] font-medium text-foreground">لا توجد منتجات حالياً</p>

                  <p className="mt-1 text-[7px] text-muted-foreground">سيتم إضافة منتجات هذه الماركة قريبًا.</p>
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