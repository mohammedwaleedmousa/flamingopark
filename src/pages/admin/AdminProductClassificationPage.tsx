import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, History, Loader2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
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

const confidenceLabel = (value: number) => value >= 0.9 ? "ثقة عالية" : value >= 0.75 ? "ثقة جيدة" : "يحتاج مراجعة";

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
      toast({ title: "تم تطبيق الاقتراح", description: `${row.name_ar || row.name} • ${suggestion.label}` });
      await load();
      if (historyId === row.id) await openHistory(row.id, true);
    } catch (error: any) {
      toast({ title: "تعذر تطبيق الاقتراح", description: error?.message || "راجع المنتج", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

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

  const undo = async (productId: string, revision: AdminRevision) => {
    setBusyId(`undo:${revision.id}`);
    try {
      await undoProductRevision(revision.id);
      toast({ title: "تم التراجع بأمان", description: "تم إنشاء سجل جديد لعملية التراجع ولم يتم حذف السجل القديم." });
      await Promise.all([load(), openHistory(productId, true)]);
    } catch (error: any) {
      const message = String(error?.message || "تعذر التراجع");
      toast({
        title: "لم يتم التراجع",
        description: message.includes("stale") ? "المنتج تغيّر بعد هذا التعديل، لذلك تم منع التراجع حتى لا نفقد تعديلًا أحدث." : message,
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="text-lg font-semibold">اقتراحات التصنيف والسجل</h2></div>
          <p className="mt-1 text-sm text-muted-foreground">اقتراحات فقط؛ لا يتم تعديل أي منتج إلا بعد موافقتك. التراجع لا يلمس المخزون.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ml-2 h-4 w-4" />}تحديث
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج" className="sm:max-w-md" />
          <div className="text-xs text-muted-foreground">
            {rows.length.toLocaleString("ar-EG")} منتجًا ينقصه ماركة أو قسم أو جمهور
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : visibleRows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">لا توجد منتجات تحتاج اقتراحات ضمن البحث الحالي.</div>
      ) : (
        <div className="space-y-3">
          {visibleRows.slice(0, 150).map((row) => {
            const historyOpen = historyId === row.id;
            return (
              <div key={row.id} className="rounded-xl border border-border bg-card">
                <div className="p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 xl:w-72">
                      <p className="font-semibold">{row.name_ar || row.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{row.name || row.slug}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded-full border px-2 py-1">{row.brand || "بدون ماركة"}</span>
                        <span className="rounded-full border px-2 py-1">{row.category || "بدون قسم"}</span>
                        <span className="rounded-full border px-2 py-1">{row.audience || "بدون جمهور"}</span>
                      </div>
                    </div>

                    <div className="grid flex-1 gap-2 md:grid-cols-3">
                      <SuggestionCard
                        label="الماركة"
                        suggestion={row.brandSuggestion}
                        current={row.brand_id ? row.brand : null}
                        busy={busyId === `${row.id}:brand`}
                        onApply={() => void apply(row, "brand")}
                      />
                      <SuggestionCard
                        label="القسم"
                        suggestion={row.categorySuggestion}
                        current={row.category_id ? row.category : null}
                        busy={busyId === `${row.id}:category`}
                        onApply={() => void apply(row, "category")}
                      />
                      <SuggestionCard
                        label="الجمهور"
                        suggestion={row.audienceSuggestion}
                        current={row.audience}
                        busy={busyId === `${row.id}:audience`}
                        onApply={() => void apply(row, "audience")}
                      />
                    </div>

                    <Button variant="outline" size="sm" onClick={() => void openHistory(row.id)}>
                      <History className="ml-1 h-4 w-4" />السجل
                    </Button>
                  </div>
                </div>

                {historyOpen && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    {historyLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />تحميل السجل...</div>
                    ) : (revisions[row.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا يوجد سجل لهذا المنتج حتى الآن.</p>
                    ) : (
                      <div className="space-y-2">
                        {(revisions[row.id] || []).map((revision) => {
                          const fields = reversibleFields(revision);
                          return (
                            <div key={revision.id} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-medium">{ACTION_LABELS[revision.action] || revision.action}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {new Date(revision.created_at).toLocaleString("ar-EG")}
                                  {fields.length > 0 ? ` • ${fields.map((field) => FIELD_LABELS[field] || field).join("، ")}` : ""}
                                </p>
                              </div>
                              {fields.length > 0 && (
                                <Button variant="outline" size="sm" disabled={busyId === `undo:${revision.id}`} onClick={() => void undo(row.id, revision)}>
                                  {busyId === `undo:${revision.id}` ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <RotateCcw className="ml-1 h-4 w-4" />}تراجع آمن
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const SuggestionCard = ({
  label,
  suggestion,
  current,
  busy,
  onApply,
}: {
  label: string;
  suggestion: ProductClassificationRow["brandSuggestion"];
  current: string | null | undefined;
  busy: boolean;
  onApply: () => void;
}) => (
  <div className="rounded-lg border border-border bg-muted/20 p-3">
    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    {current ? (
      <p className="mt-2 text-sm font-medium">{current}</p>
    ) : suggestion ? (
      <>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{suggestion.label}</p>
          <span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">{Math.round(suggestion.confidence * 100)}% • {confidenceLabel(suggestion.confidence)}</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{suggestion.reasons[0]}</p>
        <Button className="mt-3 w-full" variant="outline" size="sm" disabled={busy} onClick={onApply}>
          {busy ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : <Check className="ml-1 h-4 w-4" />}اعتماد الاقتراح
        </Button>
      </>
    ) : (
      <p className="mt-2 text-xs text-muted-foreground">لا يوجد اقتراح موثوق حاليًا</p>
    )}
  </div>
);

export default AdminProductClassificationPage;
