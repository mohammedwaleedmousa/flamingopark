import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, History, Loader2, RefreshCw, RotateCcw, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  applyProductClassification,
  listProductRevisions,
  loadProductClassificationSuggestions,
  reversibleFields,
  undoProductRevision,
  type ProductClassificationRow,
} from "@/lib/productClassificationSuggestions";
import type { AdminRevision } from "@/lib/adminProductivity";

const ACTION_LABELS: Record<string, string> = {
  quick_update: "تعديل سريع",
  classification_update: "تعديل تصنيف",
  duplicate: "نسخ المنتج",
  undo: "تراجع",
  excel_create_draft: "إنشاء من Excel",
  excel_stock_update: "تعديل مخزون Excel",
};

const FIELD_LABELS: Record<string, string> = {
  price: "السعر",
  is_active: "الحالة",
  brand_id: "الماركة",
  category_id: "القسم",
  audience: "الجمهور",
};

const confidenceLabel = (value: number) => value >= 0.9 ? "ثقة عالية" : value >= 0.75 ? "ثقة جيدة" : "مراجعة";

const AdminProductClassificationPage = () => {
  const [rows, setRows] = useState<ProductClassificationRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<Record<string, AdminRevision[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await loadProductClassificationSuggestions());
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل اقتراحات التصنيف", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.name, row.name_ar, row.slug, row.brand, row.category].some((value) => String(value || "").toLowerCase().includes(q)));
  }, [rows, search]);

  const openHistory = async (productId: string, force = false) => {
    if (!force && historyId === productId) {
      setHistoryId(null);
      return;
    }
    setHistoryId(productId);
    setHistoryLoading(true);
    try {
      setRevisions((current) => ({ ...current, [productId]: await listProductRevisions(productId, 20) }));
    } catch (error) {
      console.error(error);
      toast({ title: "تعذر تحميل سجل المنتج", variant: "destructive" });
    } finally {
      setHistoryLoading(false);
    }
  };

  const apply = async (row: ProductClassificationRow, field: "brand" | "category" | "audience") => {
    const suggestion = field === "brand" ? row.brandSuggestion : field === "category" ? row.categorySuggestion : row.audienceSuggestion;
    if (!suggestion) return;
    setBusyId(`${row.id}:${field}`);
    try {
      const patch = field === "brand"
        ? { brand_id: suggestion.value }
        : field === "category"
          ? { category_id: suggestion.value }
          : { audience: suggestion.value as "men" | "women" | "kids" | "unisex" };
      await applyProductClassification(row.id, patch);
      toast({ title: "تم اعتماد الاقتراح", description: `${row.name_ar || row.name} • ${suggestion.label}` });
      await load();
      if (historyId === row.id) await openHistory(row.id, true);
    } catch (error: any) {
      toast({ title: "تعذر تطبيق الاقتراح", description: error?.message || "راجع المنتج", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const undo = async (productId: string, revision: AdminRevision) => {
    setBusyId(`undo:${revision.id}`);
    try {
      await undoProductRevision(revision.id);
      toast({ title: "تم التراجع بأمان", description: "تم حفظ عملية التراجع كسجل جديد بدون لمس المخزون." });
      await Promise.all([load(), openHistory(productId, true)]);
    } catch (error: any) {
      const message = String(error?.message || "تعذر التراجع");
      toast({
        title: "لم يتم التراجع",
        description: message.includes("stale") ? "المنتج تغيّر بعد هذا التعديل، لذلك تم منع التراجع لحماية التعديل الأحدث." : message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-[10px] border-b border-[#EDF0F3] px-[14px] py-[11px] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-[8px]">
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F2F0FF] text-[#675CBA]">
              <Sparkles className="h-[13px] w-[13px]" strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[#444B55]">اقتراحات التصنيف والسجل</p>
              <p className="mt-[2px] text-[7px] text-[#9BA2AC]">لا يتم تعديل أي منتج إلا بعد اعتمادك، والتراجع لا يغيّر المخزون.</p>
            </div>
          </div>

          <div className="flex w-full gap-[7px] sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-[270px]">
              <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج" className="h-[36px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[32px] text-[9px] shadow-none placeholder:text-[#A4ABB4] focus-visible:ring-0" />
            </div>
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} className="h-[36px] w-[36px] rounded-[9px] border-[#E3E7EC] shadow-none" title="تحديث">
              {loading ? <Loader2 className="h-[13px] w-[13px] animate-spin" /> : <RefreshCw className="h-[13px] w-[13px]" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-[#FBFCFD] px-[14px] py-[9px] text-[7.5px] text-[#8F97A2]">
          <span>{visibleRows.length.toLocaleString("ar-EG")} منتجًا لديه تصنيف ناقص أو اقتراح قابل للمراجعة</span>
          <span>التطبيق فردي فقط</span>
        </div>
      </section>

      {loading ? (
        <div className="grid min-h-48 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9098A3]" /></div>
      ) : visibleRows.length === 0 ? (
        <section className="grid min-h-52 place-items-center rounded-[16px] border border-[#E5E9EF] bg-white px-4 text-center">
          <div>
            <p className="text-[11px] font-semibold text-[#4A515B]">لا توجد اقتراحات تحتاج مراجعة</p>
            <p className="mt-1 text-[8px] text-[#9BA2AC]">التصنيفات الحالية مكتملة ضمن الفحوص المتاحة.</p>
          </div>
        </section>
      ) : (
        <div className="space-y-[9px]">
          {visibleRows.slice(0, 150).map((row) => {
            const historyOpen = historyId === row.id;
            return (
              <section key={row.id} className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
                <div className="p-[13px]">
                  <div className="flex flex-col gap-[12px] xl:flex-row xl:items-start">
                    <div className="min-w-0 xl:w-[220px] xl:shrink-0">
                      <p className="text-[10px] font-semibold text-[#424A54]">{row.name_ar || row.name}</p>
                      <p className="mt-[3px] truncate text-[7px] text-[#9BA2AC]">{row.name || row.slug}</p>
                      <div className="mt-[7px] flex flex-wrap gap-[5px]">
                        <MetaPill value={row.brand || "بدون ماركة"} muted={!row.brand_id} />
                        <MetaPill value={row.category || "بدون قسم"} muted={!row.category_id} />
                        <MetaPill value={audienceLabel(row.audience)} muted={!row.audience} />
                      </div>
                    </div>

                    <div className="grid flex-1 gap-[7px] md:grid-cols-3">
                      <SuggestionCard label="الماركة" suggestion={row.brandSuggestion} current={row.brand_id ? row.brand : null} busy={busyId === `${row.id}:brand`} onApply={() => void apply(row, "brand")} />
                      <SuggestionCard label="القسم" suggestion={row.categorySuggestion} current={row.category_id ? row.category : null} busy={busyId === `${row.id}:category`} onApply={() => void apply(row, "category")} />
                      <SuggestionCard label="الجمهور" suggestion={row.audienceSuggestion} current={row.audience ? audienceLabel(row.audience) : null} busy={busyId === `${row.id}:audience`} onApply={() => void apply(row, "audience")} />
                    </div>

                    <Button variant="outline" size="sm" onClick={() => void openHistory(row.id)} className="h-[32px] rounded-[8px] border-[#E1E5EA] px-[9px] text-[8px] shadow-none xl:shrink-0">
                      <History className="ml-[5px] h-[12px] w-[12px]" />السجل
                    </Button>
                  </div>
                </div>

                {historyOpen && (
                  <div className="border-t border-[#EDF0F3] bg-[#FBFCFD] p-[12px]">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 text-[8px] text-[#8F97A2]"><Loader2 className="h-3 w-3 animate-spin" />تحميل السجل...</div>
                    ) : (revisions[row.id] || []).length === 0 ? (
                      <p className="text-[8px] text-[#8F97A2]">لا يوجد سجل لهذا المنتج حتى الآن.</p>
                    ) : (
                      <div className="space-y-[6px]">
                        {(revisions[row.id] || []).map((revision) => {
                          const fields = reversibleFields(revision);
                          return (
                            <div key={revision.id} className="flex flex-col gap-[7px] rounded-[10px] border border-[#E7EAEF] bg-white p-[10px] sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-[8.5px] font-semibold text-[#4D555F]">{ACTION_LABELS[revision.action] || revision.action}</p>
                                <p className="mt-[3px] text-[7px] text-[#969EA8]">
                                  {new Date(revision.created_at).toLocaleString("ar-EG")}
                                  {fields.length > 0 ? ` • ${fields.map((field) => FIELD_LABELS[field] || field).join("، ")}` : ""}
                                </p>
                              </div>
                              {fields.length > 0 && (
                                <Button variant="outline" size="sm" disabled={busyId === `undo:${revision.id}`} onClick={() => void undo(row.id, revision)} className="h-[30px] rounded-[8px] border-[#E1E5EA] px-[8px] text-[7.5px] shadow-none">
                                  {busyId === `undo:${revision.id}` ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <RotateCcw className="ml-1 h-3 w-3" />}تراجع آمن
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

const audienceLabel = (value: string | null | undefined) => ({ men: "رجالي", women: "نسائي", kids: "أطفال", unisex: "للجميع" }[String(value || "")] || "بدون جمهور");

const MetaPill = ({ value, muted = false }: { value: string; muted?: boolean }) => (
  <span className={cn("rounded-full border px-[7px] py-[4px] text-[6.5px]", muted ? "border-[#ECEFF2] bg-[#F7F8F9] text-[#A0A7AF]" : "border-[#E3E7EB] bg-white text-[#747C86]")}>{value}</span>
);

const SuggestionCard = ({ label, suggestion, current, busy, onApply }: {
  label: string;
  suggestion: ProductClassificationRow["brandSuggestion"];
  current: string | null | undefined;
  busy: boolean;
  onApply: () => void;
}) => (
  <div className="rounded-[11px] border border-[#E7EAEF] bg-[#FBFCFD] p-[10px]">
    <p className="text-[7px] font-semibold text-[#8A929D]">{label}</p>
    {current ? (
      <p className="mt-[6px] text-[9px] font-semibold text-[#4A525C]">{current}</p>
    ) : suggestion ? (
      <>
        <div className="mt-[6px] flex items-center justify-between gap-[6px]">
          <p className="truncate text-[9px] font-semibold text-[#454D57]">{suggestion.label}</p>
          <span className="shrink-0 rounded-full border border-[#E4E1F4] bg-[#F5F3FF] px-[6px] py-[3px] text-[6px] text-[#6A60A8]">{Math.round(suggestion.confidence * 100)}% • {confidenceLabel(suggestion.confidence)}</span>
        </div>
        <p className="mt-[5px] line-clamp-2 text-[6.5px] leading-4 text-[#969EA8]">{suggestion.reasons[0]}</p>
        <Button variant="outline" size="sm" disabled={busy} onClick={onApply} className="mt-[7px] h-[29px] w-full rounded-[8px] border-[#DFE3E8] bg-white px-[8px] text-[7px] shadow-none">
          {busy ? <Loader2 className="ml-1 h-3 w-3 animate-spin" /> : <Check className="ml-1 h-3 w-3" />}اعتماد
        </Button>
      </>
    ) : (
      <p className="mt-[6px] text-[7px] text-[#A0A7AF]">لا يوجد اقتراح موثوق</p>
    )}
  </div>
);

export default AdminProductClassificationPage;
