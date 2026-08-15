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
import { AlertTriangle, CheckCircle2, CircleOff, Copy, Globe2, Loader2, MapPin, Pencil, Plus, Search, ShieldCheck, Trash2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CODRegion {
  id: string;
  country: string;
  region_name: string;
  region_name_ar: string;
  is_active: boolean | null;
  created_at?: string;
}

type RegionForm = {
  country: string;
  region_name: string;
  region_name_ar: string;
  is_active: boolean;
};

type StatusFilter = "all" | "active" | "inactive";
type SortMode = "arabic" | "english" | "newest";

const SINGLE_COUNTRY = "GLOBAL";

const emptyForm = (): RegionForm => ({
  country: SINGLE_COUNTRY,
  region_name: "",
  region_name_ar: "",
  is_active: true,
});

const AdminCODRegionsPage = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("arabic");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<CODRegion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CODRegion | null>(null);
  const [form, setForm] = useState<RegionForm>(emptyForm());

  /* =========================================================
     REGIONS
  ========================================================= */

  const { data: regions = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-cod-regions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cod_regions").select("id,country,region_name,region_name_ar,is_active,created_at").order("region_name_ar", { ascending: true });

      if (error) throw error;

      return (data || []) as CODRegion[];
    },
    staleTime: 30_000,
  });

  /* =========================================================
     DERIVED
  ========================================================= */

  const stats = useMemo(() => {
    const active = regions.filter((region) => region.is_active).length;
    const inactive = regions.length - active;
    const coverageRate = regions.length > 0 ? Math.round((active / regions.length) * 100) : 0;

    return {
      total: regions.length,
      active,
      inactive,
      coverageRate,
    };
  }, [regions]);

  const filteredRegions = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = regions.filter((region) => {
      const matchesSearch =
        !query ||
        region.region_name_ar.toLowerCase().includes(query) ||
        region.region_name.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(region.is_active)) ||
        (statusFilter === "inactive" && !region.is_active);

      return matchesSearch && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "english") return a.region_name.localeCompare(b.region_name, "en");
      if (sortMode === "newest") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      return a.region_name_ar.localeCompare(b.region_name_ar, "ar");
    });
  }, [regions, search, statusFilter, sortMode]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || sortMode !== "arabic";

  /* =========================================================
     FORM
  ========================================================= */

  const resetForm = () => {
    setForm(emptyForm());
    setEditingRegion(null);
    setDialogOpen(false);
  };

  const openCreate = () => {
    setEditingRegion(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (region: CODRegion) => {
    setEditingRegion(region);
    setForm({
      country: region.country || SINGLE_COUNTRY,
      region_name: region.region_name || "",
      region_name_ar: region.region_name_ar || "",
      is_active: region.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    resetForm();
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async (payload: RegionForm & { id?: string }) => {
      const regionNameAr = payload.region_name_ar.trim();
      const regionName = payload.region_name.trim() || regionNameAr;

      if (!regionNameAr) throw new Error("اسم المنطقة بالعربي مطلوب.");
      if (!regionName) throw new Error("اسم المنطقة غير صالح.");

      let duplicateQuery = supabase.from("cod_regions").select("id").eq("country", SINGLE_COUNTRY).ilike("region_name", regionName).limit(1);

      if (payload.id) duplicateQuery = duplicateQuery.neq("id", payload.id);

      const { data: duplicated, error: duplicateError } = await duplicateQuery;

      if (duplicateError) throw duplicateError;

      if ((duplicated || []).length > 0) {
        throw new Error(`المنطقة "${regionName}" موجودة مسبقًا.`);
      }

      const data = {
        country: SINGLE_COUNTRY,
        region_name: regionName,
        region_name_ar: regionNameAr,
        is_active: payload.is_active,
      };

      if (payload.id) {
        const { error } = await supabase.from("cod_regions").update(data).eq("id", payload.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("cod_regions").insert(data);
      if (error) throw error;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-cod-regions"] }),
        queryClient.invalidateQueries({ queryKey: ["cod-regions"] }),
      ]);

      toast({
        title: editingRegion ? "تم تحديث المنطقة" : "تمت إضافة المنطقة",
        description: editingRegion ? "تم حفظ بيانات المنطقة وحالة الدفع عند الاستلام." : "أصبحت المنطقة متاحة ضمن إعدادات الدفع عند الاستلام.",
      });

      resetForm();
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ المنطقة",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    saveMutation.mutate({
      ...form,
      id: editingRegion?.id,
    });
  };

  /* =========================================================
     ACTIVE
  ========================================================= */

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("cod_regions").update({ is_active }).eq("id", id);

      if (error) throw error;

      return { id, is_active };
    },

    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-cod-regions"] });

      const previous = queryClient.getQueryData<CODRegion[]>(["admin-cod-regions"]);

      queryClient.setQueryData<CODRegion[]>(["admin-cod-regions"], (current = []) => current.map((region) => region.id === id ? { ...region, is_active } : region));

      return { previous };
    },

    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-cod-regions"], context.previous);

      toast({
        title: "تعذر تحديث المنطقة",
        description: error?.message || "حدث خطأ أثناء تحديث الحالة.",
        variant: "destructive",
      });
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-cod-regions"] }),
        queryClient.invalidateQueries({ queryKey: ["cod-regions"] }),
      ]);
    },
  });

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (region: CODRegion) => {
      const englishName = region.region_name.trim();
      const arabicName = region.region_name_ar.trim();

      const { count: englishCount, error: englishError } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_region", englishName);

      if (englishError) throw englishError;

      let arabicCount = 0;

      if (arabicName && arabicName.toLowerCase() !== englishName.toLowerCase()) {
        const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_region", arabicName);

        if (error) throw error;

        arabicCount = Number(count || 0);
      }

      const usageCount = Number(englishCount || 0) + arabicCount;

      if (usageCount > 0) {
        throw new Error(`لا يمكن حذف المنطقة لأنها مستخدمة في ${usageCount.toLocaleString("ar-EG")} طلب. عطّلها بدل الحذف للحفاظ على سجل الطلبات.`);
      }

      const { error } = await supabase.from("cod_regions").delete().eq("id", region.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-cod-regions"] }),
        queryClient.invalidateQueries({ queryKey: ["cod-regions"] }),
      ]);

      toast({ title: "تم حذف المنطقة" });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حذف المنطقة",
        description: error?.message || "حدث خطأ أثناء الحذف.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     LOADING
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>
          <p className="mt-3 text-[10px] font-medium text-[#969DA7]">جاري تحميل مناطق الدفع عند الاستلام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="العمليات والدفع" title="مناطق الدفع عند الاستلام" description="إدارة التغطية الجغرافية المتاحة لخيار الدفع عند الاستلام" actions={[{ label: "إضافة منطقة", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <RegionStatCard title="إجمالي المناطق" value={stats.total.toLocaleString("en-US")} helper="جميع المناطق المسجلة" icon={MapPin} tone="indigo" />
        <RegionStatCard title="التغطية النشطة" value={stats.active.toLocaleString("en-US")} helper={`${stats.inactive} منطقة معطلة`} icon={CheckCircle2} tone="green" />
        <RegionStatCard title="نسبة التغطية" value={`${stats.coverageRate}%`} helper="من المناطق المسجلة حاليًا" icon={Globe2} tone="blue" />
        <RegionStatCard title="غير متاحة للدفع عند الاستلام" value={stats.inactive.toLocaleString("en-US")} helper="تبقى محفوظة ويمكن إعادة تفعيلها" icon={CircleOff} tone="coral" />
      </section>

      {stats.active === 0 && (
        <section className="rounded-[12px] border border-[#EEDFC4] bg-[#FFF9EF] px-[12px] py-[10px]">
          <div className="flex items-start gap-[8px]">
            <AlertTriangle className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#B17C37]" />
            <div>
              <p className="text-[10px] font-semibold text-[#9A7139]">الدفع عند الاستلام غير متاح في أي منطقة</p>
              <p className="mt-[3px] text-[9px] leading-5 text-[#8A7659]">فعّل منطقة واحدة على الأقل حتى يتمكن العميل من اختيار منطقة مدعومة عند استخدام الدفع عند الاستلام.</p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[9px] text-[#9BA2AC]">ابحث بالعربي أو الإنجليزي وفلتر حسب حالة التغطية</p>
          </div>

          {hasFilters && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setSortMode("arabic"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[9px] text-[9px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_175px_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم المنطقة بالعربي أو الإنجليزي..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">مفعلة</SelectItem>
              <SelectItem value="inactive">معطلة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arabic">الاسم العربي</SelectItem>
              <SelectItem value="english">الاسم الإنجليزي</SelectItem>
              <SelectItem value="newest">الأحدث إضافة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">تغطية الدفع عند الاستلام</h2>
            <p className="mt-[3px] text-[9px] text-[#9CA3AC]">{filteredRegions.length.toLocaleString("ar-EG")} منطقة ظاهرة</p>
          </div>

          {isFetching && (
            <span className="flex items-center gap-[5px] text-[9px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right">المنطقة</th>
                <th className="px-[12px] text-right">الاسم الإنجليزي</th>
                <th className="px-[12px] text-right">النطاق</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[110px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredRegions.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <RegionsEmpty />
                  </td>
                </tr>
              ) : (
                filteredRegions.map((region) => (
                  <tr key={region.id} className="h-[68px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                    <td className="px-[12px]">
                      <div className="flex items-center gap-[9px]">
                        <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]">
                          <MapPin className="h-[15px] w-[15px]" />
                        </div>

                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate text-[11px] font-semibold text-[#414953]">{region.region_name_ar}</p>
                          <p className="mt-[3px] text-[9px] text-[#9AA2AC]">منطقة دفع عند الاستلام</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-[12px]">
                      <span dir="ltr" className="block max-w-[220px] truncate text-right text-[10px] font-medium text-[#707883]">{region.region_name}</span>
                    </td>

                    <td className="px-[12px]">
                      <span className="inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[8px] text-[9px] font-semibold text-[#5679A4]">
                        <Globe2 className="h-[9px] w-[9px]" />
                        المتجر الموحد
                      </span>
                    </td>

                    <td className="px-[12px]">
                      <div className="flex items-center gap-[8px]">
                        <Switch checked={region.is_active ?? true} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: region.id, is_active: checked })} />
                        <RegionStatus active={Boolean(region.is_active)} />
                      </div>
                    </td>

                    <td className="px-[12px]">
                      <div className="flex items-center justify-center gap-[4px]">
                        <button type="button" title="تعديل المنطقة" onClick={() => openEdit(region)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#675CBA] hover:bg-[#F5F3FF]">
                          <Pencil className="h-[11px] w-[11px]" />
                        </button>

                        <button type="button" title="حذف المنطقة" onClick={() => setDeleteTarget(region)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]">
                          <Trash2 className="h-[11px] w-[11px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-[8px] md:hidden">
        {filteredRegions.length === 0 ? (
          <RegionsEmpty />
        ) : (
          filteredRegions.map((region) => (
            <article key={region.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <div className="p-[11px]">
                <div className="flex items-start justify-between gap-[8px]">
                  <div className="flex min-w-0 gap-[9px]">
                    <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]">
                      <MapPin className="h-[16px] w-[16px]" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{region.region_name_ar}</h3>
                      <p dir="ltr" className="mt-[3px] truncate text-right text-[9px] text-[#9299A3]">{region.region_name}</p>
                    </div>
                  </div>

                  <RegionStatus active={Boolean(region.is_active)} />
                </div>

                <div className="mt-[9px] rounded-[9px] bg-[#F8FAFC] p-[8px]">
                  <div className="flex items-center gap-[6px]">
                    <ShieldCheck className="h-[11px] w-[11px] text-[#5680CF]" />
                    <p className="text-[9px] text-[#707883]">{region.is_active ? "الدفع عند الاستلام متاح للعملاء في هذه المنطقة." : "الدفع عند الاستلام متوقف في هذه المنطقة."}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                <button type="button" onClick={() => toggleActiveMutation.mutate({ id: region.id, is_active: !region.is_active })} className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[9px] font-semibold text-[#68717B]">{region.is_active ? "تعطيل" : "تفعيل"}</button>
                <button type="button" onClick={() => openEdit(region)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[9px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                <button type="button" onClick={() => setDeleteTarget(region)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[11px] w-[11px]" /></button>
              </div>
            </article>
          ))
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[620px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingRegion ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingRegion ? "تعديل منطقة الدفع عند الاستلام" : "إضافة منطقة جديدة"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[9px] text-[#9299A3]">إدارة الاسم العربي والإنجليزي وحالة توفر الدفع عند الاستلام.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات المنطقة" icon={MapPin}>
                <Field label="اسم المنطقة بالعربي" required>
                  <Input value={form.region_name_ar} onChange={(event) => setForm((current) => ({ ...current, region_name_ar: event.target.value }))} placeholder="مثال: عدن" dir="rtl" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <Field label="اسم المنطقة بالإنجليزي">
                  <div className="flex gap-[6px]">
                    <Input value={form.region_name} onChange={(event) => setForm((current) => ({ ...current, region_name: event.target.value }))} placeholder="Aden" dir="ltr" className="h-[40px] flex-1 rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />

                    <button type="button" title="نسخ الاسم العربي" onClick={() => setForm((current) => ({ ...current, region_name: current.region_name_ar.trim() }))} className="flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[9px] border border-[#E2E6EB] bg-white text-[#777F89] hover:bg-[#F8FAFC]">
                      <Copy className="h-[12px] w-[12px]" />
                    </button>
                  </div>

                  <p className="mt-[5px] text-[9px] leading-5 text-[#9BA2AC]">إذا تركته فارغًا سيُستخدم الاسم العربي تلقائيًا.</p>
                </Field>
              </FormSection>

              <FormSection title="التغطية" icon={ShieldCheck}>
                <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#555D67]">السماح بالدفع عند الاستلام</p>
                    <p className="mt-[3px] text-[9px] text-[#9BA2AC]">{form.is_active ? "المنطقة متاحة للعملاء" : "المنطقة محفوظة لكن الدفع عند الاستلام متوقف فيها"}</p>
                  </div>

                  <Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
                </div>
              </FormSection>

              <div className="rounded-[10px] border border-[#DCE7F4] bg-[#F5F8FC] p-[10px]">
                <div className="flex items-start gap-[7px]">
                  <Globe2 className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#5680CF]" />
                  <div>
                    <p className="text-[10px] font-semibold text-[#526B89]">النطاق الحالي</p>
                    <p className="mt-[3px] text-[9px] leading-5 text-[#7F8FA2]">النظام الحالي يعمل بمتجر موحد، لذلك يتم حفظ كل المناطق ضمن نطاق GLOBAL وتظهر المناطق النشطة في صفحة إتمام الطلب.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[9px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[9px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : editingRegion ? <Pencil className="ml-[5px] h-[11px] w-[11px]" /> : <Plus className="ml-[5px] h-[11px] w-[11px]" />}{editingRegion ? "حفظ التعديلات" : "إضافة المنطقة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div>
            <AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف منطقة الدفع عند الاستلام</AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">سيتم التحقق أولًا من سجل الطلبات. إذا استُخدمت منطقة "{deleteTarget?.region_name_ar || ""}" في طلبات سابقة فسيتم منع الحذف، ويمكنك تعطيلها بدلًا من ذلك.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const RegionStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />
      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div>
      <p className="mt-[12px] text-[10px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[19px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[6px] text-[9px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const RegionStatus = ({ active }: { active: boolean }) => {
  return <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}><span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />{active ? "مفعلة" : "معطلة"}</span>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[10px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[9px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const RegionsEmpty = () => {
  return <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] bg-white px-6 text-center"><div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><MapPin className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11px] font-semibold text-[#535B65]">لا توجد مناطق</h3><p className="mt-[4px] text-[9px] text-[#9BA2AC]">أضف منطقة جديدة أو غيّر البحث والفلاتر الحالية.</p></div>;
};

export default AdminCODRegionsPage;