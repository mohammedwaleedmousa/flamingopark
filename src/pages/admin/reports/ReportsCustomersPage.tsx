import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { fmtMoney, orderTotalBase, currencyOptions, downloadCSV } from "./reportHelpers";
import { Download, Users, UserPlus, Repeat, Heart, TrendingUp, MapPin, Smartphone, ShoppingBag, AlertTriangle } from "lucide-react";

type OrderRow = {
  id: string; order_number: string; total: number; total_base: number | null;
  created_at: string; status: string; items: any;
  customer_id: string | null; customer_phone: string | null; customer_name: string | null;
  customer_address: string | null; country: string | null;
};
type Ev = { event_type: string; created_at: string; session_id: string | null; user_id: string | null; product_id: string | null; device: string | null; utm_source: string | null };
type Product = { id: string; name_ar: string | null; name: string | null };

type Segment = "Champions" | "Loyal" | "Potential" | "At Risk" | "Lost";
const segColor: Record<Segment, string> = {
  Champions: "bg-emerald-500",
  Loyal: "bg-blue-500",
  Potential: "bg-amber-500",
  "At Risk": "bg-orange-500",
  Lost: "bg-red-500",
};
const segLabel: Record<Segment, string> = {
  Champions: "أبطال — عملاء VIP",
  Loyal: "أوفياء",
  Potential: "واعدون",
  "At Risk": "في خطر الفقد",
  Lost: "مفقودون",
};

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  orders: number;
  spent: number;
  lastOrder: string;
  firstOrder: string;
  recency: number;
  segment: Segment;
}

function extractCity(addr: string | null): string {
  if (!addr) return "-";
  const s = String(addr).trim();
  if (!s) return "-";
  const parts = s.split(/[،,\-–|]/).map((x) => x.trim()).filter(Boolean);
  return parts[0] || s.slice(0, 40);
}

function computeSegment(recencyDays: number, freq: number, monetarySAR: number): Segment {
  if (freq >= 4 && recencyDays <= 60 && monetarySAR >= 500) return "Champions";
  if (freq >= 2 && recencyDays <= 90) return "Loyal";
  if (freq >= 2 && recencyDays > 90 && recencyDays <= 180) return "At Risk";
  if (freq >= 1 && recencyDays > 180) return "Lost";
  return "Potential";
}

export default function ReportsCustomersPage() {
  const { range } = useDateRange();
  const [currency, setCurrency] = useState("SAR");
  const [openSegment, setOpenSegment] = useState<Segment | null>(null);
  const options = currencyOptions();

  const startISO = new Date(range.start + "T00:00:00").toISOString();
  const endISO = new Date(range.end + "T23:59:59").toISOString();

  // ALL orders (for lifetime/RFM). Also filtered subset for the range where needed.
  const { data: allOrders = [] } = useQuery({
    queryKey: ["reports-cust-orders-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,total,total_base,created_at,status,items,customer_id,customer_phone,customer_name,customer_address,country")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data || []) as OrderRow[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["reports-cust-events", range.start, range.end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type,created_at,session_id,user_id,product_id,device,utm_source")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .limit(20000);
      if (error) throw error;
      return (data || []) as Ev[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["reports-cust-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,name_ar");
      if (error) throw error;
      return (data || []) as Product[];
    },
  });

  const nameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.name_ar || p.name || "-");
    return m;
  }, [products]);

  // Build per-customer aggregate
  const customers = useMemo<CustomerRow[]>(() => {
    const now = Date.now();
    const map = new Map<string, CustomerRow>();
    for (const o of allOrders) {
      const key = o.customer_id || o.customer_phone || o.order_number;
      if (!key) continue;
      const row = map.get(key) || {
        key, name: o.customer_name || "-", phone: o.customer_phone || "-",
        city: extractCity(o.customer_address), country: o.country || "-",
        orders: 0, spent: 0, lastOrder: o.created_at, firstOrder: o.created_at,
        recency: 0, segment: "Potential" as Segment,
      };
      row.orders += 1;
      row.spent += orderTotalBase(o);
      if (o.created_at > row.lastOrder) row.lastOrder = o.created_at;
      if (o.created_at < row.firstOrder) row.firstOrder = o.created_at;
      map.set(key, row);
    }
    const rows = Array.from(map.values());
    for (const r of rows) {
      r.recency = Math.floor((now - new Date(r.lastOrder).getTime()) / (1000 * 60 * 60 * 24));
      r.segment = computeSegment(r.recency, r.orders, r.spent);
    }
    return rows.sort((a, b) => b.spent - a.spent);
  }, [allOrders]);

  const kpis = useMemo(() => {
    const total = customers.length;
    const startTs = new Date(startISO).getTime();
    const endTs = new Date(endISO).getTime();
    const newInRange = customers.filter((c) => {
      const t = new Date(c.firstOrder).getTime();
      return t >= startTs && t <= endTs;
    }).length;
    const activeInRange = customers.filter((c) => {
      const t = new Date(c.lastOrder).getTime();
      return t >= startTs && t <= endTs;
    }).length;
    const repeat = customers.filter((c) => c.orders >= 2).length;
    const repeatRate = total ? (repeat / total) * 100 : 0;
    const ltv = total ? customers.reduce((s, c) => s + c.spent, 0) / total : 0;
    const aov = customers.reduce((s, c) => s + c.orders, 0)
      ? customers.reduce((s, c) => s + c.spent, 0) / customers.reduce((s, c) => s + c.orders, 0)
      : 0;
    return { total, newInRange, activeInRange, repeatRate, ltv, aov };
  }, [customers, startISO, endISO]);

  const segmentStats = useMemo(() => {
    const segs: Segment[] = ["Champions", "Loyal", "Potential", "At Risk", "Lost"];
    return segs.map((s) => {
      const list = customers.filter((c) => c.segment === s);
      const revenue = list.reduce((sum, c) => sum + c.spent, 0);
      return { segment: s, count: list.length, revenue, pct: customers.length ? (list.length / customers.length) * 100 : 0, list };
    });
  }, [customers]);

  // Geographic distribution
  const byCountry = useMemo(() => {
    const m = new Map<string, { key: string; count: number; revenue: number }>();
    for (const c of customers) {
      const row = m.get(c.country) || { key: c.country, count: 0, revenue: 0 };
      row.count += 1; row.revenue += c.spent;
      m.set(c.country, row);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue);
  }, [customers]);

  const byCity = useMemo(() => {
    const m = new Map<string, { key: string; count: number; revenue: number }>();
    for (const c of customers) {
      const row = m.get(c.city) || { key: c.city, count: 0, revenue: 0 };
      row.count += 1; row.revenue += c.spent;
      m.set(c.city, row);
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [customers]);

  // Behavioral: viewed vs purchased
  const viewedVsPurchased = useMemo(() => {
    const views = new Map<string, number>();
    for (const e of events) if (e.event_type === "product_view" && e.product_id) {
      views.set(e.product_id, (views.get(e.product_id) || 0) + 1);
    }
    const startTs = new Date(startISO).getTime();
    const endTs = new Date(endISO).getTime();
    const purchases = new Map<string, number>();
    for (const o of allOrders) {
      const t = new Date(o.created_at).getTime();
      if (t < startTs || t > endTs) continue;
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        if (!it.product_id) continue;
        purchases.set(it.product_id, (purchases.get(it.product_id) || 0) + (Number(it.quantity) || 0));
      }
    }
    const merged: { id: string; name: string; views: number; purchases: number; ratio: number }[] = [];
    const ids = new Set<string>([...views.keys(), ...purchases.keys()]);
    for (const id of ids) {
      const v = views.get(id) || 0; const p = purchases.get(id) || 0;
      merged.push({ id, name: nameMap.get(id) || id.slice(0, 8), views: v, purchases: p, ratio: v ? (p / v) * 100 : 0 });
    }
    return merged.sort((a, b) => b.views - a.views).slice(0, 15);
  }, [events, allOrders, nameMap, startISO, endISO]);

  // Abandoned carts: sessions with add_to_cart but no order_placed in range
  const abandoned = useMemo(() => {
    const carts = new Set<string>();
    const ordered = new Set<string>();
    for (const e of events) {
      if (!e.session_id) continue;
      if (e.event_type === "add_to_cart") carts.add(e.session_id);
      if (e.event_type === "order_placed" || e.event_type === "purchase") ordered.add(e.session_id);
    }
    const abandonedSessions = Array.from(carts).filter((s) => !ordered.has(s));
    return { abandonedCount: abandonedSessions.length, totalCarts: carts.size, ordered: ordered.size };
  }, [events]);

  // Device split
  const devices = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) if (e.event_type === "page_view") m.set(e.device || "unknown", (m.get(e.device || "unknown") || 0) + 1);
    return Array.from(m.entries()).map(([k, v]) => ({ device: k, sessions: v }));
  }, [events]);

  // UTM source performance
  const utmSources = useMemo(() => {
    const m = new Map<string, { source: string; sessions: number; addToCart: number; orders: number }>();
    for (const e of events) {
      const key = e.utm_source || "direct";
      const row = m.get(key) || { source: key, sessions: 0, addToCart: 0, orders: 0 };
      if (e.event_type === "page_view") row.sessions += 1;
      if (e.event_type === "add_to_cart") row.addToCart += 1;
      if (e.event_type === "order_placed" || e.event_type === "purchase") row.orders += 1;
      m.set(key, row);
    }
    return Array.from(m.values()).sort((a, b) => b.orders - a.orders);
  }, [events]);

  // Cross-sell: products purchased together
  const crossSell = useMemo(() => {
    const pairs = new Map<string, { a: string; b: string; count: number }>();
    for (const o of allOrders) {
      const items = Array.isArray(o.items) ? o.items : [];
      const ids = items.map((it: any) => it.product_id).filter(Boolean);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const [a, b] = [ids[i], ids[j]].sort();
          const key = `${a}|${b}`;
          const row = pairs.get(key) || { a, b, count: 0 };
          row.count += 1;
          pairs.set(key, row);
        }
      }
    }
    return Array.from(pairs.values()).sort((x, y) => y.count - x.count).slice(0, 10);
  }, [allOrders]);

  const kpiCards = [
    { icon: Users, label: "إجمالي العملاء", value: kpis.total.toLocaleString("en-US") },
    { icon: UserPlus, label: "جدد في الفترة", value: kpis.newInRange.toLocaleString("en-US") },
    { icon: Heart, label: "نشطون في الفترة", value: kpis.activeInRange.toLocaleString("en-US") },
    { icon: Repeat, label: "معدل العودة", value: `${kpis.repeatRate.toFixed(1)}%` },
    { icon: TrendingUp, label: "متوسط قيمة العميل (LTV)", value: fmtMoney(kpis.ltv, currency) },
    { icon: ShoppingBag, label: "متوسط قيمة الطلب (AOV)", value: fmtMoney(kpis.aov, currency) },
  ];

  const exportSegment = (seg: Segment) => {
    const list = segmentStats.find((s) => s.segment === seg)?.list || [];
    downloadCSV(`segment-${seg}.csv`, list.map((c) => ({
      name: c.name, phone: c.phone, city: c.city, country: c.country,
      orders: c.orders, spent_sar: Math.round(c.spent), last_order: c.lastOrder.slice(0, 10),
      recency_days: c.recency, segment: c.segment,
    })));
  };

  const exportAll = () => {
    downloadCSV(`all-customers.csv`, customers.map((c) => ({
      name: c.name, phone: c.phone, city: c.city, country: c.country,
      orders: c.orders, spent_sar: Math.round(c.spent), last_order: c.lastOrder.slice(0, 10),
      recency_days: c.recency, segment: c.segment,
    })));
  };

  const openList = openSegment ? segmentStats.find((s) => s.segment === openSegment)?.list ?? [] : [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl">تحليل العملاء</h1>
          <p className="text-xs text-muted-foreground mt-1">بيانات جاهزة لصنع قرارات حملاتك التسويقية.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={exportAll}><Download className="w-3 h-3 ml-1" /> تصدير جميع العملاء</Button>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{options.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
          <DateRangePicker />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-black/5">
            <CardContent className="p-4">
              <k.icon className="w-4 h-4 text-pink-500 mb-2" />
              <p className="text-[11px] text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold mt-1">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RFM Segments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">تقسيم العملاء (RFM) — اضغط شريحة لعرض القائمة والتصدير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {segmentStats.map((s) => (
              <button
                key={s.segment}
                onClick={() => setOpenSegment(openSegment === s.segment ? null : s.segment)}
                className={`text-right p-4 rounded-xl border transition ${openSegment === s.segment ? "border-pink-500 ring-2 ring-pink-200" : "border-black/10 hover:border-pink-300"}`}
              >
                <div className={`w-3 h-3 rounded-full ${segColor[s.segment]} mb-2`} />
                <p className="text-xs font-medium">{segLabel[s.segment]}</p>
                <p className="text-xl font-bold mt-1">{s.count}</p>
                <p className="text-[11px] text-muted-foreground">{s.pct.toFixed(1)}% • {fmtMoney(s.revenue, currency)}</p>
              </button>
            ))}
          </div>

          {openSegment && (
            <div className="mt-4 rounded-xl border border-pink-200 p-3 bg-pink-50/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">{segLabel[openSegment]} ({openList.length})</p>
                <Button size="sm" onClick={() => exportSegment(openSegment)}>
                  <Download className="w-3 h-3 ml-1" /> تصدير CSV
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead><TableHead>الجوال</TableHead><TableHead>المدينة</TableHead>
                      <TableHead>الطلبات</TableHead><TableHead>الإنفاق</TableHead><TableHead>آخر طلب</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openList.slice(0, 200).map((c) => (
                      <TableRow key={c.key}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell dir="ltr">{c.phone}</TableCell>
                        <TableCell>{c.city}</TableCell>
                        <TableCell>{c.orders}</TableCell>
                        <TableCell>{fmtMoney(c.spent, currency)}</TableCell>
                        <TableCell className="text-xs">{c.lastOrder.slice(0, 10)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Geographic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> حسب الدولة</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>الدولة</TableHead><TableHead>عملاء</TableHead><TableHead>الإيراد</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCountry.map((c) => (
                  <TableRow key={c.key}><TableCell>{c.key}</TableCell><TableCell>{c.count}</TableCell><TableCell>{fmtMoney(c.revenue, currency)}</TableCell></TableRow>
                ))}
                {!byCountry.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> أفضل 10 مدن</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>المدينة</TableHead><TableHead>عملاء</TableHead><TableHead>الإيراد</TableHead></TableRow></TableHeader>
              <TableBody>
                {byCity.map((c) => (
                  <TableRow key={c.key}><TableCell>{c.key}</TableCell><TableCell>{c.count}</TableCell><TableCell>{fmtMoney(c.revenue, currency)}</TableCell></TableRow>
                ))}
                {!byCity.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Behavior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">تصفح مقابل شراء — اكتشف منتجات "الاهتمام العالي، الشراء المنخفض"</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>المنتج</TableHead><TableHead>مشاهدات</TableHead><TableHead>مشتريات</TableHead><TableHead>معدل التحويل</TableHead></TableRow></TableHeader>
              <TableBody>
                {viewedVsPurchased.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[220px] truncate">{p.name}</TableCell>
                    <TableCell>{p.views}</TableCell>
                    <TableCell>{p.purchases}</TableCell>
                    <TableCell>
                      <Badge variant={p.ratio < 2 && p.views > 20 ? "destructive" : "secondary"}>{p.ratio.toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!viewedVsPurchased.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-500" /> عربات مهجورة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><p className="text-[11px] text-muted-foreground">جلسات أضافت للسلة</p><p className="text-2xl font-bold">{abandoned.totalCarts}</p></div>
            <div><p className="text-[11px] text-muted-foreground">أكملت الطلب</p><p className="text-2xl font-bold text-emerald-600">{abandoned.ordered}</p></div>
            <div><p className="text-[11px] text-muted-foreground">هجرت السلة</p><p className="text-2xl font-bold text-red-500">{abandoned.abandonedCount}</p></div>
            <p className="text-xs text-muted-foreground">اربطها بحملة تذكير عبر واتساب لاسترجاع هؤلاء العملاء.</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic + Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">أداء مصادر الحملات (UTM)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>المصدر</TableHead><TableHead>جلسات</TableHead><TableHead>إضافة سلة</TableHead><TableHead>طلبات</TableHead></TableRow></TableHeader>
              <TableBody>
                {utmSources.map((s) => (
                  <TableRow key={s.source}><TableCell>{s.source}</TableCell><TableCell>{s.sessions}</TableCell><TableCell>{s.addToCart}</TableCell><TableCell>{s.orders}</TableCell></TableRow>
                ))}
                {!utmSources.length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Smartphone className="w-4 h-4" /> الأجهزة</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>الجهاز</TableHead><TableHead>جلسات</TableHead></TableRow></TableHeader>
              <TableBody>
                {devices.map((d) => (
                  <TableRow key={d.device}><TableCell>{d.device}</TableCell><TableCell>{d.sessions}</TableCell></TableRow>
                ))}
                {!devices.length && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">لا توجد بيانات</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cross-sell */}
      <Card>
        <CardHeader><CardTitle className="text-base">منتجات تُشترى معاً (Cross-sell)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>المنتج (أ)</TableHead><TableHead>المنتج (ب)</TableHead><TableHead>عدد الطلبات المشتركة</TableHead></TableRow></TableHeader>
            <TableBody>
              {crossSell.map((p) => (
                <TableRow key={`${p.a}-${p.b}`}>
                  <TableCell className="max-w-[220px] truncate">{nameMap.get(p.a) || p.a.slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{nameMap.get(p.b) || p.b.slice(0, 8)}</TableCell>
                  <TableCell><Badge>{p.count}</Badge></TableCell>
                </TableRow>
              ))}
              {!crossSell.length && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">لا توجد بيانات كافية</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}