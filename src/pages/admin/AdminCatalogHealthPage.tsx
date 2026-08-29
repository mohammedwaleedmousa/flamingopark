import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  FileSpreadsheet,
  ImageOff,
  Layers3,
  Loader2,
  PackageSearch,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
  Wrench,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import AdminProductToolsPage from "@/pages/admin/AdminProductToolsPage";
import AdminProductExcelPage from "@/pages/admin/AdminProductExcelPage";
import AdminProductClassificationPage from "@/pages/admin/AdminProductClassificationPage";
import { cn } from "@/lib/utils";
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

type ToolTab = "health" | "classification" | "quick" | "excel";

const TABS: Array<{ id: ToolTab; label: string; helper: string; icon: typeof PackageSearch }> = [
  { id: "health", label: "صحة الكتالوج", helper: "المشكلات والبيانات الناقصة", icon: PackageSearch },
  { id: "classification", label: "التصنيف والسجل", helper: "اقتراحات وتراجع آمن", icon: Sparkles },
  { id: "quick", label: "تعديل سريع", helper: "السعر والحالة والنسخ", icon: Wrench },
  { id: "excel", label: "Excel", helper: "تصدير وتحديث جماعي", icon: FileSpreadsheet },
];

const AdminCatalogHealthPage = () => {
  const [activeTab, setActiveTab] = useState<ToolTab>("health");
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
    { label: "تحتاج مراجعة", helper: "منتجات بها ملاحظة واحدة على الأقل", value: summary.products_with_issues, icon: AlertTriangle, tone: "amber" },
    { label: "بدون صور", helper: "تحتاج صورة منتج", value: summary.missing_images, icon: ImageOff, tone: "rose" },
    { label: "بدون ماركة", helper: "الماركة غير مرتبطة", value: summary.missing_brand, icon: Tags, tone: "violet" },
    { label: "بدون قسم", helper: "القسم غير مرتبط", value: summary.missing_category, icon: Layers3, tone: "blue" },
  ] as const;

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="الكتالوج والمخزون"
        title="صحة الكتالوج والأدوات"
        description="راجع جودة المنتجات ونفّذ أدوات الإدارة من مكان واحد بدون تكديس الصفحات."
        actions={[{ label: "إدارة المنتجات", icon: PackageSearch, href: "/admin/products" }]}
      />

      <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[6px]">
        <div className="grid gap-[6px] sm:grid-cols-2 xl:grid-cols-4">
          {TABS.map(({ id, label, helper, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex min-h-[58px] items-center gap-[10px] rounded-[12px] px-[12px] text-right transition-colors",
                  active ? "bg-[#F3F5F1] text-[#4F5A45]" : "text-[#6E7681] hover:bg-[#F8F9FA]",
                )}
              >
                <span className={cn("flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]", active ? "bg-white text-[#647057]" : "bg-[#F5F7F9] text-[#8E96A1]")}>
                  <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold">{label}</span>
                  <span className="mt-[2px] block truncate text-[7px] text-[#9BA2AC]">{helper}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {activeTab === "health" && (
        <div className="space-y-4">
          <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
            {cards.map(({ label, helper, value, icon: Icon, tone }) => (
              <HealthStatCard key={label} title={label} helper={helper} value={Number(value || 0)} icon={Icon} tone={tone} />
            ))}
          </section>

          <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
            <div className="flex flex-col gap-[10px] border-b border-[#EDF0F3] px-[14px] py-[11px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[8px]">
                <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#FFF6E7] text-[#B57A23]">
                  <AlertTriangle className="h-[13px] w-[13px]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#444B55]">المنتجات التي تحتاج مراجعة</p>
                  <p className="mt-[2px] text-[7px] text-[#9BA2AC]">{visibleRows.length.toLocaleString("ar-EG")} نتيجة من أصل {summary.total_products.toLocaleString("ar-EG")} منتج</p>
                </div>
              </div>

              <div className="flex w-full gap-[7px] sm:w-auto">
                <div className="relative min-w-0 flex-1 sm:w-[270px]">
                  <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث بالمنتج أو المشكلة"
                    className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[32px] text-[9px] shadow-none placeholder:text-[#A4ABB4] focus-visible:ring-0"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} title="إعادة الفحص" className="h-[36px] w-[36px] rounded-[9px] border-[#E3E7EC] shadow-none">
                  {loading ? <Loader2 className="h-[13px] w-[13px] animate-spin" /> : <RefreshCw className="h-[13px] w-[13px]" />}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid min-h-56 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9098A3]" /></div>
            ) : visibleRows.length === 0 ? (
              <div className="grid min-h-56 place-items-center px-4 text-center">
                <div>
                  <p className="text-[11px] font-semibold text-[#4A515B]">لا توجد نتائج تحتاج مراجعة</p>
                  <p className="mt-1 text-[8px] text-[#9BA2AC]">الكتالوج مطابق للفحوص الحالية.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[#FBFCFD]">
                    <tr className="border-b border-[#EDF0F3] text-right text-[8px] text-[#8E96A1]">
                      <th className="px-4 py-[10px] font-semibold">المنتج</th>
                      <th className="px-4 py-[10px] font-semibold">المشكلات</th>
                      <th className="px-4 py-[10px] font-semibold">الحالة</th>
                      <th className="px-4 py-[10px] font-semibold">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.id} className="border-b border-[#F0F2F4] last:border-0 hover:bg-[#FCFDFD]">
                        <td className="px-4 py-[11px]">
                          <p className="text-[9.5px] font-semibold text-[#424A54]">{row.name_ar || row.name || "منتج بدون اسم"}</p>
                          <p className="mt-[2px] text-[7px] text-[#9BA2AC]">{row.name || row.slug}</p>
                        </td>
                        <td className="px-4 py-[11px]">
                          <div className="flex flex-wrap gap-[5px]">
                            {row.issues.map((issue) => (
                              <span key={issue} className="rounded-[7px] border border-[#E7EAEF] bg-[#F8F9FA] px-[7px] py-[4px] text-[7px] font-medium text-[#6D7580]">
                                {CATALOG_ISSUE_LABELS[issue] || issue}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-[11px]">
                          <span className={cn("inline-flex rounded-full px-[7px] py-[4px] text-[7px] font-semibold", row.is_active ? "bg-[#EEF7F0] text-[#4D7A57]" : "bg-[#F3F4F6] text-[#858D98]")}>{row.is_active ? "نشط" : "غير نشط"}</span>
                        </td>
                        <td className="px-4 py-[11px]">
                          <Button asChild variant="outline" size="sm" className="h-[30px] rounded-[8px] border-[#E1E5EA] px-[9px] text-[8px] shadow-none">
                            <Link to={`/admin/products/${row.id}`}>فتح المنتج</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === "classification" && <AdminProductClassificationPage />}
      {activeTab === "quick" && <AdminProductToolsPage embedded />}
      {activeTab === "excel" && <AdminProductExcelPage embedded />}
    </div>
  );
};

const TONE_CLASSES = {
  amber: { icon: "bg-[#FFF6E7] text-[#B57A23]", bar: "bg-[#E2B45F]" },
  rose: { icon: "bg-[#FFF0F1] text-[#B96670]", bar: "bg-[#D88B94]" },
  violet: { icon: "bg-[#F2F0FF] text-[#675CBA]", bar: "bg-[#8C83C8]" },
  blue: { icon: "bg-[#EEF5FF] text-[#557CA9]", bar: "bg-[#7EA1C7]" },
} as const;

const HealthStatCard = ({ title, helper, value, icon: Icon, tone }: { title: string; helper: string; value: number; icon: typeof AlertTriangle; tone: keyof typeof TONE_CLASSES }) => {
  const classes = TONE_CLASSES[tone];
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[13px]">
      <div className={cn("absolute inset-x-0 top-0 h-[2px]", classes.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[8px] font-semibold text-[#777F89]">{title}</p>
          <p className="mt-[5px] text-[20px] font-bold leading-none tabular-nums text-[#343B44]">{value.toLocaleString("ar-EG")}</p>
          <p className="mt-[6px] truncate text-[6.5px] text-[#A0A7B0]">{helper}</p>
        </div>
        <div className={cn("flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-[9px]", classes.icon)}>
          <Icon className="h-[14px] w-[14px]" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
};

export default AdminCatalogHealthPage;
