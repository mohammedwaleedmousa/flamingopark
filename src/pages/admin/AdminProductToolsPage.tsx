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
  type ProductQuickPatch,
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

type AdminProductToolsPageProps = {
  embedded?: boolean;
};

const AdminProductToolsPage = ({ embedded = false }: AdminProductToolsPageProps) => {
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
    const patch: ProductQuickPatch = {};
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
    <div className="w-full space-y-4" dir="rtl">
      {!embedded && (
        <AdminPageHeader
          category="الكتالوج والمخزون"
          title="أدوات المنتجات السريعة"
          description="تعديلات صغيرة وآمنة بدون فتح نموذج المنتج الكامل."
          actions={[
            { label: "صحة الكتالوج", icon: PackageSearch, href: "/admin/catalog-health" },
            { label: "إدارة المنتجات", icon: ExternalLink, href: "/admin/products" },
          ]}
        />
      )}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-[10px] border-b border-[#EDF0F3] px-[14px] py-[11px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
              <Search className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">البحث والتعديل السريع</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">آخر 150 منتجًا مع أدوات الحفظ والنسخ</p>
            </div>
          </div>

          <div className="flex w-full gap-[7px] sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-[300px]">
              <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المنتج، الرابط أو الماركة" className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[32px] text-[9px] shadow-none placeholder:text-[#A4ABB4] focus-visible:ring-0" />
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading} className="h-[36px] rounded-[9px] border-[#E3E7EC] px-[10px] text-[8px] shadow-none">
              {loading ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <RefreshCw className="ml-[5px] h-[12px] w-[12px]" />}
              تحديث
            </Button>
          </div>
        </div>

        <div className="flex items-start gap-[7px] border-b border-[#EDF0F3] bg-[#FBFCFD] px-[14px] py-[9px] text-[7.5px] text-[#7D8590]">
          <ShieldAlert className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#9A8052]" />
          <p>مخزون المنتجات التي تستخدم مقاسات أو SKU يُعدّل من نظام المخزون الحالي فقط. السعر والحالة والنسخ متاحة هنا بأمان.</p>
        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9098A3]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] text-sm">
              <thead className="bg-[#FBFCFD]">
                <tr className="border-b border-[#EDF0F3] text-right text-[8px] text-[#8E96A1]">
                  <th className="px-4 py-[10px] font-semibold">المنتج</th>
                  <th className="px-4 py-[10px] font-semibold">السعر</th>
                  <th className="px-4 py-[10px] font-semibold">المخزون</th>
                  <th className="px-4 py-[10px] font-semibold">نشط</th>
                  <th className="px-4 py-[10px] font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const draft = drafts[product.id];
                  const isSku = modes.get(product.id) === "sku";
                  const busy = busyId === product.id;
                  return (
                    <tr key={product.id} className="border-b border-[#F0F2F4] last:border-0 hover:bg-[#FCFDFD]">
                      <td className="px-4 py-[10px]">
                        <Link to={`/admin/products/${product.id}`} className="text-[9.5px] font-semibold text-[#424A54] hover:underline">{product.name_ar || product.name}</Link>
                        <p className="mt-[2px] text-[7px] text-[#9BA2AC]">{[product.brand, product.category].filter(Boolean).join(" • ") || product.slug}</p>
                      </td>
                      <td className="px-4 py-[10px]"><Input className="h-[32px] w-28 rounded-[8px] border-[#E3E7EC] bg-[#F9FAFB] text-[8.5px] shadow-none focus-visible:ring-0" inputMode="decimal" value={draft?.price ?? ""} onChange={(e) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], price: e.target.value } }))} /></td>
                      <td className="px-4 py-[10px]">
                        <div className="flex items-center gap-[6px]">
                          <Input className="h-[32px] w-24 rounded-[8px] border-[#E3E7EC] bg-[#F9FAFB] text-[8.5px] shadow-none focus-visible:ring-0 disabled:opacity-55" inputMode="numeric" disabled={isSku} value={draft?.stock ?? "0"} onChange={(e) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], stock: e.target.value } }))} />
                          {isSku && <span className="rounded-[6px] bg-[#F1F3F5] px-[6px] py-[3px] text-[6.5px] font-semibold text-[#858D98]">SKU</span>}
                        </div>
                      </td>
                      <td className="px-4 py-[10px]"><Checkbox checked={draft?.is_active ?? false} onCheckedChange={(value) => setDrafts((current) => ({ ...current, [product.id]: { ...current[product.id], is_active: value === true } }))} /></td>
                      <td className="px-4 py-[10px]">
                        <div className="flex gap-[6px]">
                          <Button size="sm" disabled={!changed.has(product.id) || busy} onClick={() => void save(product)} className="h-[30px] rounded-[8px] px-[9px] text-[8px] shadow-none">
                            {busy ? <Loader2 className="ml-[4px] h-[11px] w-[11px] animate-spin" /> : <Save className="ml-[4px] h-[11px] w-[11px]" />}حفظ
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => void duplicate(product)} className="h-[30px] rounded-[8px] border-[#E1E5EA] px-[9px] text-[8px] shadow-none"><Copy className="ml-[4px] h-[11px] w-[11px]" />نسخ</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && <div className="grid min-h-48 place-items-center text-[9px] text-[#9098A3]">لا توجد منتجات مطابقة</div>}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProductToolsPage;
