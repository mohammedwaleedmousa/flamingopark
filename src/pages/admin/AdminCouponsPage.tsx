import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Banknote, BarChart3, CheckCircle2, CircleOff, Copy, Loader2, Percent, Plus, Search, Tag, TicketPercent, Trash2, X, type LucideIcon } from "lucide-react";

type CouponType = "percentage" | "fixed";
type CouponFilter = "all" | "active" | "inactive" | "used" | "unused";
type SortMode = "newest" | "oldest" | "usage_high" | "value_high";

interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  is_active: boolean;
  countries: string[];
  created_at: string;
  updated_at: string;
}

interface CouponUsage {
  code: string;
  usage_count: number;
  last_used_at: string | null;
}

interface CouponForm {
  code: string;
  type: CouponType;
  value: string;
  is_active: boolean;
  countries: string[];
}

const GLOBAL = "GLOBAL";

const emptyForm = (): CouponForm => ({
  code: "",
  type: "percentage",
  value: "",
  is_active: true,
  countries: [GLOBAL],
});

const AdminCouponsPage = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CouponFilter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | CouponType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm());

  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const { data: coupons = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("id,code,type,value,is_active,countries,created_at,updated_at").order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((coupon: any) => ({
        ...coupon,
        type: coupon.type as CouponType,
        value: Number(coupon.value || 0),
        is_active: Boolean(coupon.is_active),
        countries: Array.isArray(coupon.countries) ? coupon.countries : [GLOBAL],
      })) as Coupon[];
    },
    staleTime: 20_000,
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["admin-coupon-usage"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("coupon_usage_summary");

      if (error) throw error;

      return (data || []).map((row: any) => ({
        code: String(row.code || "").toUpperCase(),
        usage_count: Number(row.usage_count || 0),
        last_used_at: row.last_used_at || null,
      })) as CouponUsage[];
    },
    staleTime: 20_000,
  });

  const usageMap = useMemo(() => new Map(usage.map((row) => [row.code, row])), [usage]);

  const stats = useMemo(() => {
    const active = coupons.filter((coupon) => coupon.is_active).length;
    const used = coupons.filter((coupon) => (usageMap.get(coupon.code.toUpperCase())?.usage_count || 0) > 0).length;
    const totalUsage = usage.reduce((sum, row) => sum + row.usage_count, 0);

    return {
      total: coupons.length,
      active,
      used,
      totalUsage,
    };
  }, [coupons, usage, usageMap]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = coupons.filter((coupon) => {
      const couponUsage = usageMap.get(coupon.code.toUpperCase());
      const usageCount = couponUsage?.usage_count || 0;
      const matchesSearch = !query || coupon.code.toLowerCase().includes(query);
      const matchesType = typeFilter === "all" || coupon.type === typeFilter;

      let matchesFilter = true;
      if (filter === "active") matchesFilter = coupon.is_active;
      if (filter === "inactive") matchesFilter = !coupon.is_active;
      if (filter === "used") matchesFilter = usageCount > 0;
      if (filter === "unused") matchesFilter = usageCount === 0;

      return matchesSearch && matchesType && matchesFilter;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === "usage_high") return (usageMap.get(b.code.toUpperCase())?.usage_count || 0) - (usageMap.get(a.code.toUpperCase())?.usage_count || 0);
      if (sortMode === "value_high") return b.value - a.value;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [coupons, search, filter, typeFilter, sortMode, usageMap]);

  const openCreate = () => {
    setEditingCoupon(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value),
      is_active: coupon.is_active,
      countries: coupon.countries || [GLOBAL],
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    setDialogOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm());
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const code = form.code.trim().toUpperCase();
      const value = Number(form.value);

      if (!code) throw new Error("كود الكوبون مطلوب.");
      if (!/^[A-Z0-9_-]+$/.test(code)) throw new Error("كود الكوبون يجب أن يحتوي أحرفًا إنجليزية أو أرقامًا أو - و _ فقط.");
      if (!Number.isFinite(value) || value <= 0) throw new Error("قيمة الخصم يجب أن تكون أكبر من صفر.");
      if (form.type === "percentage" && value > 100) throw new Error("نسبة الخصم لا يمكن أن تتجاوز 100%.");

      const payload = {
        code,
        type: form.type,
        value,
        is_active: form.is_active,
        countries: [GLOBAL],
      };

      if (editingCoupon) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("coupons").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingCoupon);

      setDialogOpen(false);
      setEditingCoupon(null);
      setForm(emptyForm());

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-coupon-usage"] }),
      ]);

      toast({ title: wasEditing ? "تم تحديث الكوبون" : "تمت إضافة الكوبون" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ الكوبون", description: translateError(error?.message), variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ coupon, checked }: { coupon: Coupon; checked: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active: checked }).eq("id", coupon.id);
      if (error) throw error;
    },
    onMutate: async ({ coupon, checked }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-coupons"] });

      const previous = queryClient.getQueryData<Coupon[]>(["admin-coupons"]);

      queryClient.setQueryData<Coupon[]>(["admin-coupons"], (current = []) => current.map((row) => row.id === coupon.id ? { ...row, is_active: checked } : row));

      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-coupons"], context.previous);
      toast({ title: "تعذر تحديث حالة الكوبون", description: translateError(error?.message), variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (coupon: Coupon) => {
      const { error } = await (supabase as any).rpc("delete_coupon_safe", { p_coupon_id: coupon.id });

      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-coupon-usage"] }),
      ]);

      toast({ title: "تم حذف الكوبون" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف الكوبون", description: translateError(error?.message), variant: "destructive" });
    },
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "تم نسخ الكود" });
    } catch {
      toast({ title: "تعذر نسخ الكود", variant: "destructive" });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setFilter("all");
    setTypeFilter("all");
    setSortMode("newest");
  };

  const hasFilters = Boolean(search.trim()) || filter !== "all" || typeFilter !== "all" || sortMode !== "newest";

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل الكوبونات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التسويق" title="الكوبونات" description="إدارة أكواد الخصم ومتابعة استخدامها داخل الطلبات" actions={[{ label: "كوبون جديد", icon: Plus, onClick: openCreate, variant: "primary" }, { label: "التقارير", icon: BarChart3, href: "/admin/reports/overview", variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي الكوبونات" value={stats.total.toLocaleString("en-US")} helper={`${stats.active} كوبون مفعّل`} icon={TicketPercent} tone="indigo" />
        <StatCard title="الكوبونات النشطة" value={stats.active.toLocaleString("en-US")} helper="متاحة للاستخدام حاليًا" icon={CheckCircle2} tone="green" />
        <StatCard title="كوبونات مستخدمة" value={stats.used.toLocaleString("en-US")} helper="لها سجل استخدام سابق" icon={Tag} tone="blue" />
        <StatCard title="إجمالي الاستخدامات" value={stats.totalUsage.toLocaleString("en-US")} helper="عدد الطلبات التي استخدمت كوبونًا" icon={Percent} tone="amber" />
      </section>

      <section className="rounded-[12px] border border-[#E2DEF3] bg-[#F8F7FF] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <TicketPercent className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#675CBA]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#665D98]">حماية سجل الكوبونات مفعلة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#827AA8]">الكوبون الذي استُخدم في طلب سابق لا يمكن حذفه؛ يمكن تعطيله فقط حتى يبقى سجل الطلبات واضحًا.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-1 gap-[7px] border-b border-[#EDF0F3] p-[11px] xl:grid-cols-[minmax(0,1fr)_160px_170px_170px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بكود الكوبون..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={filter} onValueChange={(value) => setFilter(value as CouponFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="inactive">معطلة</SelectItem>
              <SelectItem value="used">مستخدمة</SelectItem>
              <SelectItem value="unused">غير مستخدمة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | CouponType)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="percentage">نسبة مئوية</SelectItem>
              <SelectItem value="fixed">مبلغ ثابت</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-[6px]">
            <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
              <SelectTrigger className="h-[40px] min-w-0 flex-1 rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="oldest">الأقدم</SelectItem>
                <SelectItem value="usage_high">الأكثر استخدامًا</SelectItem>
                <SelectItem value="value_high">الأعلى قيمة</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && <button type="button" onClick={clearFilters} className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[9px] border border-[#E3E7EC] bg-white text-[#7E8690]"><X className="h-[10px] w-[10px]" /></button>}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[9px]">
          <p className="text-[10.5px] font-semibold text-[#59616B]">{filteredCoupons.length.toLocaleString("ar-EG")} كوبون ظاهر</p>
          {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        {filteredCoupons.length === 0 ? (
          <PanelEmpty onCreate={openCreate} />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1080px]">
                <thead>
                  <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]">
                    <th className="px-[12px] text-right">الكوبون</th>
                    <th className="px-[12px] text-right">نوع الخصم</th>
                    <th className="px-[12px] text-right">القيمة</th>
                    <th className="px-[12px] text-right">الاستخدام</th>
                    <th className="px-[12px] text-right">آخر استخدام</th>
                    <th className="px-[12px] text-right">الحالة</th>
                    <th className="w-[130px] px-[12px] text-center">الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCoupons.map((coupon) => {
                    const couponUsage = usageMap.get(coupon.code.toUpperCase());
                    const usageCount = couponUsage?.usage_count || 0;

                    return (
                      <tr key={coupon.id} className="h-[72px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                        <td className="px-[12px]">
                          <div className="flex items-center gap-[8px]">
                            <button type="button" onClick={() => void copyCode(coupon.code)} className="inline-flex h-[30px] items-center gap-[6px] rounded-[8px] border border-[#E2DEF3] bg-[#F8F7FF] px-[9px] font-mono text-[10.5px] font-semibold text-[#675CBA]"><Copy className="h-[9px] w-[9px]" />{coupon.code}</button>
                          </div>
                        </td>
                        <td className="px-[12px]"><CouponTypeBadge type={coupon.type} /></td>
                        <td className="px-[12px]"><p className="text-[11px] font-semibold text-[#4A525C]">{coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value.toLocaleString("en-US")} ريال`}</p></td>
                        <td className="px-[12px]"><div><p className="text-[10.5px] font-semibold text-[#59616B]">{usageCount.toLocaleString("ar-EG")} مرة</p><p className="mt-[2px] text-[9.5px] text-[#9AA1AB]">{usageCount > 0 ? "له سجل استخدام" : "لم يُستخدم بعد"}</p></div></td>
                        <td className="px-[12px]"><span className="text-[10px] text-[#7E8690]">{couponUsage?.last_used_at ? formatDate(couponUsage.last_used_at) : "—"}</span></td>
                        <td className="px-[12px]"><div className="flex items-center gap-[8px]"><Switch checked={coupon.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ coupon, checked })} /><StatusBadge active={coupon.is_active} /></div></td>
                        <td className="px-[12px]">
                          <div className="flex items-center justify-center gap-[4px]">
                            <button type="button" onClick={() => openEdit(coupon)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]" title="تعديل"><Tag className="h-[10px] w-[10px]" /></button>
                            <button type="button" onClick={() => setDeleteTarget(coupon)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]" title="حذف"><Trash2 className="h-[10px] w-[10px]" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-[8px] p-[8px] md:hidden">
              {filteredCoupons.map((coupon) => {
                const couponUsage = usageMap.get(coupon.code.toUpperCase());
                const usageCount = couponUsage?.usage_count || 0;

                return (
                  <article key={coupon.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                    <div className="p-[11px]">
                      <div className="flex items-start justify-between gap-[8px]">
                        <div className="min-w-0">
                          <button type="button" onClick={() => void copyCode(coupon.code)} className="inline-flex items-center gap-[5px] font-mono text-[11px] font-semibold text-[#675CBA]"><Copy className="h-[9px] w-[9px]" />{coupon.code}</button>
                          <div className="mt-[5px]"><CouponTypeBadge type={coupon.type} /></div>
                        </div>
                        <StatusBadge active={coupon.is_active} />
                      </div>

                      <div className="mt-[10px] grid grid-cols-2 gap-[6px]">
                        <InfoBox label="قيمة الخصم" value={coupon.type === "percentage" ? `${coupon.value}%` : `${coupon.value.toLocaleString("en-US")} ريال`} />
                        <InfoBox label="مرات الاستخدام" value={`${usageCount.toLocaleString("ar-EG")} مرة`} />
                      </div>

                      <div className="mt-[6px] grid grid-cols-2 gap-[6px]">
                        <InfoBox label="آخر استخدام" value={couponUsage?.last_used_at ? formatDate(couponUsage.last_used_at) : "لم يُستخدم"} />
                        <InfoBox label="النطاق" value="المتجر الموحد" />
                      </div>
                    </div>

                    <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                      <button type="button" onClick={() => toggleMutation.mutate({ coupon, checked: !coupon.is_active })} className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[10px] font-semibold text-[#68717B]">{coupon.is_active ? "تعطيل" : "تفعيل"}</button>
                      <button type="button" onClick={() => openEdit(coupon)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Tag className="h-[9px] w-[9px]" />تعديل</button>
                      <button type="button" onClick={() => setDeleteTarget(coupon)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-w-[620px] rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{editingCoupon ? <Tag className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}</div>
              <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingCoupon ? "تعديل الكوبون" : "إضافة كوبون جديد"}</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">أدخل الكود ونوع الخصم وقيمته ثم فعّل الكوبون.</DialogDescription></div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات الكوبون" icon={TicketPercent}>
                <Field label="كود الكوبون" required>
                  <Input value={form.code} disabled={Boolean(editingCoupon && (usageMap.get(editingCoupon.code.toUpperCase())?.usage_count || 0) > 0)} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="FLAMINGO20" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] font-mono text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0 disabled:opacity-70" />
                  {editingCoupon && (usageMap.get(editingCoupon.code.toUpperCase())?.usage_count || 0) > 0 && <p className="mt-[5px] text-[9.5px] leading-5 text-[#A9782F]">تم استخدام هذا الكوبون سابقًا، لذلك يُفضّل عدم تغيير الكود حفاظًا على التقارير.</p>}
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="نوع الخصم" required>
                    <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value as CouponType }))}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percentage">نسبة مئوية (%)</SelectItem><SelectItem value="fixed">مبلغ ثابت</SelectItem></SelectContent>
                    </Select>
                  </Field>

                  <Field label={form.type === "percentage" ? "نسبة الخصم" : "مبلغ الخصم"} required>
                    <div className="relative">
                      <Input type="number" min="0.01" max={form.type === "percentage" ? 100 : undefined} step="0.01" value={form.value} onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} placeholder="0" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pl-[42px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                      <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[#9299A3]">{form.type === "percentage" ? "%" : "ريال"}</span>
                    </div>
                  </Field>
                </div>
              </FormSection>

              <FormSection title="التفعيل والنطاق" icon={CheckCircle2}>
                <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                  <div><p className="text-[11px] font-semibold text-[#555D67]">الكوبون نشط</p><p className="mt-[3px] text-[10px] text-[#9BA2AC]">{form.is_active ? "متاح للاستخدام في صفحة الدفع" : "محفوظ لكنه غير قابل للاستخدام"}</p></div>
                  <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
                </div>

                <div className="rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px] py-[10px]"><p className="text-[10px] text-[#9AA2AC]">النطاق</p><p className="mt-[4px] text-[10.5px] font-semibold text-[#59616B]">المتجر الموحد</p></div>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <TicketPercent className="ml-[5px] h-[12px] w-[12px]" />}{editingCoupon ? "حفظ التعديلات" : "إضافة الكوبون"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف الكوبون</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف {deleteTarget?.code || ""} فقط إذا لم يُستخدم في أي طلب سابق. إذا كان له سجل استخدام، عطّله بدل الحذف.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CouponTypeBadge = ({ type }: { type: CouponType }) => {
  if (type === "percentage") return <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[8px] text-[9.5px] font-semibold text-[#568468]"><Percent className="h-[9px] w-[9px]" />نسبة مئوية</span>;
  return <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[8px] text-[9.5px] font-semibold text-[#5679A4]"><Banknote className="h-[9px] w-[9px]" />مبلغ ثابت</span>;
};

const StatusBadge = ({ active }: { active: boolean }) => {
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9.5px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>{active ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}{active ? "نشط" : "معطل"}</span>;
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

const PanelEmpty = ({ onCreate }: { onCreate: () => void }) => {
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F1EFFF] text-[#675CBA]"><TicketPercent className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">لا توجد كوبونات</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">أضف كوبون خصم جديد أو غيّر الفلاتر الحالية.</p><Button type="button" onClick={onCreate} className="mt-3 h-[36px] rounded-[9px] bg-[#675CBA] px-4 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]"><Plus className="ml-[5px] h-[10px] w-[10px]" />كوبون جديد</Button></div>;
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const translateError = (message?: string) => {
  const value = String(message || "");

  if (value.includes("Admin access required")) return "هذه العملية متاحة للمدير فقط.";
  if (value.includes("Coupon has usage history")) return "هذا الكوبون استُخدم في طلبات سابقة؛ عطّله بدل حذفه.";
  if (value.includes("Coupon not found")) return "الكوبون غير موجود.";
  if (value.includes("duplicate key") || value.includes("ux_coupons_code_upper") || value.includes("coupons_code_key")) return "يوجد كوبون آخر بنفس الكود.";
  if (value.includes("coupons_value_positive_check")) return "قيمة الخصم يجب أن تكون أكبر من صفر.";
  if (value.includes("coupons_percentage_range_check")) return "نسبة الخصم لا يمكن أن تتجاوز 100%.";
  if (value.includes("coupons_type_check")) return "نوع الخصم غير صالح.";

  return value || "حدث خطأ غير متوقع.";
};
export default AdminCouponsPage;
