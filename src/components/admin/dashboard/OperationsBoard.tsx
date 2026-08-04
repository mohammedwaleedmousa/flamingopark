import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardList, Image, PackageSearch, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface OperationsBoardProps {
  pendingOrders: number;
  lowStockCount: number;
}

const OperationsBoard = ({ pendingOrders, lowStockCount }: OperationsBoardProps) => {
  const { data = { pendingReviews: 0, activeCampaigns: 0 } } = useQuery({
    queryKey: ["admin-dashboard-operations"],
    queryFn: async () => {
      const [reviews, campaigns] = await Promise.all([
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).or("is_approved.eq.false,is_approved.is.null"),
        (supabase as any).from("campaign_pages").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return { pendingReviews: reviews.count || 0, activeCampaigns: campaigns.count || 0 };
    },
    staleTime: 30_000,
  });

  const items = [
    { label: "طلبات تحتاج متابعة", value: pendingOrders, hint: pendingOrders ? "راجع الطلبات الجديدة قبل تأكيدها" : "لا توجد طلبات معلقة", href: "/admin/orders", icon: ClipboardList, tone: "border-amber-200 bg-amber-50 text-amber-800", iconTone: "bg-amber-500 text-white" },
    { label: "مراجعات بانتظار الاعتماد", value: data.pendingReviews, hint: data.pendingReviews ? "اعتمد التقييمات المناسبة للعرض" : "كل المراجعات تمت مراجعتها", href: "/admin/reviews", icon: Star, tone: "border-violet-200 bg-violet-50 text-violet-800", iconTone: "bg-violet-600 text-white" },
    { label: "تنبيهات المخزون", value: lowStockCount, hint: lowStockCount ? "راجع المنتجات منخفضة التوفر" : "المخزون تحت السيطرة", href: "/admin/inventory-adjustments", icon: PackageSearch, tone: "border-rose-200 bg-rose-50 text-rose-800", iconTone: "bg-rose-600 text-white" },
    { label: "الحملات المنشورة", value: data.activeCampaigns, hint: "إدارة الواجهات والمحتوى الموسمي", href: "/admin/campaigns", icon: Image, tone: "border-sky-200 bg-sky-50 text-sky-800", iconTone: "bg-sky-600 text-white" },
  ];

  return <section className="border border-border bg-card" dir="rtl"><div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4"><div><p className="text-xs text-muted-foreground">مركز العمليات</p><h2 className="mt-1 font-heading text-xl text-foreground">أولويات اليوم</h2></div><span className="hidden items-center gap-1 text-xs text-emerald-700 sm:inline-flex"><CheckCircle2 className="h-4 w-4" /> يتم تحديث البيانات تلقائيًا</span></div><div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-4">{items.map((item) => <Link key={item.label} to={item.href} className={`group min-h-40 p-5 transition-colors hover:brightness-[0.98] ${item.tone}`}><div className="flex items-start justify-between"><span className={`grid h-10 w-10 place-items-center ${item.iconTone}`}><item.icon className="h-5 w-5" /></span><ArrowLeft className="h-4 w-4 opacity-50 transition-transform group-hover:-translate-x-1" /></div><p className="mt-5 text-3xl font-semibold tabular-nums">{item.value}</p><p className="mt-1 text-sm font-medium">{item.label}</p><p className="mt-2 text-xs leading-5 opacity-75">{item.hint}</p></Link>)}</div></section>;
};

export default OperationsBoard;