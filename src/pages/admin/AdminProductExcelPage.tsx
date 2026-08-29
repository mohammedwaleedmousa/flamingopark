import { useMemo, useState } from "react";
import { FileSpreadsheet, Loader2, PackageSearch, Upload } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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

type AdminProductExcelPageProps = {
  embedded?: boolean;
};

const AdminProductExcelPage = ({ embedded = false }: AdminProductExcelPageProps) => {
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
    <div className="w-full space-y-4" dir="rtl">
      {!embedded && (
        <AdminPageHeader
          category="الكتالوج والمخزون"
          title="Excel للمنتجات والمخزون"
          description="صدّر البيانات، عدّلها، ثم ارفعها لمعاينة كل تغيير قبل التنفيذ."
          actions={[{ label: "صحة الكتالوج", icon: PackageSearch, href: "/admin/catalog-health" }]}
        />
      )}

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="border-b border-[#EDF0F3] px-[14px] py-[11px]">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#EEF5FF] text-[#557CA9]">
              <FileSpreadsheet className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">نوع الملف</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">اختر البيانات التي تريد تصديرها أو تحديثها</p>
            </div>
          </div>
        </div>

        <div className="grid gap-[7px] p-[12px] md:grid-cols-2">
          <button
            type="button"
            onClick={() => { setMode("products"); resetPreview(); }}
            className={cn(
              "rounded-[12px] border p-[12px] text-right transition-colors",
              mode === "products" ? "border-[#D9DDD4] bg-[#F3F5F1]" : "border-[#E6E9ED] bg-[#FBFCFD] hover:bg-[#F8F9FA]",
            )}
          >
            <p className="text-[9.5px] font-semibold text-[#444B55]">ملف المنتجات</p>
            <p className="mt-[4px] text-[7px] leading-5 text-[#8F97A2]">السعر، النشر، الماركة، القسم، وإنشاء منتجات جديدة كمسودات.</p>
          </button>
          <button
            type="button"
            onClick={() => { setMode("inventory"); resetPreview(); }}
            className={cn(
              "rounded-[12px] border p-[12px] text-right transition-colors",
              mode === "inventory" ? "border-[#D9DDD4] bg-[#F3F5F1]" : "border-[#E6E9ED] bg-[#FBFCFD] hover:bg-[#F8F9FA]",
            )}
          >
            <p className="text-[9.5px] font-semibold text-[#444B55]">ملف مخزون SKU</p>
            <p className="mt-[4px] text-[7px] leading-5 text-[#8F97A2]">الكميات حسب اللون والمقاس بدون تجاوز نظام المخزون الحالي.</p>
          </button>
        </div>

        <div className="flex flex-col gap-[10px] border-t border-[#EDF0F3] px-[14px] py-[11px] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-[7px]">
            <Button variant="outline" onClick={() => void (mode === "products" ? exportProductUpdateWorkbook() : exportInventoryWorkbook())} className="h-[34px] rounded-[9px] border-[#E1E5EA] px-[10px] text-[8px] shadow-none">
              <FileSpreadsheet className="ml-[5px] h-[12px] w-[12px]" />تصدير Excel الحالي
            </Button>
            <label className="inline-flex h-[34px] cursor-pointer items-center gap-[5px] rounded-[9px] border border-[#E1E5EA] bg-white px-[10px] text-[8px] font-medium text-[#555D68] transition-colors hover:bg-[#F8F9FA]">
              <Upload className="h-[12px] w-[12px]" />رفع Excel للتحديث
              <Input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={busy} onChange={(event) => void handleFile(event.target.files?.[0])} />
            </label>
          </div>
          <div className="text-[7px] text-[#939BA6]">{fileName ? `الملف: ${fileName}` : "رفع الملف يعرض معاينة فقط ولا يغيّر البيانات تلقائيًا."}</div>
        </div>
      </section>

      {rows.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
            {[
              ["إجمالي الصفوف", summary.total, "neutral"],
              ["تغييرات", summary.changes, "green"],
              ["بدون تغيير", summary.skipped, "blue"],
              ["أخطاء", summary.errors, "rose"],
            ].map(([label, value, tone]) => (
              <ExcelStatCard key={String(label)} label={String(label)} value={Number(value)} tone={tone as "neutral" | "green" | "blue" | "rose"} />
            ))}
          </section>

          <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
            <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[11px]">
              <div>
                <p className="text-[10px] font-semibold text-[#444B55]">معاينة التغييرات</p>
                <p className="mt-[2px] text-[7px] text-[#9BA2AC]">راجع النتائج قبل التنفيذ النهائي</p>
              </div>
              <span className={cn("rounded-full px-[8px] py-[4px] text-[7px] font-semibold", errorCount > 0 ? "bg-[#FFF0F1] text-[#B96670]" : "bg-[#EEF7F0] text-[#4D7A57]")}>{errorCount > 0 ? `${errorCount.toLocaleString("ar-EG")} خطأ` : "جاهز للمراجعة"}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[#FBFCFD]">
                  <tr className="border-b border-[#EDF0F3] text-right text-[8px] text-[#8E96A1]">
                    <th className="px-4 py-[10px] font-semibold">الصف</th>
                    <th className="px-4 py-[10px] font-semibold">العنصر</th>
                    <th className="px-4 py-[10px] font-semibold">النتيجة</th>
                    <th className="px-4 py-[10px] font-semibold">التغييرات / الأخطاء</th>
                  </tr>
                </thead>
                <tbody>
                  {mode === "products" ? productPreview.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-[#F0F2F4] last:border-0 hover:bg-[#FCFDFD]">
                      <td className="px-4 py-[10px] text-[8px] text-[#6F7782]">{row.rowNumber}</td>
                      <td className="px-4 py-[10px] text-[9px] font-semibold text-[#424A54]">{row.productName}</td>
                      <td className="px-4 py-[10px] text-[8px] text-[#6F7782]">{row.mode === "create" ? "إنشاء مسودة" : row.mode === "update" ? "تحديث" : row.mode === "skip" ? "بدون تغيير" : "خطأ"}</td>
                      <td className="px-4 py-[10px] text-[7.5px] text-[#7C848F]">{row.errors.length ? row.errors.join(" • ") : row.changes.map((change) => `${change.field}: ${String(change.before ?? "-")} ← ${String(change.after ?? "-")}`).join(" | ") || "-"}</td>
                    </tr>
                  )) : inventoryPreview.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-[#F0F2F4] last:border-0 hover:bg-[#FCFDFD]">
                      <td className="px-4 py-[10px] text-[8px] text-[#6F7782]">{row.rowNumber}</td>
                      <td className="px-4 py-[10px] text-[9px] font-semibold text-[#424A54]">{row.label}</td>
                      <td className="px-4 py-[10px] text-[8px] text-[#6F7782]">{row.mode === "update" ? "تحديث" : row.mode === "skip" ? "بدون تغيير" : "خطأ"}</td>
                      <td className="px-4 py-[10px] text-[7.5px] text-[#7C848F]">{row.errors.length ? row.errors.join(" • ") : `${row.before ?? "-"} ← ${row.after ?? "-"}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-[10px] border-t border-[#EDF0F3] bg-[#FBFCFD] px-[14px] py-[11px] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[7.5px] text-[#7E8792]">{errorCount > 0 ? "يوجد أخطاء؛ لن يسمح النظام بالتنفيذ حتى تُصحح." : `جاهز لتنفيذ ${actionCount.toLocaleString("ar-EG")} تغيير.`}</p>
              <Button onClick={() => void apply()} disabled={busy || errorCount > 0 || actionCount === 0} className="h-[34px] rounded-[9px] px-[11px] text-[8px] shadow-none">
                {busy && <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" />}تنفيذ التغييرات المؤكدة
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

const STAT_TONES = {
  neutral: "bg-[#F1F3F5] text-[#747D87]",
  green: "bg-[#EEF7F0] text-[#4D7A57]",
  blue: "bg-[#EEF5FF] text-[#557CA9]",
  rose: "bg-[#FFF0F1] text-[#B96670]",
} as const;

const ExcelStatCard = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof STAT_TONES }) => (
  <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[8px] font-semibold text-[#777F89]">{label}</p>
        <p className="mt-[5px] text-[20px] font-bold leading-none tabular-nums text-[#343B44]">{value.toLocaleString("ar-EG")}</p>
      </div>
      <span className={cn("h-[9px] w-[9px] rounded-full", STAT_TONES[tone])} />
    </div>
  </div>
);

export default AdminProductExcelPage;
