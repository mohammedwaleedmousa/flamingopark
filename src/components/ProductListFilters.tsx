import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type ProductListFilterValues = {
  query: string;
  brand: string;
  sort: "new" | "price-asc" | "price-desc" | "name";
  inStockOnly: boolean;
  minPrice: string;
  maxPrice: string;
};

interface ProductListFiltersProps {
  values: ProductListFilterValues;
  brands: string[];
  resultCount: number;
  onChange: (values: ProductListFilterValues) => void;
}

const defaultValues: ProductListFilterValues = {
  query: "",
  brand: "all",
  sort: "new",
  inStockOnly: false,
  minPrice: "",
  maxPrice: "",
};

const ProductListFilters = ({ values, brands, resultCount, onChange }: ProductListFiltersProps) => {
  const update = (next: Partial<ProductListFilterValues>) => onChange({ ...values, ...next });
  const hasActiveFilters = values.query || values.brand !== "all" || values.sort !== "new" || values.inStockOnly || values.minPrice || values.maxPrice;

  return (
    <section className="mb-6 border border-border/70 bg-card p-4" aria-label="فلترة المنتجات">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          فلترة المنتجات
        </div>
        <span className="text-xs text-muted-foreground">{resultCount} منتج</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_130px_130px]">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={values.query} onChange={(event) => update({ query: event.target.value })} placeholder="ابحث في المنتجات" className="pr-10" />
        </div>
        <select value={values.brand} onChange={(event) => update({ brand: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">كل الماركات</option>
          {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
        </select>
        <select value={values.sort} onChange={(event) => update({ sort: event.target.value as ProductListFilterValues["sort"] })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="new">الأحدث</option>
          <option value="price-asc">السعر: الأقل</option>
          <option value="price-desc">السعر: الأعلى</option>
          <option value="name">الاسم</option>
        </select>
        <Input inputMode="numeric" value={values.minPrice} onChange={(event) => update({ minPrice: event.target.value })} placeholder="أقل سعر" />
        <Input inputMode="numeric" value={values.maxPrice} onChange={(event) => update({ maxPrice: event.target.value })} placeholder="أعلى سعر" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" aria-pressed={values.inStockOnly} onClick={() => update({ inStockOnly: !values.inStockOnly })} className={`h-9 border px-3 text-sm transition-colors ${values.inStockOnly ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
          المتوفر فقط
        </button>
        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(defaultValues)} className="gap-1">
            <X className="h-4 w-4" /> مسح الفلاتر
          </Button>
        )}
      </div>
    </section>
  );
};

export default ProductListFilters;