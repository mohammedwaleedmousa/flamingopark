import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Calendar, Search, AlertTriangle, Package, BarChart3, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface OrderItem {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  costPrice?: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  subtotal: number;
  items: OrderItem[];
  country: string;
  status: string;
  created_at: string;
  discount_amount: number;
  beneficiary_commission: number;
  currency_mode?: 'SAR' | 'YER_SOUTH' | 'YER_NORTH' | null;
}

interface Product {
  id: string;
  name: string;
  name_ar: string;
  price: number;
  cost_price: number | null;
  is_active: boolean;
  countries: string[];
}

interface ProfitStats {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  totalOrders: number;
  totalDiscount: number;
  totalCommission: number;
}

const LOW_MARGIN_THRESHOLD = 20; // 20% profit margin threshold

const isMissingColumnError = (error: unknown) => {
  const message = String((error as { message?: string })?.message || '');
  return /column .* does not exist/i.test(message) || /Could not find the '.*' column/i.test(message);
};

const AdminProfitReportPage = () => {
  const SINGLE_COUNTRY = 'GLOBAL';
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  const modeMeta: Record<'SAR' | 'YER_SOUTH' | 'YER_NORTH', { label: string; symbol: string }> = {
    SAR: { label: 'ريال سعودي', symbol: 'ر.س' },
    YER_SOUTH: { label: 'ريال يمني (جنوب)', symbol: 'ر.ي' },
    YER_NORTH: { label: 'ريال يمني (شمال)', symbol: 'ر.ي' },
  };

  const modeOf = (order: Order): 'SAR' | 'YER_SOUTH' | 'YER_NORTH' => {
    if (order.currency_mode === 'SAR' || order.currency_mode === 'YER_SOUTH' || order.currency_mode === 'YER_NORTH') {
      return order.currency_mode;
    }
    if (order.country === 'SA') return 'SAR';
    return 'YER_SOUTH';
  };

  const toSar = (amount: number, order: Order): number => {
    const mode = modeOf(order);
    if (mode === 'YER_SOUTH') return Number(amount || 0) / 410;
    if (mode === 'YER_NORTH') return Number(amount || 0) / 140;
    return Number(amount || 0);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const loadOrders = async () => {
        let ordersRes = await supabase
          .from('orders')
          .select('*, currency_mode')
          .order('created_at', { ascending: false });

        if (ordersRes.error && isMissingColumnError(ordersRes.error)) {
          ordersRes = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        }

        if (ordersRes.error) throw ordersRes.error;
        return ordersRes.data || [];
      };

      const loadProducts = async () => {
        let productsRes = await supabase
          .from('products')
          .select('id, name, name_ar, price, cost_price, is_active, countries');

        if (productsRes.error && isMissingColumnError(productsRes.error)) {
          productsRes = await supabase
            .from('products')
            .select('id, name, name_ar, price, cost_price, is_active');
        }

        if (productsRes.error) throw productsRes.error;
        return productsRes.data || [];
      };

      const [ordersData, productsData] = await Promise.all([loadOrders(), loadProducts()]);

      // Map orders with proper type casting
      const mappedOrders: Order[] = (ordersData || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) 
          ? (order.items as unknown as OrderItem[])
          : [],
        discount_amount: order.discount_amount || 0,
        beneficiary_commission: 0,
      }));

      setOrders(mappedOrders);
      setProducts(productsData as Product[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Products with low profit margin
  const lowMarginProducts = useMemo(() => {
    return products
      .filter(p => {
        if (!p.cost_price || p.cost_price === 0) return false;
        const margin = ((p.price - p.cost_price) / p.price) * 100;
        return margin < LOW_MARGIN_THRESHOLD && p.is_active;
      })
      .map(p => ({
        ...p,
        margin: p.cost_price ? ((p.price - p.cost_price) / p.price) * 100 : 0,
        profit: p.cost_price ? p.price - p.cost_price : 0,
      }))
      .sort((a, b) => a.margin - b.margin);
  }, [products]);

  // Create a product cost lookup
  const productCostLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    products.forEach(p => {
      if (p.cost_price) {
        lookup[p.id] = p.cost_price;
      }
    });
    return lookup;
  }, [products]);

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => 
      order.status !== 'cancelled' && order.status !== 'canceled'
    );

    if (dateFrom) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= new Date(dateTo + 'T23:59:59')
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.customer_name.toLowerCase().includes(query) ||
        order.order_number.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, dateFrom, dateTo, searchQuery]);

  // Calculate profit stats
  const stats: ProfitStats = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;
    let totalCommission = 0;

    filteredOrders.forEach(order => {
      totalRevenue += toSar(order.total, order);
      totalDiscount += toSar(order.discount_amount || 0, order);
      totalCommission += toSar(order.beneficiary_commission || 0, order);

      // Calculate cost from order items
      if (Array.isArray(order.items)) {
        order.items.forEach((item: OrderItem) => {
          // Try to get cost price from the item itself, or from product lookup
          const itemProductId = (item as any).product_id || item.id;
          const lookupCost = item.costPrice || productCostLookup[itemProductId];
          const costPrice = lookupCost ?? toSar(item.price * 0.7, order); // Fallback converts to SAR
          totalCost += costPrice * item.quantity;
        });
      }
    });

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalCommission;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      netProfit,
      profitMargin,
      totalOrders: filteredOrders.length,
      totalDiscount,
      totalCommission,
    };
  }, [filteredOrders, productCostLookup]);

  const byCurrencyStats = useMemo(() => {
    const acc = {
      SAR: { revenue: 0, cost: 0, profit: 0, orders: 0 },
      YER_SOUTH: { revenue: 0, cost: 0, profit: 0, orders: 0 },
      YER_NORTH: { revenue: 0, cost: 0, profit: 0, orders: 0 },
    };

    for (const order of filteredOrders) {
      const mode = modeOf(order);
      let orderCost = 0;
      if (Array.isArray(order.items)) {
        order.items.forEach((item: OrderItem) => {
          const itemProductId = (item as any).product_id || item.id;
          const lookupCost = item.costPrice || productCostLookup[itemProductId];
          const costPrice = lookupCost ?? toSar(item.price * 0.7, order);
          orderCost += costPrice * item.quantity;
        });
      }
      const orderRevenueSar = toSar(order.total, order);
      const orderProfit = orderRevenueSar - orderCost - toSar(order.beneficiary_commission || 0, order);
      acc[mode].revenue += orderRevenueSar;
      acc[mode].cost += orderCost;
      acc[mode].profit += orderProfit;
      acc[mode].orders += 1;
    }

    return acc;
  }, [filteredOrders, productCostLookup]);

  const byCurrencyNative = useMemo(() => {
    const acc = {
      SAR: { revenue: 0, orders: 0 },
      YER_SOUTH: { revenue: 0, orders: 0 },
      YER_NORTH: { revenue: 0, orders: 0 },
    };

    for (const order of filteredOrders) {
      const mode = modeOf(order);
      acc[mode].revenue += Number(order.total || 0);
      acc[mode].orders += 1;
    }

    return acc;
  }, [filteredOrders]);

  // Monthly profit data for chart
  const monthlyProfitData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; cost: number; profit: number }> = {};
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const key = format(date, 'yyyy-MM');
      months[key] = {
        month: format(date, 'MMM', { locale: ar }),
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }

    orders
      .filter(o => o.status !== 'cancelled' && o.status !== 'canceled')
      .forEach(order => {
        const key = format(new Date(order.created_at), 'yyyy-MM');
        if (months[key]) {
          months[key].revenue += toSar(order.total, order);
          
          // Calculate cost
          if (Array.isArray(order.items)) {
            order.items.forEach((item: OrderItem) => {
              const itemProductId = (item as any).product_id || item.id;
              const lookupCost = item.costPrice || productCostLookup[itemProductId];
              const costPrice = lookupCost ?? toSar(item.price * 0.7, order);
              months[key].cost += costPrice * item.quantity;
            });
          }
          
          months[key].profit = months[key].revenue - months[key].cost - toSar(order.beneficiary_commission || 0, order);
        }
      });

    return Object.values(months);
  }, [orders, productCostLookup]);

  const currency = 'ر.س';

  const setCurrentMonth = () => {
    setDateFrom(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setDateTo(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const setLastMonth = () => {
    const lastMonth = subMonths(new Date(), 1);
    setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
    setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  const pieData = [
    { name: 'صافي الربح', value: stats.netProfit },
    { name: 'التكلفة', value: stats.totalCost },
    { name: 'العمولات', value: stats.totalCommission },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto" dir="rtl">
      <AdminPageHeader
        category="المالية"
        title="تقرير الأرباح"
        description="تحليل المبيعات والأرباح لآخر 30 يوم"
        actions={[
          {
            label: "تحديث",
            icon: RefreshCw,
            onClick: fetchData,
            variant: "secondary",
          },
        ]}
      />

      <p className="text-xs text-muted-foreground">يتم استبعاد الطلبات الملغاة من الحساب. صافي الربح والإجمالي العام معروضان بالريال السعودي، مع إظهار تفصيل العملات بالقيمة الأصلية والمعادل.</p>

      {/* Low Margin Alert */}
      {lowMarginProducts.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              تنبيه: منتجات بهامش ربح منخفض ({lowMarginProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowMarginProducts.slice(0, 6).map(product => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
                  <Package className="w-8 h-8 text-yellow-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name_ar}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>سعر البيع: {product.price} {currency}</span>
                      <span>•</span>
                      <span>التكلفة: {product.cost_price} {currency}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600 shrink-0">
                    {product.margin.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
            {lowMarginProducts.length > 6 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                و {lowMarginProducts.length - 6} منتجات أخرى...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-6 mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                    <p className="text-lg font-bold">{stats.totalRevenue.toLocaleString()} {currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">إجمالي التكلفة</p>
                    <p className="text-lg font-bold">{stats.totalCost.toLocaleString()} {currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">صافي الربح</p>
                    <p className="text-lg font-bold">{stats.netProfit.toLocaleString()} {currency}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stats.profitMargin >= 20 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">هامش الربح</p>
                    <p className="text-lg font-bold">{stats.profitMargin.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['SAR', 'YER_SOUTH', 'YER_NORTH'] as const).map((mode) => (
              <Card key={mode}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{modeMeta[mode].label}</p>
                  <p className="text-sm mt-1">إيراد أصلي: <span className="font-bold">{byCurrencyNative[mode].revenue.toLocaleString()} {modeMeta[mode].symbol}</span></p>
                  <p className="text-xs text-muted-foreground">ما يعادل: {byCurrencyStats[mode].revenue.toLocaleString()} ر.س</p>
                  <p className="text-sm">صافي: <span className="font-bold">{byCurrencyStats[mode].profit.toLocaleString()} ر.س</span></p>
                  <p className="text-xs text-muted-foreground mt-1">{byCurrencyStats[mode].orders} طلب</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">عدد الطلبات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.totalDiscount.toLocaleString()} {currency}</p>
                <p className="text-xs text-muted-foreground">إجمالي الخصومات</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.totalCommission.toLocaleString()} {currency}</p>
                <p className="text-xs text-muted-foreground">عمولات المستفيدين</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الأرباح الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyProfitData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="الربح" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">توزيع الإيرادات</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تصفية حسب الفترة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={setCurrentMonth}>
                    الشهر الحالي
                  </Button>
                  <Button variant="outline" size="sm" onClick={setLastMonth}>
                    الشهر السابق
                  </Button>
                </div>
                <Button variant="outline" onClick={clearFilters}>
                  مسح الفلاتر
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                تفاصيل الطلبات ({filteredOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات في هذه الفترة</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">المبيعات</TableHead>
                        <TableHead className="text-right">التكلفة</TableHead>
                        <TableHead className="text-right">الربح</TableHead>
                        <TableHead className="text-right">الهامش</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.slice(0, 50).map((order) => {
                        // Calculate order cost
                        let orderCost = 0;
                        if (Array.isArray(order.items)) {
                          order.items.forEach((item: OrderItem) => {
                            const itemProductId = (item as any).product_id || item.id;
                            const lookupCost = item.costPrice || productCostLookup[itemProductId];
                            const costPrice = lookupCost ?? toSar(item.price * 0.7, order);
                            orderCost += costPrice * item.quantity;
                          });
                        }
                        const orderRevenueSar = toSar(order.total, order);
                        const orderProfit = orderRevenueSar - orderCost - toSar(order.beneficiary_commission || 0, order);
                        const orderMargin = orderRevenueSar > 0 ? (orderProfit / orderRevenueSar) * 100 : 0;

                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                            <TableCell className="font-medium">{order.customer_name}</TableCell>
                            <TableCell className="text-primary font-bold">
                              {orderRevenueSar.toLocaleString()} ر.س
                            </TableCell>
                            <TableCell className="text-red-600">
                              {orderCost.toLocaleString()} ر.س
                            </TableCell>
                            <TableCell className={orderProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {orderProfit.toLocaleString()} ر.س
                            </TableCell>
                            <TableCell>
                              <Badge variant={orderMargin >= 20 ? 'default' : 'destructive'}>
                                {orderMargin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    صافي الأرباح - المتجر الموحد
                  </p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {stats.netProfit.toLocaleString()} {currency}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
                    <p className="text-xs text-muted-foreground">طلب</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.profitMargin.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">هامش الربح</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.grossProfit.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">إجمالي الربح</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default AdminProfitReportPage;
