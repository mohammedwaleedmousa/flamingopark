import type { Product } from "@/store/useStore";

// Fields required by product cards, list filters, and Quick View. Detail-only payloads
// (accessories, specs, policies, inventory metadata) stay on the product detail route.
export const PRODUCT_CARD_SELECT = "id,name,name_ar,slug,price,original_price,discount,description,description_ar,images,category,brand,in_stock,countries,is_featured,is_best_seller,color_variants,sizes";

type ProductCardRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  slug: string;
  price: number | string;
  original_price: number | string | null;
  discount: number | null;
  description: string | null;
  description_ar: string | null;
  images: string[] | null;
  category: string | null;
  brand: string | null;
  in_stock: boolean | null;
  countries: string[] | null;
  is_featured: boolean | null;
  is_best_seller: boolean | null;
  color_variants: unknown;
  sizes: string[] | null;
};

export const mapProductCard = (row: ProductCardRow): Product => {
  const colorVariants = Array.isArray(row.color_variants) ? row.color_variants : [];
  return {
    id: row.id,
    name: row.name || "",
    nameAr: row.name_ar || "",
    slug: row.slug,
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    discount: row.discount || undefined,
    description: row.description || "",
    descriptionAr: row.description_ar || "",
    images: row.images?.length ? row.images : ((colorVariants[0] as { images?: string[] } | undefined)?.images || []),
    category: row.category || "",
    brand: row.brand || "",
    inStock: row.in_stock ?? true,
    countries: (row.countries || ["GLOBAL"]) as Product["countries"],
    isFeatured: row.is_featured ?? undefined,
    isBestSeller: row.is_best_seller ?? undefined,
    color_variants: colorVariants,
    sizes: row.sizes || [],
  } as Product;
};
