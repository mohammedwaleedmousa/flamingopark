import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";

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

const sortOptions: { value: ProductListFilterValues["sort"]; label: string; description: string }[] = [
  { value: "new", label: "الأحدث", description: "الأحدث وصولاً" },
  { value: "price-asc", label: "الأقل سعرًا", description: "من الأقل إلى الأعلى" },
  { value: "price-desc", label: "الأعلى سعرًا", description: "من الأعلى إلى الأقل" },
  { value: "name", label: "الاسم", description: "ترتيب أبجدي" },
];

const ProductListFilters = ({ values, brands, resultCount, onChange }: ProductListFiltersProps) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(values.query);
  const [draft, setDraft] = useState<ProductListFilterValues>(values);
  const latestValuesRef = useRef(values);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    latestValuesRef.current = values;
  }, [values]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    setSearchValue(values.query);
  }, [values.query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const latestValues = latestValuesRef.current;

      if (searchValue === latestValues.query) return;

      onChangeRef.current({
        ...latestValues,
        query: searchValue,
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (!filterOpen) return;

    const root = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = root.style.overflow;
    const previousRootOverscroll = root.style.overscrollBehavior;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;

    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      root.style.overflow = previousRootOverflow;
      root.style.overscrollBehavior = previousRootOverscroll;
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [filterOpen]);

  const activeFilterCount = useMemo(() => {
    return (values.brand !== "all" ? 1 : 0) + (values.sort !== "new" ? 1 : 0) + (values.inStockOnly ? 1 : 0) + (values.minPrice || values.maxPrice ? 1 : 0);
  }, [values.brand, values.sort, values.inStockOnly, values.minPrice, values.maxPrice]);

  const draftFilterCount = useMemo(() => {
    return (draft.brand !== "all" ? 1 : 0) + (draft.sort !== "new" ? 1 : 0) + (draft.inStockOnly ? 1 : 0) + (draft.minPrice || draft.maxPrice ? 1 : 0);
  }, [draft.brand, draft.sort, draft.inStockOnly, draft.minPrice, draft.maxPrice]);

  const currentSortLabel = sortOptions.find((option) => option.value === values.sort)?.label || "الأحدث";

  const openFilters = () => {
    setDraft(values);
    setFilterOpen(true);
  };

  const closeFilters = () => {
    setFilterOpen(false);
  };

  const applyFilters = () => {
    onChange({
      ...draft,
      query: searchValue,
    });

    setFilterOpen(false);
  };

  const clearSearch = () => {
    setSearchValue("");

    onChange({
      ...values,
      query: "",
    });
  };

  const clearAll = () => {
    setSearchValue("");
    setDraft(defaultValues);
    onChange(defaultValues);
    setFilterOpen(false);
  };

  const resetDraft = () => {
    setDraft({
      query: searchValue,
      brand: "all",
      sort: "new",
      inStockOnly: false,
      minPrice: "",
      maxPrice: "",
    });
  };

  return (
    <>
      {/* =========================================================
          MOBILE
      ========================================================= */}
      <div className="md:hidden" dir="rtl">
        <div className="flex items-center gap-2">
          {/* SEARCH */}
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 stroke-[1.5] text-[#A99C97]" />

            <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="ابحث في المنتجات..." className="h-[46px] w-full rounded-[15px] border border-[#E9DEDA] bg-white pr-10 pl-9 text-[11px] text-[#443936] outline-none placeholder:text-[#B5A9A4] focus:border-[#DDBFBA]" />

            {searchValue && (
              <button type="button" onClick={clearSearch} className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#F4EEEB] text-[#887A75]">
                <X className="h-3 w-3 stroke-[1.7]" />
              </button>
            )}
          </div>

          {/* FILTER BUTTON */}
          <button type="button" onClick={openFilters} className={`relative flex h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-[15px] border px-3.5 ${activeFilterCount > 0 ? "border-[#E0B8B5] bg-[#FFF3F1] text-[#A95B61]" : "border-[#E9DEDA] bg-white text-[#625551]"}`}>
            <SlidersHorizontal className="h-[15px] w-[15px] stroke-[1.6] text-[#C96F79]" />

            <span className="text-[10px] font-semibold">فلترة</span>

            {activeFilterCount > 0 && <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#D4777D] px-1 text-[7px] font-semibold text-white">{activeFilterCount}</span>}
          </button>
        </div>

        {/* META */}
        <div className="mt-2 flex h-6 items-center justify-between px-0.5">
          <span className="text-[8px] text-[#9B8D88]">{resultCount} منتج</span>

          <button type="button" onClick={openFilters} className="flex items-center gap-1 text-[8px] font-medium text-[#7A6965]">
            {currentSortLabel}
            <ChevronDown className="h-3 w-3 stroke-[1.4] text-[#B16A6E]" />
          </button>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeFilterCount > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {values.brand !== "all" && (
              <button type="button" onClick={() => onChange({ ...values, brand: "all" })} className="flex shrink-0 items-center gap-1 rounded-full bg-[#F9EEEC] px-2.5 py-1.5 text-[8px] font-medium text-[#9F6065]">
                {values.brand}
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            {values.sort !== "new" && (
              <button type="button" onClick={() => onChange({ ...values, sort: "new" })} className="flex shrink-0 items-center gap-1 rounded-full bg-[#F9EEEC] px-2.5 py-1.5 text-[8px] font-medium text-[#9F6065]">
                {currentSortLabel}
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            {values.inStockOnly && (
              <button type="button" onClick={() => onChange({ ...values, inStockOnly: false })} className="flex shrink-0 items-center gap-1 rounded-full bg-[#F9EEEC] px-2.5 py-1.5 text-[8px] font-medium text-[#9F6065]">
                المتوفر فقط
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            {(values.minPrice || values.maxPrice) && (
              <button type="button" onClick={() => onChange({ ...values, minPrice: "", maxPrice: "" })} className="flex shrink-0 items-center gap-1 rounded-full bg-[#F9EEEC] px-2.5 py-1.5 text-[8px] font-medium text-[#9F6065]">
                {values.minPrice || "0"} — {values.maxPrice || "∞"}
                <X className="h-2.5 w-2.5" />
              </button>
            )}

            <button type="button" onClick={clearAll} className="shrink-0 px-1.5 py-1.5 text-[8px] font-medium text-[#B75F66]">
              مسح الكل
            </button>
          </div>
        )}
      </div>

      {/* =========================================================
          DESKTOP
      ========================================================= */}
      <div className="hidden md:block" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-[#A99C97]" />

            <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="ابحث في المنتجات..." className="h-[42px] w-full rounded-[13px] border border-[#E9DEDA] bg-white pr-10 pl-9 text-[10px] text-[#443936] outline-none placeholder:text-[#B5A9A4] focus:border-[#DDBFBA]" />

            {searchValue && (
              <button type="button" onClick={clearSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9D8E89]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {brands.length > 0 && (
            <div className="relative">
              <select value={values.brand} onChange={(event) => onChange({ ...values, brand: event.target.value })} className="h-[42px] min-w-[145px] appearance-none rounded-[13px] border border-[#E9DEDA] bg-white pr-3 pl-8 text-[9px] font-medium text-[#625551] outline-none">
                <option value="all">كل الماركات</option>

                {brands.map((brand) => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A88E88]" />
            </div>
          )}

          <div className="relative">
            <select value={values.sort} onChange={(event) => onChange({ ...values, sort: event.target.value as ProductListFilterValues["sort"] })} className="h-[42px] min-w-[135px] appearance-none rounded-[13px] border border-[#E9DEDA] bg-white pr-3 pl-8 text-[9px] font-medium text-[#625551] outline-none">
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A88E88]" />
          </div>

          <button type="button" onClick={openFilters} className={`flex h-[42px] items-center gap-2 rounded-[13px] border px-4 text-[9px] font-medium ${activeFilterCount > 0 ? "border-[#DEB6B3] bg-[#FFF2F0] text-[#A95B61]" : "border-[#E9DEDA] bg-white text-[#625551]"}`}>
            <SlidersHorizontal className="h-3.5 w-3.5 stroke-[1.6] text-[#C96F79]" />
            فلاتر
            {activeFilterCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D4777D] px-1 text-[7px] text-white">{activeFilterCount}</span>}
          </button>

          <span className="shrink-0 px-2 text-[8px] text-[#9B8D88]">{resultCount} منتج</span>
        </div>
      </div>

      {/* =========================================================
          FILTER DRAWER
      ========================================================= */}
      {filterOpen && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/25 md:items-stretch" onClick={closeFilters}>
          <div onClick={(event) => event.stopPropagation()} className="relative mr-auto flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-[#FFFDFC] md:h-full md:max-h-none md:w-[410px] md:rounded-none">
            {/* HEADER */}
            <div className="sticky top-0 z-10 shrink-0 bg-[#FFFDFC] px-4 pt-3 md:px-5 md:pt-5">
              <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-[#DED2CE] md:hidden" />

              <div className="flex items-start justify-between border-b border-[#EEE4E0] pb-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                    <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FLAMINGO FILTER</span>
                  </div>

                  <h3 className="text-[18px] font-semibold text-[#403331]">تصفية المنتجات</h3>

                  <p className="mt-1 text-[8px] text-[#9E908A]">{resultCount} منتج</p>
                </div>

                <button type="button" aria-label="إغلاق الفلترة" onClick={closeFilters} className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8DEDA] bg-white text-[#6C5E59]">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overscroll-contain overflow-y-auto px-4 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-5">
              {/* SORT */}
              <div className="border-b border-[#F0E7E3] py-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-[#493B38]">الترتيب</p>

                  {draft.sort !== "new" && <button type="button" onClick={() => setDraft({ ...draft, sort: "new" })} className="text-[7px] text-[#B76269]">مسح</button>}
                </div>

                <div className="space-y-1">
                  {sortOptions.map((option) => {
                    const active = draft.sort === option.value;

                    return (
                      <button key={option.value} type="button" onClick={() => setDraft({ ...draft, sort: option.value })} className="flex min-h-[52px] w-full items-center justify-between border-b border-[#F2EAE7] text-right last:border-0">
                        <div>
                          <span className={`block text-[9px] font-semibold ${active ? "text-[#AC5B62]" : "text-[#5A4C48]"}`}>{option.label}</span>
                          <span className="mt-1 block text-[6px] text-[#A99C96]">{option.description}</span>
                        </div>

                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-[#C96F79] bg-[#C96F79]" : "border-[#DDD2CE] bg-white"}`}>
                          {active && <Check className="h-2.5 w-2.5 stroke-[2.2] text-white" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* BRAND */}
              {brands.length > 0 && (
                <div className="border-b border-[#F0E7E3] py-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#493B38]">الماركة</p>
                      <p className="mt-1 text-[7px] text-[#A99B95]">{brands.length} ماركة</p>
                    </div>

                    {draft.brand !== "all" && <button type="button" onClick={() => setDraft({ ...draft, brand: "all" })} className="text-[7px] text-[#B76269]">مسح</button>}
                  </div>

                  <div className="max-h-[150px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setDraft({ ...draft, brand: "all" })} className={`min-h-[38px] rounded-[11px] border px-3 text-right text-[8px] font-medium ${draft.brand === "all" ? "border-[#D89C9D] bg-[#FAEDEC] text-[#A95B61]" : "border-[#E9DEDA] bg-white text-[#655753]"}`}>كل الماركات</button>

                      {brands.map((brand) => (
                        <button key={brand} type="button" onClick={() => setDraft({ ...draft, brand })} className={`min-h-[38px] truncate rounded-[11px] border px-3 text-right text-[8px] font-medium ${draft.brand === brand ? "border-[#D89C9D] bg-[#FAEDEC] text-[#A95B61]" : "border-[#E9DEDA] bg-white text-[#655753]"}`}>{brand}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* PRICE */}
              <div className="border-b border-[#F0E7E3] py-5">
                <div className="mb-3">
                  <p className="text-[11px] font-semibold text-[#493B38]">نطاق السعر</p>
                  <p className="mt-1 text-[7px] text-[#A99B95]">أدخل السعر الأدنى والأعلى</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="relative">
                    <span className="absolute right-3 top-2 text-[6px] text-[#A79994]">من</span>

                    <input type="number" inputMode="numeric" min="0" value={draft.minPrice} onChange={(event) => setDraft({ ...draft, minPrice: event.target.value })} placeholder="0" className="h-[52px] w-full rounded-[13px] border border-[#E8DEDA] bg-white px-3 pt-3 text-[11px] font-medium text-[#5A4C48] outline-none focus:border-[#D9B6B3]" />
                  </label>

                  <label className="relative">
                    <span className="absolute right-3 top-2 text-[6px] text-[#A79994]">إلى</span>

                    <input type="number" inputMode="numeric" min="0" value={draft.maxPrice} onChange={(event) => setDraft({ ...draft, maxPrice: event.target.value })} placeholder="∞" className="h-[52px] w-full rounded-[13px] border border-[#E8DEDA] bg-white px-3 pt-3 text-[11px] font-medium text-[#5A4C48] outline-none focus:border-[#D9B6B3]" />
                  </label>
                </div>
              </div>

              {/* STOCK */}
              <div className="py-5">
                <button type="button" onClick={() => setDraft({ ...draft, inStockOnly: !draft.inStockOnly })} className={`flex h-[52px] w-full items-center justify-between rounded-[14px] border px-3.5 ${draft.inStockOnly ? "border-[#D9A4A2] bg-[#FAEDEC]" : "border-[#EAE0DC] bg-white"}`}>
                  <div className="text-right">
                    <span className={`block text-[9px] font-semibold ${draft.inStockOnly ? "text-[#AA5C62]" : "text-[#5A4C48]"}`}>المتوفر فقط</span>
                    <span className="mt-1 block text-[6px] text-[#A99C96]">إخفاء المنتجات غير المتوفرة</span>
                  </div>

                  <span className={`flex h-5 w-5 items-center justify-center rounded-[6px] border ${draft.inStockOnly ? "border-[#C96F79] bg-[#C96F79]" : "border-[#D9CECA] bg-white"}`}>
                    {draft.inStockOnly && <Check className="h-3 w-3 text-white" />}
                  </span>
                </button>
              </div>
            </div>

            {/* BOTTOM */}
            <div className="shrink-0 border-t border-[#EDE4E0] bg-[#FFFDFC] px-4 pb-[calc(env(safe-area-inset-bottom)+13px)] pt-3 md:px-5 md:pb-5">
              <div className="grid grid-cols-[.8fr_1.4fr] gap-2.5">
                <button type="button" onClick={resetDraft} className="h-[46px] rounded-[13px] border border-[#DFD3CF] bg-white text-[9px] font-medium text-[#6D5F5A]">
                  إعادة تعيين
                </button>

                <button type="button" onClick={applyFilters} className="relative h-[46px] rounded-[13px] bg-[#D4777D] text-[10px] font-semibold text-white">
                  عرض النتائج

                  {draftFilterCount > 0 && <span className="absolute left-3 top-1/2 flex h-[17px] min-w-[17px] -translate-y-1/2 items-center justify-center rounded-full bg-white/20 px-1 text-[7px] text-white">{draftFilterCount}</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductListFilters;
