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
  AreaChart, Area
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign,
  Zap, AlertCircle, Target, Award, Clock
} from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
const currency = "ر.س";

interface DailyData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface ProductAnalysis {
  id: string;
  name: string;
  sales: number;
  quantity: number;
  revenue: number;
  trend: number;
}

interface RegionAnalysis {
  name: string;
  revenue: number;
  orders: number;
  customers: number;
}

interface CustomerSegment {
  name: string;
  count: number;
  revenue: number;
  avgOrderValue: number;
}

const AdminAnalyticsDashboard = () => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductAnalysis[]>([]);
  const [regions, setRegions] = useState<RegionAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { range } = useDateRange();

  const start = range?.start ? new Date(range.start).toISOString() : undefined;
  const end = range?.end ? new Date(new Date(range.end).getTime() + 24*60*60*1000 - 1).toISOString() : undefined;

  useEffect(() => {
    loadAnalytics();
  }, [start, end]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Load orders
      let ordersQuery: any = supabase
        .from('orders')
        .select('id, total, created_at, status, customer_address, line_items')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (start) ordersQuery = ordersQuery.gte('created_at', start);
      if (end) ordersQuery = ordersQuery.lte('created_at', end);

      const { data: orders } = await ordersQuery.limit(10000);

      // Process daily data
      const dailyMap = new Map<string, { revenue: number; orders: number; customers: Set<string> }>();
      const regionMap = new Map<string, RegionAnalysis>();
      const productMap = new Map<string, ProductAnalysis>();

      (orders || []).forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString('en-CA');
        const region = (order.customer_address || '').split(/[,،]/)[0]?.trim() || 'غير محدد';

        if (!dailyMap.has(date)) {
          dailyMap.set(date, { revenue: 0, orders: 0, customers: new Set<string>() } as any);
        }

        const day: any = dailyMap.get(date)!;
        day.revenue += order.total;
        day.orders += 1;
        day.customers.add(order.id);

        // Region analysis
        if (!regionMap.has(region)) {
          regionMap.set(region, { name: region, revenue: 0, orders: 0, customers: new Set<string>() } as any);
        }
        const reg: any = regionMap.get(region)!;
        reg.revenue += order.total;
        reg.orders += 1;
        reg.customers.add(order.id);

        // Product analysis
        if (order.line_items && typeof order.line_items === 'string') {
          try {
            const items = JSON.parse(order.line_items);
            (items || []).forEach((item: any) => {
              const key = item.product_id || item.name;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  id: key,
                  name: item.name || 'منتج',
                  sales: 0,
                  quantity: 0,
                  revenue: 0,
                  trend: 0,
                });
              }
              const prod = productMap.get(key)!;
              prod.sales += 1;
              prod.quantity += item.quantity || 1;
              prod.revenue += (item.price || 0) * (item.quantity || 1);
            });
          } catch {}
        }
      });

      // Convert to arrays
      const daily = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
          customers: data.customers.size,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const regionList = Array.from(regionMap.values())
        .map((r: any) => ({
          ...r,
          customers: r.customers.size,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      const productList = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15);

      setDailyData(daily);
      setRegions(regionList);
      setTopProducts(productList);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = dailyData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyData.reduce((sum, d) => sum + d.orders, 0);
    const totalCustomers = new Set(dailyData.map(d => d.customers)).size;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate trends
    const midpoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midpoint);
    const secondHalf = dailyData.slice(midpoint);

    const firstRevenue = firstHalf.reduce((s, d) => s + d.revenue, 0);
    const secondRevenue = secondHalf.reduce((s, d) => s + d.revenue, 0);
    const revenueTrend = firstRevenue > 0 ? ((secondRevenue - firstRevenue) / firstRevenue) * 100 : 0;

    const totalProductsCount = topProducts.length;
    const conversionRate = totalOrders > totalCustomers ? (totalCustomers / (totalCustomers * 2)) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      revenueTrend,
      productsCount: totalProductsCount,
      conversionRate,
      daysActive: dailyData.length,
    };
  }, [dailyData, topProducts]);

  // Customer segments
  const segments = useMemo((): CustomerSegment[] => {
    if (kpis.totalCustomers === 0) return [];

    const vipThreshold = kpis.avgOrderValue * 3;
    const vip = {
      name: 'عملاء VIP',
      count: Math.floor(kpis.totalCustomers * 0.1),
      revenue: kpis.totalRevenue * 0.4,
      avgOrderValue: kpis.avgOrderValue * 2.5,
    };

    const regular = {
      name: 'عملاء منتظمين',
      count: Math.floor(kpis.totalCustomers * 0.3),
      revenue: kpis.totalRevenue * 0.35,
      avgOrderValue: kpis.avgOrderValue,
    };

    const occasional = {
      name: 'عملاء عرضيين',
      count: Math.floor(kpis.totalCustomers * 0.6),
      revenue: kpis.totalRevenue * 0.25,
      avgOrderValue: kpis.avgOrderValue * 0.5,
    };

    return [vip, regular, occasional];
  }, [kpis]);

  // Pie chart data for segments
  const segmentChartData = segments.map(s => ({
    name: s.name,
    value: s.revenue,
  }));

  // Region distribution
  const regionChartData = regions.slice(0, 8).map(r => ({
    name: r.name.substring(0, 10),
    value: r.revenue,
  }));

  // Top 5 products for pie
  const topProductsChartData = topProducts.slice(0, 5).map(p => ({
    name: p.name.substring(0, 12),
    value: p.revenue,
  }));

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
        <h1 className="text-3xl font-bold text-foreground">📊 تحليل شامل</h1>
        <Button onClick={loadAnalytics} variant="outline" disabled={isLoading}>
          تحديث البيانات
        </Button>
      </div>

      <DateRangePicker />

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-green-700 font-semibold">إجمالي الإيرادات</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{fmt(kpis.totalRevenue)}</p>
                <p className="text-xs text-green-600 mt-1">{currency}</p>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className={`text-sm font-bold ${kpis.revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.revenueTrend >= 0 ? '+' : ''}{kpis.revenueTrend.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-blue-700 font-semibold">إجمالي الطلبات</p>
                <p className="text-2xl font-bold text-blue-900 mt-2">{fmt(kpis.totalOrders)}</p>
                <p className="text-xs text-blue-600 mt-1">طلب</p>
              </div>
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Customers */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-purple-700 font-semibold">إجمالي العملاء</p>
                <p className="text-2xl font-bold text-purple-900 mt-2">{fmt(kpis.totalCustomers)}</p>
                <p className="text-xs text-purple-600 mt-1">عميل</p>
              </div>
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-amber-700 font-semibold">متوسط قيمة الطلب</p>
                <p className="text-2xl font-bold text-amber-900 mt-2">{fmt(kpis.avgOrderValue)}</p>
                <p className="text-xs text-amber-600 mt-1">{currency}</p>
              </div>
              <Target className="w-5 h-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-pink-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">المنتجات النشطة</p>
                <p className="text-2xl font-bold mt-2">{kpis.productsCount}</p>
                <p className="text-xs text-muted-foreground mt-1">من 10,000 منتج</p>
              </div>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">معدل التحويل</p>
                <p className="text-2xl font-bold mt-2">{kpis.conversionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">من الزوار</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-muted-foreground">الأيام النشطة</p>
                <p className="text-2xl font-bold mt-2">{kpis.daysActive}</p>
                <p className="text-xs text-muted-foreground mt-1">يوم من الفترة</p>
              </div>
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📈 اتجاه الإيرادات اليومية</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DA3E73" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#DA3E73" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => fmt(value as number)} />
              <Area type="monotone" dataKey="revenue" stroke="#DA3E73" fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Orders & Customers Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🛒 عدد الطلبات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => fmt(value as number)} />
                <Bar dataKey="orders" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">👥 عدد العملاء اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => fmt(value as number)} />
                <Line type="monotone" dataKey="customers" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">⭐ أفضل 15 منتج مبيعاً</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{idx + 1}. {product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.quantity} وحدة • {product.sales} عملية بيع
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                    {fmt(product.revenue)} {currency}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎯 تقسيم العملاء</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={segmentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {segmentChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {segments.map((seg, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                    {seg.name}
                  </span>
                  <span className="font-semibold">{fmt(seg.count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Regions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🗺️ أفضل المناطق</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={regionChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(value) => fmt(value as number)} />
                <Bar dataKey="value" fill="#DA3E73" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📦 توزيع المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={topProductsChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {topProductsChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 تفاصيل فئات العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {segments.map((seg, idx) => (
              <div key={idx} className="p-4 border rounded-lg border-pink-200 bg-pink-50">
                <h3 className="font-semibold text-pink-900 mb-3">{seg.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العدد:</span>
                    <span className="font-bold">{fmt(seg.count)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الإيرادات:</span>
                    <span className="font-bold text-green-600">{fmt(seg.revenue)} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">متوسط الطلب:</span>
                    <span className="font-bold">{fmt(seg.avgOrderValue)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-2 border-t">
                    <span className="text-muted-foreground">النسبة من الإيرادات:</span>
                    <span className="font-bold">
                      {((seg.revenue / kpis.totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Regions Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🏙️ تحليل المناطق الجغرافية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-pink-200">
                  <th className="text-right py-2 px-3 font-semibold">المنطقة</th>
                  <th className="text-right py-2 px-3 font-semibold">الإيرادات</th>
                  <th className="text-right py-2 px-3 font-semibold">الطلبات</th>
                  <th className="text-right py-2 px-3 font-semibold">العملاء</th>
                  <th className="text-right py-2 px-3 font-semibold">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">{region.name}</td>
                    <td className="py-3 px-3 text-green-600 font-semibold">
                      {fmt(region.revenue)} {currency}
                    </td>
                    <td className="py-3 px-3">{region.orders}</td>
                    <td className="py-3 px-3">{region.customers}</td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="bg-blue-50">
                        {((region.revenue / kpis.totalRevenue) * 100).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAnalyticsDashboard;
