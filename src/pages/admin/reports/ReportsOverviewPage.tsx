import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { fmtMoney, orderTotalBase, currencyOptions } from "./reportHelpers";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, ShoppingCart, Users, DollarSign, Package } from "lucide-react";

type OrderRow = { id: string; total: number; total_base: number | null; created_at: string; status: string; items: any; customer_id: string | null; customer_phone: string | null };
type Ev = { event_type: string; created_at: string; path: string; utm_source: string | null; device: string | null; value: number | null; session_id: string | null; product_id: string | null };

export default function ReportsOverviewPage() {
  const { range } = useDateRange();
  const [currency, setCurrency] = useState("SAR");
  const options = currencyOptions();

  const startISO = new Date(range.start + "T00:00:00").toISOString();
  const endISO = new Date(range.end + "T23:59:59").toISOString();

  const { data: orders = [] } = useQuery({
    queryKey: ["reports-overview-orders", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total,total_base,created_at,status,items,customer_id,customer_phone")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["reports-overview-events", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type,created_at,path,utm_source,device,value,session_id,product_id")
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      if (error) throw error;
      return (data || []) as Ev[];
    },
  });

  const validOrders = orders.filter((o) => o.status !== "cancelled");

  const kpis = useMemo(() => {
    const revenue = validOrders.reduce((s, o) => s + orderTotalBase(o), 0);
    const count = validOrders.length;
    const aov = count ? revenue / count : 0;
    const uniqueCustomers = new Set(validOrders.map((o) => o.customer_id || o.customer_phone).filter(Boolean)).size;
    const sessions = new Set(events.map((e) => e.session_id).filter(Boolean)).size;
    const conv = sessions ? (count / sessions) * 100 : 0;
    return { revenue, count, aov, uniqueCustomers, sessions, conv };
  }, [validOrders, events]);

  const daily = useMemo(() => {
    const map = new Map<string, { day: string; revenue: number; orders: number }>();
    for (const o of validOrders) {
      const d = o.created_at.slice(0, 10);
      const row = map.get(d) || { day: d, revenue: 0, orders: 0 };
      row.revenue += orderTotalBase(o);
      row.orders += 1;
      map.set(d, row);
    }
    return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [validOrders]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of validOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const key = String(it.product_id || it.product_name || "unknown");
        const row = map.get(key) || { name: String(it.product_name || "غير معروف"), qty: 0, revenue: 0 };
        const qty = Number(it.quantity) || 0;
        const price = Number(it.price) || 0;
        row.qty += qty;
        row.revenue += qty * price;
        map.set(key, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [validOrders]);

  const trafficSources = useMemo(() => {
    const map = new Map<string, { source: string; sessions: number; addToCart: number }>();
    for (const e of events) {
      const src = e.utm_source || "direct";
      const row = map.get(src) || { source: src, sessions: 0, addToCart: 0 };
      if (e.event_type === "page_view") row.sessions += 1;
      if (e.event_type === "add_to_cart") row.addToCart += 1;
      map.set(src, row);
    }
    return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions).slice(0, 10);
  }, [events]);

  const kpiCards = [
    { icon: DollarSign, label: "إجمالي الإيرادات", value: fmtMoney(kpis.revenue, currency), color: "from-emerald-500 to-emerald-600" },
    { icon: ShoppingCart, label: "عدد الطلبات", value: kpis.count.toLocaleString("en-US"), color: "from-blue-500 to-blue-600" },
    { icon: TrendingUp, label: "متوسط قيمة الطلب", value: fmtMoney(kpis.aov, currency), color: "from-amber-500 to-amber-600" },
    { icon: Users, label: "عملاء فريدون", value: kpis.uniqueCustomers.toLocaleString("en-US"), color: "from-purple-500 to-purple-600" },
    { icon: Package, label: "جلسات الزوّار", value: kpis.sessions.toLocaleString("en-US"), color: "from-pink-500 to-pink-600" },
    { icon: TrendingUp, label: "معدل التحويل", value: `${kpis.conv.toFixed(2)}%`, color: "from-rose-500 to-rose-600" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl">نظرة عامة والإيرادات</h1>
        <div className="flex items-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <DateRangePicker />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-black/5">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${k.color} text-white flex items-center justify-center mb-2`}>
                <k.icon className="w-4 h-4" />
              </div>
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الإيرادات اليومية</CardTitle></CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip formatter={(v: any, k: any) => k === "revenue" ? fmtMoney(Number(v), currency) : v} />
                <Line type="monotone" dataKey="revenue" stroke="#e91e63" strokeWidth={2} name="الإيراد" />
                <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="الطلبات" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">أفضل 10 منتجات مبيعاً</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>الكمية</TableHead><TableHead>الإيراد</TableHead></TableRow></TableHeader>
              <TableBody>
                {topProducts.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="max-w-[220px] truncate">{p.name}</TableCell>
                    <TableCell>{p.qty}</TableCell>
                    <TableCell>{fmtMoney(p.revenue, currency)}</TableCell>
                  </TableRow>
                ))}
                {!topProducts.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">مصادر الزيارات</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>المصدر</TableHead><TableHead>جلسات</TableHead><TableHead>إضافة للسلة</TableHead></TableRow></TableHeader>
              <TableBody>
                {trafficSources.map((t) => (
                  <TableRow key={t.source}>
                    <TableCell>{t.source}</TableCell>
                    <TableCell>{t.sessions}</TableCell>
                    <TableCell>{t.addToCart}</TableCell>
                  </TableRow>
                ))}
                {!trafficSources.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}