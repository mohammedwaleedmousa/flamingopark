import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import ProductListFilters, {
  type ProductListFilterValues,
} from "@/components/ProductListFilters";

import { supabase } from "@/integrations/supabase/client";
import {
  useSiteContent,
  getSiteText,
} from "@/hooks/useSiteContent";

import { Button } from "@/components/ui/button";

import {
  PRODUCT_CARD_SELECT,
  mapProductCard,
} from "@/lib/productCardData";

import {
  restoreCatalogScroll,
} from "@/lib/catalogScroll";

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
  women:
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=640&q=65",

  men:
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=640&q=65",

  kids:
    "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=640&q=65",

  bags:
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=640&q=65",

  shoes:
    "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=640&q=65",

  beauty:
    "https://images.unsplash.com/photo-1522335789203-aaa2a87b6ed8?w=640&q=65",
};

const CategoriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const location = useLocation();

  const { data: content } =
    useSiteContent("categories_page_");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-all-active"],

    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select(
          "id,slug,name,name_ar,parent_id,image_url,sort_order"
        )
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      return data as unknown as Category[];
    },
  });

  const parentSlug =
    searchParams.get("parent") || "";

  const subSlug =
    searchParams.get("sub") || "";

  const brandFilter =
    searchParams.get("brand") || "all";

  const productQuery =
    searchParams.get("q") || "";

  const productSort = (
    searchParams.get("sort") || "new"
  ) as ProductListFilterValues["sort"];

  const inStockOnly =
    searchParams.get("stock") === "1";

  const minPrice =
    searchParams.get("min") || "";

  const maxPrice =
    searchParams.get("max") || "";

  const [brandOpen, setBrandOpen] =
    useState(false);

  const parents = useMemo(
    () =>
      categories.filter(
        (category) => !category.parent_id
      ),
    [categories]
  );

  const selectedParent = useMemo(
    () =>
      parents.find(
        (parent) =>
          parent.slug === parentSlug
      ) || null,
    [parents, parentSlug]
  );

  const subCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          selectedParent &&
          category.parent_id ===
            selectedParent.id
      ),
    [categories, selectedParent]
  );

  const selectedSub = useMemo(
    () =>
      subCategories.find(
        (sub) => sub.slug === subSlug
      ) || null,
    [subCategories, subSlug]
  );

  const activeProductCategory =
    selectedSub ||
    (selectedParent &&
    subCategories.length === 0
      ? selectedParent
      : null);

  const page = Math.max(
    1,
    Number(
      searchParams.get("page") || 1
    )
  );

  const PAGE_SIZE = 24;

  const scopedCategoryIds = useMemo(() => {
    if (!activeProductCategory) {
      return [] as string[];
    }

    return [activeProductCategory.id];
  }, [activeProductCategory]);

  useEffect(() => {
    if (subSlug && !selectedSub) {
      setSearchParams(
        (current) => {
          const next =
            new URLSearchParams(current);

          next.delete("sub");
          next.delete("brand");
          next.delete("page");

          return next;
        },
        { replace: true }
      );
    }
  }, [
    selectedSub,
    setSearchParams,
    subSlug,
  ]);

  const productQueries = useQueries({
    queries: Array.from(
      { length: page },
      (_, pageIndex) => ({
        queryKey: [
          "categories-leaf-products",
          scopedCategoryIds.join(","),
          brandFilter,
          productQuery,
          productSort,
          inStockOnly,
          minPrice,
          maxPrice,
          pageIndex + 1,
        ],

        enabled:
          scopedCategoryIds.length > 0,

        queryFn: async () => {
          const from =
            pageIndex * PAGE_SIZE;

          let query = supabase
            .from("products")
            .select(PRODUCT_CARD_SELECT)
            .eq("is_active", true)
            .in(
              "category_id",
              scopedCategoryIds
            );

          if (brandFilter !== "all") {
            query = query.eq(
              "brand",
              brandFilter
            );
          }

          if (productQuery.trim()) {
            query = query.or(
              `name_ar.ilike.%${productQuery.trim()}%,name.ilike.%${productQuery.trim()}%,description_ar.ilike.%${productQuery.trim()}%`
            );
          }

          if (inStockOnly) {
            query = query.eq(
              "in_stock",
              true
            );
          }

          if (Number(minPrice) > 0) {
            query = query.gte(
              "price",
              Number(minPrice)
            );
          }

          if (Number(maxPrice) > 0) {
            query = query.lte(
              "price",
              Number(maxPrice)
            );
          }

          if (
            productSort === "price-asc"
          ) {
            query = query.order(
              "price",
              { ascending: true }
            );
          } else if (
            productSort === "price-desc"
          ) {
            query = query.order(
              "price",
              { ascending: false }
            );
          } else if (
            productSort === "name"
          ) {
            query = query.order(
              "name_ar",
              { ascending: true }
            );
          } else {
            query = query.order(
              "created_at",
              { ascending: false }
            );
          }

          const { data, error } =
            await query.range(
              from,
              from + PAGE_SIZE - 1
            );

          if (error) throw error;

          return (data || []).map(
            mapProductCard
          );
        },
      })
    ),
  });

  const leafProducts = useMemo(() => {
    const seen = new Set<string>();

    return productQueries
      .flatMap(
        (query) => query.data || []
      )
      .filter((product) => {
        if (seen.has(product.id)) {
          return false;
        }

        seen.add(product.id);

        return true;
      });
  }, [productQueries]);

  const productsLoading =
    productQueries.some(
      (query) => query.isLoading
    );

  const leafPage =
    productQueries[
      productQueries.length - 1
    ]?.data || [];

  const hasMore =
    leafPage.length === PAGE_SIZE;

  useEffect(() => {
    if (
      !productsLoading &&
      leafProducts.length > 0
    ) {
      restoreCatalogScroll(
        `${location.pathname}${location.search}`
      );
    }
  }, [
    productsLoading,
    leafProducts.length,
    location.pathname,
    location.search,
  ]);

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          leafProducts
            .map((product) =>
              product.brand?.trim()
            )
            .filter(Boolean)
        )
      ) as string[],
    [leafProducts]
  );

  const availableBrands = brands;

  const visibleProducts = useMemo(() => {
    if (brandFilter === "all") {
      return leafProducts;
    }

    return leafProducts.filter(
      (product) =>
        product.brand?.trim() ===
        brandFilter
    );
  }, [leafProducts, brandFilter]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [subSlug, parentSlug]);

  useEffect(() => {
    setBrandOpen(false);
  }, [parentSlug, subSlug]);

  const setStepParams = (
    next: Record<string, string | null>
  ) => {
    const params =
      new URLSearchParams(
        searchParams
      );

    Object.entries(next).forEach(
      ([key, value]) => {
        if (!value) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
    );

    if (!("page" in next)) {
      params.delete("page");
    }

    setSearchParams(params);

    if (!("page" in next)) {
      requestAnimationFrame(() =>
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: "auto",
        })
      );
    }
  };

  const updateProductFilters = (
    values: ProductListFilterValues
  ) => {
    setStepParams({
      brand:
        values.brand === "all"
          ? null
          : values.brand,

      q:
        values.query || null,

      sort:
        values.sort === "new"
          ? null
          : values.sort,

      stock:
        values.inStockOnly
          ? "1"
          : null,

      min:
        values.minPrice || null,

      max:
        values.maxPrice || null,
    });
  };

  return (
    <div
      className="min-h-screen bg-white"
      dir="rtl"
    >
      <Navbar />

      <CartDrawer />

      <main className="pb-20">

        {/* PAGE INTRO */}
        {!activeProductCategory && (
          <section className="container mx-auto px-4 pt-8 md:px-8 md:pt-12">
            <div className="mx-auto max-w-xl text-center">

              <span className="mb-3 inline-block text-[10px] font-semibold tracking-[0.16em] text-[#E85A91]">
                {getSiteText(
                  content,
                  "categories_page_eyebrow",
                  "FLAMINGO"
                )}
              </span>

              <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#2A2024] md:text-5xl">
                {getSiteText(
                  content,
                  "categories_page_title",
                  "تسوّقي حسب القسم"
                )}
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-[12px] leading-6 text-black/45 md:text-sm">
                {getSiteText(
                  content,
                  "categories_page_subtitle",
                  "اكتشفي ما يناسبك من مجموعات مختارة بعناية"
                )}
              </p>
            </div>
          </section>
        )}

        {/* BREADCRUMB + BRAND */}
        {activeProductCategory && (
          <section className="container mx-auto px-4 pt-6 md:px-8">
            <div className="flex items-center justify-between gap-3">

              {/* BREADCRUMB */}
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-black/40">

                <button
                  type="button"
                  onClick={() =>
                    setStepParams({
                      parent: null,
                      sub: null,
                      brand: null,
                    })
                  }
                  className="shrink-0 hover:text-[#E85A91]"
                >
                  الأقسام
                </button>

                {selectedParent && (
                  <>
                    <ChevronLeft
                      size={12}
                      className="shrink-0 text-black/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setStepParams({
                          sub: null,
                          brand: null,
                        })
                      }
                      className="max-w-[110px] truncate text-black/60 hover:text-[#E85A91]"
                    >
                      {selectedParent.name_ar}
                    </button>
                  </>
                )}

                {selectedSub && (
                  <>
                    <ChevronLeft
                      size={12}
                      className="shrink-0 text-black/20"
                    />

                    <span className="max-w-[110px] truncate font-semibold text-[#282023]">
                      {selectedSub.name_ar}
                    </span>
                  </>
                )}
              </div>

              {/* BRAND */}
              {availableBrands.length > 0 && (
                <div className="relative shrink-0">

                  <button
                    type="button"
                    onClick={() =>
                      setBrandOpen(
                        (current) =>
                          !current
                      )
                    }
                    className="
                      flex h-9 items-center gap-1.5
                      rounded-xl
                      border border-[#EEE8EB]
                      bg-white
                      px-3
                      text-[11px] font-semibold
                      text-[#40363A]
                      hover:border-[#F1C8D8]
                    "
                  >
                    <span>
                      {brandFilter === "all"
                        ? "الماركات"
                        : brandFilter}
                    </span>

                    <ChevronDown
                      size={14}
                      className={`text-[#E85A91] ${
                        brandOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {brandOpen && (
                    <div
                      className="
                        absolute left-0 top-11 z-50
                        w-52
                        overflow-hidden
                        rounded-2xl
                        border border-[#EFEAEC]
                        bg-white
                        shadow-[0_16px_40px_-20px_rgba(0,0,0,0.22)]
                      "
                    >
                      <div className="max-h-64 overflow-y-auto p-2">

                        <button
                          type="button"
                          onClick={() => {
                            setStepParams({
                              brand: null,
                            });

                            setBrandOpen(false);
                          }}
                          className={`
                            w-full
                            rounded-xl
                            px-3 py-2.5
                            text-right
                            text-xs
                            ${
                              brandFilter ===
                              "all"
                                ? "bg-[#FFF3F7] font-semibold text-[#E85A91]"
                                : "text-black/65 hover:bg-[#FAFAFA]"
                            }
                          `}
                        >
                          كل الماركات
                        </button>

                        {availableBrands.map(
                          (brand) => (
                            <button
                              key={brand}
                              type="button"
                              onClick={() => {
                                setStepParams({
                                  brand,
                                });

                                setBrandOpen(
                                  false
                                );
                              }}
                              className={`
                                w-full
                                rounded-xl
                                px-3 py-2.5
                                text-right
                                text-xs
                                ${
                                  brandFilter ===
                                  brand
                                    ? "bg-[#FFF3F7] font-semibold text-[#E85A91]"
                                    : "text-black/65 hover:bg-[#FAFAFA]"
                                }
                              `}
                            >
                              {brand}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* PARENT CATEGORIES */}
        {!selectedParent && (
          <section className="container mx-auto px-4 pb-6 pt-8 md:px-8 md:pt-10">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">

              {parents.map(
                (category, index) => (
                  <Link
                    key={category.id}
                    to={`/categories?parent=${category.slug}`}
                    className="
                      group
                      relative
                      overflow-hidden
                      rounded-[22px]
                      bg-[#F7F7F7]
                      aspect-[4/5]
                    "
                  >
                    <img
                      src={
                        category.image_url ||
                        FALLBACK[
                          category.slug
                        ] ||
                        FALLBACK.women
                      }
                      alt={
                        category.name_ar
                      }
                      loading={
                        index < 2
                          ? "eager"
                          : "lazy"
                      }
                      fetchPriority={
                        index < 2
                          ? "high"
                          : "auto"
                      }
                      decoding="async"
                      className="
                        h-full w-full
                        object-cover
                        md:group-hover:scale-[1.025]
                        md:transition-transform
                        md:duration-300
                      "
                    />

                    {/* Soft readable overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />

                    {/* LABEL */}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-right md:p-5">

                      {category.name && (
                        <p className="mb-1 text-[9px] font-medium tracking-[0.12em] text-white/65">
                          {category.name}
                        </p>
                      )}

                      <div className="flex items-end justify-between gap-2">

                        <h3 className="text-[19px] font-bold leading-tight text-white md:text-2xl">
                          {category.name_ar}
                        </h3>

                        <span
                          className="
                            flex h-8 w-8 shrink-0
                            items-center justify-center
                            rounded-full
                            bg-white/95
                            text-[#E85A91]
                          "
                        >
                          <ChevronLeft
                            size={16}
                            strokeWidth={2}
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              )}
            </div>
          </section>
        )}

        {/* SUB CATEGORIES */}
        {selectedParent &&
          !selectedSub &&
          subCategories.length > 0 && (
            <section className="container mx-auto px-4 pb-8 pt-6 md:px-8">

              <div className="mb-5">
                <p className="text-[10px] font-semibold text-[#E85A91]">
                  {selectedParent.name}
                </p>

                <h2 className="mt-1 text-2xl font-bold tracking-[-0.02em] text-[#282023]">
                  {selectedParent.name_ar}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">

                {subCategories.map(
                  (category, index) => (
                    <Link
                      key={category.id}
                      to={`/categories?parent=${selectedParent.slug}&sub=${category.slug}`}
                      onClick={() => {
                        window.scrollTo({
                          top: 0,
                          behavior:
                            "instant",
                        });
                      }}
                      className="
                        group
                        overflow-hidden
                        rounded-[20px]
                        border border-black/[0.045]
                        bg-white
                      "
                    >
                      {/* IMAGE */}
                      <div className="aspect-square overflow-hidden bg-[#F7F7F7]">

                        <img
                          src={
                            category.image_url ||
                            FALLBACK[
                              category.slug
                            ] ||
                            FALLBACK.women
                          }
                          alt={
                            category.name_ar
                          }
                          loading={
                            index < 2
                              ? "eager"
                              : "lazy"
                          }
                          decoding="async"
                          className="
                            h-full w-full
                            object-cover
                            md:group-hover:scale-[1.025]
                            md:transition-transform
                            md:duration-300
                          "
                        />
                      </div>

                      {/* CONTENT */}
                      <div className="flex items-center justify-between gap-2 px-3 py-3">

                        <div className="min-w-0">
                          <h3 className="truncate text-[13px] font-semibold text-[#30272B] md:text-sm">
                            {
                              category.name_ar
                            }
                          </h3>

                          {category.name && (
                            <p className="mt-0.5 truncate text-[9px] text-black/35">
                              {
                                category.name
                              }
                            </p>
                          )}
                        </div>

                        <ChevronLeft
                          size={15}
                          className="shrink-0 text-[#E85A91]"
                        />
                      </div>
                    </Link>
                  )
                )}
              </div>
            </section>
          )}

        {/* PRODUCTS */}
        {!!activeProductCategory && (
          <section className="container mx-auto space-y-5 px-4 pb-8 pt-5 md:px-8">

            {/* CATEGORY TITLE */}
            <div>
              <p className="text-[10px] font-semibold text-[#E85A91]">
                منتجات
              </p>

              <h1 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-[#282023] md:text-3xl">
                {
                  activeProductCategory.name_ar
                }
              </h1>

              <p className="mt-1 text-[11px] text-black/40">
                {visibleProducts.length} منتج
              </p>
            </div>

            <ProductListFilters
              values={{
                query: productQuery,
                brand: brandFilter,
                sort: productSort,
                inStockOnly,
                minPrice,
                maxPrice,
              }}
              brands={availableBrands}
              resultCount={
                visibleProducts.length
              }
              onChange={
                updateProductFilters
              }
            />

            {productsLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">

                {Array.from({
                  length: 8,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-2xl"
                  >
                    <div className="aspect-[3/4] animate-pulse rounded-2xl bg-[#F4F4F4]" />

                    <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-[#F2F2F2]" />

                    <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#F2F2F2]" />
                  </div>
                ))}
              </div>
            ) : visibleProducts.length ===
              0 ? (
              <div
                className="
                  rounded-[24px]
                  border border-[#EFEAEC]
                  bg-[#FCFBFC]
                  px-5 py-14
                  text-center
                "
              >
                <p className="text-sm font-semibold text-[#342B2F]">
                  لا توجد منتجات حالياً
                </p>

                <p className="mt-2 text-xs text-black/40">
                  جرّبي تغيير الفلاتر أو اختيار ماركة أخرى
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
                  {visibleProducts.map(
                    (
                      product,
                      index
                    ) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        index={index}
                      />
                    )
                  )}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-5">

                    <Button
                      variant="outline"
                      onClick={() => {
                        setStepParams({
                          page: String(
                            page + 1
                          ),
                        });
                      }}
                      className="
                        h-11
                        rounded-xl
                        border-[#EBDDE3]
                        bg-white
                        px-8
                        text-xs
                        font-semibold
                        text-[#44373D]
                        hover:border-[#E85A91]/40
                        hover:bg-[#FFF7FA]
                        hover:text-[#E85A91]
                      "
                    >
                      عرض المزيد
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CategoriesPage;