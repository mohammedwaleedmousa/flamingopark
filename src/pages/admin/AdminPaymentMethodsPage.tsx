import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { CURRENCY_RATES } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, Banknote, Building2, CheckCircle2, CircleDollarSign, CreditCard, Landmark, Loader2, Pencil, Plus, Search, ShieldCheck, Trash2, Wallet, X, type LucideIcon } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
}

interface MethodDetails {
  provider_name?: string;
  account_reference?: string;
  instructions?: string;
  [key: string]: unknown;
}

interface Method {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
  account_id: string | null;
  details: MethodDetails | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  chart_of_accounts?: Account | null;
}

interface Settlement {
  id: string;
  settlement_date: string;
  payment_method_id: string | null;
  expected_amount: number;
  actual_amount: number;
  difference: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  payment_methods: { id: string; code: string; name_ar: string; type: string } | null;
}

type MethodForm = {
  code: string;
  name: string;
  name_ar: string;
  type: string;
  account_id: string;
  sort_order: number;
  is_active: boolean;
  provider_name: string;
  account_reference: string;
  instructions: string;
};

type SettlementForm = {
  payment_method_id: string;
  settlement_date: string;
  expected_amount: string;
  actual_amount: string;
  status: string;
  notes: string;
};

type ActiveTab = "methods" | "settlements";
type MethodStatusFilter = "all" | "active" | "inactive";
type SettlementStatusFilter = "all" | "pending" | "reconciled";

const emptyMethodForm = (): MethodForm => ({
  code: "",
  name: "",
  name_ar: "",
  type: "cash",
  account_id: "none",
  sort_order: 0,
  is_active: true,
  provider_name: "",
  account_reference: "",
  instructions: "",
});

const emptySettlementForm = (): SettlementForm => ({
  payment_method_id: "",
  settlement_date: new Date().toISOString().slice(0, 10),
  expected_amount: "",
  actual_amount: "",
  status: "reconciled",
  notes: "",
});

const AdminPaymentMethodsPage = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("methods");
  const [search, setSearch] = useState("");
  const [methodStatusFilter, setMethodStatusFilter] = useState<MethodStatusFilter>("all");
  const [methodTypeFilter, setMethodTypeFilter] = useState("all");
  const [settlementStatusFilter, setSettlementStatusFilter] = useState<SettlementStatusFilter>("all");

  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<Method | null>(null);
  const [methodForm, setMethodForm] = useState<MethodForm>(emptyMethodForm());

  const [settlementDialogOpen, setSettlementDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [settlementForm, setSettlementForm] = useState<SettlementForm>(emptySettlementForm());

  const [deleteMethodTarget, setDeleteMethodTarget] = useState<Method | null>(null);
  const [deleteSettlementTarget, setDeleteSettlementTarget] = useState<Settlement | null>(null);

  const baseCurrency = useMemo(() => {
    const entry = Object.entries(CURRENCY_RATES).find(([, meta]) => meta.isBase);
    return entry ? { code: entry[0], symbol: entry[1].symbol, label: entry[1].label } : { code: "SAR", symbol: "ر.س", label: "العملة الأساسية" };
  }, []);

  /* =========================================================
     DATA
  ========================================================= */

  const { data: methods = [], isLoading: methodsLoading, isFetching: methodsFetching } = useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payment_methods").select("id,code,name,name_ar,type,account_id,details,is_active,sort_order,created_at,updated_at,chart_of_accounts(id,code,name,name_ar,type)").order("sort_order", { ascending: true }).order("name_ar", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        sort_order: Number(row.sort_order || 0),
        details: row.details && typeof row.details === "object" ? row.details : {},
      })) as Method[];
    },
    staleTime: 30_000,
  });

  const { data: settlements = [], isLoading: settlementsLoading, isFetching: settlementsFetching } = useQuery({
    queryKey: ["admin-payment-settlements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("payment_settlements").select("id,settlement_date,payment_method_id,expected_amount,actual_amount,difference,status,notes,created_by,created_at,updated_at,payment_methods(id,code,name_ar,type)").order("settlement_date", { ascending: false }).order("created_at", { ascending: false }).limit(250);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        expected_amount: Number(row.expected_amount || 0),
        actual_amount: Number(row.actual_amount || 0),
        difference: row.difference == null ? Number(row.actual_amount || 0) - Number(row.expected_amount || 0) : Number(row.difference),
      })) as Settlement[];
    },
    staleTime: 20_000,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["payment-method-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("chart_of_accounts").select("id,code,name,name_ar,type").eq("is_active", true).eq("type", "asset").order("code", { ascending: true });

      if (error) throw error;

      return (data || []) as Account[];
    },
    staleTime: 60_000,
  });

  /* =========================================================
     DERIVED
  ========================================================= */

  const stats = useMemo(() => {
    const active = methods.filter((method) => method.is_active).length;
    const linkedAccounts = methods.filter((method) => Boolean(method.account_id)).length;
    const totalExpected = settlements.reduce((sum, row) => sum + row.expected_amount, 0);
    const totalActual = settlements.reduce((sum, row) => sum + row.actual_amount, 0);
    const variance = totalActual - totalExpected;
    const pendingSettlements = settlements.filter((row) => row.status !== "reconciled").length;

    return {
      totalMethods: methods.length,
      activeMethods: active,
      inactiveMethods: methods.length - active,
      linkedAccounts,
      totalExpected,
      totalActual,
      variance,
      pendingSettlements,
    };
  }, [methods, settlements]);

  const filteredMethods = useMemo(() => {
    const query = search.trim().toLowerCase();

    return methods.filter((method) => {
      const searchable = `${method.code} ${method.name} ${method.name_ar} ${method.chart_of_accounts?.name_ar || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = methodStatusFilter === "all" || (methodStatusFilter === "active" && method.is_active) || (methodStatusFilter === "inactive" && !method.is_active);
      const matchesType = methodTypeFilter === "all" || method.type === methodTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [methods, search, methodStatusFilter, methodTypeFilter]);

  const filteredSettlements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return settlements.filter((settlement) => {
      const searchable = `${settlement.payment_methods?.name_ar || ""} ${settlement.payment_methods?.code || ""} ${settlement.notes || ""} ${settlement.settlement_date}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = settlementStatusFilter === "all" || settlement.status === settlementStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [settlements, search, settlementStatusFilter]);

  /* =========================================================
     METHOD FORM
  ========================================================= */

  const openNewMethod = () => {
    setEditingMethod(null);
    setMethodForm(emptyMethodForm());
    setMethodDialogOpen(true);
  };

  const openEditMethod = (method: Method) => {
    const details = method.details || {};

    setEditingMethod(method);
    setMethodForm({
      code: method.code,
      name: method.name,
      name_ar: method.name_ar,
      type: method.type,
      account_id: method.account_id || "none",
      sort_order: method.sort_order,
      is_active: method.is_active,
      provider_name: String(details.provider_name || ""),
      account_reference: String(details.account_reference || ""),
      instructions: String(details.instructions || ""),
    });
    setMethodDialogOpen(true);
  };

  const closeMethodDialog = () => {
    if (saveMethodMutation.isPending) return;
    setMethodDialogOpen(false);
    setEditingMethod(null);
    setMethodForm(emptyMethodForm());
  };

  const saveMethodMutation = useMutation({
    mutationFn: async () => {
      const code = methodForm.code.trim().toLowerCase().replace(/\s+/g, "_");
      const nameAr = methodForm.name_ar.trim();
      const name = methodForm.name.trim() || nameAr;

      if (!code) throw new Error("كود طريقة الدفع مطلوب.");
      if (!/^[a-z0-9_-]+$/.test(code)) throw new Error("الكود يجب أن يحتوي حروفًا إنجليزية صغيرة أو أرقامًا أو _ أو - فقط.");
      if (!nameAr) throw new Error("الاسم العربي مطلوب.");

      if (editingMethod && editingMethod.code !== code) {
        const { count, error } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_method", editingMethod.code);

        if (error) throw error;

        if (Number(count || 0) > 0) {
          throw new Error(`لا يمكن تغيير الكود "${editingMethod.code}" لأنه مستخدم في ${Number(count || 0).toLocaleString("ar-EG")} طلب. غيّر الاسم أو عطّل الطريقة بدل تغيير الكود.`);
        }
      }

      const existingDetails = editingMethod?.details || {};
      const details = {
        ...existingDetails,
        provider_name: methodForm.provider_name.trim() || null,
        account_reference: methodForm.account_reference.trim() || null,
        instructions: methodForm.instructions.trim() || null,
      };

      const payload = {
        code,
        name,
        name_ar: nameAr,
        type: methodForm.type,
        account_id: methodForm.account_id === "none" ? null : methodForm.account_id,
        details,
        is_active: methodForm.is_active,
        sort_order: Number(methodForm.sort_order || 0),
      };

      if (editingMethod) {
        const { error } = await (supabase as any).from("payment_methods").update(payload).eq("id", editingMethod.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("payment_methods").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      toast({ title: editingMethod ? "تم تحديث طريقة الدفع" : "تمت إضافة طريقة الدفع" });
      setMethodDialogOpen(false);
      setEditingMethod(null);
      setMethodForm(emptyMethodForm());
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ طريقة الدفع", description: error?.message || "حدث خطأ أثناء الحفظ.", variant: "destructive" });
    },
  });

  const toggleMethodMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("payment_methods").update({ is_active }).eq("id", id);
      if (error) throw error;
      return { id, is_active };
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-payment-methods"] });
      const previous = queryClient.getQueryData<Method[]>(["admin-payment-methods"]);
      queryClient.setQueryData<Method[]>(["admin-payment-methods"], (current = []) => current.map((row) => row.id === id ? { ...row, is_active } : row));
      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-payment-methods"], context.previous);
      toast({ title: "تعذر تحديث الحالة", description: error?.message || "حدث خطأ أثناء التحديث.", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] }),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (method: Method) => {
      const [{ count: settlementCount, error: settlementError }, { count: orderCount, error: orderError }] = await Promise.all([
        supabase.from("payment_settlements").select("id", { count: "exact", head: true }).eq("payment_method_id", method.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_method", method.code),
      ]);

      if (settlementError) throw settlementError;
      if (orderError) throw orderError;

      if (Number(settlementCount || 0) > 0 || Number(orderCount || 0) > 0) {
        throw new Error(`لا يمكن حذف "${method.name_ar}" لأنها مرتبطة بسجل مالي أو طلبات سابقة. عطّلها بدل الحذف للحفاظ على السجل التاريخي.`);
      }

      const { error } = await (supabase as any).from("payment_methods").delete().eq("id", method.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteMethodTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      toast({ title: "تم حذف طريقة الدفع" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف طريقة الدفع", description: error?.message || "حدث خطأ أثناء الحذف.", variant: "destructive" });
    },
  });

  /* =========================================================
     SETTLEMENT FORM
  ========================================================= */

  const openNewSettlement = () => {
    setEditingSettlement(null);
    setSettlementForm(emptySettlementForm());
    setSettlementDialogOpen(true);
  };

  const openEditSettlement = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setSettlementForm({
      payment_method_id: settlement.payment_method_id || "",
      settlement_date: settlement.settlement_date,
      expected_amount: String(settlement.expected_amount),
      actual_amount: String(settlement.actual_amount),
      status: settlement.status || "pending",
      notes: settlement.notes || "",
    });
    setSettlementDialogOpen(true);
  };

  const closeSettlementDialog = () => {
    if (saveSettlementMutation.isPending) return;
    setSettlementDialogOpen(false);
    setEditingSettlement(null);
    setSettlementForm(emptySettlementForm());
  };

  const saveSettlementMutation = useMutation({
    mutationFn: async () => {
      if (!settlementForm.payment_method_id) throw new Error("اختر طريقة الدفع.");
      if (!settlementForm.settlement_date) throw new Error("تاريخ التسوية مطلوب.");

      const expectedAmount = Number(settlementForm.expected_amount || 0);
      const actualAmount = Number(settlementForm.actual_amount || 0);

      if (!Number.isFinite(expectedAmount) || expectedAmount < 0) throw new Error("المبلغ المتوقع غير صحيح.");
      if (!Number.isFinite(actualAmount) || actualAmount < 0) throw new Error("المبلغ الفعلي غير صحيح.");

      const difference = actualAmount - expectedAmount;
      const currentUser = await supabase.auth.getUser();

      const payload = {
        payment_method_id: settlementForm.payment_method_id,
        settlement_date: settlementForm.settlement_date,
        expected_amount: expectedAmount,
        actual_amount: actualAmount,
        difference,
        status: settlementForm.status,
        notes: settlementForm.notes.trim() || null,
        created_by: editingSettlement?.created_by || currentUser.data.user?.id || null,
      };

      if (editingSettlement) {
        const { error } = await (supabase as any).from("payment_settlements").update(payload).eq("id", editingSettlement.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("payment_settlements").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-settlements"] });
      toast({ title: editingSettlement ? "تم تحديث التسوية" : "تم حفظ التسوية" });
      setSettlementDialogOpen(false);
      setEditingSettlement(null);
      setSettlementForm(emptySettlementForm());
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ التسوية", description: error?.message || "حدث خطأ أثناء الحفظ.", variant: "destructive" });
    },
  });

  const reconcileSettlementMutation = useMutation({
    mutationFn: async (settlement: Settlement) => {
      const { error } = await (supabase as any).from("payment_settlements").update({ status: "reconciled", difference: settlement.actual_amount - settlement.expected_amount }).eq("id", settlement.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-settlements"] });
      toast({ title: "تم اعتماد التسوية" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر اعتماد التسوية", description: error?.message || "حدث خطأ أثناء التحديث.", variant: "destructive" });
    },
  });

  const deleteSettlementMutation = useMutation({
    mutationFn: async (settlement: Settlement) => {
      const { error } = await (supabase as any).from("payment_settlements").delete().eq("id", settlement.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteSettlementTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-settlements"] });
      toast({ title: "تم حذف التسوية" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف التسوية", description: error?.message || "حدث خطأ أثناء الحذف.", variant: "destructive" });
    },
  });

  /* =========================================================
     RENDER
  ========================================================= */

  if (methodsLoading && settlementsLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل مركز المدفوعات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المالية" title="طرق الدفع والتسويات" description="إدارة قنوات التحصيل وربطها بالحسابات ومطابقة المبالغ الفعلية مع المتوقع" actions={[{ label: activeTab === "methods" ? "طريقة دفع جديدة" : "تسوية جديدة", icon: Plus, onClick: activeTab === "methods" ? openNewMethod : openNewSettlement, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="طرق الدفع" value={stats.totalMethods.toLocaleString("en-US")} helper={`${stats.activeMethods} نشطة · ${stats.inactiveMethods} معطلة`} icon={Wallet} tone="indigo" />
        <StatCard title="مرتبطة محاسبيًا" value={stats.linkedAccounts.toLocaleString("en-US")} helper="طرق مرتبطة بدليل الحسابات" icon={Landmark} tone="blue" />
        <StatCard title="تسويات معلقة" value={stats.pendingSettlements.toLocaleString("en-US")} helper="تحتاج مراجعة أو اعتماد" icon={ArrowRightLeft} tone="amber" />
        <StatCard title="صافي فرق التسويات" value={formatMoney(stats.variance, baseCurrency.symbol)} helper={`فعلي ${formatMoney(stats.totalActual, baseCurrency.symbol)} مقابل متوقع ${formatMoney(stats.totalExpected, baseCurrency.symbol)}`} icon={CircleDollarSign} tone={stats.variance === 0 ? "green" : "coral"} />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-2 gap-[4px] border-b border-[#E5E9EF] bg-[#FAFBFC] p-[5px]">
          <TabButton active={activeTab === "methods"} onClick={() => setActiveTab("methods")} icon={Wallet} label="طرق الدفع" count={methods.length} />
          <TabButton active={activeTab === "settlements"} onClick={() => setActiveTab("settlements")} icon={ArrowRightLeft} label="التسويات" count={settlements.length} />
        </div>

        <div className="border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div className="flex flex-col gap-[8px] lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={activeTab === "methods" ? "بحث بالاسم، الكود أو الحساب المحاسبي..." : "بحث بطريقة الدفع، الكود، التاريخ أو الملاحظات..."} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
            </div>

            {activeTab === "methods" ? (
              <>
                <Select value={methodStatusFilter} onValueChange={(value) => setMethodStatusFilter(value as MethodStatusFilter)}>
                  <SelectTrigger className="h-[40px] w-full rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0 lg:w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="active">نشطة</SelectItem>
                    <SelectItem value="inactive">معطلة</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={methodTypeFilter} onValueChange={setMethodTypeFilter}>
                  <SelectTrigger className="h-[40px] w-full rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0 lg:w-[165px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank">بنكي</SelectItem>
                    <SelectItem value="card">بطاقة</SelectItem>
                    <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <Select value={settlementStatusFilter} onValueChange={(value) => setSettlementStatusFilter(value as SettlementStatusFilter)}>
                <SelectTrigger className="h-[40px] w-full rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0 lg:w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل حالات التسوية</SelectItem>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="reconciled">تمت التسوية</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(search || methodStatusFilter !== "all" || methodTypeFilter !== "all" || settlementStatusFilter !== "all") && (
              <button type="button" onClick={() => { setSearch(""); setMethodStatusFilter("all"); setMethodTypeFilter("all"); setSettlementStatusFilter("all"); }} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[9px] border border-[#E3E7EC] bg-white px-[12px] text-[10.5px] font-semibold text-[#727A84] hover:bg-[#F8FAFC]">
                <X className="h-[11px] w-[11px]" />
                مسح
              </button>
            )}
          </div>
        </div>

        {activeTab === "methods" ? (
          <MethodsPanel methods={filteredMethods} loading={methodsLoading} fetching={methodsFetching} onEdit={openEditMethod} onDelete={setDeleteMethodTarget} onToggle={(method, checked) => toggleMethodMutation.mutate({ id: method.id, is_active: checked })} />
        ) : (
          <SettlementsPanel settlements={filteredSettlements} loading={settlementsLoading} fetching={settlementsFetching} currencySymbol={baseCurrency.symbol} onEdit={openEditSettlement} onDelete={setDeleteSettlementTarget} onReconcile={(settlement) => reconcileSettlementMutation.mutate(settlement)} />
        )}
      </section>

      {/* METHOD DIALOG */}
      <Dialog open={methodDialogOpen} onOpenChange={(next) => { if (!next) closeMethodDialog(); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[680px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{editingMethod ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}</div>
              <div>
                <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingMethod ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">إدارة الكود والنوع والربط بالحساب المالي ومعلومات المزود.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMethodMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="البيانات الأساسية" icon={Wallet}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="الاسم بالعربية" required><Input value={methodForm.name_ar} onChange={(event) => setMethodForm((current) => ({ ...current, name_ar: event.target.value }))} placeholder="مثال: الدفع عند الاستلام" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  <Field label="الاسم بالإنجليزية"><Input value={methodForm.name} onChange={(event) => setMethodForm((current) => ({ ...current, name: event.target.value }))} placeholder="Cash on Delivery" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                </div>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="الكود" required>
                    <Input value={methodForm.code} onChange={(event) => setMethodForm((current) => ({ ...current, code: event.target.value }))} placeholder="cod أو transfer" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    <p className="mt-[5px] text-[10px] leading-5 text-[#979EA7]">الكود هو المفتاح البرمجي؛ لا تغيّره بعد استخدامه في الطلبات.</p>
                  </Field>

                  <Field label="النوع">
                    <Select value={methodForm.type} onValueChange={(value) => setMethodForm((current) => ({ ...current, type: value }))}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقدي</SelectItem>
                        <SelectItem value="bank">بنكي</SelectItem>
                        <SelectItem value="card">بطاقة</SelectItem>
                        <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FormSection>

              <FormSection title="الربط المحاسبي" icon={Landmark}>
                <Field label="الحساب المالي">
                  <Select value={methodForm.account_id} onValueChange={(value) => setMethodForm((current) => ({ ...current, account_id: value }))}>
                    <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط</SelectItem>
                      {accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.code} — {account.name_ar}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="اسم البنك / المزود"><Input value={methodForm.provider_name} onChange={(event) => setMethodForm((current) => ({ ...current, provider_name: event.target.value }))} placeholder="اسم البنك أو المحفظة" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  <Field label="مرجع الحساب"><Input value={methodForm.account_reference} onChange={(event) => setMethodForm((current) => ({ ...current, account_reference: event.target.value }))} placeholder="IBAN / رقم محفظة / مرجع" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                </div>

                <Field label="تعليمات داخلية"><Textarea rows={3} value={methodForm.instructions} onChange={(event) => setMethodForm((current) => ({ ...current, instructions: event.target.value }))} placeholder="ملاحظات تشغيلية خاصة بهذه الطريقة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>

              <FormSection title="الإعدادات" icon={ShieldCheck}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="ترتيب الظهور"><Input type="number" value={methodForm.sort_order} onChange={(event) => setMethodForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>

                  <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                    <div>
                      <p className="text-[11px] font-semibold text-[#555D67]">طريقة نشطة</p>
                      <p className="mt-[3px] text-[10px] text-[#9BA2AC]">{methodForm.is_active ? "متاحة للاستخدام داخل النظام" : "محفوظة لكنها معطلة"}</p>
                    </div>
                    <Switch checked={methodForm.is_active} onCheckedChange={(checked) => setMethodForm((current) => ({ ...current, is_active: checked }))} />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMethodMutation.isPending} onClick={closeMethodDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMethodMutation.isPending} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMethodMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : editingMethod ? <Pencil className="ml-[5px] h-[12px] w-[12px]" /> : <Plus className="ml-[5px] h-[12px] w-[12px]" />}{editingMethod ? "حفظ التعديلات" : "إضافة الطريقة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SETTLEMENT DIALOG */}
      <Dialog open={settlementDialogOpen} onOpenChange={(next) => { if (!next) closeSettlementDialog(); }}>
        <DialogContent dir="rtl" className="max-w-[620px] rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#EDF4FF] text-[#5680CF]"><ArrowRightLeft className="h-[15px] w-[15px]" /></div>
              <div>
                <DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingSettlement ? "تعديل التسوية" : "تسوية جديدة"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">قارن المبلغ المتوقع بالمبلغ الفعلي وسجّل فرق التسوية.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveSettlementMutation.mutate(); }}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="بيانات التسوية" icon={ArrowRightLeft}>
                <Field label="طريقة الدفع" required>
                  <Select value={settlementForm.payment_method_id} onValueChange={(value) => setSettlementForm((current) => ({ ...current, payment_method_id: value }))}>
                    <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
                    <SelectContent>{methods.map((method) => <SelectItem key={method.id} value={method.id}>{method.name_ar} — {method.code}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="تاريخ التسوية" required><Input type="date" value={settlementForm.settlement_date} onChange={(event) => setSettlementForm((current) => ({ ...current, settlement_date: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>

                  <Field label="الحالة">
                    <Select value={settlementForm.status} onValueChange={(value) => setSettlementForm((current) => ({ ...current, status: value }))}>
                      <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="reconciled">تمت التسوية</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label={`المبلغ المتوقع (${baseCurrency.symbol})`} required><Input type="number" min={0} step="0.01" value={settlementForm.expected_amount} onChange={(event) => setSettlementForm((current) => ({ ...current, expected_amount: event.target.value }))} placeholder="0.00" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                  <Field label={`المبلغ الفعلي (${baseCurrency.symbol})`} required><Input type="number" min={0} step="0.01" value={settlementForm.actual_amount} onChange={(event) => setSettlementForm((current) => ({ ...current, actual_amount: event.target.value }))} placeholder="0.00" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                </div>

                <SettlementPreview expected={Number(settlementForm.expected_amount || 0)} actual={Number(settlementForm.actual_amount || 0)} symbol={baseCurrency.symbol} />

                <Field label="الملاحظات"><Textarea rows={3} value={settlementForm.notes} onChange={(event) => setSettlementForm((current) => ({ ...current, notes: event.target.value }))} placeholder="سبب الفرق أو مرجع التحويل أو ملاحظات المطابقة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
              </FormSection>
            </div>

            <div className="flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveSettlementMutation.isPending} onClick={closeSettlementDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveSettlementMutation.isPending} className="h-[38px] rounded-[9px] bg-[#5680CF] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#496EAF]">{saveSettlementMutation.isPending && <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" />}{editingSettlement ? "حفظ التعديلات" : "حفظ التسوية"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE METHOD */}
      <AlertDialog open={Boolean(deleteMethodTarget)} onOpenChange={(next) => { if (!next) setDeleteMethodTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div>
            <AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف طريقة الدفع</AlertDialogTitle>
            <AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم التحقق أولًا من الطلبات والتسويات. إذا كانت "{deleteMethodTarget?.name_ar || ""}" مستخدمة في السجل المالي فسيتم منع الحذف ويمكن تعطيلها بدلًا منه.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel disabled={deleteMethodMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMethodMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteMethodTarget) deleteMethodMutation.mutate(deleteMethodTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMethodMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DELETE SETTLEMENT */}
      <AlertDialog open={Boolean(deleteSettlementTarget)} onOpenChange={(next) => { if (!next) setDeleteSettlementTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div>
            <AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف التسوية</AlertDialogTitle>
            <AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف سجل التسوية بتاريخ {deleteSettlementTarget?.settlement_date || ""} نهائيًا. لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel disabled={deleteSettlementMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteSettlementMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteSettlementTarget) deleteSettlementMutation.mutate(deleteSettlementTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteSettlementMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف التسوية</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   PANELS
========================================================= */

const MethodsPanel = ({ methods, loading, fetching, onEdit, onDelete, onToggle }: { methods: Method[]; loading: boolean; fetching: boolean; onEdit: (method: Method) => void; onDelete: (method: Method) => void; onToggle: (method: Method, checked: boolean) => void }) => {
  if (loading) return <PanelLoading text="جاري تحميل طرق الدفع..." />;
  if (methods.length === 0) return <PanelEmpty icon={Wallet} title="لا توجد طرق دفع" description="أضف طريقة دفع جديدة أو غيّر البحث والفلاتر." />;

  return (
    <>
      <div className="hidden md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div><h2 className="text-[11.5px] font-semibold text-[#454C56]">قنوات الدفع والتحصيل</h2><p className="mt-[3px] text-[10px] text-[#9CA3AC]">{methods.length.toLocaleString("ar-EG")} طريقة ظاهرة</p></div>
          {fetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead>
              <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right">طريقة الدفع</th>
                <th className="px-[12px] text-right">الكود</th>
                <th className="px-[12px] text-right">النوع</th>
                <th className="px-[12px] text-right">الحساب المحاسبي</th>
                <th className="px-[12px] text-right">الترتيب</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[120px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {methods.map((method) => {
                const Icon = methodTypeIcon(method.type);

                return (
                  <tr key={method.id} className="h-[72px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                    <td className="px-[12px]">
                      <div className="flex min-w-[190px] items-center gap-[9px]">
                        <div className={cn("flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[9px]", methodTypeTone(method.type))}><Icon className="h-[14px] w-[14px]" /></div>
                        <div className="min-w-0">
                          <p className="max-w-[220px] truncate text-[11px] font-semibold text-[#444C56]">{method.name_ar}</p>
                          <p dir="ltr" className="mt-[3px] max-w-[220px] truncate text-right text-[10px] text-[#969DA7]">{method.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-[12px]"><span dir="ltr" className="inline-flex rounded-[7px] bg-[#F2F4F7] px-[8px] py-[5px] font-mono text-[10px] font-semibold text-[#68717B]">{method.code}</span></td>
                    <td className="px-[12px]"><span className="text-[10.5px] font-medium text-[#6C7480]">{methodTypeLabel(method.type)}</span></td>
                    <td className="px-[12px]">{method.chart_of_accounts ? <div><p className="text-[10.5px] font-semibold text-[#59616B]">{method.chart_of_accounts.name_ar}</p><p className="mt-[2px] text-[9.5px] text-[#9AA1AB]">{method.chart_of_accounts.code}</p></div> : <span className="text-[10px] text-[#A0A6AF]">غير مربوط</span>}</td>
                    <td className="px-[12px]"><span className="text-[10.5px] text-[#68717B]">{method.sort_order}</span></td>
                    <td className="px-[12px]"><div className="flex items-center gap-[8px]"><Switch checked={method.is_active} onCheckedChange={(checked) => onToggle(method, checked)} /><StatusBadge active={method.is_active} /></div></td>
                    <td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => onEdit(method)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]" title="تعديل"><Pencil className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => onDelete(method)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]" title="حذف"><Trash2 className="h-[11px] w-[11px]" /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-[8px] p-[8px] md:hidden">
        {methods.map((method) => {
          const Icon = methodTypeIcon(method.type);

          return (
            <article key={method.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
              <div className="p-[11px]">
                <div className="flex items-start justify-between gap-[8px]">
                  <div className="flex min-w-0 gap-[9px]">
                    <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]", methodTypeTone(method.type))}><Icon className="h-[15px] w-[15px]" /></div>
                    <div className="min-w-0">
                      <h3 className="truncate text-[11.5px] font-semibold text-[#3B424C]">{method.name_ar}</h3>
                      <p dir="ltr" className="mt-[3px] truncate text-right font-mono text-[10px] text-[#9299A3]">{method.code}</p>
                    </div>
                  </div>
                  <StatusBadge active={method.is_active} />
                </div>

                <div className="mt-[10px] grid grid-cols-2 gap-[6px]">
                  <InfoBox label="النوع" value={methodTypeLabel(method.type)} />
                  <InfoBox label="الحساب" value={method.chart_of_accounts?.name_ar || "غير مربوط"} />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                <button type="button" onClick={() => onToggle(method, !method.is_active)} className="flex h-[35px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[10px] font-semibold text-[#68717B]">{method.is_active ? "تعطيل" : "تفعيل"}</button>
                <button type="button" onClick={() => onEdit(method)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                <button type="button" onClick={() => onDelete(method)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[11px] w-[11px]" /></button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};

const SettlementsPanel = ({ settlements, loading, fetching, currencySymbol, onEdit, onDelete, onReconcile }: { settlements: Settlement[]; loading: boolean; fetching: boolean; currencySymbol: string; onEdit: (settlement: Settlement) => void; onDelete: (settlement: Settlement) => void; onReconcile: (settlement: Settlement) => void }) => {
  if (loading) return <PanelLoading text="جاري تحميل التسويات..." />;
  if (settlements.length === 0) return <PanelEmpty icon={ArrowRightLeft} title="لا توجد تسويات" description="أضف أول تسوية أو غيّر البحث والفلاتر." />;

  return (
    <>
      <div className="hidden md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div><h2 className="text-[11.5px] font-semibold text-[#454C56]">سجل التسويات</h2><p className="mt-[3px] text-[10px] text-[#9CA3AC]">مطابقة المبالغ المتوقعة مع المقبوضات الفعلية</p></div>
          {fetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px]">
            <thead>
              <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right">التاريخ</th>
                <th className="px-[12px] text-right">طريقة الدفع</th>
                <th className="px-[12px] text-right">المتوقع</th>
                <th className="px-[12px] text-right">الفعلي</th>
                <th className="px-[12px] text-right">الفرق</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="px-[12px] text-right">الملاحظات</th>
                <th className="w-[145px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {settlements.map((settlement) => {
                const difference = settlement.actual_amount - settlement.expected_amount;

                return (
                  <tr key={settlement.id} className="h-[70px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                    <td className="px-[12px]"><span className="text-[10.5px] font-medium text-[#59616B]">{formatDate(settlement.settlement_date)}</span></td>
                    <td className="px-[12px]"><div><p className="text-[10.5px] font-semibold text-[#555D67]">{settlement.payment_methods?.name_ar || "طريقة محذوفة"}</p><p dir="ltr" className="mt-[2px] text-right font-mono text-[9.5px] text-[#9AA1AB]">{settlement.payment_methods?.code || "—"}</p></div></td>
                    <td className="px-[12px]"><span className="text-[10.5px] text-[#68717B]">{formatMoney(settlement.expected_amount, currencySymbol)}</span></td>
                    <td className="px-[12px]"><span className="text-[10.5px] font-semibold text-[#59616B]">{formatMoney(settlement.actual_amount, currencySymbol)}</span></td>
                    <td className="px-[12px]"><VarianceBadge value={difference} symbol={currencySymbol} /></td>
                    <td className="px-[12px]"><SettlementStatus status={settlement.status} /></td>
                    <td className="px-[12px]"><p className="max-w-[240px] truncate text-[10px] text-[#858D97]">{settlement.notes || "—"}</p></td>
                    <td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]">{settlement.status !== "reconciled" && <button type="button" onClick={() => onReconcile(settlement)} title="اعتماد التسوية" className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#D8E8DD] bg-white text-[#568468] hover:bg-[#EFF8F2]"><CheckCircle2 className="h-[11px] w-[11px]" /></button>}<button type="button" onClick={() => onEdit(settlement)} title="تعديل" className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]"><Pencil className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => onDelete(settlement)} title="حذف" className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]"><Trash2 className="h-[11px] w-[11px]" /></button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-[8px] p-[8px] md:hidden">
        {settlements.map((settlement) => {
          const difference = settlement.actual_amount - settlement.expected_amount;

          return (
            <article key={settlement.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
              <div className="p-[11px]">
                <div className="flex items-start justify-between gap-[8px]">
                  <div>
                    <h3 className="text-[11.5px] font-semibold text-[#3B424C]">{settlement.payment_methods?.name_ar || "طريقة محذوفة"}</h3>
                    <p className="mt-[3px] text-[10px] text-[#9299A3]">{formatDate(settlement.settlement_date)}</p>
                  </div>
                  <SettlementStatus status={settlement.status} />
                </div>

                <div className="mt-[10px] grid grid-cols-2 gap-[6px]">
                  <InfoBox label="المتوقع" value={formatMoney(settlement.expected_amount, currencySymbol)} />
                  <InfoBox label="الفعلي" value={formatMoney(settlement.actual_amount, currencySymbol)} />
                </div>

                <div className="mt-[8px] flex items-center justify-between gap-[8px] rounded-[9px] bg-[#F8FAFC] p-[8px]">
                  <span className="text-[10px] text-[#858D97]">فرق التسوية</span>
                  <VarianceBadge value={difference} symbol={currencySymbol} />
                </div>

                {settlement.notes && <p className="mt-[8px] text-[10px] leading-5 text-[#858D97]">{settlement.notes}</p>}
              </div>

              <div className="grid grid-cols-3 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                <button type="button" onClick={() => onReconcile(settlement)} disabled={settlement.status === "reconciled"} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#D8E8DD] bg-white text-[10px] font-semibold text-[#568468] disabled:opacity-40"><CheckCircle2 className="h-[10px] w-[10px]" />اعتماد</button>
                <button type="button" onClick={() => onEdit(settlement)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                <button type="button" onClick={() => onDelete(settlement)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[10px] font-semibold text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" />حذف</button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
    amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[19px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const TabButton = ({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string; count: number }) => {
  return <button type="button" onClick={onClick} className={cn("flex h-[40px] items-center justify-center gap-[6px] rounded-[9px] px-[8px] text-[10.5px] font-semibold transition-colors", active ? "bg-white text-[#675CBA] shadow-[0_1px_4px_rgba(31,41,55,0.08)]" : "text-[#7E8690] hover:bg-white/70")}><Icon className="h-[11px] w-[11px]" /><span>{label}</span><span className="rounded-[6px] bg-[#F1EFFF] px-[6px] py-[2px] text-[9.5px] text-[#675CBA]">{count}</span></button>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const StatusBadge = ({ active }: { active: boolean }) => {
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[10px] font-semibold", active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}><span className={cn("h-[5px] w-[5px] rounded-full", active ? "bg-[#629067]" : "bg-[#969EA8]")} />{active ? "نشطة" : "معطلة"}</span>;
};

const SettlementStatus = ({ status }: { status: string }) => {
  const reconciled = status === "reconciled";
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[10px] font-semibold", reconciled ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]")}>{reconciled ? <CheckCircle2 className="h-[10px] w-[10px]" /> : <ArrowRightLeft className="h-[10px] w-[10px]" />}{reconciled ? "تمت التسوية" : "معلقة"}</span>;
};

const VarianceBadge = ({ value, symbol }: { value: number; symbol: string }) => {
  if (Math.abs(value) < 0.0001) return <span className="inline-flex h-[27px] items-center rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[8px] text-[10px] font-semibold text-[#568468]">متطابق</span>;

  return <span className={cn("inline-flex h-[27px] items-center rounded-[7px] border px-[8px] text-[10px] font-semibold", value > 0 ? "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]" : "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]")}>{value > 0 ? "+" : ""}{formatMoney(value, symbol)}</span>;
};

const SettlementPreview = ({ expected, actual, symbol }: { expected: number; actual: number; symbol: string }) => {
  const difference = actual - expected;

  return <div className="grid grid-cols-3 gap-[6px] rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] p-[8px]"><InfoBox label="المتوقع" value={formatMoney(expected, symbol)} /><InfoBox label="الفعلي" value={formatMoney(actual, symbol)} /><div className="rounded-[9px] bg-white p-[8px]"><p className="text-[10px] text-[#9AA2AC]">الفرق</p><div className="mt-[4px]"><VarianceBadge value={difference} symbol={symbol} /></div></div></div>;
};

const InfoBox = ({ label, value }: { label: string; value: string }) => {
  return <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[10px] text-[#9AA2AC]">{label}</p><p className="mt-[4px] truncate text-[10.5px] font-semibold text-[#59616B]">{value}</p></div>;
};

const PanelLoading = ({ text }: { text: string }) => {
  return <div className="flex min-h-[300px] flex-col items-center justify-center gap-[8px]"><Loader2 className="h-[19px] w-[19px] animate-spin text-[#675CBA]" /><p className="text-[11px] text-[#9299A3]">{text}</p></div>;
};

const PanelEmpty = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => {
  return <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><Icon className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11.5px] font-semibold text-[#535B65]">{title}</h3><p className="mt-[5px] text-[10px] text-[#9BA2AC]">{description}</p></div>;
};

const methodTypeLabel = (type: string) => {
  if (type === "cash") return "نقدي";
  if (type === "bank") return "بنكي";
  if (type === "card") return "بطاقة";
  if (type === "wallet") return "محفظة إلكترونية";
  return type || "غير محدد";
};

const methodTypeIcon = (type: string): LucideIcon => {
  if (type === "cash") return Banknote;
  if (type === "bank") return Building2;
  if (type === "card") return CreditCard;
  return Wallet;
};

const methodTypeTone = (type: string) => {
  if (type === "cash") return "bg-[#EAF7EE] text-[#629067]";
  if (type === "bank") return "bg-[#EDF4FF] text-[#5680CF]";
  if (type === "card") return "bg-[#F1EFFF] text-[#675CBA]";
  return "bg-[#FFF7E8] text-[#A9782F]";
};

const formatMoney = (value: number, symbol: string) => `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${symbol}`;

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value || "—";
  }
};

export default AdminPaymentMethodsPage;