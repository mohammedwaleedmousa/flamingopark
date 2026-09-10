import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Copy, Loader2, Pencil, Plus, Search, Tag, Trash2, UserRoundCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SalesAgent {
  id: string;
  name: string;
  code: string;
  platform: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SalesAgentStats {
  code: string;
  orders: number;
  salesBase: number;
  lastOrderAt: string | null;
}

const emptyForm = () => ({ name: "", code: "", platform: "WhatsApp / Social Media", is_active: true });

const AdminSalesAgentsPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalesAgent | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ["admin-sales-agents"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_agents")
        .select("id,name,code,platform,is_active,created_at,updated_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as SalesAgent[];
    },
    staleTime: 15_000,
  });

  const { data: orderRows = [] } = useQuery({
    queryKey: ["admin-sales-agent-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("sales_agent_code,total_base,total,created_at,status")
        .not("sales_agent_code", "is", null)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });

  const statsMap = useMemo(() => {
    const map = new Map<string, SalesAgentStats>();
    orderRows.forEach((row: any) => {
      const code = String(row.sales_agent_code || "").trim().toUpperCase();
      if (!code) return;
      const current = map.get(code) || { code, orders: 0, salesBase: 0, lastOrderAt: null };
      current.orders += 1;
      current.salesBase += Number(row.total_base ?? row.total ?? 0) || 0;
      if (!current.lastOrderAt || new Date(row.created_at).getTime() > new Date(current.lastOrderAt).getTime()) current.lastOrderAt = row.created_at;
      map.set(code, current);
    });
    return map;
  }, [orderRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => `${agent.name} ${agent.code} ${agent.platform || ""}`.toLowerCase().includes(q));
  }, [agents, search]);

  const totals = useMemo(() => {
    const active = agents.filter((agent) => agent.is_active).length;
    const orders = orderRows.length;
    const sales = orderRows.reduce((sum: number, row: any) => sum + (Number(row.total_base ?? row.total ?? 0) || 0), 0);
    return { active, orders, sales };
  }, [agents, orderRows]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (agent: SalesAgent) => {
    setEditing(agent);
    setForm({ name: agent.name, code: agent.code, platform: agent.platform || "", is_active: agent.is_active });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const code = form.code.trim().toUpperCase();
      if (name.length < 2) throw new Error("اسم الموظف مطلوب.");
      if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new Error("الكود يجب أن يكون من أحرف إنجليزية أو أرقام أو - و _ فقط.");
      const payload = { name, code, platform: form.platform.trim() || null, is_active: form.is_active, updated_at: new Date().toISOString() };
      if (editing) {
        const { error } = await (supabase as any).from("sales_agents").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("sales_agents").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["admin-sales-agents"] });
      toast({ title: editing ? "تم تحديث الموظف" : "تمت إضافة الموظف" });
    },
    onError: (error: any) => toast({ title: "تعذر حفظ الموظف", description: String(error?.message || error), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ agent, checked }: { agent: SalesAgent; checked: boolean }) => {
      const { error } = await (supabase as any).from("sales_agents").update({ is_active: checked, updated_at: new Date().toISOString() }).eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sales-agents"] }),
    onError: (error: any) => toast({ title: "تعذر تغيير الحالة", description: String(error?.message || error), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (agent: SalesAgent) => {
      const stat = statsMap.get(agent.code.toUpperCase());
      if (stat?.orders) throw new Error("هذا الموظف لديه طلبات مسجلة. عطّل الكود بدل حذفه للحفاظ على سجل المبيعات.");
      const { error } = await (supabase as any).from("sales_agents").delete().eq("id", agent.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-sales-agents"] });
      toast({ title: "تم حذف الموظف" });
    },
    onError: (error: any) => toast({ title: "تعذر حذف الموظف", description: String(error?.message || error), variant: "destructive" }),
  });

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: "تم نسخ كود الموظف" });
  };

  if (isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#675CBA]" /></div>;
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="المبيعات"
        title="أكواد الموظفين"
        description="إنشاء كود خاص لكل موظف وربط الطلبات والمبيعات به تلقائيًا"
        actions={[{ label: "موظف جديد", icon: Plus, onClick: openCreate, variant: "primary" }]}
      />

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat title="إجمالي الموظفين" value={agents.length.toLocaleString("en-US")} helper="كل الأكواد المسجلة" icon={<UserRoundCheck className="h-4 w-4" />} />
        <Stat title="الأكواد المفعلة" value={totals.active.toLocaleString("en-US")} helper="متاحة للعملاء الآن" icon={<CheckCircle2 className="h-4 w-4" />} />
        <Stat title="طلبات الموظفين" value={totals.orders.toLocaleString("en-US")} helper="طلبات مرتبطة بكود موظف" icon={<Tag className="h-4 w-4" />} />
        <Stat title="إجمالي المبيعات" value={`${totals.sales.toLocaleString("en-US", { maximumFractionDigits: 2 })} SAR`} helper="بحسب القيمة الأساسية للطلبات" icon={<BarChart3 className="h-4 w-4" />} />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="border-b border-[#EDF0F3] p-3">
          <div className="relative max-w-[440px]">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA1AA]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الموظف أو الكود" className="pr-9" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-[11px]">
            <thead className="bg-[#FAFBFC] text-[#7C838D]"><tr><th className="px-4 py-3">الموظف</th><th className="px-4 py-3">الكود</th><th className="px-4 py-3">القناة</th><th className="px-4 py-3">الطلبات</th><th className="px-4 py-3">المبيعات</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">إجراءات</th></tr></thead>
            <tbody>
              {filtered.map((agent) => {
                const stat = statsMap.get(agent.code.toUpperCase());
                return (
                  <tr key={agent.id} className="border-t border-[#EEF1F4] text-[#515864]">
                    <td className="px-4 py-3 font-semibold">{agent.name}</td>
                    <td className="px-4 py-3"><button type="button" onClick={() => copyCode(agent.code)} className="inline-flex items-center gap-2 rounded-lg border border-[#E3E6EA] bg-white px-2.5 py-1.5 font-mono font-semibold text-[#5E56A6]"><Copy className="h-3 w-3" />{agent.code}</button></td>
                    <td className="px-4 py-3 text-[#7D848D]">{agent.platform || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{(stat?.orders || 0).toLocaleString("en-US")}</td>
                    <td className="px-4 py-3 font-semibold">{(stat?.salesBase || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} SAR</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><Switch checked={agent.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ agent, checked })} /><span>{agent.is_active ? "مفعّل" : "متوقف"}</span></div></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(agent)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(agent)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[#969DA6]">لا توجد نتائج.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saveMutation.isPending && setDialogOpen(open)}>
        <DialogContent dir="rtl" className="sm:max-w-[460px]">
          <DialogHeader><DialogTitle>{editing ? "تعديل الموظف" : "إضافة موظف"}</DialogTitle><DialogDescription>الكود الذي سيعطيه الموظف للعملاء عند الطلب.</DialogDescription></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>اسم الموظف</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="مثال: عبدالرحمن" /></div>
            <div className="space-y-2"><Label>الكود الخاص</Label><Input dir="ltr" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="FP-104" /></div>
            <div className="space-y-2"><Label>القناة أو القسم</Label><Input value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} placeholder="WhatsApp / Instagram" /></div>
            <label className="flex items-center justify-between rounded-lg border p-3"><span className="text-sm">الكود مفعّل</span><Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} /></label>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}{editing ? "حفظ التعديلات" : "إضافة الموظف"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Stat = ({ title, value, helper, icon }: { title: string; value: string; helper: string; icon: React.ReactNode }) => (
  <div className="rounded-[13px] border border-[#E6E9EE] bg-white p-3.5">
    <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-[#7E858F]">{title}</span><span className="text-[#675CBA]">{icon}</span></div>
    <p className="mt-2 text-[18px] font-bold text-[#454C56]">{value}</p>
    <p className="mt-1 text-[9px] text-[#9AA1AA]">{helper}</p>
  </div>
);

export default AdminSalesAgentsPage;
