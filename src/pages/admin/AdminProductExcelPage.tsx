import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, PackageSearch, Upload } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  applyInventoryWorkbookPreview,
  applyProductWorkbookPreview,
  exportInventoryWorkbook,
  exportProductUpdateWorkbook,
  previewInventoryWorkbook,
  previewProductWorkbook,
  type InventoryExcelPreviewRow,
  type ProductExcelPreviewRow,
} from "@/lib/adminProductExcel";

type Mode = "products" | "inventory";

const AdminProductExcelPage = () => {
  const [mode, setMode] = useState<Mode>("products");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");
  const [productPreview, setProductPreview] = useState<ProductExcelPreviewRow[]>([]);
  const [inventoryPreview, setInventoryPreview] = useState<InventoryExcelPreviewRow[]>([]);

  const rows = mode === "products" ? productPreview : inventoryPreview;
  const errorCount = rows.filter((row) => row.mode === "error").length;
  const actionCount = rows.filter((row) => row.mode === "update" || row.mode === "create").length;

  const resetPreview = () => {
    setProductPreview([]);
    setInventoryPreview([]);
    setFileName("");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      if (mode === "products") setProductPreview(await previewProductWorkbook(file));
      else setInventoryPreview(await previewInventoryWorkbook(file));
      setFileName(file.name);
    } catch (error: any) {
      resetPreview();
      toast({ title: "تعذر قراءة ملف Excel", description: error?.message || "تحقق من الملف", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!rows.length || errorCount > 0 || actionCount === 0) return;
    setBusy(true);
    try {
      const count = mode === "products"
        ? await applyProductWorkbookPreview(productPreview)
        : await applyInventoryWorkbookPreview(inventoryPreview);
      toast({ title: "تم تطبيق ملف Excel", description: `تم تنفيذ ${count.toLocaleString("ar-EG")} تغيير بأمان.` });
      resetPreview();
    } catch (error: any) {
      toast({ title: "توقف التنفيذ", description: error?.message || "لم تكتمل العملية", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const summary = useMemo(() => ({
    total: rows.length,
    changes: actionCount,
    errors: errorCount,
    skipped: rows.filter((row) => row.mode === "skip").length,
  }), [actionCount, errorCount, rows]);

  return (
    <div className="w-full space-y-5" dir="rtl">
      <AdminPageHeader
        category="الكتالوج والمخزون"
        title="Excel للمنتجات والمخزون"
        description="صدّر البيانات، عدّلها، ثم ارفعها لمعاينة كل تغيير قبل التنفيذ."
        actions={[{ label: "صحة الكتالوج", icon: PackageSearch, href: "/admin/catalog-health" }]}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => { setMode("products"); resetPreview(); }} className={`rounded-xl border p-4 text-right ${mode === "products" ? "border-foreground bg-muted" : "border-border bg-card"}`}>
          <p className="font-semibold">ملف المنتجات</p>
          <p className="mt-1 text-sm text-muted-foreground">السعر، حالة النشر، الماركة، القسم، وإنشاء منتجات جديدة كمسودات.</p>
        </button>
        <button type="button" onClick={() => { setMode("inventory"); resetPreview(); }} className={`rounded-xl border p-4 text-right ${mode === "inventory" ? "border-foreground bg-muted" : "border-border bg-card"}`}>
          <p className="font-semibold">ملف مخزون SKU</p>
          <p className="mt-1 text-sm text-muted-foreground">الكميات حسب اللون والمقاس بدون تجاوز نظام المخزون الحالي.</p>
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void (mode === "products" ? exportProductUpdateWorkbook() : exportInventoryWorkbook())}>
              <FileSpreadsheet className="ml-2 h-4 w-4" />تصدير Excel الحالي
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              <Upload className="h-4 w-4" />رفع Excel للتحديث
              <Input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={busy} onChange={(event) => void handleFile(event.target.files?.[0])} />
            </label>
          </div>
          <div className="text-xs text-muted-foreground">{fileName ? `الملف: ${fileName}` : "لن يتم تغيير أي بيانات بمجرد رفع الملف."}</div>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[['إجمالي الصفوف', summary.total], ['تغييرات', summary.changes], ['بدون تغيير', summary.skipped], ['أخطاء', summary.errors]].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{Number(value).toLocaleString("ar-EG")}</p></div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b text-right text-xs text-muted-foreground"><th className="px-4 py-3">الصف</th><th className="px-4 py-3">العنصر</th><th className="px-4 py-3">النتيجة</th><th className="px-4 py-3">التغييرات / الأخطاء</th></tr></thead>
              <tbody>
                {mode === "products" ? productPreview.map((row) => (
                  <tr key={row.rowNumber} className="border-b last:border-0">
                    <td className="px-4 py-3">{row.rowNumber}</td><td className="px-4 py-3 font-medium">{row.productName}</td>
                    <td className="px-4 py-3">{row.mode === "create" ? "إنشاء مسودة" : row.mode === "update" ? "تحديث" : row.mode === "skip" ? "بدون تغيير" : "خطأ"}</td>
                    <td className="px-4 py-3 text-xs">{row.errors.length ? row.errors.join(" • ") : row.changes.map((change) => `${change.field}: ${String(change.before ?? "-")} ← ${String(change.after ?? "-")}`).join(" | ") || "-"}</td>
                  </tr>
                )) : inventoryPreview.map((row) => (
                  <tr key={row.rowNumber} className="border-b last:border-0"><td className="px-4 py-3">{row.rowNumber}</td><td className="px-4 py-3 font-medium">{row.label}</td><td className="px-4 py-3">{row.mode === "update" ? "تحديث" : row.mode === "skip" ? "بدون تغيير" : "خطأ"}</td><td className="px-4 py-3 text-xs">{row.errors.length ? row.errors.join(" • ") : `${row.before ?? "-"} ← ${row.after ?? "-"}`}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{errorCount > 0 ? "يوجد أخطاء؛ لن يسمح النظام بالتنفيذ حتى تُصحح." : `جاهز لتنفيذ ${actionCount.toLocaleString("ar-EG")} تغيير.`}</p>
            <Button onClick={() => void apply()} disabled={busy || errorCount > 0 || actionCount === 0}>
              {busy && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}تنفيذ التغييرات المؤكدة
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminProductExcelPage;
