import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ImageOff, Layers3, Loader2, PackageSearch, RefreshCw, Tags } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  CATALOG_ISSUE_LABELS,
  getCatalogHealth,
  getCatalogHealthSummary,
  type CatalogHealthRow,
  type CatalogHealthSummary,
} from "@/lib/adminProductTools";

const EMPTY_SUMMARY: CatalogHealthSummary = {
  total_products: 0,
  products_with_issues: 0,
  missing_images: 0,
  missing_brand: 0,
  missing_category: 0,
  invalid_price: 0,
  stock_mismatch: 0,
};

const AdminCatalogHealthPage = () => {
  const [rows, setRows] = useState<CatalogHealthRow[]>([]);
  const [summary, setSummary] = useState<CatalogHealthSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextRows, nextSummary] = await Promise.all([
        getCatalogHealth(1000),
        getCatalogHealthSummary(),
      ]);
      setRows(nextRows);
      setSummary(nextSummary);
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر فحص الكتالوج", description: "حاول مرة أخرى بعد قليل.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.name, row.name_ar, row.slug, ...row.issues.map((issue) => CATALOG_ISSUE_LABELS[issue] || issue)]
        .some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const cards = [
    { label: "منتجات تحتاج مراجعة", value: summary.products_with_issues, icon: AlertTriangle },
    { label: "بدون صور", value: summary.missing_images, icon: ImageOff },
    { label: "بدون ماركة", value: summary.missing_brand, icon: Tags },
    { label: "بدون قسم", value: summary.missing_category, icon: Layers3 },
  ];

  return (
    <div className="w-full space-y-5" dir="rtl">
      <AdminPageHeader
        category="الكتالوج والمخزون"
        title="صحة الكتالوج"
        description="اكتشف المنتجات الناقصة أو غير المتطابقة بدون تغييرها تلقائيًا."
        actions={[{ label: "العودة للمنتجات", icon: PackageSearch, href: "/admin/products" }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(value || 0).toLocaleString("ar-EG")}</p>
              </div>
              <div className="rounded-lg bg-muted p-2"><Icon className="h-5 w-5" /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">المنتجات التي تحتاج إصلاحًا</h2>
            <p className="text-xs text-muted-foreground">
              {visibleRows.length.toLocaleString("ar-EG")} من أصل {summary.total_products.toLocaleString("ar-EG")} منتج
            </p>
          </div>
          <div className="flex gap-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالمنتج أو المشكلة" className="w-full sm:w-72" />
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} title="إعادة الفحص">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid min-h-56 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visibleRows.length === 0 ? (
          <div className="grid min-h-56 place-items-center text-center">
            <div>
              <p className="font-medium">لا توجد نتائج تحتاج مراجعة</p>
              <p className="mt-1 text-sm text-muted-foreground">الكتالوج مطابق للفحوص الحالية.</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-right text-xs text-muted-foreground">
                  <th className="px-3 py-3 font-medium">المنتج</th>
                  <th className="px-3 py-3 font-medium">المشكلات</th>
                  <th className="px-3 py-3 font-medium">الحالة</th>
                  <th className="px-3 py-3 font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-medium">{row.name_ar || row.name || "منتج بدون اسم"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.name || row.slug}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {row.issues.map((issue) => (
                          <span key={issue} className="rounded-full border border-border bg-muted px-2 py-1 text-xs">
                            {CATALOG_ISSUE_LABELS[issue] || issue}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={row.is_active ? "text-emerald-700" : "text-muted-foreground"}>{row.is_active ? "نشط" : "غير نشط"}</span>
                    </td>
                    <td className="px-3 py-3">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/admin/products/${row.id}`}>فتح المنتج</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCatalogHealthPage;
