import { BadgeCheck } from "lucide-react";

const SalesAgentCodeNotice = () => (
  <div className="mt-2 flex items-start gap-2 rounded-[9px] border border-[#E7DDD9] bg-[#FCFAF9] px-3 py-2.5" dir="rtl">
    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A76A6D]" strokeWidth={1.6} />
    <p className="text-[6.5px] leading-5 text-[#8B7D78]">
      إذا أعطاك أحد موظفي فلامنجو كودًا خاصًا، أدخله هنا. سيتم تسجيل الطلب باسم الموظف بدون إلغاء خصمك المستحق.
    </p>
  </div>
);

export default SalesAgentCodeNotice;
