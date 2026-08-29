import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, ExternalLink, Loader2, PackageSearch, RefreshCw, Save, Search, ShieldAlert } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  duplicateAdminProduct,
  getProductInventoryModes,
  quickUpdateAdminProduct,
  type ProductInventoryMode,
} from "@/lib/adminProductTools";

interface ToolProduct {
  id: string;
  name: string;
  name_ar: string;
  slug: string;
  price: number | null;
  stock_quantity: number;
  in_stock: boolean;
  is_active: boolean;
  brand: string | null;
  category: string | null;
}

type Draft = { price: string; stock: string; is_active: boolean };

const AdminProductToolsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ToolProduct[]>([]);
  const [modes, setModes] = useState<Map<string, ProductInventoryMode>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = (supabase as any)
        .from("products")
        .select("id,name,name_ar,slug,price,stock_quantity,in_stock,is_active,brand,category")
        .order("updated_at", { ascending: false })
        .limit(150);

      const q = search.trim();
      if (q) {
        const term = `%${q.replaceAll(",", " ")}%`;
        query = query.or(`name.ilike.${term},name_ar.ilike.${term},slug.ilike.${term},brand.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as ToolProduct[];
      const nextModes = await getProductInventoryModes(rows.map((row) => row.id));
      setProducts(rows);
      setModes(nextModes);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, {
        price: row.price == null ? "" : String(row.price),
        stock: String(row.stock_quantity ?? 0),
        is_active: Boolean(row.is_active),
      }])));
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل أدوات المنتجات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 300);
    return () => window.clearTimeout(timer);
  }, [load]);

  const changed = useMemo(() => new Set(products.filter((product) => {
    const draft = drafts[product.id];
    if (!draft) return false;
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    const priceChanged = Number.isFinite(price) && price !== Number(product.price ?? 0);
    const stockChanged = modes.get(product.id) === "simple" && Number.isFinite(stock) && stock !== Number(product.stock_quantity ?? 0);
    return priceChanged || stockChanged || draft.is_active !== Boolean(product.is_active);
  }).map((product) => product.id)), [drafts, modes, products]);

  const save = async (product: ToolProduct) => {
    const draft = drafts[product.id];
    if (!draft) return;
    const patch: Record<string, unknown> = {};
    const nextPrice = Number(draft.price);
    const nextStock = Number(draft.stock);

    if (Number.isFinite(nextPrice) && nextPrice !== Number(product.price ?? 0)) patch.price = nextPrice;
    if (draft.is_active !== Boolean(product.is_active)) patch.is_active = draft.is_active;
    if (modes.get(product.id) === "simple" && Number.isInteger(nextStock) && nextStock >= 0 && nextStock !== Number(product.stock_quantity ?? 0)) {
      patch.stock_quantity = nextStock;
    }

    if (Object.keys(patch).length === 0) return;
    setBusyId(product.id);
    try {
      await quickUpdateAdminProduct(product.id, patch);
      toast({ title: "تم الحفظ", description: product.name_ar || product.name });
      await load();
    } catch (error: any) {
      toast({ title: "فشل التعديل", description: error?.message || "تحقق من القيم", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (product: ToolProduct) => {
    setBusyId(product.id);
    try {
      const newId = await duplicateAdminProduct(product.id);
      toast({ title: "تم إنشاء نسخة آمنة", description: "النسخة غير منشورة ومخزونها صفر حتى تراجعها." });
      navigate(`/admin/products/${newId}`);
    } catch (error: any) {
      toast({ title: "تعذر نسخ المنتج", description: error?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="w-full space-y-5" dir="rtl">
      <AdminPageHeader
        category="الكتالوج والمخزون"
        title="أدوات المنتجات السريعة"
        description="تعديلات صغيرة وآمنة بدون فتح نموذج المنتج الكامل."
        actions={[
          { label: "صحة الكتالوج", icon: PackageSearch, href: "/admin/catalog-health" },
          { label: "إدارة المنتجات", icon: ExternalLink, href: "/admin/products" },
        ]}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المنتج، الرابط أو الماركة" className="pr-9" />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}
            تحديث
          </Button>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>إذا كان المنتج يستخدم مقاسات أو SKU، يبقى تعديل المخزون من نموذج المنتج/المخزون الحالي فقط. السعر والحالة يمكن تعديلهما هنا بأمان.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[930px] text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">السعر</th>
                <th className="px-4 py-3 font-medium">المخزون</th>
                <th className="px-4 py-3 font-medium">نشط</th>
                <th className="px-4 py-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const draft = drafts[product.id];
                const isSku = modes.get(product.id) === "sku";
                const busy = busyId === product.id;
                return (
                  <tr key={product.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <Link to={`/admin/products/${product.id}`} className="font-medium hover:underline">{product.name_ar || product.name}</Link>
                      <p className="mt-1 text-xs text-muted-foreground">{[product.brand, product.category].filter(Boolean).join(" • ") || product.slug}</p>
                    </td>
                    <td className="px-4 py-3"><Input className="w-28" inputMode="decimal" value={draft?.price ?? ""} onChange={(e) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], price: e.target.value } }))} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Input className="w-24" inputMode="numeric" disabled={isSku} value={draft?.stock ?? "0"} onChange={(e) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], stock: e.target.value } }))} />
                        {isSku && <span className="text-[11px] text-muted-foreground">SKU</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Checkbox checked={draft?.is_active ?? false} onCheckedChange={(value) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], is_active: value === true } }))} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" disabled={!changed.has(product.id) || busy} onClick={() => void save(product)}>
                          {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}حفظ
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void duplicate(product)}><Copy className="ml-1 h-4 w-4" />نسخ</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">لا توجد منتجات مطابقة</div>}
        </div>
      )}
    </div>
  );
};

export default AdminProductToolsPage;
