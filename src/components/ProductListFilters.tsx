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
};

export default ProductListFilters;