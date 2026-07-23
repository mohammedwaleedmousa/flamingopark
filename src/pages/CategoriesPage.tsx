import { Link, useSearchParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, getSiteText } from "@/hooks/useSiteContent";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import type { Product } from "@/store/useStore";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: content } = useSiteContent("categories_page_");
  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-for-hierarchy"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const parentSlug = searchParams.get("parent") || "";
  const subSlug = searchParams.get("sub") || "";
  const brandFilter = searchParams.get("brand") || "all";

  const parents = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const selectedParent = useMemo(() => parents.find((p) => p.slug === parentSlug) || null, [parents, parentSlug]);
  const subCategories = useMemo(
    () => categories.filter((c) => selectedParent && c.parent_id === selectedParent.id),
    [categories, selectedParent],
  );
  const selectedSub = useMemo(() => subCategories.find((s) => s.slug === subSlug) || null, [subCategories, subSlug]);
  const showAllForParent = searchParams.get("all") === "1";

  const effectiveLeafCategory = selectedSub
    ? selectedSub
    : selectedParent && (subCategories.length === 0 || showAllForParent)
      ? selectedParent
      : null;

  const effectiveLeafSlug = effectiveLeafCategory?.slug || "";

  const scopedCategoryIds = useMemo(() => {
    if (!effectiveLeafCategory) return [] as string[];
    if (selectedSub) return [selectedSub.id];
    const descendants = categories.filter((c) => c.parent_id === effectiveLeafCategory.id).map((c) => c.id);
    return [effectiveLeafCategory.id, ...descendants];
  }, [categories, effectiveLeafCategory, selectedSub]);
  const scopedCategorySlugs = useMemo(() => {
    if (!effectiveLeafCategory) return [] as string[];
    if (selectedSub) return [selectedSub.slug];
    const descendants = categories.filter((c) => c.parent_id === effectiveLeafCategory.id).map((c) => c.slug);
    return [effectiveLeafCategory.slug, ...descendants];
  }, [categories, effectiveLeafCategory, selectedSub]);

  const { data: leafProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["categories-leaf-products", effectiveLeafSlug, scopedCategoryIds.join(","), scopedCategorySlugs.join(",")],
    enabled: !!effectiveLeafSlug,
    queryFn: async () => {
      const slugList = scopedCategorySlugs.map((s) => `"${s}"`).join(",");
      const idList = scopedCategoryIds.join(",");
      const orFilter = [
        slugList ? `category.in.(${slugList})` : null,
        idList ? `category_id.in.(${idList})` : null,
      ]
        .filter(Boolean)
        .join(",");
      const { data, error } = await supabase
        .from("products")
        .select("id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,variants,color_variants")
        .eq("is_active", true)
        .or(orFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;

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
        images:
  p.images?.length > 0
    ? p.images
    : ((p as any).color_variants?.[0]?.images || []),
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["GLOBAL"]) as Product["countries"],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
        variants: p.variants || undefined,
        ...(p.color_variants ? { color_variants: p.color_variants } : {}),
      })) as Product[];
    },
  });

  const brands = useMemo(() => {
    const set = new Set<string>();
    leafProducts.forEach((p) => {
      if (p.brand?.trim()) set.add(p.brand.trim());
    });
    return Array.from(set);
  }, [leafProducts]);

  const { data: mappedBrands = [] } = useQuery({
    queryKey: ["categories-mapped-brands", effectiveLeafCategory?.id],
    enabled: !!effectiveLeafCategory,
    queryFn: async () => {
      const { data: links, error: linkError } = await (supabase as any)
        .from("brand_categories")
        .select("brand_id")
        .eq("category_id", effectiveLeafCategory!.id);
      if (linkError) throw linkError;

      const brandIds = (links || []).map((row: any) => row.brand_id).filter(Boolean);
      if (brandIds.length === 0) return [] as string[];

      const { data: rows, error: brandsError } = await supabase
        .from("brands")
        .select("name")
        .eq("is_active", true)
        .in("id", brandIds as string[]);
      if (brandsError) throw brandsError;

      return Array.from(new Set((rows || []).map((r: any) => (r.name || "").trim()).filter(Boolean)));
    },
  });

  const availableBrands = mappedBrands.length > 0 ? mappedBrands : brands;

  const visibleProducts = useMemo(() => {
    if (brandFilter === "all") return leafProducts;
    return leafProducts.filter((p) => p.brand?.trim() === brandFilter);
  }, [leafProducts, brandFilter]);

  const setStepParams = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) p.delete(key);
      else p.set(key, value);
    });
    setSearchParams(p);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <section className="container mx-auto px-6 mb-10 text-center">
          <p className="text-[10px] tracking-[0.08em] uppercase text-muted-foreground mb-3">{getSiteText(content, "categories_page_eyebrow", " ")}</p>
          <h1 className="font-heading text-4xl md:text-6xl">{getSiteText(content, "categories_page_title", "الأقسام")}</h1>
          <p className="text-sm text-muted-foreground mt-3">{getSiteText(content, "categories_page_subtitle", "اختاري القسم ثم الماركة واستعرضي المنتجات")}</p>

          {(selectedParent || selectedSub) && (
            <div className="
            mt-8
            flex
            items-center
            justify-center
            gap-3
            text-xs
            tracking-[0.15em]
            uppercase
          ">
            <button
              onClick={() =>
                setStepParams({
                  parent:null,
                  sub:null,
                  brand:null
                })
              }
              className="
                text-muted-foreground
                hover:text-foreground
                transition-colors
                duration-300
              "
            >
              الأقسام
            </button>
            {selectedParent && (
              <>
                <span className="text-muted-foreground/40">
                  /
                </span>
                <button
                  onClick={() =>
                    setStepParams({
                      sub:null,
                      brand:null
                    })
                  }
                  className="
                    text-foreground
                    hover:opacity-60
                    transition-opacity
                    duration-300
                  "
                >
                  {selectedParent.name_ar}
                </button>
              </>
            )}


            {selectedSub && (
              <>
                <span className="text-muted-foreground/40">
                  /
                </span>

                <button
                  onClick={() =>
                    setStepParams({
                      brand:null
                    })
                  }
                  className="
                    text-muted-foreground
                    hover:text-foreground
                    transition-colors
                    duration-300
                  "
                >
                  {selectedSub.name_ar}
                </button>
              </>
            )}

          </div>
          )}
        </section>

        {!selectedParent && (
          <section className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              {parents.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories?parent=${c.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={c.image_url || FALLBACK[c.slug] || FALLBACK.women}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-center text-white">
                    <p className="text-[10px] tracking-[0.4em] uppercase opacity-70 mb-1">{c.name}</p>
                    <h3 className="font-heading text-xl md:text-2xl">{c.name_ar}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {selectedParent && !selectedSub && subCategories.length > 0 && (
          <section className="container mx-auto px-4 md:px-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
              {subCategories.map((c) => (
                <Link
                  key={c.id}
                  to={`/categories?parent=${selectedParent.slug}&sub=${c.slug}`}
                  className="group relative aspect-[4/5] overflow-hidden bg-muted"
                >
                  <img
                    src={c.image_url || FALLBACK[c.slug] || FALLBACK.women}
                    alt={c.name_ar}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-center text-white">
                    <h3 className="font-heading text-lg md:text-xl">{c.name_ar}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!!effectiveLeafSlug && (
          <section className="container mx-auto px-4 md:px-6 space-y-5">
            <div className="text-center">
              <h2 className="font-heading text-2xl">{selectedSub?.name_ar || selectedParent?.name_ar}</h2>
              <p className="text-sm text-muted-foreground mt-1">اختاري الماركة ثم شاهدي المنتجات</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant={brandFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStepParams({ brand: null })}
              >
                كل الماركات
              </Button>
              {availableBrands.map((brand) => (
                <Button
                  key={brand}
                  variant={brandFilter === brand ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStepParams({ brand })}
                >
                  {brand}
                </Button>
              ))}
            </div>

            {productsLoading ? (
              <div className="text-center py-12 text-muted-foreground">جاري تحميل المنتجات...</div>
            ) : visibleProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">لا توجد منتجات لهذه الماركة داخل هذا القسم</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {visibleProducts.map((product, index) => (
                  <ProductCard key={product.id} product={product} index={index} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CategoriesPage;