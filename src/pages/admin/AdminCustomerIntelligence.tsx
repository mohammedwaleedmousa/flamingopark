import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Crown, Sparkles, Activity, Search, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { cn } from "@/lib/utils";

const currency = "ر.ي";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Segment = "VIP" | "نشط" | "جديد" | "خامل";
interface Row {
  id: string;
  name: string;
  phone: string | null;
  region: string;
  orders: number;
  spent: number;
  aov: number;
  last: string | null;
  segment: Segment;
}

const SEG_COLORS: Record<Segment, string> = {
  "VIP": "#8b5cf6",
  "نشط": "#10b981",
  "جديد": "#3b82f6",
  "خامل": "#94a3b8",
};

export default function AdminCustomerIntelligence() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: orders } = await supabase
      .from("orders")
      .select("customer_name,customer_phone,customer_address,total,created_at,status")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(5000);

    const byPhone = new Map<string, Row>();
    const now = Date.now();
    (orders || []).forEach((o: any) => {
      const key = (o.customer_phone || o.customer_name || "?").trim();
      const region = (o.customer_address || "").split(/[,،]/)[0]?.trim() || "غير محدد";
      const total = parseFloat(o.total) || 0;
      const cur = byPhone.get(key);
      if (cur) {
        cur.orders += 1; cur.spent += total;
        if (!cur.last || new Date(o.created_at) > new Date(cur.last)) cur.last = o.created_at;
      } else {
        byPhone.set(key, {
          id: key, name: o.customer_name || "عميل", phone: o.customer_phone || null,
          region, orders: 1, spent: total, aov: 0, last: o.created_at, segment: "جديد",
        });
      }
    });

    const list: Row[] = Array.from(byPhone.values()).map(r => {
      r.aov = r.spent / Math.max(1, r.orders);
      const daysSince = r.last ? (now - new Date(r.last).getTime()) / 86400000 : 999;
      r.segment = r.spent >= 5000 || r.orders >= 5
        ? "VIP"
        : daysSince <= 30
          ? "نشط"
          : r.orders === 1
            ? "جديد"
            : "خامل";
      return r;
    });
    list.sort((a, b) => b.spent - a.spent);
    setRows(list);
    setLoading(false);
  }

  const regions = useMemo(() => Array.from(new Set(rows.map(r => r.region))).sort(), [rows]);

  const filtered = rows.filter(r => {
    if (seg !== "all" && r.segment !== seg) return false;
    if (region !== "all" && r.region !== region) return false;
    if (q && !(r.name + " " + (r.phone || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const totals = useMemo(() => {
    const total = rows.length;
    const revenue = rows.reduce((s, r) => s + r.spent, 0);
    const vip = rows.filter(r => r.segment === "VIP").length;
    const aov = revenue / Math.max(1, rows.reduce((s, r) => s + r.orders, 0));
    return { total, revenue, vip, aov };
  }, [rows]);

  const segData = (["VIP", "نشط", "جديد", "خامل"] as Segment[]).map(s => ({
    name: s, value: rows.filter(r => r.segment === s).length,
  }));

  const regionData = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach(r => m.set(r.region, (m.get(r.region) || 0) + r.spent));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([region, revenue]) => ({ region, revenue: Math.round(revenue) }));
  }, [rows]);

  const kpis = [
    { label: "إجمالي العملاء", value: fmt(totals.total), icon: Users, bg: "bg-blue-50", tone: "text-blue-600" },
    { label: "عملاء VIP", value: fmt(totals.vip), icon: Crown, bg: "bg-violet-50", tone: "text-violet-600" },
    { label: "متوسط قيمة الطلب", value: `${fmt(totals.aov)} ${currency}`, icon: Activity, bg: "bg-amber-50", tone: "text-amber-600" },
    { label: "إجمالي الإنفاق", value: `${fmt(totals.revenue)} ${currency}`, icon: Sparkles, bg: "bg-emerald-50", tone: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <header>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">ذكاء العملاء</p>
        <h1 className="font-heading text-2xl md:text-3xl">تحليلات وتقسيم العملاء</h1>
        <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على سلوك ومناطق وقيمة العملاء</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label} className="p-5 ring-1 ring-black/5 border-0 shadow-none">
            <div className={cn("p-2.5 rounded-xl inline-block", k.bg)}><k.icon className={cn("w-4.5 h-4.5", k.tone)} /></div>
            <p className="text-xs text-muted-foreground mt-3">{k.label}</p>
            {loading ? <Skeleton className="h-7 w-24 mt-1.5" /> : <p className="text-xl md:text-2xl font-heading tabular-nums mt-1">{k.value}</p>}
          </Card>
        ))}
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 ring-1 ring-black/5 border-0 shadow-none">
          <h2 className="font-heading text-base mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />الإيرادات حسب المنطقة</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 12, fill: "#475569" }} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} formatter={(v: any) => [`${fmt(Number(v))} ${currency}`, "إيراد"]} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 ring-1 ring-black/5 border-0 shadow-none">
          <h2 className="font-heading text-base mb-3">تقسيم العملاء</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                  {segData.map(s => <Cell key={s.name} fill={SEG_COLORS[s.name as Segment]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="p-0 ring-1 ring-black/5 border-0 shadow-none overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث باسم أو رقم..." className="pr-9" />
          </div>
          <Select value={seg} onValueChange={setSeg}>
            <SelectTrigger className="w-full md:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الشرائح</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="نشط">نشط</SelectItem>
              <SelectItem value="جديد">جديد</SelectItem>
              <SelectItem value="خامل">خامل</SelectItem>
            </SelectContent>
          </Select>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full md:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المناطق</SelectItem>
              {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[0.02] text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-medium">العميل</th>
                <th className="text-right p-3 font-medium">المنطقة</th>
                <th className="text-right p-3 font-medium">الطلبات</th>
                <th className="text-right p-3 font-medium">إجمالي الإنفاق</th>
                <th className="text-right p-3 font-medium">متوسط الطلب</th>
                <th className="text-right p-3 font-medium">آخر شراء</th>
                <th className="text-right p-3 font-medium">الشريحة</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-t border-black/5"><td colSpan={7} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا يوجد عملاء مطابقين</td></tr>
              )}
              {!loading && filtered.slice(0, 100).map(r => (
                <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-medium" style={{ background: SEG_COLORS[r.segment] + "22", color: SEG_COLORS[r.segment] }}>
                        {r.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{r.phone || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{r.region}</td>
                  <td className="p-3 tabular-nums">{r.orders}</td>
                  <td className="p-3 tabular-nums font-medium">{fmt(r.spent)} {currency}</td>
                  <td className="p-3 tabular-nums">{fmt(r.aov)} {currency}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.last ? new Date(r.last).toLocaleDateString("ar-EG") : "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline" style={{ borderColor: SEG_COLORS[r.segment] + "55", color: SEG_COLORS[r.segment], background: SEG_COLORS[r.segment] + "11" }}>{r.segment}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && <p className="p-3 text-xs text-center text-muted-foreground border-t border-black/5">يعرض أول 100 من {filtered.length} عميل</p>}
      </Card>
    </div>
  );
}