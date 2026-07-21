import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Edit, Trash2, Eye, EyeOff, Package, Loader2, X, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminPagination } from "@/components/admin/AdminPagination";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useDebounce } from "@/hooks/useDebounce";

interface DbProduct {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  cost_price: number | null;
  original_price: number | null;
  discount: number | null;
  description: string;
  description_ar: string;
  images: string[];
  category: string;
  brand: string;
  in_stock: boolean;
  countries: string[];
  is_active: boolean;
  is_featured: boolean;
  is_best_seller: boolean;
  color_variants?: any[];
  sort_order: number | null;
}

const PAGE_SIZE = 25;

const AdminProductsPage = () => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    active: 0,
    inStock: 0,
    outOfStock: 0,
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 350);

  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [stock, setStock] = useState<"all" | "in" | "out">("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id?: string; bulk?: boolean } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search, status, stock]);

  useEffect(() => {
    fetchProducts();
    fetchProductStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, stock, page]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setSelected(new Set());

    let q = supabase
      .from("products")
      .select(
        "id,name,name_ar,slug,price,cost_price,discount,category,brand,in_stock,is_active,countries,images,sort_order",
        { count: "exact" }
      );

    if (search.trim()) {
      const term = `%${search.trim()}%`;
      q = q.or(`name.ilike.${term},name_ar.ilike.${term},slug.ilike.${term}`);
    }
    if (status !== "all") q = q.eq("is_active", status === "active");
    if (stock !== "all") q = q.eq("in_stock", stock === "in");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await q
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل المنتجات", variant: "destructive" });
    } else {
      setProducts((data || []) as DbProduct[]);
      setTotal(count || 0);
    }
    setIsLoading(false);
  };

  const fetchProductStats = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("is_active,in_stock,stock_quantity");

    if (error) {
      console.error("Failed to fetch product stats", error);
      return;
    }

    console.log("PRODUCT STATS:", data);

    setStats({
      active: data.filter((p) => p.is_active).length,
      inStock: data.filter((p) => (p.stock_quantity ?? 0) > 0).length,
      outOfStock: data.filter((p) => (p.stock_quantity ?? 0) <= 0).length,
    });
  };

  const toggleActive = async (id: string, currentState: boolean) => {
    const next = !currentState;
    setProducts(ps => ps.map(p => (p.id === id ? { ...p, is_active: next } : p)));
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", id);
    if (error) {
      toast({ title: "خطأ", description: "فشل في تحديث الحالة", variant: "destructive" });
      fetchProducts();
    } else {
      toast({ title: "تم", description: next ? "تم تفعيل المنتج" : "تم تعطيل المنتج" });
    }
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: "فشل في حذف المنتج", variant: "destructive" });
    else {
      toast({ title: "تم", description: "تم حذف المنتج" });
      fetchProducts();
    }
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map(p => p.id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkSetActive = async (active: boolean) => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("products").update({ is_active: active }).in("id", ids);
    setBulkBusy(false);
    if (error) toast({ title: "خطأ", description: "فشل التحديث الجماعي", variant: "destructive" });
    else {
      toast({ title: "تم", description: `تم تحديث ${ids.length} منتج` });
      fetchProducts();
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from("products").delete().in("id", ids);
    setBulkBusy(false);
    setConfirmDelete(null);
    if (error) toast({ title: "خطأ", description: "فشل الحذف الجماعي", variant: "destructive" });
    else {
      toast({ title: "تم", description: `تم حذف ${ids.length} منتج` });
      fetchProducts();
    }
  };

  const allSelected = useMemo(
    () => products.length > 0 && selected.size === products.length,
    [products, selected]
  );

  const formatPrice = (p: DbProduct) => `${p.price} ر.ي`;

  const newProductHref = "/admin/products/new";

  // KPI calculations
  const getProductImage = (product: DbProduct) => {
    if (product.images?.length > 0) {
      return product.images[0];
    }

    const variants = (product as any).color_variants;

    if (Array.isArray(variants) && variants.length > 0) {
      return variants[0]?.images?.[0] || "/placeholder.svg";
    }

    return "/placeholder.svg";
  };
  return (
    <div className="max-w-[1600px] mx-auto space-y-8 px-6 py-4" dir="rtl">
      {/* Header */}
      <AdminPageHeader
        category="الكتالوج"
        title="إدارة المنتجات"
        description={`تحكم في ${total.toLocaleString("ar-EG")} منتج • إدارة الأسعار والمخزون والحالة`}
        actions={[
          {
            label: "إضافة منتج",
            icon: Plus,
            href: newProductHref,
            variant: "primary",
          },
          {
            label: "إدارة المخزون",
            icon: Package,
            href: "/admin/inventory",
            variant: "outline",
          },
          {
            label: "التقارير",
            icon: BarChart3,
            href: "/admin/analytics",
            variant: "outline",
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>

          <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>

          <h3 className="mt-2 text-3xl font-bold">
            {total.toLocaleString("ar-EG")}
          </h3>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Eye className="h-6 w-6 text-emerald-600" />
          </div>

          <p className="text-sm text-muted-foreground">المنتجات النشطة</p>

          <h3 className="mt-2 text-3xl font-bold">
            {stats.active}
          </h3>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
            <Package className="h-6 w-6 text-orange-600" />
          </div>

          <p className="text-sm text-muted-foreground">متوفر بالمخزون</p>

          <h3 className="mt-2 text-3xl font-bold">
            {stats.inStock}
          </h3>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10">
            <EyeOff className="h-6 w-6 text-rose-600" />
          </div>

          <p className="text-sm text-muted-foreground">المنتجات المعطلة</p>

          <h3 className="mt-2 text-3xl font-bold">
            {total - stats.active}
          </h3>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-5 z-20 rounded-3xl border border-border/60 bg-background/80 backdrop-blur-xl shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم العربي/الإنجليزي أو الـ slug..."
              className="h-12 rounded-2xl border-border/60 bg-muted/30 pr-11 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20"
              dir="rtl"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 md:flex gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-12 w-full md:w-40 rounded-2xl border-border/60 bg-muted/30 shadow-sm"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stock} onValueChange={(v) => setStock(v as typeof stock)}>
              <SelectTrigger className="h-12 w-full md:w-40 rounded-2xl border-border/60 bg-muted/30 shadow-sm"><SelectValue placeholder="المخزون" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المخزون</SelectItem>
                <SelectItem value="in">متوفر</SelectItem>
                <SelectItem value="out">غير متوفر</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 shadow-md animate-in fade-in slide-in-from-top-2">
            <p className="text-sm">
              تم تحديد <span className="font-bold text-primary">{selected.size}</span> منتج
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetActive(true)}>
                <Eye className="w-4 h-4 ml-1" /> تفعيل
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetActive(false)}>
                <EyeOff className="w-4 h-4 ml-1" /> تعطيل
              </Button>
              <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => setConfirmDelete({ bulk: true })}>
                <Trash2 className="w-4 h-4 ml-1" /> حذف
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>إلغاء</Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {isLoading && products.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-background py-16 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="rounded-3xl border border-border/60 bg-background p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex gap-3">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  className="mt-1"
                />
                <img src={getProductImage(p)} alt={p.name_ar} className="w-20 h-20 rounded-2xl border border-border object-cover shadow-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-heading text-sm truncate">{p.name_ar}</h3>
                    <Badge variant={p.is_active ? "default" : "secondary"} className="shrink-0">
                      {p.is_active ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-heading text-primary text-sm">{formatPrice(p)}</span>
                    {(p.discount ?? 0) > 0 && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 rounded">-{p.discount}%</span>
                    )}
                    <div className="text-[10px] text-muted-foreground ml-auto">المتجر الموحد</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1 gap-2 rounded-xl" onClick={() => toggleActive(p.id, p.is_active)}>
                  {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {p.is_active ? "تعطيل" : "تفعيل"}
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 gap-2 rounded-xl">
                  <Link to={`/admin/products/${p.id}`}>
                    <Edit className="w-3.5 h-3.5" /> تعديل
                  </Link>
                </Button>
                <Button size="icon" variant="outline" className="text-destructive" onClick={() => setConfirmDelete({ id: p.id })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-border/60 bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
              <tr className="text-xs">
                <th className="p-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">المنتج</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">التصنيف</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">السعر</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">المخزون</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">النطاق</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">الحالة</th>
                <th className="text-right px-5 py-4 font-semibold whitespace-nowrap">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && products.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-3 opacity-50" /> لا توجد منتجات
                </td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className={cn(
                    "border-b border-border/50 transition-all duration-200 hover:bg-primary/[0.03]",
                    selected.has(p.id) && "bg-primary/5"
                  )}>
                    <td className="p-3"><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={getProductImage(p)} alt={p.name_ar} className="w-16 h-16 rounded-2xl border border-border object-cover shadow-sm shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-[15px] truncate max-w-[260px]">{p.name_ar}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground truncate max-w-[260px]">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{p.category || "-"}</td>
                    <td className="p-3">
                      <span className="font-heading text-primary text-sm">{formatPrice(p)}</span>
                      {(p.discount ?? 0) > 0 && (
                        <span className="block text-[10px] text-destructive mt-0.5">-{p.discount}%</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={p.in_stock ? "outline" : "secondary"} className="rounded-full px-3 py-1 text-[11px] font-medium">
                        {p.in_stock ? "متوفر" : "نفد"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">المتجر الموحد</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={p.is_active ? "default" : "secondary"} className="rounded-full px-3 py-1 text-[11px] font-medium">
                        {p.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl transition-all hover:scale-105 hover:bg-muted" onClick={() => toggleActive(p.id, p.is_active)}>
                          {p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-xl transition-all hover:scale-105 hover:bg-muted">
                          <Link to={`/admin/products/${p.id}`}><Edit className="w-4 h-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl transition-all hover:scale-105 hover:bg-muted" onClick={() => setConfirmDelete({ id: p.id })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          className="border-t border-border/60 bg-muted/20 px-6 py-3"
        />
      </div>

      {/* Mobile pagination */}
      <div className="md:hidden bg-card border border-border rounded-2xl px-3">
        <AdminPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.bulk
                ? `سيتم حذف ${selected.size} منتج نهائياً. لا يمكن التراجع.`
                : "سيتم حذف هذا المنتج نهائياً. لا يمكن التراجع."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete?.bulk) bulkDelete();
                else if (confirmDelete?.id) { deleteOne(confirmDelete.id); setConfirmDelete(null); }
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminProductsPage;