import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDateRange } from "@/lib/analytics/dateRange";
import { currencyOptions, fmtMoney, orderTotalBase } from "./reportHelpers";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarDays, CheckCircle2, CircleDollarSign, Loader2, Package, ReceiptText, RefreshCw, RotateCcw, TrendingDown, TrendingUp, WalletCards, type LucideIcon } from "lucide-react";
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
  exchange_rate_snapshot: number | null;
  currency_code: string | null;
  created_at: string;
  status: string;
  items: OrderItem[] | unknown;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number;
  amount_base: number | null;
  currency_code: string | null;
  description: string;
  vendor: string | null;
  category_id: string | null;
  created_at: string;
  expense_categories?: { name_ar: string | null; name: string | null } | null;
};

type RefundRow = {
  id: string;
  refund_number: string;
  amount: number;
  amount_base: number | null;
  currency_code: string | null;
  status: string;
  processed_at: string | null;
  created_at: string;
};

type ProductRow = {
  id: string;
  cost_price: number | null;
  price: number;
};

type FinanceMetrics = {
  grossRevenue: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  discounts: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  expenseRatio: number;
  orderCount: number;
  costCoverage: number;
};

type DailyFinance = {
  day: string;
  label: string;
  revenue: number;
  cost: number;
  expenses: number;
  refunds: number;
  netProfit: number;
};

type CurrencySummary = {
  code: string;
  orders: number;
  nativeRevenue: number;
  baseRevenue: number;
};

const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

export default function ReportsFinancePage() {
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
      previousStartKey: toDateInput(previousStart),
      currentStartKey: range.start,
      currentEndKey: range.end,
      currentStartISO: currentStart.toISOString(),
      currentEndExclusiveISO: currentEndExclusive.toISOString(),
      previousStartISO: previousStart.toISOString(),
    };
  }, [range.start, range.end]);

  const ordersQuery = useQuery({
    queryKey: ["reports-finance-orders-v2", period.previousStartISO, period.currentEndExclusiveISO],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id,total,total_base,subtotal,delivery_fee,discount_amount,exchange_rate_snapshot,currency_code,created_at,status,items").gte("created_at", period.previousStartISO).lt("created_at", period.currentEndExclusiveISO).order("created_at", { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        total: Number(row.total || 0),
        total_base: row.total_base == null ? null : Number(row.total_base),
        subtotal: Number(row.subtotal || 0),
        delivery_fee: Number(row.delivery_fee || 0),
        discount_amount: row.discount_amount == null ? null : Number(row.discount_amount),
        exchange_rate_snapshot: row.exchange_rate_snapshot == null ? null : Number(row.exchange_rate_snapshot),
      })) as OrderRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const expensesQuery = useQuery({
    queryKey: ["reports-finance-expenses-v2", period.previousStartKey, period.currentEndKey],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("expenses").select("id,expense_date,amount,amount_base,currency_code,description,vendor,category_id,created_at,expense_categories!expenses_category_id_fkey(name_ar,name)").gte("expense_date", period.previousStartKey).lte("expense_date", period.currentEndKey).order("expense_date", { ascending: false }).order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        amount: Number(row.amount || 0),
        amount_base: row.amount_base == null ? null : Number(row.amount_base),
        expense_categories: Array.isArray(row.expense_categories) ? row.expense_categories[0] || null : row.expense_categories || null,
      })) as ExpenseRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const refundsQuery = useQuery({
    queryKey: ["reports-finance-refunds-v2", period.previousStartISO, period.currentEndExclusiveISO],
    queryFn: async () => {
      const [processedResult, fallbackResult] = await Promise.all([
        (supabase as any).from("refunds").select("id,refund_number,amount,amount_base,currency_code,status,processed_at,created_at").eq("status", "completed").gte("processed_at", period.previousStartISO).lt("processed_at", period.currentEndExclusiveISO),
        (supabase as any).from("refunds").select("id,refund_number,amount,amount_base,currency_code,status,processed_at,created_at").eq("status", "completed").is("processed_at", null).gte("created_at", period.previousStartISO).lt("created_at", period.currentEndExclusiveISO),
      ]);

      if (processedResult.error) throw processedResult.error;
      if (fallbackResult.error) throw fallbackResult.error;

      const merged = [...(processedResult.data || []), ...(fallbackResult.data || [])];
      const unique = Array.from(new Map(merged.map((row: any) => [row.id, row])).values());

      return unique.map((row: any) => ({
        ...row,
        amount: Number(row.amount || 0),
        amount_base: row.amount_base == null ? null : Number(row.amount_base),
      })) as RefundRow[];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const productsQuery = useQuery({
    queryKey: ["reports-finance-products-cost-v2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("products").select("id,price,product_costs(cost_price)");

      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        cost_price: Number(Array.isArray(row.product_costs) ? row.product_costs[0]?.cost_price || 0 : row.product_costs?.cost_price || 0),
        price: Number(row.price || 0),
      })) as ProductRow[];
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const orders = ordersQuery.data || [];
  const expenses = expensesQuery.data || [];
  const refunds = refundsQuery.data || [];
  const products = productsQuery.data || [];

  const costMap = useMemo(() => {
    const map = new Map<string, number>();

    products.forEach((product) => {
      map.set(product.id, Math.max(0, Number(product.cost_price || 0)));
    });

    return map;
  }, [products]);

  const currentOrders = useMemo(() => orders.filter((order) => new Date(order.created_at) >= period.currentStart && !CANCELLED_STATUSES.has(String(order.status || "").toLowerCase())), [orders, period.currentStart]);
  const previousOrders = useMemo(() => orders.filter((order) => new Date(order.created_at) < period.currentStart && !CANCELLED_STATUSES.has(String(order.status || "").toLowerCase())), [orders, period.currentStart]);

  const currentExpenses = useMemo(() => expenses.filter((expense) => expense.expense_date >= period.currentStartKey), [expenses, period.currentStartKey]);
  const previousExpenses = useMemo(() => expenses.filter((expense) => expense.expense_date < period.currentStartKey), [expenses, period.currentStartKey]);

  const currentRefunds = useMemo(() => refunds.filter((refund) => financialRefundDate(refund) >= period.currentStart), [refunds, period.currentStart]);
  const previousRefunds = useMemo(() => refunds.filter((refund) => financialRefundDate(refund) < period.currentStart), [refunds, period.currentStart]);

  const currentMetrics = useMemo(() => buildFinanceMetrics(currentOrders, currentExpenses, currentRefunds, costMap), [currentOrders, currentExpenses, currentRefunds, costMap]);
  const previousMetrics = useMemo(() => buildFinanceMetrics(previousOrders, previousExpenses, previousRefunds, costMap), [previousOrders, previousExpenses, previousRefunds, costMap]);

  const daily = useMemo(() => buildDailyFinance(currentOrders, currentExpenses, currentRefunds, costMap, range.start, range.end), [currentOrders, currentExpenses, currentRefunds, costMap, range.start, range.end]);
  const byCurrency = useMemo(() => buildCurrencySummary(currentOrders), [currentOrders]);
  const latestExpenses = useMemo(() => [...currentExpenses].sort((a, b) => `${b.expense_date}-${b.created_at}`.localeCompare(`${a.expense_date}-${a.created_at}`)).slice(0, 10), [currentExpenses]);

  const kpis = [
    { title: "إجمالي إيرادات الطلبات", value: fmtMoney(currentMetrics.grossRevenue, currency), helper: `${currentMetrics.orderCount.toLocaleString("en-US")} طلب غير ملغى`, icon: CircleDollarSign, tone: "indigo" as const, delta: percentChange(currentMetrics.grossRevenue, previousMetrics.grossRevenue) },
    { title: "تكلفة البضاعة", value: fmtMoney(currentMetrics.cogs, currency), helper: `تغطية تكلفة ${currentMetrics.costCoverage.toFixed(0)}%`, icon: Package, tone: "amber" as const, delta: inversePercentChange(currentMetrics.cogs, previousMetrics.cogs) },
    { title: "المرتجعات المكتملة", value: fmtMoney(currentMetrics.refunds, currency), helper: "تُخصم من صافي الإيراد", icon: RotateCcw, tone: "rose" as const, delta: inversePercentChange(currentMetrics.refunds, previousMetrics.refunds) },
    { title: "الربح الإجمالي", value: fmtMoney(currentMetrics.grossProfit, currency), helper: `${currentMetrics.grossMargin.toFixed(1)}% هامش إجمالي`, icon: TrendingUp, tone: currentMetrics.grossProfit >= 0 ? "green" as const : "red" as const, delta: percentChange(currentMetrics.grossProfit, previousMetrics.grossProfit) },
    { title: "المصروفات", value: fmtMoney(currentMetrics.expenses, currency), helper: `${currentMetrics.expenseRatio.toFixed(1)}% من صافي الإيراد`, icon: ReceiptText, tone: "violet" as const, delta: inversePercentChange(currentMetrics.expenses, previousMetrics.expenses) },
    { title: "صافي الربح", value: fmtMoney(currentMetrics.netProfit, currency), helper: `${currentMetrics.netMargin.toFixed(1)}% هامش صافي`, icon: WalletCards, tone: currentMetrics.netProfit >= 0 ? "green" as const : "red" as const, delta: percentChange(currentMetrics.netProfit, previousMetrics.netProfit) },
  ];

  const isLoading = ordersQuery.isLoading || expensesQuery.isLoading || refundsQuery.isLoading || productsQuery.isLoading;
  const isFetching = ordersQuery.isFetching || expensesQuery.isFetching || refundsQuery.isFetching || productsQuery.isFetching;
  const queryError = ordersQuery.error || expensesQuery.error || refundsQuery.error || productsQuery.error;

  const refresh = async () => {
    await Promise.all([ordersQuery.refetch(), expensesQuery.refetch(), refundsQuery.refetch(), productsQuery.refetch()]);
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التقارير والتحليلات" title="الأرباح والمالية" description="تحليل الإيرادات والتكاليف والمصروفات والمرتجعات وصافي الربح" />

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

      <section className="rounded-[12px] border border-[#EEDFC4] bg-[#FFFAF1] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <Package className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#A9782F]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#8B6A35]">تكلفة البضاعة تقديرية</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#9D8052]">تعتمد على cost_price الحالي للمنتج لأن الطلبات الحالية لا تحفظ تكلفة المنتج التاريخية داخل Snapshot الطلب. الخصومات لا تُطرح مرة ثانية من الربح لأن إجمالي الطلب النهائي يتضمنها أصلًا.</p>
          </div>
        </div>
      </section>

      {queryError && (
        <section className="rounded-[12px] border border-[#F0D7D4] bg-[#FFF6F5] px-[12px] py-[10px]">
          <p className="text-[10.5px] font-semibold text-[#B75F56]">تعذر تحميل بعض بيانات التقرير</p>
          <p className="mt-[3px] text-[10px] text-[#C47770]">{queryError instanceof Error ? queryError.message : "حدث خطأ غير متوقع."}</p>
        </section>
      )}

      {isLoading ? (
        <div className="flex min-h-[430px] items-center justify-center">
          <div className="text-center"><div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div><p className="mt-3 text-[10.5px] font-medium text-[#8D949E]">جاري تجهيز التقرير المالي...</p></div>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-[9px] md:grid-cols-3 xl:grid-cols-6">
            {kpis.map((kpi) => <KpiCard key={kpi.title} {...kpi} />)}
          </section>

          <section className="grid grid-cols-2 gap-[8px] md:grid-cols-4">
            <MiniMetric label="صافي الإيراد بعد المرتجعات" value={fmtMoney(currentMetrics.netRevenue, currency)} />
            <MiniMetric label="الخصومات المسجلة" value={fmtMoney(currentMetrics.discounts, currency)} helper="معلومة فقط — ليست خصمًا إضافيًا من الربح" />
            <MiniMetric label="الهامش الإجمالي" value={`${currentMetrics.grossMargin.toFixed(2)}%`} />
            <MiniMetric label="الهامش الصافي" value={`${currentMetrics.netMargin.toFixed(2)}%`} />
          </section>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.65fr)]">
            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="الإيراد والتكلفة وصافي الربح يوميًا" description="مقارنة الحركة المالية اليومية داخل الفترة المحددة" icon={TrendingUp} />

              <div className="h-[310px] px-[6px] pb-[10px] pt-[8px] sm:h-[340px] sm:px-[10px]">
                {daily.every((row) => row.revenue === 0 && row.cost === 0 && row.expenses === 0 && row.netProfit === 0) ? (
                  <ChartEmpty />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 10, right: 4, left: 0, bottom: 0 }} barGap={2}>
                      <CartesianGrid vertical={false} stroke="#EEF1F4" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#8E959F" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis orientation="right" tick={{ fontSize: 9, fill: "#8E959F" }} tickLine={false} axisLine={false} width={50} />
                      <Tooltip contentStyle={{ border: "1px solid #E5E9EF", borderRadius: 10, background: "#FFFFFF", fontSize: 10, boxShadow: "0 8px 24px rgba(20,25,35,0.06)" }} labelStyle={{ color: "#59616B", fontWeight: 600, marginBottom: 4 }} formatter={(value: number, name: string) => [fmtMoney(Number(value), currency), name]} />
                      <Bar dataKey="revenue" name="الإيراد" fill="#675CBA" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="cost" name="تكلفة البضاعة" fill="#C38838" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="expenses" name="المصروفات" fill="#8F63C1" radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="netProfit" name="صافي الربح" fill="#629067" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-[13px] border-t border-[#EDF0F3] px-[13px] py-[9px]">
                <LegendDot color="#675CBA" label="الإيراد" />
                <LegendDot color="#C38838" label="تكلفة البضاعة" />
                <LegendDot color="#8F63C1" label="المصروفات" />
                <LegendDot color="#629067" label="صافي الربح" />
              </div>
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="ملخص الربحية" description="كيف انتقل الإيراد إلى صافي الربح" icon={WalletCards} />

              <div className="space-y-[9px] p-[12px]">
                <FlowRow label="إيرادات الطلبات" value={currentMetrics.grossRevenue} currency={currency} tone="normal" />
                <FlowRow label="المرتجعات المكتملة" value={currentMetrics.refunds} currency={currency} tone="minus" />
                <FlowDivider />
                <FlowRow label="صافي الإيراد" value={currentMetrics.netRevenue} currency={currency} tone="strong" />
                <FlowRow label="تكلفة البضاعة" value={currentMetrics.cogs} currency={currency} tone="minus" />
                <FlowDivider />
                <FlowRow label="الربح الإجمالي" value={currentMetrics.grossProfit} currency={currency} tone="strong" />
                <FlowRow label="المصروفات" value={currentMetrics.expenses} currency={currency} tone="minus" />
                <FlowDivider />
                <FlowRow label="صافي الربح" value={currentMetrics.netProfit} currency={currency} tone={currentMetrics.netProfit >= 0 ? "positive" : "negative"} />

                <div className="grid grid-cols-2 gap-[6px] pt-[4px]">
                  <MiniStat label="هامش إجمالي" value={`${currentMetrics.grossMargin.toFixed(1)}%`} />
                  <MiniStat label="هامش صافي" value={`${currentMetrics.netMargin.toFixed(1)}%`} />
                </div>
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-2">
            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="الإيرادات حسب عملة الطلب" description="القيمة الأصلية للطلب والقيمة المحولة لعملة التقرير" icon={CircleDollarSign} />

              {byCurrency.length === 0 ? (
                <SmallEmpty text="لا توجد إيرادات خلال هذه الفترة." />
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[620px]">
                      <thead><tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9.5px] font-semibold text-[#858D97]"><th className="px-[12px] text-right">العملة</th><th className="px-[12px] text-right">الطلبات</th><th className="px-[12px] text-right">القيمة الأصلية</th><th className="px-[12px] text-right">بعملة التقرير</th></tr></thead>
                      <tbody>
                        {byCurrency.map((row) => (
                          <tr key={row.code} className="h-[54px] border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FCFDFE]">
                            <td className="px-[12px]"><CurrencyBadge code={row.code} /></td>
                            <td className="px-[12px] text-[10px] font-semibold text-[#59616B]">{row.orders.toLocaleString("en-US")}</td>
                            <td className="px-[12px] text-[10px] text-[#69717B]">{formatNativeAmount(row.nativeRevenue, row.code)}</td>
                            <td className="px-[12px] text-[10px] font-semibold text-[#59616B]">{fmtMoney(row.baseRevenue, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-[7px] p-[8px] sm:hidden">
                    {byCurrency.map((row) => (
                      <div key={row.code} className="rounded-[10px] border border-[#E8EBEF] bg-white p-[9px]">
                        <div className="flex items-center justify-between gap-[8px]"><CurrencyBadge code={row.code} /><span className="text-[9px] text-[#8D959F]">{row.orders.toLocaleString("en-US")} طلب</span></div>
                        <div className="mt-[7px] grid grid-cols-2 gap-[5px]"><MiniStat label="القيمة الأصلية" value={formatNativeAmount(row.nativeRevenue, row.code)} /><MiniStat label="بعملة التقرير" value={fmtMoney(row.baseRevenue, currency)} /></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
              <SectionHeader title="أحدث المصروفات" description="أحدث 10 مصروفات ضمن الفترة الحالية" icon={ReceiptText} />

              {latestExpenses.length === 0 ? (
                <SmallEmpty text="لا توجد مصروفات خلال هذه الفترة." />
              ) : (
                <>
                  <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full min-w-[650px]">
                      <thead><tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[9.5px] font-semibold text-[#858D97]"><th className="px-[12px] text-right">المصروف</th><th className="px-[12px] text-right">الفئة</th><th className="px-[12px] text-right">المبلغ</th><th className="px-[12px] text-right">التاريخ</th></tr></thead>
                      <tbody>
                        {latestExpenses.map((expense) => (
                          <tr key={expense.id} className="h-[58px] border-b border-[#F0F2F5] last:border-b-0 hover:bg-[#FCFDFE]">
                            <td className="max-w-[230px] px-[12px]"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{expense.description || "مصروف"}</p>{expense.vendor && <p className="mt-[2px] truncate text-[9px] text-[#9AA2AC]">{expense.vendor}</p>}</td>
                            <td className="px-[12px]"><span className="text-[9.5px] text-[#69717B]">{expenseCategoryName(expense)}</span></td>
                            <td className="px-[12px]"><p className="text-[10px] font-semibold text-[#59616B]">{fmtMoney(expenseBase(expense), currency)}</p><p dir="ltr" className="mt-[2px] text-right text-[8.5px] text-[#A0A6AF]">{formatNativeAmount(expense.amount, expense.currency_code || "SAR")}</p></td>
                            <td className="px-[12px] text-[9.5px] text-[#7E8690]">{formatDate(expense.expense_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-[7px] p-[8px] sm:hidden">
                    {latestExpenses.map((expense) => (
                      <div key={expense.id} className="rounded-[10px] border border-[#E8EBEF] bg-white p-[9px]">
                        <div className="flex items-start justify-between gap-[8px]"><div className="min-w-0"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{expense.description || "مصروف"}</p><p className="mt-[3px] text-[9px] text-[#9AA2AC]">{expenseCategoryName(expense)}</p></div><span className="shrink-0 text-[10px] font-semibold text-[#59616B]">{fmtMoney(expenseBase(expense), currency)}</span></div>
                        <div className="mt-[7px] flex items-center justify-between text-[9px] text-[#9AA2AC]"><span>{formatDate(expense.expense_date)}</span><span dir="ltr">{formatNativeAmount(expense.amount, expense.currency_code || "SAR")}</span></div>
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
    setRange({ start: toDateInput(subDays(new Date(), days - 1)), end: today });
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

const KpiCard = ({ title, value, helper, icon: Icon, tone, delta }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "amber" | "rose" | "violet" | "green" | "red"; delta: DeltaValue }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    amber: { icon: "bg-[#FFF5E6] text-[#C38838]", line: "bg-[#C38838]" },
    rose: { icon: "bg-[#FFF0F4] text-[#C66A7F]", line: "bg-[#C66A7F]" },
    violet: { icon: "bg-[#F4ECFF] text-[#8F63C1]", line: "bg-[#8F63C1]" },
    green: { icon: "bg-[#ECF7EC] text-[#629067]", line: "bg-[#629067]" },
    red: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[138px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />
      <div className="flex items-start justify-between gap-[6px]"><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><DeltaBadge delta={delta} /></div>
      <p className="mt-[11px] text-[10px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[15px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[7px] truncate text-[9px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

type DeltaValue = { value: number; label: string; positive: boolean; neutral: boolean };

const DeltaBadge = ({ delta }: { delta: DeltaValue }) => {
  if (delta.neutral) return <span className="inline-flex h-[24px] items-center rounded-[7px] border border-[#E5E8EC] bg-[#F7F8FA] px-[6px] text-[8.5px] font-semibold text-[#9299A3]">—</span>;

  return <span className={cn("inline-flex h-[24px] items-center gap-[3px] rounded-[7px] border px-[6px] text-[8.5px] font-semibold", delta.positive ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]")}>{delta.positive ? <TrendingUp className="h-[8px] w-[8px]" /> : <TrendingDown className="h-[8px] w-[8px]" />}{delta.label}</span>;
};

const MiniMetric = ({ label, value, helper }: { label: string; value: string; helper?: string }) => <article className="rounded-[12px] border border-[#E5E9EF] bg-white p-[10px]"><p className="text-[9px] text-[#969EA8]">{label}</p><p className="mt-[4px] truncate text-[11px] font-semibold text-[#4C545E]">{value}</p>{helper && <p className="mt-[4px] line-clamp-1 text-[8.5px] text-[#A4AAB2]">{helper}</p>}</article>;

const SectionHeader = ({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) => <div className="flex items-center gap-[8px] border-b border-[#EDF0F3] px-[13px] py-[11px]"><div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[12px] w-[12px]" /></div><div><h2 className="text-[11.5px] font-semibold text-[#4A525C]">{title}</h2><p className="mt-[2px] text-[9px] text-[#9AA2AC]">{description}</p></div></div>;

const LegendDot = ({ color, label }: { color: string; label: string }) => <span className="inline-flex items-center gap-[5px] text-[9px] font-medium text-[#7E8690]"><span className="h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />{label}</span>;

const FlowRow = ({ label, value, currency, tone }: { label: string; value: number; currency: string; tone: "normal" | "minus" | "strong" | "positive" | "negative" }) => <div className="flex items-center justify-between gap-[10px]"><span className={cn("text-[10px]", tone === "strong" || tone === "positive" || tone === "negative" ? "font-semibold text-[#4A525C]" : "text-[#7E8690]")}>{label}</span><span className={cn("text-[10.5px] font-semibold", tone === "minus" ? "text-[#B86B61]" : tone === "positive" ? "text-[#568468]" : tone === "negative" ? "text-[#C15F56]" : "text-[#59616B]")}>{tone === "minus" && value > 0 ? "− " : ""}{fmtMoney(Math.abs(value), currency)}</span></div>;

const FlowDivider = () => <div className="border-t border-dashed border-[#E6E9EE]" />;

const MiniStat = ({ label, value }: { label: string; value: string }) => <div className="rounded-[9px] bg-[#F8FAFC] p-[8px]"><p className="text-[8.5px] text-[#9AA2AC]">{label}</p><p className="mt-[3px] truncate text-[10px] font-semibold text-[#59616B]">{value}</p></div>;

const CurrencyBadge = ({ code }: { code: string }) => <span className="inline-flex h-[26px] items-center rounded-[7px] border border-[#E2DEF3] bg-[#F8F7FF] px-[8px] text-[9px] font-semibold text-[#675CBA]">{currencyLabel(code)}</span>;

const SmallEmpty = ({ text }: { text: string }) => <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center"><ReceiptText className="h-[20px] w-[20px] text-[#B0B6BD]" /><p className="mt-2 text-[10px] text-[#9199A3]">{text}</p></div>;

const ChartEmpty = () => <div className="flex h-full flex-col items-center justify-center text-center"><WalletCards className="h-[22px] w-[22px] text-[#B0B6BD]" /><p className="mt-2 text-[10px] text-[#9199A3]">لا توجد حركة مالية خلال هذه الفترة.</p></div>;

function buildFinanceMetrics(orders: OrderRow[], expenses: ExpenseRow[], refunds: RefundRow[], costMap: Map<string, number>): FinanceMetrics {
  let grossRevenue = 0;
  let cogs = 0;
  let discounts = 0;
  let totalCostLines = 0;
  let coveredCostLines = 0;

  for (const order of orders) {
    grossRevenue += orderTotalBase(order);
    discounts += orderNativeToBase(order, Number(order.discount_amount || 0));

    const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];

    for (const item of items) {
      const quantity = Math.max(0, Number(item.quantity || 0));
      if (!quantity) continue;

      totalCostLines += 1;

      const productId = String(item.product_id || "");
      const cost = costMap.get(productId);

      if (cost != null && cost > 0) {
        coveredCostLines += 1;
        cogs += cost * quantity;
      }
    }
  }

  const expenseTotal = expenses.reduce((sum, expense) => sum + expenseBase(expense), 0);
  const refundTotal = refunds.reduce((sum, refund) => sum + refundBase(refund), 0);
  const netRevenue = grossRevenue - refundTotal;
  const grossProfit = netRevenue - cogs;
  const netProfit = grossProfit - expenseTotal;
  const grossMargin = netRevenue !== 0 ? (grossProfit / netRevenue) * 100 : 0;
  const netMargin = netRevenue !== 0 ? (netProfit / netRevenue) * 100 : 0;
  const expenseRatio = netRevenue !== 0 ? (expenseTotal / Math.abs(netRevenue)) * 100 : 0;
  const costCoverage = totalCostLines ? (coveredCostLines / totalCostLines) * 100 : 100;

  return {
    grossRevenue,
    refunds: refundTotal,
    netRevenue,
    cogs,
    discounts,
    expenses: expenseTotal,
    grossProfit,
    netProfit,
    grossMargin,
    netMargin,
    expenseRatio,
    orderCount: orders.length,
    costCoverage,
  };
}

function buildDailyFinance(orders: OrderRow[], expenses: ExpenseRow[], refunds: RefundRow[], costMap: Map<string, number>, start: string, end: string): DailyFinance[] {
  const map = new Map<string, { revenue: number; cost: number; expenses: number; refunds: number }>();

  for (const order of orders) {
    const key = toLocalDateKey(new Date(order.created_at));
    const row = map.get(key) || { revenue: 0, cost: 0, expenses: 0, refunds: 0 };

    row.revenue += orderTotalBase(order);

    const items = Array.isArray(order.items) ? order.items as OrderItem[] : [];

    for (const item of items) {
      const quantity = Math.max(0, Number(item.quantity || 0));
      const productId = String(item.product_id || "");
      row.cost += (costMap.get(productId) || 0) * quantity;
    }

    map.set(key, row);
  }

  for (const expense of expenses) {
    const key = expense.expense_date;
    const row = map.get(key) || { revenue: 0, cost: 0, expenses: 0, refunds: 0 };
    row.expenses += expenseBase(expense);
    map.set(key, row);
  }

  for (const refund of refunds) {
    const key = toLocalDateKey(financialRefundDate(refund));
    const row = map.get(key) || { revenue: 0, cost: 0, expenses: 0, refunds: 0 };
    row.refunds += refundBase(refund);
    map.set(key, row);
  }

  const result: DailyFinance[] = [];
  let cursor = startOfLocalDay(start);
  const last = startOfLocalDay(end);

  while (cursor <= last) {
    const key = toDateInput(cursor);
    const row = map.get(key) || { revenue: 0, cost: 0, expenses: 0, refunds: 0 };

    result.push({
      day: key,
      label: new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short" }).format(cursor),
      revenue: row.revenue,
      cost: row.cost,
      expenses: row.expenses,
      refunds: row.refunds,
      netProfit: row.revenue - row.refunds - row.cost - row.expenses,
    });

    cursor = addDays(cursor, 1);
  }

  return result;
}

function buildCurrencySummary(orders: OrderRow[]): CurrencySummary[] {
  const map = new Map<string, CurrencySummary>();

  for (const order of orders) {
    const code = String(order.currency_code || "SAR");
    const current = map.get(code) || { code, orders: 0, nativeRevenue: 0, baseRevenue: 0 };

    current.orders += 1;
    current.nativeRevenue += Number(order.total || 0);
    current.baseRevenue += orderTotalBase(order);

    map.set(code, current);
  }

  return Array.from(map.values()).sort((a, b) => b.baseRevenue - a.baseRevenue);
}

function orderNativeToBase(order: OrderRow, amount: number) {
  const nativeTotal = Number(order.total || 0);
  const baseTotal = Number(order.total_base || 0);
  const rate = Number(order.exchange_rate_snapshot || 0);

  if (nativeTotal > 0 && baseTotal > 0) return amount * (baseTotal / nativeTotal);
  if (rate > 0) return amount / rate;

  return amount;
}

function expenseBase(expense: ExpenseRow) {
  if (expense.amount_base != null && Number.isFinite(Number(expense.amount_base))) return Number(expense.amount_base);
  return Number(expense.amount || 0);
}

function refundBase(refund: RefundRow) {
  if (refund.amount_base != null && Number.isFinite(Number(refund.amount_base))) return Number(refund.amount_base);
  return Number(refund.amount || 0);
}

function financialRefundDate(refund: RefundRow) {
  return new Date(refund.processed_at || refund.created_at);
}

function expenseCategoryName(expense: ExpenseRow) {
  return expense.expense_categories?.name_ar || expense.expense_categories?.name || "غير مصنف";
}

function percentChange(current: number, previous: number): DeltaValue {
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

function inversePercentChange(current: number, previous: number): DeltaValue {
  const change = percentChange(current, previous);

  if (change.neutral) return change;

  return {
    ...change,
    positive: change.value <= 0,
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

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function currencyLabel(code: string) {
  if (code === "SAR") return "ريال سعودي";
  if (code === "YER_SOUTH") return "ريال يمني — جنوب";
  if (code === "YER_NORTH") return "ريال يمني — شمال";
  return code;
}

function formatNativeAmount(amount: number, code: string) {
  const digits = code === "SAR" ? 2 : 0;

  return `${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits })} ${code}`;
}