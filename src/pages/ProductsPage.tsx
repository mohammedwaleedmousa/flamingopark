import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCardMinimal from "@/components/ProductCardMinimal";
import { useStore, Product } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";

type CountryType = "SA" | "YE";

const ProductsPage = () => {
  const { country: storeCountry, setCountry } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local country selection for this page
  const [selectedCountry, setSelectedCountry] = useState<CountryType>(
    (searchParams.get("country") as CountryType) || storeCountry || "SA"
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "all");
  const [showFilters, setShowFilters] = useState(false);

  // Handle country change
  const handleCountryChange = (country: CountryType) => {
    setSelectedCountry(country);
    setCountry(country);
    setSearchParams((prev) => {
      prev.set("country", country);
      return prev;
    });
  };

  // Sync URL params with state
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const brandParam = searchParams.get("brand");
    const countryParam = searchParams.get("country") as CountryType;
    if (categoryParam) setSelectedCategory(categoryParam);
    if (brandParam) setSelectedBrand(brandParam);
    if (countryParam && (countryParam === "SA" || countryParam === "YE")) {
      setSelectedCountry(countryParam);
    }
  }, [searchParams]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch brands
  const { data: brands = [] } = useQuery({
    queryKey: ["brands", selectedCountry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true)
        .contains("countries", [selectedCountry])
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCountry,
  });

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", selectedCountry],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .contains("countries", [selectedCountry])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "",
        descriptionAr: p.description_ar || "",
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["SA", "YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: !!selectedCountry,
  });

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query || product.nameAr.toLowerCase().includes(query) || product.name.toLowerCase().includes(query);

      const selectedCatSlug = selectedCategory;
      const selectedCatData = categories.find((cat) => cat.slug === selectedCatSlug);

      const matchesCategory =
        selectedCategory === "all" ||
        product.category?.trim() === selectedCatSlug || // فلترة حسب slug
        product.category?.trim() === selectedCatData?.name_ar?.trim(); // فلترة حسب الاسم العربي

      const matchesBrand = selectedBrand === "all" || product.brand?.trim() === selectedBrand?.trim();

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchQuery, selectedCategory, selectedBrand, categories]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Country Selector */}
        <section className="py-4 bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm text-muted-foreground font-body">اختر البلد:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleCountryChange("SA")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm transition-all ${
                    selectedCountry === "SA"
                      ? "bg-gold text-secondary shadow-md"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                  }`}
                >
                  <span className="text-lg">🇸🇦</span>
                  السعودية
                </button>
                <button
                  onClick={() => handleCountryChange("YE")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm transition-all ${
                    selectedCountry === "YE"
                      ? "bg-gold text-secondary shadow-md"
                      : "bg-muted hover:bg-muted/80 text-foreground border border-border"
                  }`}
                >
                  <span className="text-lg">🇾🇪</span>
                  اليمن
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Hero */}
        <section className="py-16 bg-muted border-b border-border">
          <div className="container mx-auto px-4 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-4xl md:text-5xl text-foreground mb-4"
            >
              <span className="text-gold">مجموعتنا</span> الفاخرة
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-body text-muted-foreground max-w-xl mx-auto"
            >
              منتجات {selectedCountry === "SA" ? "السعودية" : "اليمن"}
            </motion.p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-muted border border-border rounded-lg font-body text-sm focus:outline-none focus:border-gold transition-colors"
                dir="rtl"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg font-body text-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              الفلاتر
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Filters */}
            <motion.aside
              initial={false}
              animate={{
                height: showFilters ? "auto" : 0,
                opacity: showFilters ? 1 : 0,
              }}
              className={`md:w-64 shrink-0 overflow-hidden md:overflow-visible md:h-auto md:opacity-100`}
            >
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading text-lg text-foreground">الفلاتر</h3>
                  <button
                    onClick={() => {
                      setSelectedCategory("all");
                      setSelectedBrand("all");
                      setSearchParams({});
                    }}
                    className="text-xs text-gold hover:underline font-body"
                  >
                    إعادة تعيين
                  </button>
                </div>

                {/* Categories */}
                <div className="mb-6">
                  <h4 className="font-heading text-sm text-foreground mb-3">التصنيفات</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                        selectedCategory === "all" ? "bg-gold text-secondary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      الكل
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                          selectedCategory === cat.slug ? "bg-gold text-secondary" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {cat.name_ar}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brands */}
                <div>
                  <h4 className="font-heading text-sm text-foreground mb-3">الماركات</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedBrand("all")}
                      className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                        selectedBrand === "all" ? "bg-gold text-secondary" : "hover:bg-muted text-foreground"
                      }`}
                    >
                      الكل
                    </button>
                    {brands.map((brand) => (
                      <button
                        key={brand.id}
                        onClick={() => setSelectedBrand(brand.name.trim())}
                        className={`w-full text-right px-3 py-2 rounded-md font-body text-sm transition-colors ${
                          selectedBrand === brand.name.trim()
                            ? "bg-gold text-secondary"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        {brand.name.trim()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>

            {/* Products Grid */}
            <div className="flex-1">
              {/* Results Count */}
              <p className="text-sm text-muted-foreground font-body mb-6">عرض {searchResults.length} منتج</p>

              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground font-body">لا توجد منتجات مطابقة</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchResults.map((product, index) => (
                    <ProductCardMinimal key={product.id} product={product} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;
