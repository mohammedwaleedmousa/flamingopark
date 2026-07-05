import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker, useDateRange } from '@/lib/analytics/dateRange';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, ScatterChart, Scatter, ComposedChart
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign,
  Zap, AlertCircle, Target, Award, Clock, AlertTriangle,
  ArrowUp, ArrowDown, Eye, EyeOff, Lightbulb
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => n.toFixed(1);
const currency = "ر.س";

interface DailyMetrics {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  avgDeliveryTime: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  revenue: number;
  successRate: number;
  failedCount: number;
}

interface ProductCategory {
  category: string;
  revenue: number;
  quantity: number;
  products: number;
}

interface ComparisonMetrics {
  today: number;
  yesterday: number;
  thisWeek: number;
  lastWeek: number;
  thisMonth: number;
  lastMonth: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'danger';
  title: string;
  description: string;
  icon: any;
}

const AdminAnalyticsDashboardV2 = () => {
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stagnanctProducts, setStagnantProducts] = useState<any[]>([]);
  const { range } = useDateRange();

  const start = range?.start ? new Date(range.start).toISOString() : undefined;
  const end = range?.end ? new Date(new Date(range.end).getTime() + 24*60*60*1000 - 1).toISOString() : undefined;

  useEffect(() => {
    loadAnalytics();
  }, [start, end]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load orders with details
      let ordersQuery: any = supabase
        .from('orders')
        .select('id, total, status, created_at, updated_at, payment_method, line_items, customer_address')
        .order('created_at', { ascending: false });

      if (start) ordersQuery = ordersQuery.gte('created_at', start);
      if (end) ordersQuery = ordersQuery.lte('created_at', end);

      const { data: orders } = await ordersQuery.limit(10000);

      // Process metrics
      const dailyMap = new Map<string, DailyMetrics>();
      const paymentMap = new Map<string, PaymentMethod>();
      const categoryMap = new Map<string, ProductCategory>();
      const productSalesMap = new Map<string, { revenue: number; quantity: number; lastSale: Date }>();

      (orders || []).forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString('en-CA');
        const isCompleted = order.status === 'completed' || order.status === 'delivered';
        const isCancelled = order.status === 'cancelled';
        const isReturned = order.status === 'returned';

        if (!dailyMap.has(date)) {
          dailyMap.set(date, {
            date,
            revenue: 0,
            orders: 0,
            customers: 1,
            completedOrders: 0,
            cancelledOrders: 0,
            returnedOrders: 0,
            avgDeliveryTime: 0,
          });
        }

        const day = dailyMap.get(date)!;
        day.revenue += order.total;
        day.orders += 1;
        if (isCompleted) day.completedOrders += 1;
        if (isCancelled) day.cancelledOrders += 1;
        if (isReturned) day.returnedOrders += 1;

        // Calculate delivery time
        if (isCompleted && order.updated_at) {
          const deliveryTime = (new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24);
          day.avgDeliveryTime = (day.avgDeliveryTime + deliveryTime) / 2;
        }

        // Payment method analysis
        const pm = order.payment_method || 'unknown';
        if (!paymentMap.has(pm)) {
          paymentMap.set(pm, {
            method: pm === 'cod' ? 'دفع عند الاستلام' : pm === 'transfer' ? 'تحويل بنكي' : pm,
            count: 0,
            revenue: 0,
            successRate: 0,
            failedCount: 0,
          });
        }
        const pmt = paymentMap.get(pm)!;
        pmt.count += 1;
        pmt.revenue += order.total;
        if (!isCompleted) pmt.failedCount += 1;

        // Category analysis
        if (order.line_items && typeof order.line_items === 'string') {
          try {
            const items = JSON.parse(order.line_items);
            (items || []).forEach((item: any) => {
              const cat = item.category || 'بدون فئة';
              if (!categoryMap.has(cat)) {
                categoryMap.set(cat, {
                  category: cat,
                  revenue: 0,
                  quantity: 0,
                  products: 0,
                });
              }
              const c = categoryMap.get(cat)!;
              c.revenue += (item.price || 0) * (item.quantity || 1);
              c.quantity += item.quantity || 1;
              c.products += 1;

              // Track product sales
              const prodKey = item.product_id || item.name;
              if (!productSalesMap.has(prodKey)) {
                productSalesMap.set(prodKey, {
                  revenue: 0,
                  quantity: 0,
                  lastSale: new Date(order.created_at),
                });
              }
              const prod = productSalesMap.get(prodKey)!;
              prod.revenue += (item.price || 0) * (item.quantity || 1);
              prod.quantity += item.quantity || 1;
              prod.lastSale = new Date(order.created_at);
            });
          } catch {}
        }
      });

      // Calculate payment success rates
      const paymentList = Array.from(paymentMap.values()).map(p => ({
        ...p,
        successRate: p.count > 0 ? ((p.count - p.failedCount) / p.count) * 100 : 0,
      }));

      // Find stagnant products (no sales in last 30 days or very low sales)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const stagnant = Array.from(productSalesMap.entries())
        .filter(([_, prod]) => prod.lastSale < thirtyDaysAgo || prod.quantity < 2)
        .map(([id, prod]) => ({
          id,
          revenue: prod.revenue,
          quantity: prod.quantity,
          daysSinceLastSale: Math.floor((now.getTime() - prod.lastSale.getTime()) / (24 * 60 * 60 * 1000)),
        }))
        .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
        .slice(0, 10);

      const dailyList = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      setDailyMetrics(dailyList);
      setPayments(paymentList);
      setCategories(Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue));
      setStagnantProducts(stagnant);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = dailyMetrics.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyMetrics.reduce((sum, d) => sum + d.orders, 0);
    const completedOrders = dailyMetrics.reduce((sum, d) => sum + d.completedOrders, 0);
    const cancelledOrders = dailyMetrics.reduce((sum, d) => sum + d.cancelledOrders, 0);
    const returnedOrders = dailyMetrics.reduce((sum, d) => sum + d.returnedOrders, 0);
    const avgDeliveryTime = dailyMetrics.length > 0 
      ? dailyMetrics.reduce((sum, d) => sum + d.avgDeliveryTime, 0) / dailyMetrics.length 
      : 0;

    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
    const returnRate = completedOrders > 0 ? (returnedOrders / completedOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    // Forecast next 7 days
    const lastWeek = dailyMetrics.slice(-7);
    const avgDailyRevenue = lastWeek.length > 0 
      ? lastWeek.reduce((s, d) => s + d.revenue, 0) / lastWeek.length 
      : 0;
    const forecast = avgDailyRevenue * 7;

    // Comparisons
    const today = dailyMetrics[dailyMetrics.length - 1] || { revenue: 0, orders: 0 };
    const yesterday = dailyMetrics[dailyMetrics.length - 2] || { revenue: 0, orders: 0 };
    const thisWeekRevenue = dailyMetrics.slice(-7).reduce((s, d) => s + d.revenue, 0);
    const lastWeekRevenue = dailyMetrics.slice(-14, -7).reduce((s, d) => s + d.revenue, 0);
    const thisMonthRevenue = dailyMetrics.reduce((s, d) => s + d.revenue, 0);

    return {
      totalRevenue,
      totalOrders,
      completedOrders,
      cancelledOrders,
      returnedOrders,
      conversionRate,
      returnRate,
      cancellationRate,
      avgDeliveryTime,
      forecast,
      comparisons: {
        today: today.revenue,
        yesterday: yesterday.revenue,
        thisWeek: thisWeekRevenue,
        lastWeek: lastWeekRevenue,
        thisMonth: thisMonthRevenue,
      },
    };
  }, [dailyMetrics]);

  // Generate alerts
  const alerts = useMemo((): Alert[] => {
    const alertList: Alert[] = [];

    if (kpis.conversionRate < 30) {
      alertList.push({
        id: 'low-conversion',
        type: 'warning',
        title: 'معدل تحويل منخفض',
        description: `معدل إكمال الطلبات ${fmtPct(kpis.conversionRate)}% - يحتاج تحسين`,
        icon: AlertTriangle,
      });
    }

    if (kpis.returnRate > 15) {
      alertList.push({
        id: 'high-return',
        type: 'danger',
        title: 'معدل مرتجعات مرتفع',
        description: `معدل المرتجعات ${fmtPct(kpis.returnRate)}% - تحقق من جودة المنتجات`,
        icon: AlertTriangle,
      });
    }

    if (kpis.cancellationRate > 10) {
      alertList.push({
        id: 'high-cancel',
        type: 'danger',
        title: 'معدل إلغاء مرتفع',
        description: `معدل الإلغاء ${fmtPct(kpis.cancellationRate)}% - تحقق من المخزون`,
        icon: AlertTriangle,
      });
    }

    if (stagnanctProducts.length > 5) {
      alertList.push({
        id: 'stagnant',
        type: 'warning',
        title: 'منتجات راكدة',
        description: `${stagnanctProducts.length} منتجات لم تُبع - قد تحتاج إلى إزالة أو تخفيف`,
        icon: Zap,
      });
    }

    if (kpis.comparisons.today < kpis.comparisons.yesterday * 0.7) {
      alertList.push({
        id: 'low-today',
        type: 'warning',
        title: 'انخفاض في المبيعات اليوم',
        description: `اليوم أقل من أمس بـ ${fmtPct((1 - kpis.comparisons.today / kpis.comparisons.yesterday) * 100)}%`,
        icon: TrendingDown,
      });
    }

    if (kpis.avgDeliveryTime > 5) {
      alertList.push({
        id: 'slow-delivery',
        type: 'warning',
        title: 'تسليم بطيء',
        description: `متوسط وقت التسليم ${fmtPct(kpis.avgDeliveryTime)} أيام - محسّن العملية`,
        icon: Clock,
      });
    }

    return alertList;
  }, [kpis, stagnanctProducts]);

  // Comparison chart data
  const comparisonData = [
    {
      name: 'اليوم',
      value: kpis.comparisons.today,
    },
    {
      name: 'أمس',
      value: kpis.comparisons.yesterday,
    },
    {
      name: 'هذا الأسبوع',
      value: kpis.comparisons.thisWeek,
    },
    {
      name: 'الأسبوع الماضي',
      value: kpis.comparisons.lastWeek,
    },
  ];

  const COLORS = ['#DA3E73', '#FF7AAE', '#8b5cf6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin text-primary text-4xl">⟳</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">📊 لوحة التحليل المتقدمة</h1>
        <Button onClick={loadAnalytics} variant="outline" disabled={isLoading}>
          تحديث البيانات
        </Button>
      </div>

      <DateRangePicker />

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.type === 'danger' ? 'border-l-red-500 bg-red-50' :
              alert.type === 'warning' ? 'border-l-amber-500 bg-amber-50' :
              'border-l-green-500 bg-green-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <alert.icon className={`w-5 h-5 flex-shrink-0 ${
                    alert.type === 'danger' ? 'text-red-600' :
                    alert.type === 'warning' ? 'text-amber-600' :
                    'text-green-600'
                  }`} />
                  <div>
                    <p className="font-semibold text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Critical Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Conversion Rate */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-blue-700 font-semibold">معدل إكمال الطلبات</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">{fmtPct(kpis.conversionRate)}%</p>
                <p className="text-xs text-blue-600 mt-1">{fmt(kpis.completedOrders)} من {fmt(kpis.totalOrders)}</p>
              </div>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Return Rate */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-orange-700 font-semibold">معدل المرتجعات</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{fmtPct(kpis.returnRate)}%</p>
                <p className="text-xs text-orange-600 mt-1">{fmt(kpis.returnedOrders)} عملية</p>
              </div>
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Cancellation Rate */}
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-red-700 font-semibold">معدل الإلغاء</p>
                <p className="text-2xl font-bold text-red-900 mt-2">{fmtPct(kpis.cancellationRate)}%</p>
                <p className="text-xs text-red-600 mt-1">{fmt(kpis.cancelledOrders)} عملية</p>
              </div>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Delivery Time */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-green-700 font-semibold">متوسط وقت التسليم</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{fmtPct(kpis.avgDeliveryTime)}</p>
                <p className="text-xs text-green-600 mt-1">أيام</p>
              </div>
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💳 تحليل طرق الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((pm, idx) => (
                <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm">{pm.method}</h3>
                    <Badge variant={pm.successRate > 90 ? "default" : "destructive"}>
                      {fmtPct(pm.successRate)}% نجاح
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                    <div>
                      <p className="text-muted-foreground">العمليات</p>
                      <p className="font-bold text-lg">{pm.count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">الإيرادات</p>
                      <p className="font-bold">{fmt(pm.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">فاشلة</p>
                      <p className="font-bold text-red-600">{pm.failedCount}</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${pm.successRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 توزيع طرق الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={payments}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ method }) => method.substring(0, 8)}
                >
                  {payments.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 مقارنة الفترات</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => fmt(value as number)} />
              <Bar dataKey="value" fill="#DA3E73" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Categories Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏷️ تحليل الفئات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-pink-200">
                  <th className="text-right py-2 px-3 font-semibold">الفئة</th>
                  <th className="text-right py-2 px-3 font-semibold">الإيرادات</th>
                  <th className="text-right py-2 px-3 font-semibold">الكمية</th>
                  <th className="text-right py-2 px-3 font-semibold">المنتجات</th>
                  <th className="text-right py-2 px-3 font-semibold">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{cat.category}</td>
                    <td className="py-3 px-3 text-green-600 font-semibold">
                      {fmt(cat.revenue)} {currency}
                    </td>
                    <td className="py-3 px-3">{cat.quantity}</td>
                    <td className="py-3 px-3">{cat.products}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline">
                        {((cat.revenue / kpis.totalRevenue) * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stagnant Products */}
      {stagnanctProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg">⚠️ المنتجات الراكدة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stagnanctProducts.map((prod, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-semibold text-sm">منتج #{idx + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {prod.daysSinceLastSale} يوم بدون مبيعات • {prod.quantity} وحدة مباعة
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {fmt(prod.revenue)} {currency}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue Forecast */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-semibold">📮 توقع الإيرادات</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">
                {fmt(kpis.forecast)} {currency}
              </p>
              <p className="text-xs text-purple-600 mt-1">للـ 7 أيام القادمة</p>
            </div>
            <Lightbulb className="w-12 h-12 text-purple-500 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
            <p className="text-2xl font-bold mt-2">{fmt(kpis.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">{currency}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            <p className="text-2xl font-bold mt-2">{fmt(kpis.totalOrders)}</p>
            <p className="text-xs text-muted-foreground mt-1">طلب</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">معدل الرضا</p>
            <p className="text-2xl font-bold mt-2">{fmtPct(100 - kpis.returnRate - kpis.cancellationRate)}%</p>
            <p className="text-xs text-muted-foreground mt-1">عملاء راضين</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboardV2;
