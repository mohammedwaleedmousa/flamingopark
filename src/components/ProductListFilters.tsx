import { Search, X } from "lucide-react";

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

const fieldClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm text-muted-foreground outline-none focus:border-ring focus:text-foreground";

const ProductListFilters = ({ values, brands, resultCount, onChange }: ProductListFiltersProps) => {
  const update = (next: Partial<ProductListFilterValues>) => onChange({ ...values, ...next });
  const isDirty = JSON.stringify(values) !== JSON.stringify(defaultValues);

  return (
    <div className="mb-6 space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={values.query}
            onChange={(event) => update({ query: event.target.value })}
            placeholder="ابحث في المنتجات"
            className={`${fieldClass} w-full pr-8 text-foreground`}
          />
        </div>

        {brands.length > 0 && (
          <select value={values.brand} onChange={(event) => update({ brand: event.target.value })} className={fieldClass}>
            <option value="all">كل الماركات</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        )}

        <select
          value={values.sort}
          onChange={(event) => update({ sort: event.target.value as ProductListFilterValues["sort"] })}
          className={fieldClass}
        >
          <option value="new">الأحدث</option>
          <option value="price-asc">السعر: الأقل أولاً</option>
          <option value="price-desc">السعر: الأعلى أولاً</option>
          <option value="name">الاسم</option>
        </select>

        <input
          value={values.minPrice}
          onChange={(event) => update({ minPrice: event.target.value })}
          inputMode="numeric"
          placeholder="من"
          className={`${fieldClass} w-20 text-foreground`}
        />
        <input
          value={values.maxPrice}
          onChange={(event) => update({ maxPrice: event.target.value })}
          inputMode="numeric"
          placeholder="إلى"
          className={`${fieldClass} w-20 text-foreground`}
        />

        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={values.inStockOnly}
            onChange={(event) => update({ inStockOnly: event.target.checked })}
          />
          المتوفر فقط
        </label>

        {isDirty && (
          <button
            type="button"
            onClick={() => onChange(defaultValues)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            مسح
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{resultCount} منتج</p>
    </div>
  );
};

export default ProductListFilters;