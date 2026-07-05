import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker, useDateRange } from "@/lib/analytics/dateRange";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Sparkles, Activity, Search, MapPin, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const currency = "ر.ي";
const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);

type Segment = "VIP" | "متوسط" | "عادي";
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

    const FLAMINGO = {
    primary: "#FF4D8D",
    soft: "#FF7AAE",
    dark: "#C9184A",
    glow: "rgba(255, 77, 141, 0.10)",
    };

    const SEG_COLORS: Record<Segment, string> = {
    "VIP": "#8b5cf6",
    "متوسط": "#10b981",
    "عادي": "#94a3b8",
    };

    export default function AdminCustomerIntelligence() {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<Row[]>([]);
        const [selectedCustomer, setSelectedCustomer] = useState<Row | null>(null);
        const [customerOrders, setCustomerOrders] = useState<any[]>([]);
        const [loadingDetails, setLoadingDetails] = useState(false);
        const [customerPayments, setCustomerPayments] = useState<any[]>([]);
        const [modalVisible, setModalVisible] = useState(false);
    const [q, setQ] = useState("");
    const [seg, setSeg] = useState<string>("all");
    const [region, setRegion] = useState<string>("all");
    const [quickFilter, setQuickFilter] = useState("all");
    const { range } = useDateRange();
    useEffect(() => { load(); }, [range.start, range.end]);

    async function load() {
        setLoading(true);
        // use global date range when available
        const start = range?.start ? new Date(range.start).toISOString() : undefined;
        const end = range?.end ? new Date(new Date(range.end).getTime() + 24*60*60*1000 -1).toISOString() : undefined;
        let qbuilder: any = supabase.from("orders").select("customer_name,customer_phone,customer_address,total,created_at,status").neq("status", "cancelled").order("created_at", { ascending: false }).limit(5000);
        if (start) qbuilder = qbuilder.gte("created_at", start);
        if (end) qbuilder = qbuilder.lte("created_at", end);
        const { data: orders } = await qbuilder;

        const byPhone = new Map<string, Row>();
        const now = Date.now();
        (orders || []).forEach((o: any) => {
        const key = (o.customer_phone?.trim() || o.customer_name?.trim() || "unknown-" + Math.random());
        const region = (o.customer_address || "").split(/[,،]/)[0]?.trim() || "غير محدد";
        const total = Number(o.total ?? 0);
        const cur = byPhone.get(key);
        if (cur) {
            cur.orders += 1; cur.spent += total;
            if (!cur.last || new Date(o.created_at) > new Date(cur.last)) cur.last = o.created_at;
        } else {
            byPhone.set(key, {
            id: key, name: o.customer_name || "عميل", phone: o.customer_phone || null,
            region, orders: 1, spent: total, aov: 0, last: o.created_at, segment: "عادي",
            });
        }
        });

        const list: Row[] = Array.from(byPhone.values()).map(r => {
        r.aov = r.spent / Math.max(1, r.orders);
        const daysSince = r.last ? (now - new Date(r.last).getTime()) / 86400000 : 999;
        r.segment =
            r.spent >= 8000 || r.orders >= 6
            ? "VIP"
            : r.spent >= 2000 || r.orders >= 2
                ? "متوسط"
                : "عادي";
        return r;
        });
        list.sort((a, b) => b.spent - a.spent);
        setRows(list);
        setLoading(false);
    }

    async function openDetails(r: Row) {
        setSelectedCustomer(r);
        setLoadingDetails(true);
        try {
            // load full customer record from `customers` table when possible
            const { data: custData } = await supabase.from("customers").select("*").eq("phone", r.phone).limit(1).maybeSingle();
            // if found and has id, attach to selectedCustomer (non-destructive)
            if (custData) {
                setSelectedCustomer(prev => prev ? { ...prev, id: custData.id, name: custData.name, phone: custData.phone, region: prev.region } : prev);
            }
            const start = range?.start ? new Date(range.start).toISOString() : undefined;
            const end = range?.end ? new Date(new Date(range.end).getTime() + 24*60*60*1000 -1).toISOString() : undefined;
            let qbuilder: any = supabase.from("orders").select("id,customer_name,customer_phone,customer_address,total,created_at,status,line_items").neq("status","cancelled").order("created_at", { ascending: false }).limit(2000);
            if (start) qbuilder = qbuilder.gte("created_at", start);
            if (end) qbuilder = qbuilder.lte("created_at", end);

            // Prefer phone-based lookup when available
            if (r.phone) {
                const { data } = await qbuilder.eq("customer_phone", r.phone);
                if (data && data.length) {
                    setCustomerOrders(data);
                    setLoadingDetails(false);
                    // also load related financial transactions where reference matches order id or phone
                    try {
                        const refs = data.map((d: any) => d.id).slice(0, 50);
                        const { data: txs } = await supabase.from('financial_transactions').select('id,entry_date,description,reference,source_id,source_type').or(refs.map((id: string) => `reference.eq.${id}`).join(',')).limit(100);
                        setCustomerPayments(txs || []);
                    } catch (e) { console.error(e); setCustomerPayments([]); }
                    return;
                }
            }

            // Fallback to name-based lookup
            const { data: byName } = await qbuilder.eq("customer_name", r.name);
            setCustomerOrders(byName || []);
            try {
                const refs = (byName || []).map((d: any) => d.id).slice(0, 50);
                const { data: txs } = await supabase.from('financial_transactions').select('id,entry_date,description,reference,source_id,source_type').or(refs.map((id: string) => `reference.eq.${id}`).join(',')).limit(100);
                setCustomerPayments(txs || []);
            } catch (e) { console.error(e); setCustomerPayments([]); }
        } catch (err) {
            console.error(err);
            setCustomerOrders([]);
        } finally {
            setLoadingDetails(false);
        }
    }

    function closeDetails() {
        setSelectedCustomer(null);
        setCustomerOrders([]);
    }

    // Animated close that respects modal animation before clearing state
    function handleCloseDetails() {
        setModalVisible(false);
        // wait for animation to finish then clear
        setTimeout(() => closeDetails(), 240);
    }

    useEffect(() => {
        if (selectedCustomer) {
            // open modal with small delay to allow mount
            requestAnimationFrame(() => setModalVisible(true));
        } else {
            setModalVisible(false);
        }
    }, [selectedCustomer]);

    // close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && selectedCustomer) handleCloseDetails();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selectedCustomer]);

    const regions = useMemo(() => Array.from(new Set(rows.map(r => r.region))).sort(), [rows]);
    const regionData = useMemo(() => {
    const m = new Map<string, number>();

    rows.forEach((r) => {
        const region = (r.region || "غير محدد").trim();
        const current = m.get(region) || 0;

        m.set(region, current + (r.spent || 0));
    });

    return Array.from(m.entries())
        .map(([region, revenue]) => ({
        region,
        revenue: Math.round(revenue),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .filter((r) => r.revenue > 0) // 👈 مهم جداً
        .slice(0, 8);
    }, [rows]);
    const filtered = rows.filter((r) => {
        if (seg !== "all" && r.segment !== seg) return false;

        if (region !== "all" && r.region !== region) return false;

        if (
        q &&
        !(r.name + " " + (r.phone || ""))
            .toLowerCase()
            .includes(q.toLowerCase())
        )
        return false;

        const days =
        r.last
            ? (Date.now() - new Date(r.last).getTime()) / 86400000
            : 999;

        switch (quickFilter) {
        case "vip":
            return r.segment === "VIP";

        case "spender":
            return r.spent >= 10000;

        case "orders":
            return r.orders >= 5;

        case "new":
            return r.orders === 1;

        case "active":
            return days <= 30;

        case "inactive":
            return days > 90;

        case "top-region":
            return r.region === regionData[0]?.region;

        default:
            return true;
        }
    });
    
    // Export filtered customers to Excel/CSV
    function exportFilteredToExcel() {
        const out = filtered.map(r => ({
            id: r.id,
            name: r.name,
            phone: r.phone,
            region: r.region,
            orders: r.orders,
            spent: r.spent,
            aov: Math.round(r.aov),
            last: r.last,
            segment: r.segment,
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "customers");
        XLSX.writeFile(wb, `customers_${new Date().toISOString().slice(0,10)}.xlsx`);
    }

    function exportFilteredToCSV() {
        const header = ["id","name","phone","region","orders","spent","aov","last","segment"];
        const rowsCsv = filtered.map(r => [r.id, r.name, r.phone||"", r.region, r.orders, r.spent, Math.round(r.aov), r.last||"", r.segment]);
        const csv = [header, ...rowsCsv].map(r => r.map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `customers_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    }

    function exportCustomerOrdersToExcel() {
        if (!selectedCustomer) return;
        const out = customerOrders.map(o => ({
            id: o.id,
            order_number: o.order_number || o.id,
            date: o.created_at,
            total: o.total,
            address: o.customer_address,
            phone: o.customer_phone,
            status: o.status,
        }));
        const ws = XLSX.utils.json_to_sheet(out);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "orders");
        const name = `orders_${selectedCustomer.id || 'customer'}_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, name);
    }
    const aiEngine = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;

    let currentRevenue = 0;
    let prevRevenue = 0;

    let vipRevenue = 0;
    let regionMap: Record<string, number> = {};
    let inactiveRisk = 0;

    rows.forEach((r) => {
        if (!r.last) return;

        const d = new Date(r.last);
        const m = d.getMonth();

        const days =
        (Date.now() - new Date(r.last).getTime()) / 86400000;

        if (m === currentMonth) currentRevenue += r.spent;
        if (m === prevMonth) prevRevenue += r.spent;

        if (r.segment === "VIP") vipRevenue += r.spent;

        regionMap[r.region] = (regionMap[r.region] || 0) + r.spent;

        // ⚠️ risk: inactive customers
        if (days > 60) inactiveRisk += 1;
    });

    const growth =
        prevRevenue === 0
        ? 100
        : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

    const forecast = currentRevenue * (1 + growth / 100);

    const topRegion = Object.entries(regionMap).sort(
        (a, b) => b[1] - a[1]
    )[0];

    const riskLevel =
        inactiveRisk > rows.length * 0.3
        ? "high"
        : inactiveRisk > rows.length * 0.15
        ? "medium"
        : "low";

    const action =
        growth > 10
        ? "استمر في استهداف VIP + نفس المناطق"
        : growth < 0
        ? "ركّز على إعادة تنشيط العملاء الخاملين"
        : "النمو مستقر، حسّن متوسط الطلب";

    return {
        currentRevenue,
        prevRevenue,
        growth,
        forecast,
        topRegion: topRegion?.[0],
        riskLevel,
        inactiveRisk,
        action,
    };
    }, [rows]);
    const totals = useMemo(() => {
        const total = rows.length;
        const revenue = rows.reduce((s, r) => s + r.spent, 0);
        const vip = rows.filter(r => r.segment === "VIP").length;
        const aov = revenue / Math.max(1, rows.reduce((s, r) => s + r.orders, 0));
        return { total, revenue, vip, aov };
    }, [rows]);
    const segData = (["VIP", "متوسط", "عادي"] as Segment[]).map(s => ({
        name: s, value: rows.filter(r => r.segment === s).length,
    }));

    

    const kpis = [
        { label: "إجمالي العملاء", value: fmt(totals.total), icon: Users, bg: "bg-blue-50", tone: "text-blue-600", subtext: "+12% نمو" },
        { label: "عملاء VIP", value: fmt(totals.vip), icon: Crown, bg: "bg-violet-50", tone: "text-violet-600", subtext: `${((totals.vip / totals.total) * 100).toFixed(1)}% من الإجمالي` },
        { label: "متوسط قيمة الطلب", value: `${fmt(totals.aov)} ${currency}`, icon: Activity, bg: "bg-amber-50", tone: "text-amber-600", subtext: "المتوسط الحالي" },
        { label: "إجمالي الإنفاق", value: `${fmt(totals.revenue)} ${currency}`, icon: Sparkles, bg: "bg-emerald-50", tone: "text-emerald-600", subtext: `من ${rows.length} عميل` },
    ];

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
        <header className="relative">
            <div className="relative p-6 rounded-2xl border border-black/5 bg-white overflow-hidden">
                <div className="absolute inset-0" style={{ background: "radial-gradient(circle at top right, rgba(255,77,141,0.14), transparent 60%)" }} />

                <div className="relative z-10 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Customer Intelligence</p>
                        <h1 className="font-heading text-2xl md:text-3xl">تحليل سلوك العملاء</h1>
                        <p className="text-sm text-muted-foreground mt-1">فهم عميق لسلوك الشراء + تقسيم العملاء حسب القيمة</p>

                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white border border-black/10 rounded-lg p-2">
                            <DateRangePicker />
                        </div>

                        <div className="flex items-center gap-2">
                            <button onClick={load} className="px-4 py-2 rounded-xl text-sm border border-black/10 hover:bg-black/5 transition">تحديث</button>
                            <button onClick={exportFilteredToExcel} title="تصدير Excel" className="px-3 py-2 rounded-xl text-sm border border-black/10 hover:bg-black/5 flex items-center gap-2"><DownloadCloud className="w-4 h-4" /> Excel</button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {kpis.map((k) => (
        <Card
        key={k.label}
        className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
        >
        {/* Glow Background */}
        <div className={`absolute inset-0 opacity-40 ${k.bg}`} />

        {/* Content */}
        <div className="relative p-5 flex flex-col gap-3">

            {/* icon */}
            <div className={`w-10 h-10 rounded-xl grid place-items-center ${k.bg} shadow-sm`}>
            <k.icon className={`w-5 h-5 ${k.tone}`} />
            </div>

            {/* label */}
            <p className="text-xs text-muted-foreground">
            {k.label}
            </p>

            {/* value */}
            {loading ? (
            <Skeleton className="h-8 w-24" />
            ) : (
            <>
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                    {k.value}
                </p>
                {k.subtext && <p className={`text-xs font-medium mt-1 opacity-75 ${k.tone}`}>{k.subtext}</p>}
            </>
            )}
        </div>
        </Card>
    ))}
    </section>

    <div className="grid lg:grid-cols-2 gap-4">

    {/* 📊 MONTH COMPARISON */}
    <Card className="p-6 rounded-2xl border border-black/5 bg-white shadow-sm space-y-5">

        <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
            مقارنة شهرية
        </p>

        <span className="text-[10px] px-2 py-1 rounded-full bg-gray-900 text-white">
            Month vs Month
        </span>
        </div>

        {/* CURRENT */}
        <div className="p-4 rounded-xl bg-pink-50 border border-pink-100">
        <p className="text-xs text-muted-foreground">الشهر الحالي</p>
        <p className="text-2xl font-bold text-pink-500">
            {fmt(aiEngine.currentRevenue)} ر.ي
        </p>
        </div>

        {/* PREVIOUS */}
        <div className="p-4 rounded-xl bg-gray-50 border">
        <p className="text-xs text-muted-foreground">الشهر السابق</p>
        <p className="text-xl font-semibold text-gray-700">
            {fmt(aiEngine.prevRevenue)} ر.ي
        </p>
        </div>

        {/* GROWTH */}
        <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">
            معدل النمو
        </span>

        <span className={`font-bold ${
            aiEngine.growth >= 0 ? "text-green-600" : "text-red-500"
        }`}>
            {aiEngine.growth.toFixed(1)}%
        </span>
        </div>

    </Card>

    {/* 🧠 AI INSIGHT */}
    <Card className="relative p-6 rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">

        {/* glow */}
        <div
        className="absolute inset-0 opacity-40"
        style={{
            background:
            "radial-gradient(circle at top right, rgba(255,77,141,0.18), transparent 60%), radial-gradient(circle at bottom left, rgba(139,92,246,0.12), transparent 60%)",
        }}
        />

        <div className="relative space-y-5">

        <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
            ذكاء فلامنجو
            </p>

            <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500 text-white">
            AI
            </span>
        </div>

        {/* INSIGHT */}
        <h3 className="text-lg font-bold text-gray-800 leading-snug">
            {aiEngine.growth >= 0
            ? "النمو مستقر بسبب زيادة العملاء النشطين"
            : "انخفاض الأداء مرتبط بتراجع الطلبات المتكررة"}
        </h3>

        {/* KEY METRICS */}
        <div className="grid grid-cols-2 gap-3">

            <div className="p-3 rounded-xl bg-pink-50 border">
            <p className="text-[10px] text-muted-foreground">التوقع القادم</p>
            <p className="text-sm font-bold text-amber-600">
                {fmt(aiEngine.forecast)} ر.ي
            </p>
            </div>

            <div className="p-3 rounded-xl bg-violet-50 border">
            <p className="text-[10px] text-muted-foreground">المخاطر</p>
            <p className="text-sm font-bold">
                {aiEngine.riskLevel === "high"
                ? "مرتفع"
                : aiEngine.riskLevel === "medium"
                ? "متوسط"
                : "منخفض"}
            </p>
            </div>

        </div>

        {/* ACTION */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white">
            <p className="text-[10px] opacity-80">
            توصية ذكية
            </p>
            <p className="text-sm font-medium mt-1">
            {aiEngine.action}
            </p>
        </div>

        </div>

    </Card>

    </div>
    <Card className="relative p-6 rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">

    {/* background glow */}
    <div
        className="absolute inset-0 opacity-40"
        style={{
        background:
            "radial-gradient(circle at top right, rgba(255,77,141,0.16), transparent 60%), radial-gradient(circle at bottom left, rgba(139,92,246,0.10), transparent 60%)",
        }}
    />

    <div className="relative space-y-5">

        {/* HEADER */}
        <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground tracking-wide">
            ذكاء الأعمال فلامنجو
        </p>

        <span className="text-[10px] px-2 py-1 rounded-full bg-pink-500 text-white shadow">
            مباشر
        </span>
        </div>

        {/* FORECAST (Main Metric) */}
        <div>
        <p className="text-xs text-muted-foreground">
            📈 التوقع القادم
        </p>

        <p className="text-2xl font-bold text-gray-800 mt-1">
            {fmt(aiEngine.forecast)} ر.ي
        </p>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 gap-3">

        {/* Growth */}
        <div className="p-3 rounded-xl bg-pink-50 border border-pink-100">
            <p className="text-[10px] text-muted-foreground">النمو</p>
            <p className={`text-sm font-bold ${
            aiEngine.growth >= 0 ? "text-amber-600" : "text-red-500"
            }`}>
            {aiEngine.growth.toFixed(1)}%
            </p>
        </div>

        {/* Risk */}
        <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
            <p className="text-[10px] text-muted-foreground">المخاطر</p>
            <p className={`text-sm font-bold ${
            aiEngine.riskLevel === "high"
                ? "text-red-500"
                : aiEngine.riskLevel === "medium"
                ? "text-orange-500"
                : "text-green-600"
            }`}>
            {aiEngine.riskLevel === "high"
                ? "مرتفع"
                : aiEngine.riskLevel === "medium"
                ? "متوسط"
                : "منخفض"}
            </p>
        </div>

        </div>

        {/* ACTION (Decision Block) */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md">

        <p className="text-[10px] opacity-80">
            🎯 توصية الذكاء الاصطناعي
        </p>

        <p className="text-sm font-medium mt-1 leading-relaxed">
            {aiEngine.action}
        </p>

        </div>

    </div>
    </Card>




        <section className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 p-5 ring-1 ring-black/5 border-0 shadow-none">
            <h2 className="font-heading text-base mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />الإيرادات حسب المنطقة</h2>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData} layout="vertical" margin={{ left: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis
    type="category"
    dataKey="region"
    width={100}
    tick={{ fontSize: 12, fill: "#64748b" }}
    tickLine={false}
    axisLine={false}
    />
                    <Tooltip contentStyle={{ borderRadius: 12, direction: "rtl", border: "1px solid #e2e8f0" }} formatter={(v: any) => [`${fmt(Number(v))} ${currency}`, "إيراد"]} />
                    <Bar
    dataKey="revenue"
    radius={[10, 10, 10, 10]}
    fill="url(#barGradient)"
    barSize={18}
    />
    <defs>
    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FF4D8D" />
        <stop offset="100%" stopColor="#8b5cf6" />
    </linearGradient>
    </defs>
                </BarChart>
                </ResponsiveContainer>
            </div>
            </Card>

            <Card className="p-5 ring-1 ring-black/5 border-0 shadow-none">
            <h2 className="font-heading text-base mb-3">تقسيم العملاء</h2>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
    data={segData}
    dataKey="value"
    nameKey="name"
    innerRadius={60}
    outerRadius={90}
    paddingAngle={5}
    stroke="none"
    >
                    {segData.map((s) => (
    <Cell
        key={s.name}
        fill={SEG_COLORS[s.name as Segment]}
    />
    ))}
                    </Pie>
    <Tooltip
    contentStyle={{
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        fontSize: 12
    }}
    />
                    <Legend
    iconType="circle"
    wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
    />
                </PieChart>
                </ResponsiveContainer>
            </div>
            </Card>
        </section>

        <Card className="p-0 border border-black/5 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-5 border-b border-black/5 bg-white space-y-4 sticky top-0 z-10 backdrop-blur">

    <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-gray-50 p-3 rounded-xl border border-black/5">

    {/* SEARCH */}
    <div className="flex-1 relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="ابحث باسم العميل أو الرقم..."
        className="pr-10 h-10 bg-white rounded-lg border-black/10"
        />
    </div>

    {/* SEGMENT FILTER (Tabs صغيرة) */}
    <div className="flex bg-white border border-black/10 rounded-lg p-1 gap-1">
        {["all", "VIP", "متوسط", "عادي"].map((s) => (
        <button
            key={s}
            onClick={() => setSeg(s)}
            className={`px-3 py-1.5 text-xs rounded-md transition whitespace-nowrap
            ${seg === s
                ? "bg-pink-500 text-white shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
        >
            {s === "all" ? "الكل" : s}
        </button>
        ))}
    </div>

    {/* QUICK FILTERS */}
    <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {[
            { key: "all", label: "الكل" },
            { key: "vip", label: "👑 VIP" },
            { key: "active", label: "🔥 نشطون" },
            { key: "inactive", label: "😴 خامل" },
            { key: "new", label: "✨ جدد" },
        ].map((f) => (
            <button
            key={f.key}
            onClick={() => setQuickFilter(f.key)}
            className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap transition
            ${quickFilter === f.key
                ? "bg-pink-500 text-white border-pink-500"
                : "bg-white text-gray-600"
            }
            `}
            >
            {f.label}
            </button>
        ))}
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">

    <button
        onClick={() => setRegion("all")}
        className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap
        ${region === "all"
            ? "bg-pink-500 text-white border-pink-500"
            : "bg-white text-gray-600"
        }
        `}
    >
        🌍 كل المناطق
    </button>

    {regions.map(r => (
        <button
        key={r}
        onClick={() => setRegion(r)}
        className={`px-3 py-1.5 text-xs rounded-full border whitespace-nowrap
            ${region === r
            ? "bg-pink-500 text-white border-pink-500"
            : "bg-white text-gray-600"
            }
        `}
        >
        📍 {r}
        </button>
    ))}

    </div>

    {/* RESET BUTTON */}
    <button
        onClick={() => {
        setSeg("all");
        setRegion("all");
        setQ("");
        setQuickFilter("all");
        }}
        className="px-3 py-2 text-xs rounded-lg border bg-white hover:bg-gray-100 text-gray-600"
    >
        إعادة ضبط
    </button>

    </div>

    </div>

            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-black/[0.02] text-xs text-muted-foreground ">
                <tr>
                    <th className="text-right p-3 font-medium">العميل</th>
                    <th className="text-right p-3 font-medium">المنطقة</th>
                    <th className="text-right p-3 font-medium">الطلبات</th>
                    <th className="text-right p-3 font-medium">إجمالي الإنفاق</th>
                    <th className="text-right p-3 font-medium">متوسط الطلب</th>
                    <th className="text-right p-3 font-medium">آخر شراء</th>
                    <th className="text-right p-3 font-medium">الحالة</th>
                    <th className="text-center p-3 font-medium">إجراءات</th>
                </tr>
                </thead>
                <tbody>
                {loading && Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-t border-black/5 hover:bg-pink-50/30 transition-all duration-150"><td colSpan={8} className="p-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))}
                {!loading && filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا يوجد عملاء مطابقين</td></tr>
                )}
                {!loading && filtered.slice(0, 100).map(r => {
                    const daysSince = r.last ? (Date.now() - new Date(r.last).getTime()) / 86400000 : 999;
                    const statusColor = daysSince <= 30 ? "text-green-600" : daysSince <= 90 ? "text-orange-600" : "text-red-600";
                    const statusEmoji = daysSince <= 30 ? "🔥" : daysSince <= 90 ? "⚠️" : "😴";
                    const statusLabel = daysSince <= 30 ? "نشط" : daysSince <= 90 ? "خامل" : "خامل جداً";
                    
                    return (
                    <tr key={r.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                    <td className="p-3">
                        <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl grid place-items-center text-sm font-semibold shadow-sm"
                            style={{
                            background: SEG_COLORS[r.segment] + "20",
                            color: SEG_COLORS[r.segment]
                            }}
                        >
                            {r.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium truncate">{r.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{r.phone || "—"}</p>
                        </div>
                        </div>
                    </td>
                    <td className="p-3">
                        <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs">📍 {r.region}</span>
                    </td>
                    <td className="p-3 tabular-nums font-semibold text-center">
                        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-600">{r.orders}x</span>
                    </td>
                    <td className="p-3 tabular-nums font-bold text-pink-600">{fmt(r.spent)} {currency}</td>
                    <td className="p-3 tabular-nums text-emerald-600 font-semibold">{fmt(r.aov)} {currency}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.last ? new Date(r.last).toLocaleDateString("ar-EG") : "—"}</td>
                    <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusColor === "text-green-600" ? "bg-green-50 text-green-600" : statusColor === "text-orange-600" ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"}`}>
                            {statusEmoji} {statusLabel}
                        </span>
                    </td>
                    <td className="p-3 text-center">
                        <Button size="sm" variant="ghost" onClick={() => openDetails(r)}>تفاصيل</Button>
                    </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
            {filtered.length > 100 && <p className="p-3 text-xs text-center text-muted-foreground border-t border-black/5 bg-gray-50">يعرض أول 100 من {filtered.length} عميل</p>}
        </Card>
        {/* Customer Details Drawer */}
        {selectedCustomer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className={`absolute inset-0 bg-black/40 transition-opacity ${modalVisible ? 'opacity-80' : 'opacity-0'}`} onClick={handleCloseDetails} />
                <aside className={`relative w-full max-w-3xl bg-white rounded-2xl p-6 overflow-auto shadow-2xl transform transition-all duration-240 ${modalVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`} role="dialog" aria-modal="true">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <img src="/icons/flamingo.jpeg" alt="logo" className="w-20 h-20 object-cover rounded-md shadow" />
                                <div>
                                    <h3 className="text-2xl font-bold">{selectedCustomer.name}</h3>
                                    <p className="text-sm text-muted-foreground">#{selectedCustomer.id}</p>
                                    <p className="text-sm">{selectedCustomer.phone || '—'}</p>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">عرض معلومات</p>
                                <p className="text-sm">{new Date().toLocaleDateString('ar-EG')}</p>
                                <div className="flex gap-2 mt-3 justify-end">
                                    <Button size="sm" onClick={() => window.print()}>طباعة</Button>
                                    <Button size="sm" onClick={exportCustomerOrdersToExcel}><DownloadCloud className="w-4 h-4" /> تصدير</Button>
                                    <Button size="sm" variant="ghost" onClick={closeDetails}>إغلاق</Button>
                                </div>
                            </div>
                        </div>

                        <hr className="my-4" />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-medium mb-2">تفاصيل العميل</h4>
                                <p className="text-sm"><strong>الاسم:</strong> {selectedCustomer.name}</p>
                                <p className="text-sm"><strong>الهاتف:</strong> {selectedCustomer.phone || '—'}</p>
                                <p className="text-sm"><strong>المنطقة:</strong> {selectedCustomer.region}</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">إحصائيات</h4>
                                <p className="text-sm"><strong>الطلبات:</strong> {selectedCustomer.orders}</p>
                                <p className="text-sm"><strong>إجمالي الإنفاق:</strong> {fmt(selectedCustomer.spent)} {currency}</p>
                                <p className="text-sm"><strong>متوسط الطلب:</strong> {fmt(selectedCustomer.aov)} {currency}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-medium mb-3">الطلبات</h4>
                            <div className="space-y-3">
                                {customerOrders.map(o => (
                                    <div key={o.id} className="p-4 border rounded-lg bg-white">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">#{o.order_number || o.id}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('ar-EG')}</p>
                                                {o.customer_address && <p className="text-xs mt-1">📍 {o.customer_address}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">{fmt(Number(o.total))} {currency}</p>
                                                <p className="text-xs text-muted-foreground">{o.status}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {customerOrders.length === 0 && <p className="text-sm text-muted-foreground">لا توجد طلبات</p>}
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-medium mb-2">ملاحظات / مدونة</h4>
                            <div className="prose prose-sm max-w-none text-sm text-gray-700">
                                {/* Use the latest order note or empty */}
                                <p>{(customerOrders[0] && customerOrders[0].customer_notes) || 'لا توجد ملاحظات'}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-medium mb-2">المدفوعات ({customerPayments.length})</h4>
                            <div className="space-y-2">
                                {customerPayments.length === 0 && <p className="text-sm text-muted-foreground">لا توجد مدفوعات مرتبطة</p>}
                                {customerPayments.map(p => (
                                    <div key={p.id} className="p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <p className="font-medium">{p.description || 'دفع'}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(p.entry_date).toLocaleString('ar-EG')}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm text-muted-foreground">مرجع: {p.reference || p.source_id || '—'}</div>
                                                <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/ledger?ref=${encodeURIComponent(p.reference || p.source_id || '')}`)}>سجل</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        )}
        </div>
    );
}