import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, CheckCircle2, Grid3X3, ImageOff, Link2, Package, PackageX, Search, Tag, Tags, TriangleAlert } from "lucide-react";

interface AuditProduct {
  id: string;
  name: string | null;
  name_ar: string | null;
  slug: string | null;
  price: number | null;
  images: string[] | null;
  category: string | null;
  category_id: string | null;
  brand: string | null;
  brand_id: string | null;
  in_stock: boolean | null;
  is_active: boolean | null;
}

interface BrandRow {
  id: string;
  name: string;
}

interface CategoryRow {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
}

type IssueKey = "brand" | "category" | "image" | "price" | "stock" | "name";

type ProductIssue = {
  key: IssueKey;
  label: string;
  severity: "error" | "warning";
};

type AuditedProduct = AuditProduct & {
  issues: ProductIssue[];
};

const steps = [
  { id: 1, title: "أضف القسم الرئيسي والفرعي", description: "مثال: نسائي ثم فساتين وبناطيل. عند إضافة قسم فرعي اختر القسم الأب.", href: "/admin/categories", icon: Grid3X3, action: "فتح صفحة الفئات" },
  { id: 2, title: "أضف الماركات", description: "أضف اسم الماركة وشعارها فقط.", href: "/admin/brands", icon: Tag, action: "فتح صفحة الماركات" },
  { id: 3, title: "اربط الماركات بالأقسام", description: "اختر لكل ماركة الأقسام التي يجب أن تظهر فيها داخل المتجر.", href: "/admin/brand-category-map", icon: Link2, action: "فتح صفحة الربط" },
  { id: 4, title: "أضف المنتجات واربطها فعلياً", description: "عند إضافة المنتج اختر القسم الرئيسي ثم الفرعي ثم الماركة.", href: "/admin/products/new", icon: Package, action: "إضافة منتج" },
];

const issueLabels: Record<IssueKey, string> = {
  brand: "الماركة",
  category: "التصنيف",
  image: "الصورة",
  price: "السعر",
  stock: "المخزون",
  name: "الاسم",
};

const AdminCatalogWorkflowPage = () => {
  const [search, setSearch] = useState("");
  const [issueFilter, setIssueFilter] = useState<"all" | IssueKey>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-catalog-quality-audit"],
    queryFn: async () => {
      const [productsResult, brandsResult, categoriesResult] = await Promise.all([
        supabase.from("products").select("id,name,name_ar,slug,price,images,category,category_id,brand,brand_id,in_stock,is_active").order("created_at", { ascending: false }),
        supabase.from("brands").select("id,name"),
        supabase.from("categories").select("id,name,name_ar,slug"),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (brandsResult.error) throw brandsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      return {
        products: (productsResult.data || []) as AuditProduct[],
        brands: (brandsResult.data || []) as BrandRow[],
        categories: (categoriesResult.data || []) as CategoryRow[],
      };
    },
  });

  const auditedProducts = useMemo<AuditedProduct[]>(() => {
    if (!data) return [];

    const brandIds = new Set(data.brands.map((brand) => brand.id));
    const brandNames = new Set(data.brands.map((brand) => brand.name.trim().toLocaleLowerCase()));
    const categoryIds = new Set(data.categories.map((category) => category.id));
    const categoryValues = new Set(
      data.categories.flatMap((category) => [category.slug, category.name, category.name_ar]).filter(Boolean).map((value) => value.trim().toLocaleLowerCase()),
    );

    return data.products.map((product) => {
      const issues: ProductIssue[] = [];
      const brand = product.brand?.trim() || "";
      const category = product.category?.trim() || "";

      if (!brand && !product.brand_id) {
        issues.push({ key: "brand", label: "بدون ماركة", severity: "warning" });
      } else if ((product.brand_id && !brandIds.has(product.brand_id)) || (brand && !brandNames.has(brand.toLocaleLowerCase()))) {
        issues.push({ key: "brand", label: "ماركة غير معروفة أو غير متطابقة", severity: "error" });
      }

      if (!category && !product.category_id) {
        issues.push({ key: "category", label: "بدون تصنيف", severity: "error" });
      } else if ((product.category_id && !categoryIds.has(product.category_id)) || (category && !categoryValues.has(category.toLocaleLowerCase()))) {
        issues.push({ key: "category", label: "تصنيف غير معروف أو غير متطابق", severity: "error" });
      }

      if (!product.images?.some((image) => Boolean(image?.trim()))) {
        issues.push({ key: "image", label: "بدون صورة", severity: "error" });
      }

      if (product.price == null || Number(product.price) <= 0 || !Number.isFinite(Number(product.price))) {
        issues.push({ key: "price", label: "السعر غير صالح", severity: "error" });
      }

      if (product.in_stock === false) {
        issues.push({ key: "stock", label: "نافد من المخزون", severity: "warning" });
      }

      if (!product.name?.trim() || !product.name_ar?.trim()) {
        issues.push({ key: "name", label: "اسم المنتج غير مكتمل", severity: "warning" });
      }

      return { ...product, issues };
    });
  }, [data]);

  const problemProducts = useMemo(() => auditedProducts.filter((product) => product.issues.length > 0), [auditedProducts]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLocaleLowerCase();
    return problemProducts.filter((product) => {
      if (issueFilter !== "all" && !product.issues.some((issue) => issue.key === issueFilter)) return false;
      if (!q) return true;
      return [product.name, product.name_ar, product.slug, product.brand, product.category].some((value) => value?.toLocaleLowerCase().includes(q));
    });
  }, [problemProducts, issueFilter, search]);

  const counts = useMemo(() => {
    const result: Record<IssueKey, number> = { brand: 0, category: 0, image: 0, price: 0, stock: 0, name: 0 };
    problemProducts.forEach((product) => product.issues.forEach((issue) => { result[issue.key] += 1; }));
    return result;
  }, [problemProducts]);

  const healthyCount = auditedProducts.length - problemProducts.length;

  return (
    <div className="mx-auto max-w-[1280px] space-y-6" dir="rtl">
      <AdminPageHeader
        category="الكتالوج"
        title="جودة الكتالوج"
        description="فحص مباشر لبيانات المنتجات لاكتشاف المشاكل التي تمنع ظهورها أو تصنيفها بشكل صحيح"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">إجمالي المنتجات</p><p className="text-2xl font-semibold">{auditedProducts.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-xs text-muted-foreground">سليمة</p><p className="text-2xl font-semibold">{healthyCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TriangleAlert className="h-5 w-5 text-amber-600" /><div><p className="text-xs text-muted-foreground">تحتاج مراجعة</p><p className="text-2xl font-semibold">{problemProducts.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><PackageX className="h-5 w-5 text-rose-600" /><div><p className="text-xs text-muted-foreground">نافد من المخزون</p><p className="text-2xl font-semibold">{counts.stock}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">نوع المشكلة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={issueFilter === "all" ? "default" : "outline"} onClick={() => setIssueFilter("all")}>الكل ({problemProducts.length})</Button>
            {(Object.keys(issueLabels) as IssueKey[]).map((key) => (
              <Button key={key} size="sm" variant={issueFilter === key ? "default" : "outline"} onClick={() => setIssueFilter(key)}>
                {issueLabels[key]} ({counts[key]})
              </Button>
            ))}
          </div>

          <div className="relative max-w-xl">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الماركة أو التصنيف..." className="pr-9" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5 text-amber-600" />المنتجات التي تحتاج مراجعة</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">جاري فحص الكتالوج...</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-destructive">تعذر تحميل بيانات جودة الكتالوج.</div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><p className="font-medium">لا توجد مشاكل مطابقة للفلاتر الحالية</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead><tr className="border-b text-right text-muted-foreground"><th className="px-3 py-3 font-medium">المنتج</th><th className="px-3 py-3 font-medium">الماركة</th><th className="px-3 py-3 font-medium">التصنيف</th><th className="px-3 py-3 font-medium">المشاكل</th><th className="px-3 py-3 font-medium">الحالة</th><th className="px-3 py-3 font-medium">إجراء</th></tr></thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b last:border-0">
                      <td className="px-3 py-3"><div className="flex items-center gap-3">{product.images?.[0] ? <img src={product.images[0]} alt="" className="h-11 w-11 rounded-md border object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-md border bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>}<div><p className="font-medium">{product.name_ar || product.name || "بدون اسم"}</p><p className="text-xs text-muted-foreground">{product.slug || product.id.slice(0, 8)}</p></div></div></td>
                      <td className="px-3 py-3">{product.brand || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3">{product.category || <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-3"><div className="flex max-w-[360px] flex-wrap gap-1.5">{product.issues.map((issue, index) => <Badge key={`${issue.key}-${index}`} variant={issue.severity === "error" ? "destructive" : "secondary"}>{issue.label}</Badge>)}</div></td>
                      <td className="px-3 py-3">{product.is_active === false ? <Badge variant="outline">مخفي</Badge> : <Badge variant="outline">نشط</Badge>}</td>
                      <td className="px-3 py-3"><Button asChild size="sm" variant="outline"><Link to={`/admin/products/${product.id}`}>تعديل<ArrowLeft className="mr-2 h-4 w-4" /></Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tags className="h-5 w-5" />سير عمل الكتالوج</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between gap-3"><p className="font-medium">{step.title}</p><span className="grid h-7 min-w-7 place-items-center rounded-full bg-primary/10 px-2 text-sm text-primary">{step.id}</span></div>
                  <div className="mb-4 flex items-start gap-2 text-sm text-muted-foreground"><Icon className="mt-0.5 h-4 w-4 text-primary" /><p>{step.description}</p></div>
                  <Button asChild size="sm" variant="outline" className="w-full justify-between"><Link to={step.href}>{step.action}<ArrowLeft className="h-4 w-4" /></Link></Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCatalogWorkflowPage;
