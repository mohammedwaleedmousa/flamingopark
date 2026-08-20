import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, CircleOff, Layers3, Loader2, Package, Save, Search, ShoppingBag, Trash2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  images: string[] | null;
  brand: string | null;
  brand_id: string | null;
  category_id: string | null;
  is_active: boolean;
}

interface Section {
  id: string;
  brand_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
}

interface BrandRow {
  id: string;
  name: string;
}

type SelectionFilter = "all" | "selected" | "unselected";
type BrandFilter = "section-brand";

const AdminBrandSectionProductsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>("all");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("section-brand");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectionLoadedFor, setSelectionLoadedFor] = useState("");

  /* =========================================================
     SECTION
  ========================================================= */

  const { data: section, isLoading: sectionLoading } = useQuery({
    queryKey: ["brand-section", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_sections").select("id,brand_id,name,slug,image_url,description").eq("id", id).single();

      if (error) throw error;

      return data as Section;
    },
    staleTime: 30_000,
  });

  const { data: sectionBrand = null } = useQuery({
    queryKey: ["brand-section-brand", section?.brand_id],
    enabled: Boolean(section?.brand_id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brands").select("id,name").eq("id", section!.brand_id).maybeSingle();

      if (error) throw error;

      return (data || null) as BrandRow | null;
    },
    staleTime: 60_000,
  });

  /* =========================================================
     PRODUCTS
  ========================================================= */

  const { data: products = [], isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ["all-products-brand-section"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select("id,name,name_ar,price,images,brand,brand_id,category_id,is_active").eq("is_active", true).order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as Product[];
    },
    staleTime: 30_000,
  });

  /* =========================================================
     LINKED PRODUCTS
  ========================================================= */

  const { data: linkedProductIds = [], isLoading: linkedLoading, isSuccess: linkedLoaded } = useQuery({
    queryKey: ["brand-section-products", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("brand_section_products").select("product_id").eq("section_id", id);

      if (error) throw error;

      return (data || []).map((row: any) => String(row.product_id));
    },
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!id || !linkedLoaded || selectionLoadedFor === id) return;

    setSelectedProducts(linkedProductIds);
    setSelectionLoadedFor(id);
  }, [id, linkedLoaded, linkedProductIds, selectionLoadedFor]);

  /* =========================================================
     DERIVED
  ========================================================= */

  const selectedSet = useMemo(() => new Set(selectedProducts), [selectedProducts]);

  const sectionBrandProducts = useMemo(() => {
    if (!section?.brand_id) return [];
    return products.filter((product) => product.brand_id === section.brand_id);
  }, [products, section?.brand_id]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const text = `${product.name} ${product.name_ar || ""} ${product.brand || ""}`.toLowerCase();
      const matchesSearch = !normalizedSearch || text.includes(normalizedSearch);
      const matchesSelection = selectionFilter === "all" || (selectionFilter === "selected" && selectedSet.has(product.id)) || (selectionFilter === "unselected" && !selectedSet.has(product.id));
      const matchesBrand = !section?.brand_id || product.brand_id === section.brand_id;

      return matchesSearch && matchesSelection && matchesBrand;
    });
  }, [products, search, selectionFilter, brandFilter, selectedSet, section?.brand_id]);

  const selectedProductRows = useMemo(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    return selectedProducts.map((productId) => productMap.get(productId)).filter(Boolean) as Product[];
  }, [products, selectedProducts]);

  const hasChanges = useMemo(() => {
    if (!linkedLoaded) return false;

    const current = new Set(selectedProducts);
    const original = new Set(linkedProductIds);

    if (current.size !== original.size) return true;

    return Array.from(current).some((productId) => !original.has(productId));
  }, [linkedLoaded, linkedProductIds, selectedProducts]);

  /* =========================================================
     SELECTION
  ========================================================= */

  const toggleProduct = (productId: string) => {
    setSelectedProducts((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((current) => current.filter((id) => id !== productId));
  };

  const selectVisible = () => {
    setSelectedProducts((current) => Array.from(new Set([...current, ...filteredProducts.map((product) => product.id)])));
  };

  const clearSelected = () => {
    setSelectedProducts([]);
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveProducts = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("القسم غير موجود.");

      const existing = new Set(linkedProductIds);
      const next = new Set(selectedProducts);

      const toRemove = linkedProductIds.filter((productId) => !next.has(productId));
      const toInsert = selectedProducts.filter((productId) => !existing.has(productId));

      const invalidInsert = toInsert.find((productId) => {
        const product = products.find((item) => item.id === productId);
        return !section?.brand_id || product?.brand_id !== section.brand_id;
      });

      if (invalidInsert) {
        throw new Error(`لا يمكن ربط منتج بماركة مختلفة عن ${sectionBrand?.name || "ماركة القسم"}.`);
      }

      if (toRemove.length > 0) {
        const { error } = await (supabase as any).from("brand_section_products").delete().eq("section_id", id).in("product_id", toRemove);

        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const rows = toInsert.map((productId) => ({
          section_id: id,
          product_id: productId,
        }));

        const { error } = await (supabase as any).from("brand_section_products").insert(rows);

        if (error) throw error;
      }
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["brand-section-products", id] }),
        queryClient.invalidateQueries({ queryKey: ["brand-section-product-counts"] }),
        queryClient.invalidateQueries({ queryKey: ["brand-page-sections"] }),
      ]);

      setSelectionLoadedFor("");

      toast({
        title: "تم حفظ منتجات القسم",
        description: `أصبح القسم يحتوي على ${selectedProducts.length} منتج.`,
      });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ المنتجات",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     LOADING
  ========================================================= */

  if (sectionLoading || linkedLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>
          <p className="mt-3 text-[9px] font-medium text-[#969DA7]">جاري تحميل منتجات القسم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="الماركات" title={section ? `منتجات قسم ${section.name}` : "منتجات القسم"} description="اختيار المنتجات التي تظهر داخل هذا القسم في صفحة الماركة" actions={[{ label: "رجوع", icon: ArrowRight, variant: "secondary", onClick: () => navigate(-1) }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <ProductStatCard title="المنتجات النشطة" value={products.length} helper="جميع منتجات المتجر المتاحة" icon={Package} tone="indigo" />
        <ProductStatCard title="مرتبطة بالقسم" value={selectedProducts.length} helper={section?.name || "القسم الحالي"} icon={CheckCircle2} tone="green" />
        <ProductStatCard title="منتجات نفس الماركة" value={sectionBrandProducts.length} helper={sectionBrand?.name || "الماركة الحالية"} icon={ShoppingBag} tone="blue" />
        <ProductStatCard title="غير مرتبطة" value={Math.max(0, sectionBrandProducts.length - selectedProducts.filter((productId) => sectionBrandProducts.some((product) => product.id === productId)).length)} helper="يمكن إضافتها للقسم" icon={CircleOff} tone="coral" />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">معلومات القسم</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">القسم الذي سيتم ربط المنتجات به</p>
          </div>

          {hasChanges && <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[7px] text-[6.5px] font-semibold text-[#A9782F]">تغييرات غير محفوظة</span>}
        </div>

        <div className="flex items-center gap-[10px] p-[11px]">
          <SectionImage section={section} />

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[11px] font-semibold text-[#414953]">{section?.name || "—"}</h2>
            <p dir="ltr" className="mt-[3px] truncate text-right text-[7px] text-[#9299A3]">/{section?.slug || ""}</p>
            <p className="mt-[5px] max-w-[720px] truncate text-[7px] text-[#9BA2AC]">{section?.description || "لا يوجد وصف للقسم"}</p>
          </div>

          <span className="hidden rounded-[7px] bg-[#F1EFFF] px-[8px] py-[5px] text-[7px] font-semibold text-[#675CBA] sm:inline-flex">{selectedProducts.length} منتج مرتبط</span>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">تظهر هنا منتجات ماركة القسم فقط</p>
          </div>

          {(search || selectionFilter !== "all") && (
            <button type="button" onClick={() => { setSearch(""); setSelectionFilter("all"); setBrandFilter("section-brand"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_175px_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المنتج أو الماركة..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={selectionFilter} onValueChange={(value) => setSelectionFilter(value as SelectionFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المنتجات</SelectItem>
              <SelectItem value="selected">المختارة فقط</SelectItem>
              <SelectItem value="unselected">غير المختارة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={brandFilter} onValueChange={(value) => setBrandFilter(value as BrandFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section-brand">{sectionBrand?.name || "ماركة القسم"} فقط</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-[7px] border-t border-[#EDF0F3] bg-[#FAFBFC] px-[11px] py-[8px]">
          <p className="text-[7px] text-[#9299A3]">{filteredProducts.length} منتج ظاهر</p>

          <div className="flex gap-[5px]">
            <button type="button" disabled={filteredProducts.length === 0} onClick={selectVisible} className="h-[30px] rounded-[8px] border border-[#DCE7F4] bg-white px-[9px] text-[7px] font-semibold text-[#5680CF] disabled:opacity-40">تحديد الظاهر</button>
            <button type="button" disabled={selectedProducts.length === 0} onClick={clearSelected} className="h-[30px] rounded-[8px] border border-[#E3E7EC] bg-white px-[9px] text-[7px] font-semibold text-[#7C848E] disabled:opacity-40">إلغاء الكل</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
          <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
            <div>
              <h2 className="text-[11px] font-semibold text-[#454C56]">منتجات {sectionBrand?.name || "الماركة"}</h2>
              <p className="mt-[3px] text-[8px] text-[#9CA3AC]">اضغط على المنتج لإضافته أو إزالته من القسم</p>
            </div>

            {productsFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
          </div>

          {productsLoading ? (
            <div className="flex h-[360px] items-center justify-center"><Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" /></div>
          ) : filteredProducts.length === 0 ? (
            <ProductsEmpty />
          ) : (
            <div className="grid max-h-[660px] grid-cols-1 gap-[7px] overflow-y-auto p-[8px] md:grid-cols-2">
              {filteredProducts.map((product) => {
                const selected = selectedSet.has(product.id);

                return (
                  <button key={product.id} type="button" onClick={() => toggleProduct(product.id)} className={cn("flex items-center gap-[9px] rounded-[10px] border p-[8px] text-right transition-colors", selected ? "border-[#CDC7EB] bg-[#F8F6FF]" : "border-[#E6E9EE] bg-white hover:bg-[#FAFBFC]")}>
                    <div onClick={(event) => event.stopPropagation()}>
                      <Checkbox checked={selected} onCheckedChange={() => toggleProduct(product.id)} className="h-[14px] w-[14px] border-[#BCC2CA] data-[state=checked]:border-[#675CBA] data-[state=checked]:bg-[#675CBA]" />
                    </div>

                    <ProductImage product={product} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-semibold text-[#4B535D]">{product.name_ar || product.name}</p>
                      <p className="mt-[3px] truncate text-[6.5px] text-[#9BA2AC]">{product.brand || product.name}</p>

                      <div className="mt-[5px] flex items-center gap-[5px]">
                        <span className="text-[8px] font-semibold text-[#626A74]">{Number(product.price || 0).toLocaleString("en-US")} ر.س</span>
                        {section?.brand_id && product.brand_id === section.brand_id && <span className="rounded-[5px] bg-[#EDF4FF] px-[5px] py-[2px] text-[5.8px] font-semibold text-[#5680CF]">نفس الماركة</span>}
                      </div>
                    </div>

                    <span className={cn("flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[7px]", selected ? "bg-[#675CBA] text-white" : "bg-[#F1F3F6] text-[#9AA1AB]")}>{selected ? <CheckCircle2 className="h-[10px] w-[10px]" /> : <PlusIcon />}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white xl:sticky xl:top-[84px] xl:self-start">
          <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[12px] py-[10px]">
            <div>
              <h2 className="text-[10.5px] font-semibold text-[#454C56]">المنتجات المختارة</h2>
              <p className="mt-[3px] text-[7px] text-[#9CA3AC]">{selectedProducts.length} منتج داخل القسم</p>
            </div>

            <span className="flex h-[27px] min-w-[27px] items-center justify-center rounded-[8px] bg-[#F1EFFF] px-[7px] text-[7px] font-semibold text-[#675CBA]">{selectedProducts.length}</span>
          </div>

          {selectedProductRows.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[12px] bg-[#F0F2F5] text-[#8C949E]"><ShoppingBag className="h-[16px] w-[16px]" /></div>
              <p className="mt-[9px] text-[8.5px] font-semibold text-[#59616B]">لم يتم اختيار منتجات</p>
              <p className="mt-[3px] text-[6.5px] text-[#9BA2AC]">اختر المنتجات من القائمة لإضافتها للقسم.</p>
            </div>
          ) : (
            <div className="max-h-[600px] space-y-[5px] overflow-y-auto p-[7px]">
              {selectedProductRows.map((product) => (
                <div key={product.id} className="flex items-center gap-[7px] rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] p-[7px]">
                  <ProductImage product={product} compact />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[8px] font-semibold text-[#535B65]">{product.name_ar || product.name}</p>
                    <p className="mt-[2px] truncate text-[6px] text-[#9BA2AC]">{Number(product.price || 0).toLocaleString("en-US")} ر.س</p>
                    {section?.brand_id && product.brand_id !== section.brand_id && <p className="mt-[2px] text-[6px] font-semibold text-[#C15F56]">ماركة مختلفة — احذف الربط القديم</p>}
                  </div>

                  <button type="button" onClick={() => removeProduct(product.id)} className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-[7px] text-[#C15F56] hover:bg-[#FFF0ED]"><Trash2 className="h-[10px] w-[10px]" /></button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-[14px] border border-[#E5E9EF] bg-white px-[12px] py-[10px] shadow-[0_-8px_24px_rgba(31,41,55,0.04)]">
        <div className="hidden sm:block">
          <p className="text-[8px] font-semibold text-[#59616B]">{selectedProducts.length} منتج سيتم ربطه بالقسم</p>
          <p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">{hasChanges ? "لديك تغييرات غير محفوظة." : "لا توجد تغييرات جديدة."}</p>
        </div>

        <Button type="button" disabled={saveProducts.isPending || !hasChanges} onClick={() => saveProducts.mutate()} className="mr-auto h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white shadow-none hover:bg-[#594FAB] disabled:opacity-40">
          {saveProducts.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <Save className="ml-[5px] h-[11px] w-[11px]" />}
          حفظ المنتجات
        </Button>
      </div>
    </div>
  );
};

const ProductStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] text-[20px] font-semibold leading-none text-[#303741]">{value.toLocaleString("en-US")}</p><p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p></article>;
};

const SectionImage = ({ section }: { section?: Section }) => {
  return <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[#E7EAEF] bg-[#F5F6F8]">{section?.image_url ? <img src={section.image_url} alt={section.name} loading="lazy" className="h-full w-full object-cover" /> : <Layers3 className="h-[15px] w-[15px] text-[#9AA1AB]" />}</div>;
};

const ProductImage = ({ product, compact = false }: { product: Product; compact?: boolean }) => {
  const size = compact ? "h-[38px] w-[34px] rounded-[7px]" : "h-[52px] w-[46px] rounded-[8px]";
  const image = product.images?.find(Boolean) || "";

  return <div className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-[#E7EAEF] bg-[#F5F6F8]", size)}>{image ? <img src={image} alt={product.name_ar || product.name} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[12px] w-[12px] text-[#A0A6AF]" />}</div>;
};

const PlusIcon = () => <span className="text-[13px] leading-none">+</span>;

const ProductsEmpty = () => {
  return <div className="flex min-h-[330px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><Package className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد منتجات</h3><p className="mt-[4px] text-[7px] text-[#9BA2AC]">تأكد من أن منتجات الماركة مفعّلة ومربوطة بالماركة الصحيحة.</p></div>;
};

export default AdminBrandSectionProductsPage;
