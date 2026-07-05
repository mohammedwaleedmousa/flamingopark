import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useRevenueSummary,
  useOrdersSummary,
  useCustomersCount,
  useRevenueTimeseries,
  useProfitSummary,
  useRecentOrders,
  useLowStock,
  useTopProducts,
  useOrdersByStatus,
  useConversionMetrics,
  useReturningCustomers,
  usePendingAlerts,
  useCategoryPerformance,
} from "@/lib/analytics/hooks";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Wallet,
  BarChart3,
  Download,
  Send,
  Share2,
  PieChart,
  LineChart,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  PackagePlus,
  UserPlus,
  Receipt,
  Tag,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Kpi {
  revenue: number;
  revenueDelta: number;
  profit: number;
  profitDelta: number;
  orders: number;
  ordersDelta: number;
  customers: number;
  customersDelta: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const currency = "ر.ي";

const COLORS = ["#DA3E73", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكد",
  processing: "تجهيز",
  shipped: "شحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-200",
  processing: "bg-violet-50 text-violet-700 ring-violet-200",
  shipped: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<Kpi>({
    revenue: 0,
    revenueDelta: 0,
    profit: 0,
    profitDelta: 0,
    orders: 0,
    ordersDelta: 0,
    customers: 0,
    customersDelta: 0,
  });
  const [chart, setChart] = useState<{ date: string; revenue: number }[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any>({});
  const [conversionRate, setConversionRate] = useState(0);
  const [returningRate, setReturningRate] = useState(0);
  const [categoryPerf, setCategoryPerf] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAlerts, setPendingAlerts] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Fetch all analytics data
  const rev = useRevenueSummary();
  const ord = useOrdersSummary();
  const cust = useCustomersCount();
  const ts = useRevenueTimeseries();
  const profit = useProfitSummary();
  const recentQ = useRecentOrders();
  const lowQ = useLowStock();
  const topProd = useTopProducts();
  const orderStatus = useOrdersByStatus();
  const conversion = useConversionMetrics();
  const returning = useReturningCustomers();
  const alerts = usePendingAlerts();
  const categoryPerformance = useCategoryPerformance();

  useEffect(() => {
    const allLoading = [
      rev.isLoading,
      ord.isLoading,
      cust.isLoading,
      profit.isLoading,
      topProd.isLoading,
      orderStatus.isLoading,
      conversion.isLoading,
      returning.isLoading,
      alerts.isLoading,
      categoryPerformance.isLoading,
    ].some((l) => l);

    setLoading(allLoading);

    const revenue = rev.data?.revenue ?? 0;
    const ordersCount = ord.data?.count ?? 0;
    const customersCount = cust.data?.customers ?? 0;
    const profitVal = profit.data?.profit ?? 0;

    setKpi({
      revenue,
      revenueDelta: 0,
      profit: profitVal,
      profitDelta: 0,
      orders: ordersCount,
      ordersDelta: 0,
      customers: customersCount,
      customersDelta: 0,
    });

    setChart(
      (ts.data ?? []).map((r: any) => ({
        date: r?.date ? String(r.date).slice(5) : "",
        revenue: Math.round(Number(r?.total) || 0),
      }))
    );
    setRecent(recentQ.data ?? []);
    setLowStock(lowQ.data ?? []);
    setTopProducts(topProd.data ?? []);
    setOrdersByStatus(orderStatus.data ?? {});
    setConversionRate(conversion.data?.conversionRate ?? 0);
    setReturningRate(returning.data?.returnRate ?? 0);
    setCategoryPerf(categoryPerformance.data ?? []);
    setPendingAlerts(alerts.data);
    setPendingCount((recentQ.data ?? []).filter((o: any) => o.status === "pending").length);
  }, [
    rev.data,
    ord.data,
    cust.data,
    ts.data,
    profit.data,
    recentQ.data,
    lowQ.data,
    topProd.data,
    orderStatus.data,
    conversion.data,
    returning.data,
    alerts.data,
    categoryPerformance.data,
  ]);

  const kpis = [
    {
      label: "الإيرادات (30 يوم)",
      value: `${fmt(kpi.revenue)} ${currency}`,
      delta: kpi.revenueDelta,
      icon: DollarSign,
      tint: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "صافي الربح",
      value: `${fmt(kpi.profit)} ${currency}`,
      delta: kpi.profitDelta,
      icon: Wallet,
      tint: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "الطلبات",
      value: fmt(kpi.orders),
      delta: kpi.ordersDelta,
      icon: ShoppingCart,
      tint: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "عملاء جدد",
      value: fmt(kpi.customers),
      delta: kpi.customersDelta,
      icon: Users,
      tint: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const statusChartData = Object.entries(ordersByStatus).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count as number,
  }));

  const handleExportReport = (format: "pdf" | "excel") => {
    console.log(`تصدير التقرير بصيغة ${format}`);
    // TODO: Implement export functionality
  };

  const handleEmailReport = () => {
    console.log("إرسال التقرير بالبريد الإلكتروني");
    // TODO: Implement email functionality
  };

  const handleShareReport = () => {
    console.log("مشاركة التقرير");
    // TODO: Implement share functionality
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      {/* Header with AdminPageHeader */}
      <AdminPageHeader
        category="لوحة التحكم"
        title="نظرة عامة على المتجر"
        description="أداء آخر 30 يوم مقارنة بالـ 30 السابقة"
        actions={[
          {
            label: "تنزيل",
            icon: Download,
            onClick: () => setShowExportMenu(!showExportMenu),
            variant: "secondary",
          },
          {
            label: "التحليلات",
            icon: BarChart3,
            href: "/admin/analytics",
            variant: "secondary",
          },
          {
            label: "المالية",
            icon: Wallet,
            href: "/admin/finance",
            variant: "outline",
          },
        ]}
      />

      {/* Export Menu */}
      {showExportMenu && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportReport("pdf")}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              تنزيل PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExportReport("excel")}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              تنزيل Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleEmailReport}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              إرسال بالبريد
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleShareReport}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              مشاركة
            </Button>
          </div>
        </Card>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-white border rounded-2xl p-5 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-2.5 rounded-xl", k.bg)}>
                <k.icon className={cn("w-4.5 h-4.5", k.tint)} />
              </div>
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  k.delta >= 0
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-rose-600 bg-rose-50"
                )}
              >
                {k.delta >= 0 ? (
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                )}
                {Math.abs(k.delta).toFixed(1)}%
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              {loading ? (
                <Skeleton className="h-7 w-28 mt-1.5" />
              ) : (
                <p className="text-xl md:text-2xl font-heading text-foreground mt-1.5 tabular-nums">
                  {k.value}
                </p>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Conversion & Return Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="p-4 border rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">معدل التحويل</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Skeleton className="h-8 w-16" /> : `${conversionRate}%`}
              </p>
            </div>
            <Activity className="w-8 h-8 text-pink-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">العملاء المتكررين</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? <Skeleton className="h-8 w-16" /> : `${returningRate}%`}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">متوسط قيمة الطلب</p>
              <p className="text-2xl font-bold mt-1">
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  `${fmt(ord.data?.avg || 0)} ${currency}`
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-2xl ring-1 ring-black/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-base">الإجراءات السريعة</h2>
            <p className="text-xs text-muted-foreground">أكثر العمليات استخداماً</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Link
            to="/admin/products/new"
            className="group rounded-2xl border p-5 hover:border-pink-500 hover:bg-pink-50 transition"
          >
            <PackagePlus className="w-8 h-8 text-pink-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-medium text-sm">إضافة منتج</h3>
            <p className="text-xs text-muted-foreground mt-1">منتج جديد</p>
          </Link>

          <Link
            to="/admin/orders"
            className="group rounded-2xl border p-5 hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <Receipt className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-medium text-sm">الطلبات</h3>
            <p className="text-xs text-muted-foreground mt-1">مراجعة</p>
          </Link>

          <Link
            to="/admin/customers"
            className="group rounded-2xl border p-5 hover:border-green-500 hover:bg-green-50 transition"
          >
            <UserPlus className="w-8 h-8 text-green-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-medium text-sm">العملاء</h3>
            <p className="text-xs text-muted-foreground mt-1">إدارة</p>
          </Link>

          <Link
            to="/admin/coupons"
            className="group rounded-2xl border p-5 hover:border-violet-500 hover:bg-violet-50 transition"
          >
            <Tag className="w-8 h-8 text-violet-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-medium text-sm">قسائم خصم</h3>
            <p className="text-xs text-muted-foreground mt-1">جديد</p>
          </Link>

          <Link
            to="/admin/categories"
            className="group rounded-2xl border p-5 hover:border-amber-500 hover:bg-amber-50 transition"
          >
            <Plus className="w-8 h-8 text-amber-500 mb-3 group-hover:scale-110 transition" />
            <h3 className="font-medium text-sm">الأقسام</h3>
            <p className="text-xs text-muted-foreground mt-1">إدارة</p>
          </Link>
        </div>
      </section>

      {/* Charts Grid - Revenue & Orders Status */}
      <section className="grid lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-base">الإيرادات اليومية</h2>
              <p className="text-xs text-muted-foreground">آخر 30 يوم</p>
            </div>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            {loading ? (
              <Skeleton className="w-full h-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                    formatter={(v: any) => [`${fmt(Number(v))} ${currency}`, "إيراد"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Orders by Status Pie Chart */}
        <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-base">توزيع الطلبات</h2>
              <p className="text-xs text-muted-foreground">حسب الحالة</p>
            </div>
            <PieChart className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="h-64">
            {loading ? (
              <Skeleton className="w-full h-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie data={statusChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      {/* Top Products & Categories */}
      <section className="grid lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="font-heading text-base">أعلى المنتجات مبيعاً</h2>
            <p className="text-xs text-muted-foreground mt-1">أكثر المنتجات رواجاً</p>
          </div>
          <div className="divide-y divide-black/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : topProducts.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              topProducts.map((product, idx) => (
                <div key={product.id} className="px-5 py-3 flex items-center justify-between hover:bg-black/[0.02]">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-bold text-pink-600 bg-pink-50 w-6 h-6 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.count} قطعة</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold ml-2">
                    {fmt(product.sales)} {currency}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-black/5">
            <h2 className="font-heading text-base">أداء الفئات</h2>
            <p className="text-xs text-muted-foreground mt-1">إيرادات كل فئة</p>
          </div>
          <div className="divide-y divide-black/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            ) : categoryPerf.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              categoryPerf.slice(0, 5).map((cat, idx) => (
                <div key={cat.name} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {fmt(cat.sales)} {currency}
                    </p>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                      style={{
                        width: `${Math.min(100, (cat.sales / (categoryPerf[0]?.sales || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      {pendingAlerts && (
        <section className="grid md:grid-cols-3 gap-4">
          {/* Pending Orders Alert */}
          {(pendingAlerts.pendingOrders?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">طلبات معلقة</p>
                  <p className="text-xs text-amber-700/80">
                    {pendingAlerts.pendingOrders.length} طلب
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {pendingAlerts.pendingOrders.slice(0, 3).map((order: any) => (
                  <p key={order.id} className="text-xs text-amber-900 truncate">
                    #{order.order_number} - {order.customer_name}
                  </p>
                ))}
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/admin/orders">عرض الكل</Link>
              </Button>
            </div>
          )}

          {/* Low Stock Alert */}
          {(pendingAlerts.lowStockProducts?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-rose-50 ring-1 ring-rose-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-rose-900">مخزون منخفض</p>
                  <p className="text-xs text-rose-700/80">
                    {pendingAlerts.lowStockProducts.length} منتج
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {pendingAlerts.lowStockProducts.slice(0, 3).map((product: any) => (
                  <p key={product.id} className="text-xs text-rose-900 truncate">
                    {product.name_ar}
                  </p>
                ))}
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/admin/products">عرض الكل</Link>
              </Button>
            </div>
          )}

          {/* Returning Orders Alert */}
          {(pendingAlerts.returningOrders?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-blue-50 ring-1 ring-blue-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">طلبات قيد الشحن</p>
                  <p className="text-xs text-blue-700/80">
                    {pendingAlerts.returningOrders.length} طلب
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {pendingAlerts.returningOrders.slice(0, 3).map((order: any) => (
                  <p key={order.id} className="text-xs text-blue-900 truncate">
                    #{order.order_number} - {order.customer_name}
                  </p>
                ))}
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/admin/orders">متابعة</Link>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Recent Activity */}
      <section className="bg-white rounded-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
          <h2 className="font-heading text-base">آخر النشاطات</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/orders">عرض الكل</Link>
          </Button>
        </div>
        <div className="divide-y divide-black/5">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          {!loading && recent.length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">لا يوجد نشاط حديث</p>
          )}
          {!loading &&
            recent.map((o, index) => (
              <div
                key={o.id}
                className="px-5 py-4 flex items-start justify-between hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-100 to-rose-100 grid place-items-center text-sm font-bold text-rose-600 shadow-sm">
                      {(o.customer_name || "?").charAt(0)}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{o.customer_name || "عميل"}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        طلب
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      #{o.order_number}
                    </p>
                  </div>
                </div>
                <div className="text-left flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-[10.5px] px-2 py-0.5 rounded-full ring-1",
                      STATUS_COLORS[o.status] || "bg-gray-50 text-gray-600 ring-gray-200"
                    )}
                  >
                    {STATUS_LABELS[o.status] || o.status}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {fmt(parseFloat(o.total) || 0)} {currency}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
