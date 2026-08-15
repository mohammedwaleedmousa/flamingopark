import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/lib/analytics/dateRange";
import { currencyOptions, fmtMoney, orderTotalBase } from "./reportHelpers";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, CheckCircle2, Eye, Loader2, Package, RefreshCw, ShoppingCart, TrendingDown, TrendingUp, Users, WalletCards, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderItem = {
  product_id?: string | null;
  product_name?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
};

type OrderRow = {
  id: string;
  total: number;
  total_base: number | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number | null;
  created_at: string;
  status: string;
  items: OrderItem[] | unknown;
  customer_id: string | null;
  customer_phone: string | null;
};

type AnalyticsEvent = {
  event_type: string;
  created_at: string;
  path: string | null;
  utm_source: string | null;
  device: string | null;
  value: number | null;
  session_id: string | null;
  product_id: string | null;
};

type Metrics = {
  revenue: number;
  orders: number;
  aov: number;
  customers: number;
  sessions: number;
  conversion: number;
  addToCartSessions: number;
  purchaseSessions: number;
};

type DailyRow = {
  day: string;
  label: string;
  revenue: number;
  orders: number;
};

type TopProduct = {
  key: string;
  name: string;
  qty: number;
  revenue: number;
};

type TrafficSource = {
  source: string;
  sessions: number;
  addToCart: number;
  purchases: number;
  conversion: number;
};

const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

export default function ReportsOverviewPage() {
  const { range, setRange } = useDateRange();
  const [currency, setCurrency] = useState("SAR");
  const options = currencyOptions();

  const period = useMemo(() => {
    const currentStart = startOfLocalDay(range.start);
    const currentEndExclusive = addDays(startOfLocalDay(range.end), 1);
    const spanDays = Math.max(1, Math.round((currentEndExclusive.getTime() - currentStart.getTime()) / 86_400_000));
    const previousStart = addDays(currentStart, -spanDays);

    return {
      currentStart,
      currentEndExclusive,
      previousStart,
      spanDays,
      currentStartISO: currentStart.toISOString(),
      currentEndExclusiveISO: currentEndExclusive.toISOString(),
      previousStartISO: previousStart.toISOString(),
    };
  }, [range.start, range.end]);

  const ordersQuery = useQuery({
    queryKey: ["reports-overview-orders-v2", period.previousStartISO, period.currentEndExclusiveISO],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,total,total_base,subtotal,delivery_fee,discount_amount,created_at,status,items,customer_id,customer_phone").gte("created_at", period.previousStartISO).lt("created_at", period.currentEndExclusiveISO).order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        total: Number(row.total || 0),
        total_base: row.total_base == null ? null : Number(row.total_base),
        subtotal: Number(row.subtotal || 0),
        delivery_fee: Number(row.delivery_fee || 0),
        discount_amount: row.discount_amount == null ? null : Number(row.discount_amount),
      })) as OrderRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const eventsQuery = useQuery({
    queryKey: ["reports-overview-events-v2", period.previousStartISO, period.currentEndExclusiveISO],
    queryFn: async () => {
      const { data, error } = await supabase.from("analytics_events").select("event_type,created_at,path,utm_source,device,value,session_id,product_id").gte("created_at", period.previousStartISO).lt("created_at", period.currentEndExclusiveISO).order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []) as AnalyticsEvent[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const orders = ordersQuery.data || [];
  const events = eventsQuery.data || [];

  const currentOrders = useMemo(() => orders.filter((order) => new Date(order.created_at) >= period.currentStart && !CANCELLED_STATUSES.has(String(order.status || "").toLowerCase())), [orders, period.currentStart]);
  const previousOrders = useMemo(() => orders.filter((order) => new Date(order.created_at) < period.currentStart && !CANCELLED_STATUSES.has(String(order.status || "").toLowerCase())), [orders, period.currentStart]);

  const currentEvents = useMemo(() => events.filter((event) => new Date(event.created_at) >= period.currentStart), [events, period.currentStart]);
  const previousEvents = useMemo(() => events.filter((event) => new Date(event.created_at) < period.currentStart), [events, period.currentStart]);

  const currentMetrics = useMemo(() => buildMetrics(currentOrders, currentEvents), [currentOrders, currentEvents]);
  const previousMetrics = useMemo(() => buildMetrics(previousOrders, previousEvents), [previousOrders, previousEvents]);

  const daily = useMemo(() => buildDailySeries(currentOrders, range.start, range.end), [currentOrders, range.start, range.end]);
  const topProducts = useMemo(() => buildTopProducts(currentOrders), [currentOrders]);
  const trafficSources = useMemo(() => buildTrafficSources(currentEvents), [currentEvents]);

  const funnel = useMemo(() => {
    const sessions = currentMetrics.sessions;
    const addToCart = currentMetrics.addToCartSessions;
    const purchase = currentMetrics.purchaseSessions;

    return [
      { label: "الجلسات", value: sessions, percent: 100 },
      { label: "أضافوا للسلة", value: addToCart, percent: sessions ? (addToCart / sessions) * 100 : 0 },
      { label: "أتموا الشراء", value: purchase, percent: sessions ? (purchase / sessions) * 100 : 0 },
    ];
  }, [currentMetrics]);

  const kpis = [
    { title: "إجمالي الإيرادات", value: fmtMoney(currentMetrics.revenue, currency), helper: `${currentMetrics.orders.toLocaleString("en-US")} طلب صالح`, icon: WalletCards, tone: "indigo" as const, delta: percentChange(currentMetrics.revenue, previousMetrics.revenue) },
    { title: "عدد الطلبات", value: currentMetrics.orders.toLocaleString("en-US"), helper: "باستثناء الطلبات الملغاة", icon: ShoppingCart, tone: "blue" as const, delta: percentChange(currentMetrics.orders, previousMetrics.orders) },
    { title: "متوسط قيمة الطلب", value: fmtMoney(currentMetrics.aov, currency), helper: "متوسط الإيراد لكل طلب", icon: BarChart3, tone: "amber" as const, delta: percentChange(currentMetrics.aov, previousMetrics.aov) },
    { title: "عملاء فريدون", value: currentMetrics.customers.toLocaleString("en-US"), helper: "حسب الحساب أو رقم الهاتف", icon: Users, tone: "violet" as const, delta: percentChange(currentMetrics.customers, previousMetrics.customers) },
    { title: "جلسات الزوار", value: currentMetrics.sessions.toLocaleString("en-US"), helper: "جلسات Analytics فريدة", icon: Eye, tone: "teal" as const, delta: percentChange(currentMetrics.sessions, previousMetrics.sessions) },
    { title: "معدل التحويل", value: `${currentMetrics.conversion.toFixed(2)}%`, helper: "جلسات شراء ÷ كل الجلسات", icon: CheckCircle2, tone: "green" as const, delta: percentagePointChange(currentMetrics.conversion, previousMetrics.conversion) },
  ];

  const isLoading = ordersQuery.isLoading || eventsQuery.isLoading;
  const isFetching = ordersQuery.isFetching || eventsQuery.isFetching;
  const error = ordersQuery.error || eventsQuery.error;

  const refresh = async () => {
    await Promise.all([ordersQuery.refetch(), eventsQuery.refetch()]);
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التقارير والتحليلات" title="نظرة عامة والإيرادات" description="ملخص أداء المتجر والمبيعات وسلوك الزوار خلال الفترة المحددة" />

      <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[10px]">
        <div className="flex flex-col gap-[8px] xl:flex-row xl:items-center xl:justify-between">
          <DateControls range={range} setRange={setRange} />

          <div className="flex flex-wrap items-center gap-[7px]">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-[40px] w-[185px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
              <SelectContent>{options.map((option) => <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>)}</SelectContent>
            </Select>

            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={isFetching} className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-white px-[12px] text-[10.5px] font-semibold text-[#68717B] shadow-none">{isFetching ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <RefreshCw className="ml-[5px] h-[11px] w-[11px]" />}تحديث</Button>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-[12px] border border-[#F0D7D4] bg-[#FFF6F5] px-[12px] py-[10px]">
          <p className="text-[10.5px] font-semibold text-[#B75F56]">تعذر تحميل بعض بيانات التقرير</p>
          <p className="mt-[3px] text-[10px] text-[#C47770]">{error instanceof Error ? error.message : "حدث خطأ غير متوقع."}</p>
        </section>
      )}

      {isLoading ? (
        <div className="flex min-h-[430px] items-center justify-center">
          <div className="text-center"><div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div><p className="mt-3 text-[10.5px] font-medium text-[#8D949E]">جاري تجهيز التقرير...</p></div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-[9px] md:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
          </section>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="الإيرادات اليومية" description="حركة الإيرادات وعدد الطلبات خلال الفترة المحددة" icon={TrendingUp} />

              <div className="h-[300px] px-[6px] pb-[10px] pt-[8px] sm:h-[330px] sm:px-[10px]">
                {daily.every((row) => row.revenue === 0 && row.orders === 0) ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={daily} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF1F4" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8E959F" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis yAxisId="money" orientation="right" tick={{ fontSize: 9, fill: "#8E959F" }} tickLine={false} axisLine={false} width={48} />
                      <YAxis yAxisId="orders" orientation="left" tick={{ fontSize: 9, fill: "#A0A6AF" }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                      <Tooltip contentStyle={{ border: "1px solid #E5E9EF", borderRadius: 10, background: "#FFFFFF", fontSize: 10, boxShadow: "0 8px 24px rgba(20,25,35,0.06)" }} labelStyle={{ color: "#59616B", fontWeight: 600, marginBottom: 4 }} formatter={(value: number, name: string) => name === "الإيرادات" ? [fmtMoney(Number(value), currency), name] : [Number(value).toLocaleString("en-US"), name]} />
                      <Line yAxisId="money" type="monotone" dataKey="revenue" name="الإيرادات" stroke="#675CBA" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
                      <Line yAxisId="orders" type="monotone" dataKey="orders" name="الطلبات" stroke="#5680CF" strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-[13px] border-t border-[#EDF0F3] px-[13px] py-[9px]">
                <LegendDot color="#675CBA" label="الإيرادات" />
                <LegendDot color="#5680CF" label="الطلبات" />
                <span className="mr-auto text-[9px] text-[#A0A6AF]">المقارنة في البطاقات مع الفترة السابقة بنفس المدة</span>
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="مسار التحويل" description="من الزيارة حتى إتمام الشراء" icon={Package} />

              <div className="space-y-[14px] p-[13px]">
                {funnel.map((row, index) => (
                  <div key={row.label}>
                    <div className="mb-[6px] flex items-center justify-between gap-[8px]">
                      <div className="flex items-center gap-[7px]"><span className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-[#F1EFFF] text-[9px] font-semibold text-[#675CBA]">{index + 1}</span><span className="text-[10.5px] font-semibold text-[#59616B]">{row.label}</span></div>
                      <div className="text-left"><p className="text-[11px] font-semibold text-[#404751]">{row.value.toLocaleString("en-US")}</p><p className="mt-[1px] text-[8.5px] text-[#9AA2AC]">{row.percent.toFixed(1)}%</p></div>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded-full bg-[#F0F2F5]"><div className="h-full rounded-full bg-[#675CBA]" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} /></div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-[7px] border-t border-[#EDF0F3] pt-[11px]">
                  <MiniStat label="إضافة للسلة" value={currentMetrics.sessions ? `${((currentMetrics.addToCartSessions / currentMetrics.sessions) * 100).toFixed(2)}%` : "0.00%"} />
                  <MiniStat label="تحويل للشراء" value={`${currentMetrics.conversion.toFixed(2)}%`} />
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="أفضل المنتجات مبيعًا" description="صافي قيمة المنتجات بعد توزيع خصم الطلب، بدون رسوم التوصيل" icon={ShoppingCart} />

              {topProducts.length === 0 ? (
                <SmallEmpty text="لا توجد مبيعات منتجات خلال هذه الفترة." />
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[560px]">
                      <thead><tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9.5px] font-semibold text-[#858D97]"><th className="w-[46px] px-[12px] text-center">#</th><th className="px-[12px] text-right">المنتج</th><th className="px-[12px] text-right">الكمية</th><th className="px-[12px] text-right">الإيراد</th></tr></thead>
                      <tbody>
                        {topProducts.map((product, index) => (
                          <tr key={product.key} className="h-[54px] border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FCFDFE]">
                            <td className="px-[12px] text-center"><span className="inline-flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-[#F4F2FF] text-[9px] font-semibold text-[#675CBA]">{index + 1}</span></td>
                            <td className="max-w-[280px] px-[12px]"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{product.name}</p></td>
                            <td className="px-[12px] text-[10px] font-semibold text-[#69717B]">{product.qty.toLocaleString("en-US")}</td>
                            <td className="px-[12px] text-[10px] font-semibold text-[#59616B]">{fmtMoney(product.revenue, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-[7px] p-[8px] sm:hidden">
                    {topProducts.map((product, index) => (
                      <div key={product.key} className="rounded-[10px] border border-[#E8EBEF] bg-white p-[9px]">
                        <div className="flex items-start gap-[8px]"><span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[#F4F2FF] text-[9px] font-semibold text-[#675CBA]">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{product.name}</p><div className="mt-[5px] flex items-center justify-between gap-[8px] text-[9.5px] text-[#8D959F]"><span>{product.qty.toLocaleString("en-US")} قطعة</span><span className="font-semibold text-[#59616B]">{fmtMoney(product.revenue, currency)}</span></div></div></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="مصادر الزيارات" description="جلسات فريدة حسب مصدر UTM مع سلوك السلة والشراء" icon={Users} />

              {trafficSources.length === 0 ? (
                <SmallEmpty text="لا توجد بيانات مصادر زيارات خلال هذه الفترة." />
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[620px]">
                      <thead><tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9.5px] font-semibold text-[#858D97]"><th className="px-[12px] text-right">المصدر</th><th className="px-[12px] text-right">الجلسات</th><th className="px-[12px] text-right">أضافوا للسلة</th><th className="px-[12px] text-right">شراء</th><th className="px-[12px] text-right">التحويل</th></tr></thead>
                      <tbody>
                        {trafficSources.map((source) => (
                          <tr key={source.source} className="h-[54px] border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FCFDFE]">
                            <td className="px-[12px]"><SourceBadge source={source.source} /></td>
                            <td className="px-[12px] text-[10px] font-semibold text-[#59616B]">{source.sessions.toLocaleString("en-US")}</td>
                            <td className="px-[12px] text-[10px] text-[#69717B]">{source.addToCart.toLocaleString("en-US")}</td>
                            <td className="px-[12px] text-[10px] text-[#69717B]">{source.purchases.toLocaleString("en-US")}</td>
                            <td className="px-[12px]"><span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#D8E8DD] bg-[#EFF8F2] px-[7px] text-[9px] font-semibold text-[#568468]">{source.conversion.toFixed(2)}%</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-[7px] p-[8px] sm:hidden">
                    {trafficSources.map((source) => (
                      <div key={source.source} className="rounded-[10px] border border-[#E8EBEF] bg-white p-[9px]">
                        <div className="flex items-center justify-between gap-[8px]"><SourceBadge source={source.source} /><span className="text-[9px] font-semibold text-[#568468]">{source.conversion.toFixed(2)}%</span></div>
                        <div className="mt-[7px] grid grid-cols-3 gap-[5px]"><MiniStat label="جلسات" value={source.sessions.toLocaleString("en-US")} /><MiniStat label="سلة" value={source.addToCart.toLocaleString("en-US")} /><MiniStat label="شراء" value={source.purchases.toLocaleString("en-US")} /></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

const DateControls = ({ range, setRange }: { range: { start: string; end: string }; setRange: (range: { start: string; end: string }) => void }) => {
  const today = toDateInput(new Date());

  const applyPreset = (days: number) => {
    setRange({
      start: toDateInput(subDays(new Date(), days - 1)),
      end: today,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      <div className="flex h-[40px] items-center gap-[7px] rounded-[9px] border border-[#E3E7EC] bg-[#F8FAFC] px-[10px]">
        <CalendarDays className="h-[12px] w-[12px] text-[#675CBA]" />
        <input type="date" value={range.start} onChange={(event) => setRange({ start: event.target.value || range.start, end: range.end })} className="w-[116px] bg-transparent text-[10px] text-[#59616B] outline-none" />
        <span className="text-[9px] text-[#B0B6BD]">إلى</span>
        <input type="date" value={range.end} max={today} onChange={(event) => setRange({ start: range.start, end: event.target.value || range.end })} className="w-[116px] bg-transparent text-[10px] text-[#59616B] outline-none" />
      </div>

      <div className="flex items-center rounded-[9px] border border-[#E3E7EC] bg-white p-[3px]">
        {[7, 30, 90].map((days) => <button key={days} type="button" onClick={() => applyPreset(days)} className="h-[32px] rounded-[7px] px-[9px] text-[9.5px] font-semibold text-[#7A828C] transition-colors hover:bg-[#F4F2FF] hover:text-[#675CBA]">{days} يوم</button>)}
      </div>
    </div>
  );
};

const KpiCard = ({ title, value, helper, icon: Icon, tone, delta }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "blue" | "amber" | "violet" | "teal" | "green"; delta: { value: number; label: string; positive: boolean; neutral: boolean } }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    amber: { icon: "bg-[#FFF5E6] text-[#C38838]", line: "bg-[#C38838]" },
    violet: { icon: "bg-[#F4ECFF] text-[#8F63C1]", line: "bg-[#8F63C1]" },
    teal: { icon: "bg-[#EAF8F4] text-[#4C9687]", line: "bg-[#4C9687]" },
    green: { icon: "bg-[#ECF7EC] text-[#629067]", line: "bg-[#629067]" },
  }[tone];

  return (
    <article className="relative min-h-[138px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />
      <div className="flex items-start justify-between gap-[6px]">
        <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div>
        <DeltaBadge delta={delta} />
      </div>
      <p className="mt-[11px] text-[10px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[16px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[7px] truncate text-[9px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const DeltaBadge = ({ delta }: { delta: { value: number; label: string; positive: boolean; neutral: boolean } }) => {
  if (delta.neutral) return <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#E5E8EC] bg-[#F7F8FA] px-[6px] text-[8.5px] font-semibold text-[#9299A3]">—</span>;

  return <span className={cn("inline-flex h-[24px] items-center gap-[3px] rounded-[7px] border px-[6px] text-[8.5px] font-semibold", delta.positive ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]")}>{delta.positive ? <TrendingUp className="h-[8px] w-[8px]" /> : <TrendingDown className="h-[8px] w-[8px]" />}{delta.label}</span>;
};

const SectionHeader = ({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) => <div className="flex items-center gap-[8px] border-b border-[#EDF0F3] px-[13px] py-[11px]"><div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[12px] w-[12px]" /></div><div><h2 className="text-[11.5px] font-semibold text-[#4A525C]">{title}</h2><p className="mt-[2px] text-[9px] text-[#9AA2AC]">{description}</p></div></div>;

const LegendDot = ({ color, label }: { color: string; label: string }) => <span className="inline-flex items-center gap-[5px] text-[9px] font-medium text-[#7E8690]"><span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />{label}</span>;

const MiniStat = ({ label, value }: { label: string; value: string }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[8.5px] text-[#9AA2AC]">{label}</p><p className="mt-[3px] truncate text-[10px] font-semibold text-[#59616B]">{value}</p></div>;

const SourceBadge = ({ source }: { source: string }) => <span className="inline-flex h-[25px] max-w-[180px] items-center rounded-[7px] border border-[#E2DEF3] bg-[#F8F7FF] px-[7px] text-[9px] font-semibold text-[#675CBA]"><span className="truncate">{formatSource(source)}</span></span>;

const SmallEmpty = ({ text }: { text: string }) => <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center"><Package className="h-[20px] w-[20px] text-[#B0B6BD]" /><p className="mt-2 text-[10px] text-[#9199A3]">{text}</p></div>;

const ChartEmpty = () => <div className="flex h-full flex-col items-center justify-center text-center"><BarChart3 className="h-[22px] w-[22px] text-[#B0B6BD]" /><p className="mt-2 text-[10px] text-[#9199A3]">لا توجد بيانات مبيعات خلال هذه الفترة.</p></div>;

function buildMetrics(orders: OrderRow[], events: AnalyticsEvent[]): Metrics {
  const revenue = orders.reduce((sum, order) => sum + orderTotalBase(order), 0);
  const orderCount = orders.length;
  const customers = new Set(orders.map((order) => String(order.customer_id || order.customer_phone || "").trim()).filter(Boolean)).size;

  const sessionIds = new Set(events.map((event) => String(event.session_id || "").trim()).filter(Boolean));
  const addToCartSessions = new Set(events.filter((event) => event.event_type === "add_to_cart").map((event) => String(event.session_id || "").trim()).filter(Boolean)).size;
  const purchaseSessions = new Set(events.filter((event) => event.event_type === "purchase").map((event) => String(event.session_id || "").trim()).filter(Boolean)).size;

  const sessions = sessionIds.size;
  const conversion = sessions ? (purchaseSessions / sessions) * 100 : 0;

  return {
    revenue,
    orders: orderCount,
    aov: orderCount ? revenue / orderCount : 0,
    customers,
    sessions,
    conversion,
    addToCartSessions,
    purchaseSessions,
  };
}

function buildDailySeries(orders: OrderRow[], start: string, end: string): DailyRow[] {
  const map = new Map<string, { revenue: number; orders: number }>();

  for (const order of orders) {
    const key = toLocalDateKey(new Date(order.created_at));
    const current = map.get(key) || { revenue: 0, orders: 0 };
    current.revenue += orderTotalBase(order);
    current.orders += 1;
    map.set(key, current);
  }

  const result: DailyRow[] = [];
  let cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);

  while (cursor <= last) {
    const key = toDateInput(cursor);
    const row = map.get(key) || { revenue: 0, orders: 0 };

    result.push({
      day: key,
      label: new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short" }).format(cursor),
      revenue: row.revenue,
      orders: row.orders,
    });

    cursor = addDays(cursor, 1);
  }

  return result;
}

function buildTopProducts(orders: OrderRow[]): TopProduct[] {
  const map = new Map<string, TopProduct>();

  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];
    const nativeOrderTotal = Number(order.total || 0);
    const baseOrderTotal = orderTotalBase(order);
    const currencyFactor = nativeOrderTotal > 0 ? baseOrderTotal / nativeOrderTotal : 1;
    const subtotal = Number(order.subtotal || 0);
    const discount = Math.max(0, Number(order.discount_amount || 0));
    const discountFactor = subtotal > 0 ? Math.max(0, Math.min(1, (subtotal - discount) / subtotal)) : 1;

    for (const item of items) {
      const qty = Math.max(0, Number(item.quantity || 0));
      const price = Math.max(0, Number(item.price || 0));
      if (!qty) continue;

      const key = String(item.product_id || item.product_name || "unknown");
      const current = map.get(key) || {
        key,
        name: String(item.product_name || "منتج غير معروف"),
        qty: 0,
        revenue: 0,
      };

      current.qty += qty;
      current.revenue += qty * price * currencyFactor * discountFactor;
      map.set(key, current);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}

function buildTrafficSources(events: AnalyticsEvent[]): TrafficSource[] {
  const sessions = new Map<string, { source: string; firstAt: number; hasAddToCart: boolean; hasPurchase: boolean }>();

  for (const event of events) {
    const sessionId = String(event.session_id || "").trim();
    if (!sessionId) continue;

    const timestamp = new Date(event.created_at).getTime();
    const source = String(event.utm_source || "").trim();
    const existing = sessions.get(sessionId);

    if (!existing) {
      sessions.set(sessionId, {
        source: source || "direct",
        firstAt: timestamp,
        hasAddToCart: event.event_type === "add_to_cart",
        hasPurchase: event.event_type === "purchase",
      });
      continue;
    }

    if (source && (existing.source === "direct" || timestamp < existing.firstAt)) {
      existing.source = source;
      existing.firstAt = Math.min(existing.firstAt, timestamp);
    }

    if (event.event_type === "add_to_cart") existing.hasAddToCart = true;
    if (event.event_type === "purchase") existing.hasPurchase = true;
  }

  const sources = new Map<string, { sessions: number; addToCart: number; purchases: number }>();

  for (const session of sessions.values()) {
    const key = session.source || "direct";
    const current = sources.get(key) || { sessions: 0, addToCart: 0, purchases: 0 };

    current.sessions += 1;
    if (session.hasAddToCart) current.addToCart += 1;
    if (session.hasPurchase) current.purchases += 1;

    sources.set(key, current);
  }

  return Array.from(sources.entries()).map(([source, values]) => ({
    source,
    ...values,
    conversion: values.sessions ? (values.purchases / values.sessions) * 100 : 0,
  })).sort((a, b) => b.sessions - a.sessions).slice(0, 10);
}

function percentChange(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return { value: 0, label: "—", positive: true, neutral: true };
    return { value: 100, label: "+100%", positive: true, neutral: false };
  }

  const value = ((current - previous) / Math.abs(previous)) * 100;

  return {
    value,
    label: `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`,
    positive: value >= 0,
    neutral: Math.abs(value) < 0.05,
  };
}

function percentagePointChange(current: number, previous: number) {
  if (current === 0 && previous === 0) return { value: 0, label: "—", positive: true, neutral: true };

  const value = current - previous;

  return {
    value,
    label: `${value >= 0 ? "+" : ""}${value.toFixed(2)} ن`,
    positive: value >= 0,
    neutral: Math.abs(value) < 0.005,
  };
}

function startOfLocalDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateKey(date: Date) {
  return toDateInput(date);
}

function formatSource(source: string) {
  const value = String(source || "direct").trim();
  if (!value || value === "direct") return "مباشر";
  if (value.toLowerCase() === "facebook") return "Facebook";
  if (value.toLowerCase() === "instagram") return "Instagram";
  if (value.toLowerCase() === "google") return "Google";
  if (value.toLowerCase() === "tiktok") return "TikTok";
  if (value.toLowerCase() === "whatsapp") return "WhatsApp";
  return value;
}