import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { hydrateCurrencies } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Banknote, CheckCircle2, CircleDollarSign, CircleOff, Coins, Loader2, Pencil, Plus, RefreshCcw, Save, Search, ShieldCheck, Trash2, WalletCards, X, type LucideIcon } from "lucide-react";

interface Currency {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  rate_to_base: number;
  is_base: boolean;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  created_at: string;
}

interface CurrencyUsage {
  code: string;
  order_count: number;
  refund_count: number;
  expense_count: number;
  transaction_count: number;
  country_count: number;
}

interface CurrencyForm {
  code: string;
  name_ar: string;
  name_en: string;
  symbol: string;
  rate_to_base: string;
  sort_order: string;
  is_active: boolean;
}

const BASE_CURRENCY_CODE = "SAR";

const emptyForm = (): CurrencyForm => ({
  code: "",
  name_ar: "",
  name_en: "",
  symbol: "",
  rate_to_base: "",
  sort_order: "",
  is_active: true,
});

const AdminCurrenciesPage = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [form, setForm] = useState<CurrencyForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Currency | null>(null);

  const { data: currencies = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-currencies"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("currencies").select("code,name_ar,name_en,symbol,rate_to_base,is_base,is_active,sort_order,updated_at,created_at").order("sort_order", { ascending: true }).order("code", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        rate_to_base: Number(row.rate_to_base || 1),
        sort_order: Number(row.sort_order || 0),
      })) as Currency[];
    },
    staleTime: 30_000,
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["admin-currency-usage"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("currency_usage_summary");

      if (error) throw error;

      return (data || []).map((row: any) => ({
        code: row.code,
        order_count: Number(row.order_count || 0),
        refund_count: Number(row.refund_count || 0),
        expense_count: Number(row.expense_count || 0),
        transaction_count: Number(row.transaction_count || 0),
        country_count: Number(row.country_count || 0),
      })) as CurrencyUsage[];
    },
    staleTime: 20_000,
  });

  const usageMap = useMemo(() => new Map(usage.map((row) => [row.code, row])), [usage]);

  const filteredCurrencies = useMemo(() => {
    const query = search.trim().toLowerCase();

    return currencies.filter((currency) => {
      const searchable = `${currency.code} ${currency.name_ar} ${currency.name_en} ${currency.symbol}`.toLowerCase();
      return !query || searchable.includes(query);
    });
  }, [currencies, search]);

  const baseCurrency = currencies.find((currency) => currency.is_base) || currencies.find((currency) => currency.code === BASE_CURRENCY_CODE);

  const stats = useMemo(() => {
    const active = currencies.filter((currency) => currency.is_active).length;
    const foreign = currencies.filter((currency) => !currency.is_base).length;
    const used = currencies.filter((currency) => {
      const row = usageMap.get(currency.code);
      return row ? row.order_count + row.refund_count + row.expense_count + row.transaction_count + row.country_count > 0 : false;
    }).length;

    return {
      total: currencies.length,
      active,
      foreign,
      used,
    };
  }, [currencies, usageMap]);

  const openCreate = () => {
    setEditingCurrency(null);
    setForm({
      ...emptyForm(),
      sort_order: String(currencies.length + 1),
    });
    setDialogOpen(true);
  };

  const openEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setForm({
      code: currency.code,
      name_ar: currency.name_ar,
      name_en: currency.name_en,
      symbol: currency.symbol,
      rate_to_base: String(currency.rate_to_base),
      sort_order: String(currency.sort_order),
      is_active: currency.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingCurrency(null);
    setForm(emptyForm());
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toUpperCase();
      const rate = Number(form.rate_to_base);
      const sortOrder = Number(form.sort_order || 0);

      if (!code) throw new Error("كود العملة مطلوب.");
      if (!/^[A-Z0-9_]+$/.test(code)) throw new Error("كود العملة يجب أن يحتوي أحرفًا إنجليزية كبيرة أو أرقامًا أو _ فقط.");
      if (!form.name_ar.trim()) throw new Error("الاسم العربي مطلوب.");
      if (!form.symbol.trim()) throw new Error("رمز العملة مطلوب.");
      if (!Number.isFinite(rate) || rate <= 0) throw new Error("سعر الصرف يجب أن يكون أكبر من صفر.");

      if (editingCurrency?.is_base && code !== editingCurrency.code) {
        throw new Error("لا يمكن تغيير كود العملة الأساسية.");
      }

      const payload = {
        name_ar: form.name_ar.trim(),
        name_en: form.name_en.trim() || form.name_ar.trim(),
        symbol: form.symbol.trim(),
        rate_to_base: editingCurrency?.is_base ? 1 : rate,
        is_active: editingCurrency?.is_base ? true : form.is_active,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      };

      if (editingCurrency) {
        const { error } = await (supabase as any).from("currencies").update(payload).eq("code", editingCurrency.code);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("currencies").insert({
        code,
        ...payload,
        is_base: false,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditingCurrency(null);
      setForm(emptyForm());

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-currencies"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-currency-usage"] }),
      ]);

      await hydrateCurrencies(true);

      toast({ title: editingCurrency ? "تم تحديث العملة" : "تمت إضافة العملة" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ العملة", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ currency, checked }: { currency: Currency; checked: boolean }) => {
      if (currency.is_base && !checked) throw new Error("لا يمكن تعطيل العملة الأساسية.");

      const { error } = await (supabase as any).from("currencies").update({ is_active: checked }).eq("code", currency.code);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-currencies"] });
      await hydrateCurrencies(true);
    },
    onError: (error: any) => {
      toast({ title: "تعذر تحديث حالة العملة", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (currency: Currency) => {
      const { error } = await (supabase as any).rpc("delete_currency_safe", { p_code: currency.code });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-currencies"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-currency-usage"] }),
      ]);

      await hydrateCurrencies(true);

      toast({ title: "تم حذف العملة" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف العملة", description: translateDbError(error?.message), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل العملات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="إدارة العملات" description="إدارة العملات وأسعار الصرف المستخدمة في المتجر والتقارير المالية" actions={[{ label: "عملة جديدة", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي العملات" value={stats.total.toLocaleString("en-US")} helper={`${stats.active} عملة مفعلة`} icon={Coins} tone="indigo" />
        <StatCard title="العملة الأساسية" value={baseCurrency?.code || "SAR"} helper={baseCurrency?.name_ar || "ريال سعودي"} icon={ShieldCheck} tone="green" />
        <StatCard title="عملات التحويل" value={stats.foreign.toLocaleString("en-US")} helper="عملات محسوبة من العملة الأساسية" icon={CircleDollarSign} tone="blue" />
        <StatCard title="مستخدمة في النظام" value={stats.used.toLocaleString("en-US")} helper="مرتبطة بطلبات أو سجلات مالية" icon={WalletCards} tone="amber" />
      </section>

      <section className="rounded-[12px] border border-[#DCE7F4] bg-[#F5F8FC] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <ShieldCheck className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#5680CF]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#607894]">SAR هي العملة الأساسية الحالية للنظام</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#7B8FA5]">الأسعار الأساسية في المشروع مخزنة بالريال السعودي. لذلك لا يمكن تبديل العملة الأساسية من هذه الصفحة؛ باقي الأسعار تعبّر عن قيمة 1 ر.س بالعملة المقابلة.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11.5px] font-semibold text-[#444B55]">العملات الحالية</h2>
            <p className="mt-[3px] text-[10px] text-[#9BA2AC]">{filteredCurrencies.length.toLocaleString("ar-EG")} عملة ظاهرة</p>
          </div>

          <div className="flex items-center gap-[6px]">
            {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
            <button type="button" onClick={() => { void queryClient.invalidateQueries({ queryKey: ["admin-currencies"] }); void queryClient.invalidateQueries({ queryKey: ["admin-currency-usage"] }); }} className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#7E8690] hover:bg-[#F7F8FA]" title="تحديث"><RefreshCcw className="h-[11px] w-[11px]" /></button>
          </div>
        </div>

        <div className="border-b border-[#EDF0F3] p-[11px]">
          <div className="relative max-w-[520px]">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث بالكود، الاسم أو الرمز..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute left-[9px] top-1/2 flex h-[24px] w-[24px] -translate-y-1/2 items-center justify-center rounded-[6px] text-[#9199A3] hover:bg-[#EEF1F4]"><X className="h-[9px] w-[9px]" /></button>}
          </div>
        </div>

        {filteredCurrencies.length === 0 ? (
          <PanelEmpty />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]">
                    <th className="px-[12px] text-right">العملة</th>
                    <th className="px-[12px] text-right">الكود</th>
                    <th className="px-[12px] text-right">سعر الصرف</th>
                    <th className="px-[12px] text-right">الاستخدام</th>
                    <th className="px-[12px] text-right">الترتيب</th>
                    <th className="px-[12px] text-right">الحالة</th>
                    <th className="w-[110px] px-[12px] text-center">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCurrencies.map((currency) => {
                    const rowUsage = usageMap.get(currency.code);
                    const usageCount = rowUsage ? rowUsage.order_count + rowUsage.refund_count + rowUsage.expense_count + rowUsage.transaction_count + rowUsage.country_count : 0;

                    return (
                      <tr key={currency.code} className="h-[74px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                        <td className="px-[12px]">
                          <div className="flex min-w-[200px] items-center gap-[9px]">
                            <div className={cn("flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[9px]", currency.is_base ? "bg-[#EAF7EE] text-[#629067]" : "bg-[#F1EFFF] text-[#675CBA]")}><Banknote className="h-[14px] w-[14px]" /></div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-[5px]"><p className="max-w-[220px] truncate text-[11px] font-semibold text-[#444C56]">{currency.name_ar}</p>{currency.is_base && <span className="rounded-[6px] bg-[#EAF7EE] px-[6px] py-[2px] text-[9px] font-semibold text-[#568468]">أساسية</span>}</div>
                              <p className="mt-[3px] max-w-[220px] truncate text-[9.5px] text-[#969DA7]">{currency.name_en}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-[12px]"><div className="flex items-center gap-[6px]"><span dir="ltr" className="inline-flex rounded-[7px] bg-[#F2F4F7] px-[8px] py-[5px] font-mono text-[10px] font-semibold text-[#68717B]">{currency.code}</span><span className="text-[11px] font-semibold text-[#59616B]">{currency.symbol}</span></div></td>
                        <td className="px-[12px]"><div><p className="text-[11px] font-semibold text-[#59616B]">{currency.is_base ? "1.000000" : currency.rate_to_base.toLocaleString("en-US", { maximumFractionDigits: 6 })}</p><p className="mt-[2px] text-[9.5px] text-[#9AA1AB]">{currency.is_base ? "المرجع الأساسي" : `1 ر.س = ${currency.rate_to_base.toLocaleString("en-US")} ${currency.symbol}`}</p></div></td>
                        <td className="px-[12px]"><UsageSummary usage={rowUsage} total={usageCount} /></td>
                        <td className="px-[12px]"><span className="text-[10.5px] text-[#68717B]">{currency.sort_order}</span></td>
                        <td className="px-[12px]"><div className="flex items-center gap-[8px]"><Switch checked={currency.is_active} disabled={currency.is_base} onCheckedChange={(checked) => toggleMutation.mutate({ currency, checked })} /><StatusBadge active={currency.is_active} /></div></td>
                        <td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => openEdit(currency)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]" title="تعديل"><Pencil className="h-[11px] w-[11px]" /></button><button type="button" disabled={currency.is_base} onClick={() => setDeleteTarget(currency)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1] disabled:cursor-not-allowed disabled:opacity-35" title={currency.is_base ? "لا يمكن حذف العملة الأساسية" : "حذف"}><Trash2 className="h-[11px] w-[11px]" /></button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filteredCurrencies.map((currency) => {
                const rowUsage = usageMap.get(currency.code);
                const usageCount = rowUsage ? rowUsage.order_count + rowUsage.refund_count + rowUsage.expense_count + rowUsage.transaction_count + rowUsage.country_count : 0;

                return (
                  <article key={currency.code} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                    <div className="p-[11px]">
                      <div className="flex items-start justify-between gap-[8px]">
                        <div className="flex min-w-0 gap-[9px]">
                          <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]", currency.is_base ? "bg-[#EAF7EE] text-[#629067]" : "bg-[#F1EFFF] text-[#675CBA]")}><Banknote className="h-[15px] w-[15px]" /></div>
                          <div className="min-w-0"><div className="flex items-center gap-[5px]"><h3 className="truncate text-[11.5px] font-semibold text-[#3B424C]">{currency.name_ar}</h3>{currency.is_base && <span className="rounded-[6px] bg-[#EAF7EE] px-[5px] py-[2px] text-[8.5px] font-semibold text-[#568468]">أساسية</span>}</div><p dir="ltr" className="mt-[3px] text-right font-mono text-[10px] text-[#9299A3]">{currency.code} · {currency.symbol}</p></div>
                        </div>
                        <StatusBadge active={currency.is_active} />
                      </div>

                      <div className="mt-[10px] grid grid-cols-2 gap-[6px]"><InfoBox label="سعر الصرف" value={currency.is_base ? "1.000000" : currency.rate_to_base.toLocaleString("en-US", { maximumFractionDigits: 6 })} /><InfoBox label="الاستخدام" value={`${usageCount.toLocaleString("ar-EG")} سجل`} /></div>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                      <button type="button" disabled={currency.is_base} onClick={() => toggleMutation.mutate({ currency, checked: !currency.is_active })} className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[10px] font-semibold text-[#68717B] disabled:opacity-40">{currency.is_active ? "تعطيل" : "تفعيل"}</button>
                      <button type="button" onClick={() => openEdit(currency)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                      <button type="button" disabled={currency.is_base} onClick={() => setDeleteTarget(currency)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] disabled:opacity-35"><Trash2 className="h-[11px] w-[11px]" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-w-[680px] rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{editingCurrency ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}</div>
              <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingCurrency ? "تعديل العملة" : "إضافة عملة جديدة"}</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">{editingCurrency?.is_base ? "يمكن تعديل الاسم والرمز فقط تقريبًا؛ سعر العملة الأساسية يبقى 1." : "أدخل سعر الصرف باعتباره: كم تساوي 1 ر.س بهذه العملة."}</DialogDescription></div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات العملة" icon={Coins}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="الكود" required><Input value={form.code} disabled={Boolean(editingCurrency)} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="USD" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] font-mono text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0 disabled:opacity-70" /></Field>
                  <Field label="الرمز" required><Input value={form.symbol} onChange={(event) => setForm((current) => ({ ...current, symbol: event.target.value }))} placeholder="$" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                </div>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="الاسم بالعربية" required><Input value={form.name_ar} onChange={(event) => setForm((current) => ({ ...current, name_ar: event.target.value }))} placeholder="دولار أمريكي" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  <Field label="الاسم بالإنجليزية"><Input value={form.name_en} onChange={(event) => setForm((current) => ({ ...current, name_en: event.target.value }))} placeholder="US Dollar" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                </div>
              </FormSection>

              <FormSection title="سعر الصرف والإعدادات" icon={CircleDollarSign}>
                <Field label={editingCurrency?.is_base ? "سعر العملة الأساسية" : "سعر الصرف"} required>
                  <Input type="number" min="0.000001" step="0.000001" disabled={Boolean(editingCurrency?.is_base)} value={editingCurrency?.is_base ? "1" : form.rate_to_base} onChange={(event) => setForm((current) => ({ ...current, rate_to_base: event.target.value }))} placeholder="مثال: 410" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0 disabled:opacity-70" />
                  <p className="mt-[5px] text-[10px] leading-5 text-[#979EA7]">{editingCurrency?.is_base ? "العملة الأساسية يجب أن تبقى 1 دائمًا." : `مثال: إذا كان 1 ر.س = 410 ${form.symbol || "من العملة"} فاكتب 410.`}</p>
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="ترتيب الظهور"><Input type="number" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>

                  <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                    <div><p className="text-[11px] font-semibold text-[#555D67]">عملة مفعلة</p><p className="mt-[3px] text-[10px] text-[#9BA2AC]">{editingCurrency?.is_base ? "العملة الأساسية لا يمكن تعطيلها" : form.is_active ? "متاحة داخل المتجر والنظام" : "محفوظة لكنها غير متاحة"}</p></div>
                    <Switch checked={editingCurrency?.is_base ? true : form.is_active} disabled={Boolean(editingCurrency?.is_base)} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : editingCurrency ? <Save className="ml-[5px] h-[12px] w-[12px]" /> : <Plus className="ml-[5px] h-[12px] w-[12px]" />}{editingCurrency ? "حفظ التعديلات" : "إضافة العملة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف العملة</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف {deleteTarget?.code || ""} فقط إذا لم تكن مستخدمة في الطلبات أو المصروفات أو المرتجعات أو دفتر اليومية أو إعدادات الدول. إذا كانت مستخدمة، عطّلها بدل الحذف.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const UsageSummary = ({ usage, total }: { usage?: CurrencyUsage; total: number }) => {
  if (!usage || total === 0) return <span className="text-[10px] text-[#A0A6AF]">غير مستخدمة</span>;

  return (
    <div>
      <p className="text-[10.5px] font-semibold text-[#59616B]">{total.toLocaleString("ar-EG")} استخدام</p>
      <p className="mt-[2px] text-[9px] text-[#9AA1AB]">{usage.order_count > 0 ? `${usage.order_count} طلب` : ""}{usage.refund_count > 0 ? ` · ${usage.refund_count} مرتجع` : ""}{usage.expense_count > 0 ? ` · ${usage.expense_count} مصروف` : ""}{usage.transaction_count > 0 ? ` · ${usage.transaction_count} قيد` : ""}</p>
    </div>
  );
};

const StatusBadge = ({ active }: { active: boolean }) => {
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[10px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>{active ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}{active ? "مفعلة" : "معطلة"}</span>;
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const InfoBox = ({ label, value }: { label: string; value: string }) => {
  return <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[10px] text-[#9AA2AC]">{label}</p><p className="mt-[4px] truncate text-[10.5px] font-semibold text-[#59616B]">{value}</p></div>;
};

const PanelEmpty = () => {
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><Coins className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد عملات</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">أضف عملة جديدة أو غيّر عبارة البحث.</p></div>;
};

const translateDbError = (message?: string) => {
  const value = String(message || "");

  if (value.includes("Admin access required")) return "هذه العملية متاحة للمدير فقط.";
  if (value.includes("Base currency cannot be deleted")) return "لا يمكن حذف العملة الأساسية.";
  if (value.includes("Base currency cannot be disabled")) return "لا يمكن تعطيل العملة الأساسية.";
  if (value.includes("Base currency cannot be changed")) return "لا يمكن تغيير العملة الأساسية في بنية التسعير الحالية.";
  if (value.includes("Current application base currency must remain SAR")) return "العملة الأساسية الحالية للمشروع يجب أن تبقى SAR.";
  if (value.includes("Currency is already used and cannot be deleted")) return "هذه العملة مستخدمة في سجلات سابقة؛ عطّلها بدل حذفها.";
  if (value.includes("Currency not found")) return "العملة غير موجودة.";
  if (value.includes("duplicate key")) return "يوجد بالفعل سجل بنفس كود العملة.";
  if (value.includes("currencies_rate_positive_check")) return "سعر الصرف يجب أن يكون أكبر من صفر.";
  if (value.includes("currencies_code_format_check")) return "كود العملة غير صالح.";

  return value || "حدث خطأ غير متوقع.";
};

export default AdminCurrenciesPage;