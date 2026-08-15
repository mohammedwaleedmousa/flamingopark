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
import { AlertTriangle, CheckCircle2, CircleOff, Clock3, Loader2, PackageCheck, Pencil, Plus, Search, Truck, WalletCards, X, Trash2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryCompany {
  id: string;
  name: string;
  country: string;
  base_fee: number;
  delivery_days: string | null;
  is_active: boolean | null;
  created_at?: string;
}

type DeliveryForm = {
  name: string;
  country: string;
  base_fee: number;
  delivery_days: string;
  is_active: boolean;
};

type StatusFilter = "all" | "active" | "inactive" | "used";
type SortMode = "name" | "fee_low" | "fee_high" | "orders";

const SINGLE_COUNTRY = "GLOBAL";

const emptyForm = (): DeliveryForm => ({
  name: "",
  country: SINGLE_COUNTRY,
  base_fee: 0,
  delivery_days: "",
  is_active: true,
});

const AdminDeliveryPage = () => {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<DeliveryCompany | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryCompany | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const [formData, setFormData] = useState<DeliveryForm>(emptyForm());

  /* =========================================================
     COMPANIES
  ========================================================= */

  const { data: companies = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-delivery-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("delivery_companies").select("id,name,country,base_fee,delivery_days,is_active,created_at").order("name", { ascending: true });

      if (error) throw error;

      return (data || []) as DeliveryCompany[];
    },
    staleTime: 30_000,
  });

  /* =========================================================
     ORDER USAGE
     delivery companies are normally a small list, so HEAD count
     queries stay light while giving useful operational context.
  ========================================================= */

  const { data: orderCounts = {}, isLoading: countsLoading } = useQuery({
    queryKey: ["delivery-company-order-counts", companies.map((company) => company.id)],
    enabled: companies.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        companies.map(async (company) => {
          const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("delivery_company_id", company.id);

          if (error) throw error;

          return [company.id, Number(count || 0)] as const;
        }),
      );

      return Object.fromEntries(entries) as Record<string, number>;
    },
    staleTime: 60_000,
  });

  /* =========================================================
     DERIVED
  ========================================================= */

  const stats = useMemo(() => {
    const active = companies.filter((company) => company.is_active).length;
    const inactive = companies.length - active;
    const used = companies.filter((company) => (orderCounts[company.id] || 0) > 0).length;
    const averageFee = companies.length > 0 ? companies.reduce((sum, company) => sum + Number(company.base_fee || 0), 0) / companies.length : 0;

    return {
      total: companies.length,
      active,
      inactive,
      used,
      averageFee,
    };
  }, [companies, orderCounts]);

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = companies.filter((company) => {
      const matchesSearch = !query || company.name.toLowerCase().includes(query) || String(company.delivery_days || "").toLowerCase().includes(query);
      const ordersCount = orderCounts[company.id] || 0;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(company.is_active)) ||
        (statusFilter === "inactive" && !company.is_active) ||
        (statusFilter === "used" && ordersCount > 0);

      return matchesSearch && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "fee_low") return Number(a.base_fee || 0) - Number(b.base_fee || 0);
      if (sortMode === "fee_high") return Number(b.base_fee || 0) - Number(a.base_fee || 0);
      if (sortMode === "orders") return (orderCounts[b.id] || 0) - (orderCounts[a.id] || 0);
      return a.name.localeCompare(b.name, "ar");
    });
  }, [companies, orderCounts, search, statusFilter, sortMode]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || sortMode !== "name";

  /* =========================================================
     FORM
  ========================================================= */

  const resetForm = () => {
    setFormData(emptyForm());
    setEditingCompany(null);
    setIsDialogOpen(false);
  };

  const openCreate = () => {
    setEditingCompany(null);
    setFormData(emptyForm());
    setIsDialogOpen(true);
  };

  const handleEdit = (company: DeliveryCompany) => {
    setEditingCompany(company);
    setFormData({
      name: company.name || "",
      country: company.country || SINGLE_COUNTRY,
      base_fee: Number(company.base_fee || 0),
      delivery_days: company.delivery_days || "",
      is_active: company.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    resetForm();
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async (data: DeliveryForm & { id?: string }) => {
      const name = data.name.trim();
      const deliveryDays = data.delivery_days.trim();
      const baseFee = Number(data.base_fee || 0);

      if (!name) throw new Error("اسم شركة التوصيل مطلوب.");
      if (!Number.isFinite(baseFee) || baseFee < 0) throw new Error("رسوم التوصيل يجب أن تكون صفرًا أو أكثر.");

      let duplicateQuery = supabase.from("delivery_companies").select("id").ilike("name", name).limit(1);

      if (data.id) duplicateQuery = duplicateQuery.neq("id", data.id);

      const { data: duplicated, error: duplicateError } = await duplicateQuery;

      if (duplicateError) throw duplicateError;

      if ((duplicated || []).length > 0) {
        throw new Error(`شركة التوصيل "${name}" موجودة مسبقًا.`);
      }

      const payload = {
        name,
        country: SINGLE_COUNTRY,
        base_fee: baseFee,
        delivery_days: deliveryDays || null,
        is_active: data.is_active,
      };

      if (data.id) {
        const { error } = await supabase.from("delivery_companies").update(payload).eq("id", data.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("delivery_companies").insert(payload);
      if (error) throw error;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-delivery-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-company-order-counts"] }),
      ]);

      toast({
        title: editingCompany ? "تم تحديث شركة التوصيل" : "تم إضافة شركة التوصيل",
        description: editingCompany ? "تم حفظ الرسوم والمدة وحالة الظهور." : "أصبحت الشركة جاهزة للاستخدام في صفحة إتمام الطلب.",
      });

      resetForm();
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ شركة التوصيل",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    saveMutation.mutate({
      ...formData,
      id: editingCompany?.id,
    });
  };

  /* =========================================================
     ACTIVE
  ========================================================= */

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("delivery_companies").update({ is_active }).eq("id", id);

      if (error) throw error;

      return { id, is_active };
    },

    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-delivery-companies"] });

      const previous = queryClient.getQueryData<DeliveryCompany[]>(["admin-delivery-companies"]);

      queryClient.setQueryData<DeliveryCompany[]>(["admin-delivery-companies"], (current = []) => current.map((company) => company.id === id ? { ...company, is_active } : company));

      return { previous };
    },

    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-delivery-companies"], context.previous);

      toast({
        title: "تعذر تحديث الحالة",
        description: error?.message || "حدث خطأ أثناء تحديث الشركة.",
        variant: "destructive",
      });
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-delivery-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-companies"] }),
      ]);
    },
  });

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (company: DeliveryCompany) => {
      const { count, error: countError } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("delivery_company_id", company.id);

      if (countError) throw countError;

      const linkedOrders = Number(count || 0);

      if (linkedOrders > 0) {
        throw new Error(`لا يمكن حذف ${company.name} لأنها مستخدمة في ${linkedOrders.toLocaleString("ar-EG")} طلب. عطّلها بدل الحذف للحفاظ على سجل الطلبات.`);
      }

      const { error } = await supabase.from("delivery_companies").delete().eq("id", company.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-delivery-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-company-order-counts"] }),
      ]);

      toast({ title: "تم حذف شركة التوصيل" });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حذف شركة التوصيل",
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
          <p className="mt-3 text-[9px] font-medium text-[#969DA7]">جاري تحميل شركات التوصيل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="العمليات والتوصيل" title="شركات التوصيل" description="إدارة شركات الشحن والرسوم ومدة التوصيل المتاحة للعملاء" actions={[{ label: "إضافة شركة", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <DeliveryStatCard title="إجمالي الشركات" value={stats.total.toLocaleString("en-US")} helper="جميع خدمات التوصيل المسجلة" icon={Truck} tone="indigo" />
        <DeliveryStatCard title="الشركات النشطة" value={stats.active.toLocaleString("en-US")} helper={`${stats.inactive} شركة معطلة`} icon={CheckCircle2} tone="green" />
        <DeliveryStatCard title="متوسط رسوم التوصيل" value={formatMoney(stats.averageFee)} helper="متوسط الرسوم الأساسية الحالية" icon={WalletCards} tone="blue" />
        <DeliveryStatCard title="مستخدمة في طلبات" value={stats.used.toLocaleString("en-US")} helper="شركات لها سجل طلبات فعلي" icon={PackageCheck} tone="coral" />
      </section>

      {stats.active === 0 && (
        <section className="rounded-[12px] border border-[#EEDFC4] bg-[#FFF9EF] px-[11px] py-[9px]">
          <div className="flex items-start gap-[7px]">
            <AlertTriangle className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#B17C37]" />
            <div>
              <p className="text-[8px] font-semibold text-[#9A7139]">لا توجد شركة توصيل نشطة</p>
              <p className="mt-[3px] text-[7px] leading-5 text-[#8A7659]">فعّل شركة واحدة على الأقل حتى تظهر خيارات التوصيل للعميل في إتمام الطلب.</p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">ابحث عن شركة ورتّب النتائج حسب الرسوم أو الاستخدام</p>
          </div>

          {hasFilters && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); setSortMode("name"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_175px_195px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم الشركة أو مدة التوصيل..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="active">نشطة</SelectItem>
              <SelectItem value="inactive">معطلة</SelectItem>
              <SelectItem value="used">مستخدمة في طلبات</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[9px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">الاسم</SelectItem>
              <SelectItem value="fee_low">الرسوم: الأقل أولًا</SelectItem>
              <SelectItem value="fee_high">الرسوم: الأعلى أولًا</SelectItem>
              <SelectItem value="orders">الأكثر استخدامًا</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">دليل شركات التوصيل</h2>
            <p className="mt-[3px] text-[8px] text-[#9CA3AC]">{filteredCompanies.length.toLocaleString("ar-EG")} شركة ظاهرة</p>
          </div>

          {(isFetching || countsLoading) && (
            <span className="flex items-center gap-[5px] text-[8px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right">شركة التوصيل</th>
                <th className="px-[12px] text-right">الرسوم</th>
                <th className="px-[12px] text-right">مدة التوصيل</th>
                <th className="px-[12px] text-right">الطلبات</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[110px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <DeliveryEmpty />
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company) => {
                  const ordersCount = orderCounts[company.id] || 0;

                  return (
                    <tr key={company.id} className="h-[68px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[12px]">
                        <div className="flex items-center gap-[9px]">
                          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]">
                            <Truck className="h-[15px] w-[15px]" />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-[10.5px] font-semibold text-[#414953]">{company.name}</p>
                            <p className="mt-[3px] text-[7px] text-[#9AA2AC]">المتجر الموحد</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <span className="inline-flex h-[26px] items-center rounded-[7px] bg-[#F2F4F7] px-[8px] text-[8px] font-semibold text-[#626A74]">{formatMoney(company.base_fee)}</span>
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center gap-[5px]">
                          <Clock3 className="h-[10px] w-[10px] text-[#8D949E]" />
                          <span className="text-[8px] font-medium text-[#727A84]">{company.delivery_days || "غير محددة"}</span>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", ordersCount > 0 ? "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" : "border-[#E4E7EB] bg-[#F5F6F8] text-[#858D97]")}>
                          <PackageCheck className="h-[8px] w-[8px]" />
                          {ordersCount.toLocaleString("ar-EG")} طلب
                        </span>
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center gap-[8px]">
                          <Switch checked={company.is_active ?? true} onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: company.id, is_active: checked })} />
                          <DeliveryStatus active={Boolean(company.is_active)} />
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <button type="button" title="تعديل الشركة" onClick={() => handleEdit(company)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#675CBA] hover:bg-[#F5F3FF]">
                            <Pencil className="h-[11px] w-[11px]" />
                          </button>

                          <button type="button" title={ordersCount > 0 ? "الشركة مرتبطة بطلبات؛ عطّلها بدل الحذف" : "حذف الشركة"} onClick={() => setDeleteTarget(company)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]">
                            <Trash2 className="h-[11px] w-[11px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-[8px] md:hidden">
        {filteredCompanies.length === 0 ? (
          <DeliveryEmpty />
        ) : (
          filteredCompanies.map((company) => {
            const ordersCount = orderCounts[company.id] || 0;

            return (
              <article key={company.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex items-start justify-between gap-[8px]">
                    <div className="flex min-w-0 gap-[9px]">
                      <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]">
                        <Truck className="h-[16px] w-[16px]" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{company.name}</h3>
                        <p className="mt-[3px] text-[7px] text-[#9299A3]">{company.delivery_days || "مدة التوصيل غير محددة"}</p>
                      </div>
                    </div>

                    <DeliveryStatus active={Boolean(company.is_active)} />
                  </div>

                  <div className="mt-[9px] grid grid-cols-2 gap-[6px]">
                    <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]">
                      <p className="text-[6.5px] text-[#9AA2AC]">رسوم التوصيل</p>
                      <p className="mt-[3px] text-[9px] font-semibold text-[#59616B]">{formatMoney(company.base_fee)}</p>
                    </div>

                    <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]">
                      <p className="text-[6.5px] text-[#9AA2AC]">الاستخدام</p>
                      <p className="mt-[3px] text-[9px] font-semibold text-[#59616B]">{ordersCount.toLocaleString("ar-EG")} طلب</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <button type="button" onClick={() => toggleActiveMutation.mutate({ id: company.id, is_active: !company.is_active })} className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[8px] font-semibold text-[#68717B]">{company.is_active ? "تعطيل" : "تفعيل"}</button>
                  <button type="button" onClick={() => handleEdit(company)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[8px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                  <button type="button" onClick={() => setDeleteTarget(company)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[11px] w-[11px]" /></button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[620px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingCompany ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingCompany ? "تعديل شركة التوصيل" : "إضافة شركة توصيل"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">إدارة اسم الخدمة ورسومها ومدة التوصيل وحالة ظهورها للعميل.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات الخدمة" icon={Truck}>
                <Field label="اسم شركة التوصيل" required>
                  <Input value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} placeholder="مثال: أرامكس" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="رسوم التوصيل (ر.ي)" required>
                    <Input type="number" min={0} step="0.01" value={formData.base_fee} onChange={(event) => setFormData((current) => ({ ...current, base_fee: Number(event.target.value) || 0 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <Field label="مدة التوصيل">
                    <Input value={formData.delivery_days} onChange={(event) => setFormData((current) => ({ ...current, delivery_days: event.target.value }))} placeholder="مثال: 2-3 أيام" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="الظهور في المتجر" icon={CheckCircle2}>
                <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                  <div>
                    <p className="text-[9px] font-semibold text-[#555D67]">حالة شركة التوصيل</p>
                    <p className="mt-[3px] text-[7px] text-[#9BA2AC]">{formData.is_active ? "تظهر كخيار للعميل أثناء إتمام الطلب" : "مخفية عن صفحة إتمام الطلب"}</p>
                  </div>

                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_active: checked }))} />
                </div>
              </FormSection>

              <div className="rounded-[10px] border border-[#DCE7F4] bg-[#F5F8FC] p-[10px]">
                <div className="flex items-start gap-[7px]">
                  <Clock3 className="mt-[1px] h-[12px] w-[12px] shrink-0 text-[#5680CF]" />
                  <div>
                    <p className="text-[8px] font-semibold text-[#526B89]">نصيحة تشغيلية</p>
                    <p className="mt-[3px] text-[7px] leading-5 text-[#7F8FA2]">اكتب مدة واضحة مثل "نفس اليوم" أو "2-3 أيام". هذه العبارة تظهر كجزء من معلومات شركة التوصيل للعميل.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[8px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : editingCompany ? <Pencil className="ml-[5px] h-[11px] w-[11px]" /> : <Plus className="ml-[5px] h-[11px] w-[11px]" />}{editingCompany ? "حفظ التعديلات" : "إضافة الشركة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div>
            <AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف شركة التوصيل</AlertDialogTitle>
            <AlertDialogDescription className="text-[9px] leading-6 text-[#858D97]">
              {deleteTarget && (orderCounts[deleteTarget.id] || 0) > 0 ? `شركة "${deleteTarget.name}" مرتبطة بـ ${(orderCounts[deleteTarget.id] || 0).toLocaleString("ar-EG")} طلب. للحفاظ على سجل الطلبات يفضل تعطيلها بدل حذفها.` : `سيتم حذف شركة "${deleteTarget?.name || ""}" نهائيًا من خيارات التوصيل.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending || Boolean(deleteTarget && (orderCounts[deleteTarget.id] || 0) > 0)} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555] disabled:opacity-40">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.ي`;

const DeliveryStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
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
      <p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[17px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const DeliveryStatus = ({ active }: { active: boolean }) => {
  return <span className={cn("inline-flex h-[24px] items-center gap-[5px] rounded-[7px] border px-[7px] text-[6.5px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}><span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />{active ? "نشطة" : "معطلة"}</span>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[8px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const DeliveryEmpty = () => {
  return <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] bg-white px-6 text-center"><div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><Truck className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد شركات توصيل</h3><p className="mt-[4px] text-[7px] text-[#9BA2AC]">أضف شركة جديدة أو غيّر البحث والفلاتر الحالية.</p></div>;
};

export default AdminDeliveryPage;