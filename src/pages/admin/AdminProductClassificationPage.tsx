import { Sparkles } from "lucide-react";

const AdminProductClassificationPage = () => (
  <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[16px]" dir="rtl">
    <div className="flex items-center gap-[8px]">
      <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F2F0FF] text-[#675CBA]">
        <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-[#444B55]">اقتراحات التصنيف والسجل</p>
        <p className="mt-[2px] text-[7px] text-[#9BA2AC]">اختبار بناء المكوّن قبل إعادة منطق التصنيف.</p>
      </div>
    </div>
  </section>
);

export default AdminProductClassificationPage;
