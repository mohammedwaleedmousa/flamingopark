import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadProductClassificationSuggestions } from "@/lib/productClassificationSuggestions";

const AdminProductClassificationPage = () => {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const testLoad = async () => {
    setLoading(true);
    try {
      const rows = await loadProductClassificationSuggestions();
      setCount(rows.length);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[16px]" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F2F0FF] text-[#675CBA]">
            <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#444B55]">اقتراحات التصنيف والسجل</p>
            <p className="mt-[2px] text-[7px] text-[#9BA2AC]">اختبار طبقة الاقتراحات قبل إعادة الواجهة الكاملة.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void testLoad()} disabled={loading} className="h-[32px] text-[8px]">
          {loading && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
          {count == null ? "اختبار" : `${count} نتيجة`}
        </Button>
      </div>
    </section>
  );
};

export default AdminProductClassificationPage;
