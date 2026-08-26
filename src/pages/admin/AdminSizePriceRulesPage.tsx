import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Check, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type SizePriceRule = {
  id: string;
  name: string;
  adjustments: Record<string, number>;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  name_ar: string;
  price: number | null;
  brand: string | null;
  size_price_rule_id: string | null;
  is_active: boolean | null;
};

type AdjustmentRow = { size: string; amount: string };

const normalizeAdjustments = (value: unknown): Record<string, number> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  Object.entries(value as Record<string, unknown>).forEach(([size, amount]) => {
    const key = size.trim();
    const number = Number(amount);
    if (key && Number.isFinite(number) && number >= 0) result[key] = number;
  });
  return result;
};

const rowsFromRule = (rule?: SizePriceRule | null): AdjustmentRow[] => {
  if (!rule) return [{ size: "", amount: "0" }];
  const entries = Object.entries(normalizeAdjustments(rule.adjustments));
  return entries.length ? entries.map(([size, amount]) => ({ size, amount: String(amount) })) : [{ size: "", amount: "0" }];
};

const AdminSizePriceRulesPage = () => {
  const queryClient = useQueryClient();
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");
  const [ruleName, setRuleName] = useState("");
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([{ size: "", amount: "0" }]);
  const [isRuleActive, setIsRuleActive] = useState(true);
  const [savingRule, setSavingRule] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [bulkRuleId, setBulkRuleId] = useState<string>("");
  const [applyingBulk, setApplyingBulk] = useState(false);

  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ["admin-size-price-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("size_price_rules")
        .select("id,name,adjustments,is_active")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []).map((row: any) => ({ ...row, adjustments: normalizeAdjustments(row.adjustments) })) as SizePriceRule[];
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["admin-size-price-products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id,name,name_ar,price,brand,size_price_rule_id,is_active")
        .eq("has_sizes", true)
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const activeRules = useMemo(() => rules.filter((rule) => rule.is_active), [rules]);
  const selectedRule = rules.find((rule) => rule.id === selectedRuleId) || null;

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) => [product.name_ar, product.name, product.brand]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle)));
  }, [products, search]);

  const loadRule = (id: string) => {
    if (id === "new") {
      setSelectedRuleId("");
      setRuleName("");
      setAdjustments([{ size: "", amount: "0" }]);
      setIsRuleActive(true);
      return;
    }
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    setSelectedRuleId(rule.id);
    setRuleName(rule.name);
    setAdjustments(rowsFromRule(rule));
    setIsRuleActive(rule.is_active);
  };

  const saveRule = async () => {
    const name = ruleName.trim();
    if (!name) {
      toast({ title: "اسم القاعدة مطلوب", variant: "destructive" });
      return;
    }

    const normalized: Record<string, number> = {};
    for (const row of adjustments) {
      const size = row.size.trim();
      if (!size) continue;
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        toast({ title: `الزيادة للمقاس ${size} غير صحيحة`, variant: "destructive" });
        return;
      }
      normalized[size] = amount;
    }

    if (Object.keys(normalized).length === 0) {
      toast({ title: "أضف مقاساً واحداً على الأقل", variant: "destructive" });
      return;
    }

    setSavingRule(true);
    try {
      if (selectedRuleId) {
        const { error } = await (supabase as any)
          .from("size_price_rules")
          .update({ name, adjustments: normalized, is_active: isRuleActive, updated_at: new Date().toISOString() })
          .eq("id", selectedRuleId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("size_price_rules")
          .insert({ name, adjustments: normalized, is_active: isRuleActive })
          .select("id")
          .single();
        if (error) throw error;
        if (data?.id) setSelectedRuleId(data.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["admin-size-price-rules"] });
      toast({ title: "تم حفظ قاعدة أسعار المقاسات" });
    } catch (error: any) {
      toast({ title: "تعذر حفظ القاعدة", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setSavingRule(false);
    }
  };

  const applyRuleToProducts = async () => {
    if (selectedProducts.length === 0) {
      toast({ title: "حدد منتجاً واحداً على الأقل", variant: "destructive" });
      return;
    }
    if (!bulkRuleId) {
      toast({ title: "اختر القاعدة المراد تطبيقها", variant: "destructive" });
      return;
    }

    setApplyingBulk(true);
    try {
      const nextRuleId = bulkRuleId === "none" ? null : bulkRuleId;
      const { error } = await (supabase as any)
        .from("products")
        .update({ size_price_rule_id: nextRuleId })
        .in("id", selectedProducts);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin-size-price-products"] });
      setSelectedProducts([]);
      toast({ title: nextRuleId ? "تم تطبيق القاعدة على المنتجات المحددة" : "تمت إزالة قاعدة المقاسات من المنتجات المحددة" });
    } catch (error: any) {
      toast({ title: "تعذر تطبيق القاعدة", description: error?.message || "حاول مرة أخرى", variant: "destructive" });
    } finally {
      setApplyingBulk(false);
    }
  };

  const toggleAllVisible = (checked: boolean) => {
    const visibleIds = filteredProducts.map((product) => product.id);
    setSelectedProducts((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleIds.includes(id)));
  };

  const allVisibleSelected = filteredProducts.length > 0 && filteredProducts.every((product) => selectedProducts.includes(product.id));

  return (
    <div className="w-full space-y-4 pb-8" dir="rtl">
      <AdminPageHeader
        category="الكتالوج والتسعير"
        title="قواعد أسعار المقاسات"
        description="أنشئ زيادة سعر حسب المقاس مرة واحدة ثم طبّقها على عدة منتجات دفعة واحدة"
        actions={[{ label: "قاعدة جديدة", icon: Plus, onClick: () => loadRule("new"), variant: "outline" }]}
      />

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
          <div className="flex items-center gap-2 border-b border-[#EEF1F4] pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><BadgeDollarSign className="h-4 w-4" /></span>
            <div>
              <h2 className="text-[12px] font-semibold text-[#3F4650]">إعداد القاعدة</h2>
              <p className="text-[8px] text-[#969DA7]">الزيادة تضاف إلى سعر المنتج الأساسي</p>
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1.5 block text-[9px] font-medium text-[#6E7680]">فتح قاعدة موجودة</label>
              <Select value={selectedRuleId || "new"} onValueChange={loadRule}>
                <SelectTrigger className="h-10"><SelectValue placeholder="اختر قاعدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">قاعدة جديدة</SelectItem>
                  {rules.map((rule) => <SelectItem key={rule.id} value={rule.id}>{rule.name}{rule.is_active ? "" : " — معطلة"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-[9px] font-medium text-[#6E7680]">اسم القاعدة</label>
              <Input value={ruleName} onChange={(event) => setRuleName(event.target.value)} placeholder="مثال: ملابس رجالية - مقاسات كبيرة" className="h-10" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-medium text-[#6E7680]">المقاس والزيادة</label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAdjustments((current) => [...current, { size: "", amount: "0" }])} className="h-7 gap-1 text-[8px]"><Plus className="h-3 w-3" />إضافة مقاس</Button>
              </div>
              {adjustments.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_110px_34px] gap-2">
                  <Input value={row.size} onChange={(event) => setAdjustments((current) => current.map((item, i) => i === index ? { ...item, size: event.target.value } : item))} placeholder="XXL" className="h-9" />
                  <Input type="number" min={0} step="0.01" value={row.amount} onChange={(event) => setAdjustments((current) => current.map((item, i) => i === index ? { ...item, amount: event.target.value } : item))} placeholder="+0" className="h-9" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setAdjustments((current) => current.length === 1 ? [{ size: "", amount: "0" }] : current.filter((_, i) => i !== index))} className="h-9 w-9"><Trash2 className="h-3.5 w-3.5 text-[#C86B6B]" /></Button>
                </div>
              ))}
              <p className="text-[8px] leading-5 text-[#969DA7]">مثال: XL = 0، XXL = 10، 3XL = 20. المقاس غير الموجود في القاعدة يأخذ السعر الأساسي بدون زيادة.</p>
            </div>

            <label className="flex items-center gap-2 rounded-[9px] border border-[#E7EAEF] bg-[#FAFBFC] px-3 py-2">
              <Checkbox checked={isRuleActive} onCheckedChange={(checked) => setIsRuleActive(Boolean(checked))} />
              <span className="text-[9px] font-medium text-[#5F6771]">القاعدة مفعلة</span>
            </label>

            <Button type="button" onClick={saveRule} disabled={savingRule || rulesLoading} className="h-10 w-full gap-2">
              {savingRule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ القاعدة
            </Button>
          </div>
        </section>

        <section className="min-w-0 rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
          <div className="flex flex-col gap-3 border-b border-[#EEF1F4] pb-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[12px] font-semibold text-[#3F4650]">تطبيق جماعي على المنتجات</h2>
              <p className="mt-1 text-[8px] text-[#969DA7]">حدد المنتجات مرة واحدة ثم طبّق القاعدة عليها جميعاً</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={bulkRuleId} onValueChange={setBulkRuleId}>
                <SelectTrigger className="h-9 min-w-[210px]"><SelectValue placeholder="اختر القاعدة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">إزالة قاعدة المقاسات</SelectItem>
                  {activeRules.map((rule) => <SelectItem key={rule.id} value={rule.id}>{rule.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" onClick={applyRuleToProducts} disabled={applyingBulk || selectedProducts.length === 0} className="h-9 gap-2">
                {applyingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                تطبيق على {selectedProducts.length || 0}
              </Button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0A7B0]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الماركة" className="h-10 pr-9" />
          </div>

          <div className="mt-3 overflow-hidden rounded-[11px] border border-[#E8EBEF]">
            <div className="grid grid-cols-[36px_minmax(0,1fr)_90px_150px] items-center gap-2 bg-[#F8FAFC] px-3 py-2 text-[8px] font-semibold text-[#737B86]">
              <Checkbox checked={allVisibleSelected} onCheckedChange={(checked) => toggleAllVisible(Boolean(checked))} aria-label="تحديد الكل" />
              <span>المنتج</span>
              <span>السعر</span>
              <span>القاعدة الحالية</span>
            </div>

            {productsLoading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#675CBA]" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-[9px] text-[#969DA7]">لا توجد منتجات بمقاسات مطابقة للبحث.</div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                {filteredProducts.map((product) => {
                  const rule = rules.find((item) => item.id === product.size_price_rule_id);
                  const checked = selectedProducts.includes(product.id);
                  return (
                    <label key={product.id} className="grid cursor-pointer grid-cols-[36px_minmax(0,1fr)_90px_150px] items-center gap-2 border-t border-[#EEF1F4] px-3 py-2.5 hover:bg-[#FBFCFE]">
                      <Checkbox checked={checked} onCheckedChange={(next) => setSelectedProducts((current) => next ? [...current, product.id] : current.filter((id) => id !== product.id))} />
                      <div className="min-w-0">
                        <p className="truncate text-[9px] font-medium text-[#4A525C]">{product.name_ar || product.name}</p>
                        <p className="mt-0.5 truncate text-[7px] text-[#9AA1AA]">{product.brand || "بدون ماركة"}{product.is_active === false ? " • معطل" : ""}</p>
                      </div>
                      <span className="text-[8px] font-semibold text-[#5E6670]">{Number(product.price || 0).toFixed(2)}</span>
                      <span className={`truncate text-[8px] ${rule ? "font-medium text-[#675CBA]" : "text-[#A0A7B0]"}`}>{rule?.name || "السعر الأساسي"}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <p className="mt-2 text-[8px] text-[#969DA7]">المنتجات غير المرتبطة بقاعدة تستمر بالسعر الأساسي كما هي. تعطيل القاعدة يجعل زياداتها صفراً فوراً دون حذف الربط.</p>
        </section>
      </div>
    </div>
  );
};

export default AdminSizePriceRulesPage;
