import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, Copy, Loader2, Pencil, Plus, Search, ShoppingBag, TrendingUp, UserRoundCheck, WalletCards } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";

type SalesAgent = {
  id: string;
  name: string;
  code: string;
  platform: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  product_id?: string | null;
  quantity?: number | string | null;
};

type SalesOrder = {
  id: string;
  order_number: string | null;
  sales_agent_id: string | null;
  sales_agent_code: string | null;
  sales_agent_name: string | null;
  total: number;
  total_base: number | null;
  created_at: string;
  status: string | null;
  items: OrderItem[] | unknown;
};

type AgentStats = {
  orders: number;
  delivered: number;
  cancelled: number;
  sales: number;
  cogs: number;
  profit: number;
  costLines: number;
  coveredCostLines: number;
  lastOrderAt: string | null;
};

type Tone = "indigo" | "green" | "coral" | "blue";

const CANCELLED = new Set(["cancelled", "canceled"]);
const DELIVERED = new Set(["delivered", "completed"]);
const emptyForm = () => ({ name: "", code: "", platform: "WhatsApp / Social Media", is_active: true });
const fmt = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value || 0));
const money = (value: number) => `${fmt(value)} ر.س`;
const orderBase = (order: SalesOrder) => {
  const base = Number(order.total_base ?? 0);
  return base > 0 ? base : Number(order.total || 0);
};
const displayDate = (value: string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
};

const tones: Record<Tone, { line: string; icon: string }> = {
  indigo: { line: "#675CBA", icon: "bg-[#EEEBFF] text-[#675CBA]" },
  green: { line: "#629067", icon: "bg-[#EAF7EE] text-[#57906A]" },
  coral: { line: "#D06A5E", icon: "bg-[#FFF0ED] text-[#C9685D]" },
  blue: { line: "#5680CF", icon: "bg-[#EDF4FF] text-[#567BC5]" },
};

export default function AdminSalesAgentsPage() {
  const queryClient = useQueryClient();
  const { range } = useDateRange();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalesAgent | null>(null);
  const [form, setForm] = useState(emptyForm());

  const agentsQuery = useQuery({
    queryKey: ["electronic-sales-agents"],
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

  const ordersQuery = useQuery({
    queryKey: ["electronic-sales-orders", range.start, range.end],
    queryFn: async () => {
      const start = new Date(`${range.start}T00:00:00`).toISOString();
      const endDate = new Date(`${range.end}T00:00:00`);
      endDate.setDate(endDate.getDate() + 1);
      const end = endDate.toISOString();
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("id,order_number,sales_agent_id,sales_agent_code,sales_agent_name,total,total_base,created_at,status,items")
        .not("sales_agent_id", "is", null)
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        total: Number(row.total || 0),
        total_base: row.total_base == null ? null : Number(row.total_base),
      })) as SalesOrder[];
    },
    staleTime: 15_000,
  });

  const productsQuery = useQuery({
    queryKey: ["electronic-sales-product-costs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select("id,product_costs(cost_price)");
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((row: any) => {
        const relation = Array.isArray(row.product_costs) ? row.product_costs[0] : row.product_costs;
        map.set(String(row.id), Math.max(0, Number(relation?.cost_price || 0)));
      });
      return map;
    },
    staleTime: 5 * 60_000,
  });

  const agents = agentsQuery.data || [];
  const orders = ordersQuery.data || [];
  const costMap = productsQuery.data || new Map<string, number>();

  const statsMap = useMemo(() => {
    const map = new Map<string, AgentStats>();
    const blank = (): AgentStats => ({ orders: 0, delivered: 0, cancelled: 0, sales: 0, cogs: 0, profit: 0, costLines: 0, coveredCostLines: 0, lastOrderAt: null });

    orders.forEach((order) => {
      const agentId = String(order.sales_agent_id || "");
      if (!agentId) return;
      const current = map.get(agentId) || blank();
      const status = String(order.status || "").toLowerCase();

      if (!current.lastOrderAt || new Date(order.created_at).getTime() > new Date(current.lastOrderAt).getTime()) current.lastOrderAt = order.created_at;

      if (CANCELLED.has(status)) {
        current.cancelled += 1;
        map.set(agentId, current);
        return;
      }

      current.orders += 1;
      if (DELIVERED.has(status)) current.delivered += 1;
      current.sales += orderBase(order);

      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach((item: OrderItem) => {
        const productId = String(item?.product_id || "");
        const qty = Math.max(0, Number(item?.quantity || 1));
        if (!productId || qty <= 0) return;
        current.costLines += 1;
        if (costMap.has(productId)) {
          current.coveredCostLines += 1;
          current.cogs += (costMap.get(productId) || 0) * qty;
        }
      });

      current.profit = current.sales - current.cogs;
      map.set(agentId, current);
    });

    return map;
  }, [orders, costMap]);

  const rows = useMemo(() => agents.map((agent) => {
    const stats = statsMap.get(agent.id) || { orders: 0, delivered: 0, cancelled: 0, sales: 0, cogs: 0, profit: 0, costLines: 0, coveredCostLines: 0, lastOrderAt: null };
    return {
      agent,
      stats,
      margin: stats.sales > 0 ? (stats.profit / stats.sales) * 100 : 0,
      costCoverage: stats.costLines > 0 ? (stats.coveredCostLines / stats.costLines) * 100 : 100,
    };
  }).sort((a, b) => b.stats.sales - a.stats.sales), [agents, statsMap]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(({ agent }) => `${agent.name} ${agent.code} ${agent.platform || ""}`.toLowerCase().includes(q));
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => ({
      sales: acc.sales + row.stats.sales,
      profit: acc.profit + row.stats.profit,
      orders: acc.orders + row.stats.orders,
    }), { sales: 0, profit: 0, orders: 0 });
  }, [rows]);

  const topAgents = rows.filter((row) => row.stats.orders > 0).slice(0, 3);

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
      if (!/^[A-Z0-9_-]{2,40}$/.test(code)) throw new Error("الكود يجب أن يحتوي أحرفًا إنجليزية أو أرقامًا أو - و _ فقط.");
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
      const changedCode = Boolean(editing && editing.code !== form.code.trim().toUpperCase());
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ["electronic-sales-agents"] });
      toast({ title: changedCode ? "تم تغيير كود الموظف" : "تم حفظ الموظف", description: changedCode ? "المبيعات السابقة بقيت مرتبطة بالموظف، والكود الجديد أصبح المعتمد." : undefined });
    },
    onError: (error: any) => {
      const message = String(error?.message || error || "");
      const duplicate = message.includes("sales_agents_code_unique_ci") || message.toLowerCase().includes("duplicate");
      toast({ title: "تعذر حفظ الموظف", description: duplicate ? "هذا الكود مستخدم لموظف آخر. اختر كودًا مختلفًا." : message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      const { error } = await (supabase as any).from("sales_agents").update({ is_active: checked, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["electronic-sales-agents"] }),
    onError: (error: any) => toast({ title: "تعذر تغيير حالة الموظف", description: String(error?.message || error), variant: "destructive" }),
  });

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "تم نسخ الكود" });
    } catch {
      toast({ title: "تعذر نسخ الكود", variant: "destructive" });
    }
  };

  const isLoading = agentsQuery.isLoading || ordersQuery.isLoading || productsQuery.isLoading;
  const isFetching = agentsQuery.isFetching || ordersQuery.isFetching || productsQuery.isFetching;

  const refresh = async () => {
    await Promise.all([agentsQuery.refetch(), ordersQuery.refetch(), productsQuery.refetch()]);
  };

  if (isLoading) {
    return <div className="flex min-h-[480px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#675CBA]" /></div>;
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader
        category="المبيعات"
        title="المبيعات الإلكترونية"
        description="متابعة مبيعات موظفي السوشال ميديا وأكوادهم وأرباح الطلبات المنسوبة لكل موظف"
        actions={[{ label: "موظف جديد", icon: Plus, onClick: openCreate, variant: "primary" }]}
      />

      <section className="flex flex-col gap-2 rounded-[14px] border border-[#E5E9EF] bg-white p-[10px] sm:flex-row sm:items-center sm:justify-between">
        <div className="[&_button]:!h-[38px] [&_button]:!rounded-[10px] [&_button]:!border-[#E2E6EB] [&_button]:!bg-white [&_button]:!px-3 [&_button]:!text-[9px] [&_button]:!font-medium [&_button]:!text-[#59616C] [&_button]:!shadow-none"><DateRangePicker /></div>
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isFetching} className="h-[38px] rounded-[10px] border-[#E2E6EB] bg-white px-3 text-[9px] font-semibold text-[#5F6772] shadow-none">
          {isFetching && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}تحديث البيانات
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-[9px] xl:grid-cols-4">
        <MetricCard title="إجمالي المبيعات الإلكترونية" value={money(totals.sales)} helper="الطلبات غير الملغاة" icon={BarChart3} tone="indigo" />
        <MetricCard title="عدد الطلبات" value={fmt(totals.orders)} helper="طلبات منسوبة للموظفين" icon={ShoppingBag} tone="coral" />
        <MetricCard title="الربح الإجمالي" value={money(totals.profit)} helper="المبيعات ناقص تكلفة المنتجات" icon={WalletCards} tone="green" />
        <MetricCard title="الموظفون النشطون" value={fmt(agents.filter((agent) => agent.is_active).length)} helper={`من أصل ${agents.length.toLocaleString("en-US")} موظف`} icon={UserRoundCheck} tone="blue" />
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
          <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[14px] py-[12px]">
            <div><h2 className="text-[12px] font-semibold text-[#303640]">أداء الموظفين</h2><p className="mt-1 text-[8.5px] text-[#969DA6]">مرتّب حسب قيمة المبيعات في الفترة المحددة</p></div>
            <TrendingUp className="h-4 w-4 text-[#675CBA]" />
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
            {topAgents.length ? topAgents.map(({ agent, stats }, index) => (
              <div key={agent.id} className="rounded-[13px] border border-[#E8EBF0] bg-[#FAFBFC] p-3">
                <div className="flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[#EEEBFF] text-[10px] font-bold text-[#675CBA]">#{index + 1}</span><span className="text-[8px] text-[#979EA7]">{stats.orders} طلب</span></div>
                <p className="mt-3 text-[12px] font-semibold text-[#333943]">{agent.name}</p>
                <p dir="ltr" className="mt-1 text-right font-mono text-[9px] text-[#8178B0]">{agent.code}</p>
                <div className="mt-3 border-t border-[#E8EBF0] pt-2"><p className="text-[8px] text-[#969DA6]">المبيعات</p><p className="mt-1 text-[15px] font-semibold text-[#303640]">{money(stats.sales)}</p><p className="mt-1 text-[8px] text-[#57906A]">ربح {money(stats.profit)}</p></div>
              </div>
            )) : <div className="col-span-3 py-10 text-center text-[10px] text-[#969DA6]">لا توجد مبيعات منسوبة للموظفين في الفترة المحددة.</div>}
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E5E9EF] bg-white p-[14px]">
          <h2 className="text-[12px] font-semibold text-[#303640]">ملاحظة الأرباح</h2>
          <p className="mt-2 text-[9px] leading-6 text-[#7F8792]">الربح هنا هو الربح الإجمالي للطلبات المنسوبة للموظف: قيمة المبيعات ناقص تكلفة المنتجات المسجلة في النظام. الطلبات الملغاة لا تدخل في المبيعات أو الأرباح.</p>
          <div className="mt-3 rounded-[11px] bg-[#F8F6FF] p-3 text-[8.5px] leading-5 text-[#756DA2]">إذا كانت تكلفة منتج غير مسجلة، قد يظهر الربح أعلى من الحقيقي. صفحة المالية تستخدم نفس مصدر تكلفة المنتجات.</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#EDF0F3] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-[12px] font-semibold text-[#303640]">الموظفون والمبيعات</h2><p className="mt-1 text-[8.5px] text-[#969DA6]">يمكنك تعديل كود أي موظف من زر التعديل دون فقد المبيعات السابقة.</p></div>
          <div className="relative w-full sm:w-[330px]"><Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9AA1AA]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث باسم الموظف أو الكود" className="h-[38px] rounded-[10px] border-[#E3E7EC] pr-9 text-[10px] shadow-none" /></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-right text-[10px]">
            <thead className="bg-[#FAFBFC] text-[#7C838D]"><tr><th className="px-4 py-3">الموظف</th><th className="px-4 py-3">الكود الحالي</th><th className="px-4 py-3">القناة</th><th className="px-4 py-3">الطلبات</th><th className="px-4 py-3">المبيعات</th><th className="px-4 py-3">الأرباح</th><th className="px-4 py-3">الهامش</th><th className="px-4 py-3">آخر طلب</th><th className="px-4 py-3">الحالة</th><th className="px-4 py-3">إجراء</th></tr></thead>
            <tbody>
              {filteredRows.map(({ agent, stats, margin, costCoverage }) => (
                <tr key={agent.id} className="border-t border-[#EEF1F4] text-[#515864] hover:bg-[#FCFCFD]">
                  <td className="px-4 py-3"><p className="font-semibold text-[#343A44]">{agent.name}</p><p className="mt-1 text-[8px] text-[#9AA1AA]">{stats.delivered} مكتمل · {stats.cancelled} ملغي</p></td>
                  <td className="px-4 py-3"><button type="button" onClick={() => void copyCode(agent.code)} className="inline-flex items-center gap-2 rounded-[8px] border border-[#E2E5EA] bg-white px-2.5 py-1.5 font-mono font-semibold text-[#6259A9]"><Copy className="h-3 w-3" />{agent.code}</button></td>
                  <td className="px-4 py-3 text-[#7D848D]">{agent.platform || "—"}</td>
                  <td className="px-4 py-3 font-semibold">{fmt(stats.orders)}</td>
                  <td className="px-4 py-3 font-semibold text-[#343A44]">{money(stats.sales)}</td>
                  <td className="px-4 py-3"><p className={`font-semibold ${stats.profit >= 0 ? "text-[#57906A]" : "text-[#C76161]"}`}>{money(stats.profit)}</p>{costCoverage < 100 && <p className="mt-1 text-[7.5px] text-[#B98031]">تغطية التكلفة {costCoverage.toFixed(0)}%</p>}</td>
                  <td className="px-4 py-3">{margin.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-[#7D848D]">{displayDate(stats.lastOrderAt)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><Switch checked={agent.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: agent.id, checked })} /><span className={agent.is_active ? "text-[#57906A]" : "text-[#969DA6]"}>{agent.is_active ? "نشط" : "متوقف"}</span></div></td>
                  <td className="px-4 py-3"><Button type="button" variant="outline" size="sm" onClick={() => openEdit(agent)} className="h-8 gap-1.5 rounded-[8px] border-[#E2E6EB] px-2.5 text-[9px] shadow-none"><Pencil className="h-3 w-3" />تعديل</Button></td>
                </tr>
              ))}
              {filteredRows.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-[#969DA6]">لا توجد نتائج مطابقة.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saveMutation.isPending && setDialogOpen(open)}>
        <DialogContent dir="rtl" className="sm:max-w-[470px]">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل بيانات الموظف" : "إضافة موظف للمبيعات الإلكترونية"}</DialogTitle>
            <DialogDescription>{editing ? "يمكنك تغيير الكود في أي وقت. سجل المبيعات السابق سيبقى مرتبطًا بالموظف نفسه." : "أنشئ كودًا فريدًا ليستخدمه عملاء هذا الموظف عند الطلب."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>اسم الموظف</Label><Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="مثال: عبدالرحمن" /></div>
            <div className="space-y-2"><Label>الكود الخاص بالموظف</Label><div className="flex gap-2"><Input dir="ltr" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="FP-104" className="font-mono" />{editing && <Button type="button" variant="outline" size="icon" onClick={() => void copyCode(form.code)}><Copy className="h-4 w-4" /></Button>}</div>{editing && editing.code !== form.code.trim().toUpperCase() && <p className="rounded-[8px] bg-[#FFF8E8] px-2.5 py-2 text-[8.5px] leading-5 text-[#9A7130]">بعد الحفظ سيتوقف الكود القديم ويعمل الكود الجديد، بينما تبقى جميع المبيعات السابقة محسوبة لهذا الموظف.</p>}</div>
            <div className="space-y-2"><Label>القناة أو القسم</Label><Input value={form.platform} onChange={(event) => setForm((current) => ({ ...current, platform: event.target.value }))} placeholder="WhatsApp / Instagram / Snapchat" /></div>
            <label className="flex items-center justify-between rounded-[10px] border border-[#E5E9EF] p-3"><div><p className="text-[10px] font-semibold text-[#444B55]">الكود مفعّل</p><p className="mt-1 text-[8px] text-[#969DA6]">عند إيقافه لن يقبل المتجر الكود في الطلبات الجديدة.</p></div><Switch checked={form.is_active} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} /></label>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}{editing ? "حفظ التعديلات" : "إضافة الموظف"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: typeof BarChart3; tone: Tone }) {
  const palette = tones[tone];
  return (
    <article className="relative min-h-[126px] overflow-hidden rounded-[16px] border border-[#E5E9EF] bg-white p-[14px] transition-colors hover:border-[#DCE1E8]">
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: palette.line }} />
      <div className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] ${palette.icon}`}><Icon className="h-[15px] w-[15px]" strokeWidth={1.7} /></div>
      <div className="mt-4"><p className="text-[9.5px] font-medium text-[#7F8792]">{title}</p><p dir="ltr" className="mt-[6px] text-right text-[22px] font-semibold leading-none tracking-[-0.035em] text-[#252A33]">{value}</p><p className="mt-[7px] text-[8px] text-[#9AA1AA]">{helper}</p></div>
    </article>
  );
}
