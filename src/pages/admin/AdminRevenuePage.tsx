import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, ShoppingCart, Calendar, DollarSign, Search } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  country: string;
  status: string;
  created_at: string;
  payment_method: string;
  currency_mode?: string | null;
}

interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  uniqueCustomers: number;
  averageOrderValue: number;
}

const AdminRevenuePage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل البيانات',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    });

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
        order.customer_phone.includes(query) ||
        order.order_number.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [orders, dateFrom, dateTo, searchQuery]);

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

  const modeMeta: Record<'SAR' | 'YER_SOUTH' | 'YER_NORTH', { label: string; symbol: string }> = {
    SAR: { label: 'ريال سعودي', symbol: 'ر.س' },
    YER_SOUTH: { label: 'ريال يمني (جنوب)', symbol: 'ر.ي' },
    YER_NORTH: { label: 'ريال يمني (شمال)', symbol: 'ر.ي' },
  };

  const byCurrency = useMemo(() => {
    const acc = {
      SAR: { revenue: 0, orders: 0 },
      YER_SOUTH: { revenue: 0, orders: 0 },
      YER_NORTH: { revenue: 0, orders: 0 },
    };
    for (const order of filteredOrders) {
      const mode = modeOf(order);
      acc[mode].revenue += toSar(Number(order.total || 0), order);
      acc[mode].orders += 1;
    }
    return acc;
  }, [filteredOrders]);

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

  const currency = 'ر.س';

  const stats: RevenueStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + toSar(order.total, order), 0);
    const totalOrders = filteredOrders.length;
    const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_phone)).size;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalRevenue, totalOrders, uniqueCustomers, averageOrderValue };
  }, [filteredOrders]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const statCards = [
    { 
      title: 'إجمالي الإيرادات', 
      value: `${stats.totalRevenue.toLocaleString()} ${currency}`,
      icon: DollarSign,
      color: 'text-green-600'
    },
    { 
      title: 'عدد الطلبات', 
      value: stats.totalOrders.toString(),
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    { 
      title: 'العملاء', 
      value: stats.uniqueCustomers.toString(),
      icon: Users,
      color: 'text-purple-600'
    },
    { 
      title: 'متوسط قيمة الطلب', 
      value: `${stats.averageOrderValue.toFixed(0)} ${currency}`,
      icon: TrendingUp,
      color: 'text-orange-600'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-foreground">الإيرادات</h1>
          <p className="text-xs text-muted-foreground mt-1">الفترة الافتراضية: آخر 30 يوم، مع استبعاد الطلبات الملغاة. الإجمالي العام بالريال السعودي، وتفصيل العملات بالقيم الأصلية مع المعادل.</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" disabled={isLoading}>
          تحديث
        </Button>
      </div>

      <div className="space-y-6 mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['SAR', 'YER_SOUTH', 'YER_NORTH'] as const).map((mode) => (
              <Card key={mode}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{modeMeta[mode].label}</p>
                  <p className="text-xl font-bold mt-1">{byCurrencyNative[mode].revenue.toLocaleString()} {modeMeta[mode].symbol}</p>
                  <p className="text-xs text-muted-foreground">≈ {byCurrency[mode].revenue.toLocaleString()} ر.س</p>
                  <p className="text-xs text-muted-foreground mt-1">{byCurrency[mode].orders} طلب</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">البحث والتصفية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث باسم العميل أو رقم الطلب..."
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
                    placeholder="من تاريخ"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="pr-10"
                    placeholder="إلى تاريخ"
                  />
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
                الطلبات ({filteredOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">رقم الطلب</TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">الهاتف</TableHead>
                        <TableHead className="text-right">الدفع</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الإجمالي</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                          <TableCell className="font-medium">{order.customer_name}</TableCell>
                          <TableCell dir="ltr" className="text-left text-sm">{order.customer_phone}</TableCell>
                          <TableCell className="text-sm">
                            {order.payment_method === 'cod' ? 'عند الاستلام' : 'تحويل'}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              order.status === 'completed' ? 'bg-green-100 text-green-700' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {order.status === 'completed' ? 'مكتمل' :
                               order.status === 'pending' ? 'قيد الانتظار' :
                               order.status === 'cancelled' ? 'ملغي' :
                               order.status === 'processing' ? 'جاري التجهيز' :
                               order.status}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {toSar(order.total, order).toLocaleString()} ر.س
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), 'dd MMM yyyy', { locale: ar })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    إجمالي الإيرادات (محول إلى الريال السعودي)
                  </p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {stats.totalRevenue.toLocaleString()} ر.س
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-muted-foreground">من {stats.totalOrders} طلب</p>
                  <p className="text-sm text-muted-foreground">{stats.uniqueCustomers} عميل</p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
};

export default AdminRevenuePage;
