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

interface Product {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number;
  cost_price: number | null;
  discount: number;
  category: string;
  brand: string;
  in_stock: boolean;
  is_active: boolean;
  countries: string[];
  images: string[];
  sort_order: number;
}

const PAGE_SIZE = 25;

const AdminProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, stock, page]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setSelected(new Set());

    let q = supabase
      .from("products")
      .select("id,name,name_ar,slug,price,cost_price,discount,category,brand,in_stock,is_active,countries,images,sort_order", { count: "exact" });

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
      setProducts((data || []) as Product[]);
      setTotal(count || 0);
    }
    setIsLoading(false);
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

  const formatPrice = (p: Product) => `${p.price} ر.ي`;

  const newProductHref = "/admin/products/new";

  // KPI calculations
  const activeCount = products.filter(p => p.is_active).length;
  const inStockCount = products.filter(p => p.in_stock).length;
  const outOfStockCount = products.filter(p => !p.in_stock).length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      {/* Header */}
      <AdminPageHeader
        category="الكتالوج"
        title="المنتجات"
        description={`إدارة ${total.toLocaleString("ar-EG")} منتج`}
        actions={[
          {
            label: "إضافة منتج",
            icon: Plus,
            href: newProductHref,
            variant: "primary",
          },
          {
            label: "التحليلات",
            icon: BarChart3,
            href: "/admin/analytics",
            variant: "outline",
          },
        ]}
      />

      {/* Filters bar */}
      <div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم العربي/الإنجليزي أو الـ slug..."
              className="pr-9 bg-background"
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
              <SelectTrigger className="w-full md:w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">معطل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stock} onValueChange={(v) => setStock(v as typeof stock)}>
              <SelectTrigger className="w-full md:w-32"><SelectValue placeholder="المخزون" /></SelectTrigger>
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
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
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>لا توجد منتجات</p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex gap-3">
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggleSelect(p.id)}
                  className="mt-1"
                />
                <img src={p.images?.[0] || "/placeholder.svg"} alt={p.name_ar} className="w-16 h-16 object-cover rounded-lg" />
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
                    {p.discount > 0 && (
                      <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 rounded">-{p.discount}%</span>
                    )}
                    <div className="text-[10px] text-muted-foreground ml-auto">المتجر الموحد</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => toggleActive(p.id, p.is_active)}>
                  {p.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {p.is_active ? "تعطيل" : "تفعيل"}
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1 gap-1">
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
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/40">
              <tr className="text-xs">
                <th className="p-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                </th>
                <th className="text-right p-3 font-heading">المنتج</th>
                <th className="text-right p-3 font-heading">التصنيف</th>
                <th className="text-right p-3 font-heading">السعر</th>
                <th className="text-right p-3 font-heading">المخزون</th>
                <th className="text-right p-3 font-heading">النطاق</th>
                <th className="text-right p-3 font-heading">الحالة</th>
                <th className="text-right p-3 font-heading">الإجراءات</th>
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
                    "border-b border-border hover:bg-muted/30 transition-colors",
                    selected.has(p.id) && "bg-primary/5"
                  )}>
                    <td className="p-3"><Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} /></td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images?.[0] || "/placeholder.svg"} alt={p.name_ar} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                        <div className="min-w-0">
                          <p className="font-heading text-sm truncate max-w-[260px]">{p.name_ar}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[260px]">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{p.category || "-"}</td>
                    <td className="p-3">
                      <span className="font-heading text-primary text-sm">{formatPrice(p)}</span>
                      {p.discount > 0 && (
                        <span className="block text-[10px] text-destructive mt-0.5">-{p.discount}%</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant={p.in_stock ? "outline" : "secondary"} className="text-[10px]">
                        {p.in_stock ? "متوفر" : "نفد"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">المتجر الموحد</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={p.is_active ? "default" : "secondary"} className="text-[10px]">
                        {p.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toggleActive(p.id, p.is_active)}>
                          {p.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                          <Link to={`/admin/products/${p.id}`}><Edit className="w-4 h-4" /></Link>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setConfirmDelete({ id: p.id })}>
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
          className="px-4 border-t border-border"
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