import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { exportAdminPageData, getAdminExportDefinition } from "@/lib/adminDataExport";

const AdminExcelExportButton = ({ pathname }: { pathname: string }) => {
  const [busy, setBusy] = useState(false);
  const definition = getAdminExportDefinition(pathname);

  if (!definition) return null;

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const count = await exportAdminPageData(pathname);
      toast({
        title: "تم تجهيز ملف Excel",
        description: count > 0 ? `تم تصدير ${count.toLocaleString("ar-EG")} صف في أعمدة مرتبة.` : "تم إنشاء الملف بالعناوين ولا توجد بيانات حالياً.",
      });
    } catch (error: any) {
      console.error("[admin-excel-export]", error);
      toast({
        title: "تعذر تصدير Excel",
        description: error?.message || "حدث خطأ أثناء تجهيز الملف.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleExport()}
      disabled={busy}
      className="inline-flex h-[38px] items-center justify-center gap-[6px] rounded-[10px] border border-[#DAD6F1] bg-[#F5F3FF] px-[10px] text-[9px] font-semibold text-[#5F55A9] transition-colors hover:border-[#CFC9EA] hover:bg-[#EEEAFE] disabled:cursor-wait disabled:opacity-60"
      aria-label="تصدير البيانات إلى Excel"
      title="تصدير Excel"
    >
      {busy ? <Loader2 className="h-[12px] w-[12px] animate-spin" strokeWidth={1.8} /> : <Download className="h-[12px] w-[12px]" strokeWidth={1.8} />}
      <span className="hidden sm:inline">{busy ? "جاري التصدير..." : "تصدير Excel"}</span>
    </button>
  );
};

export default AdminExcelExportButton;
