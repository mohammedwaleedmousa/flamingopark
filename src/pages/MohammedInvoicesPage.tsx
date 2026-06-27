import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, FileText, Package, Phone, MapPin, DollarSign, Lock, Users, TrendingUp, Calendar, ShoppingCart } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';
import Logo from '@/components/Logo';

interface OrderItem {
  name?: string;
  name_ar?: string;
  quantity?: number;
  price?: number;
  size?: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string | null;
  country: string;
  payment_method: string;
  status: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  discount_amount: number | null;
  total: number;
  coupon_code: string | null;
  created_at: string;
  invoice_url: string | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: 'قيد الانتظار', color: 'bg-yellow-500/20 text-yellow-700 border-yellow-300' },
  confirmed: { label: 'مؤكد', color: 'bg-blue-500/20 text-blue-700 border-blue-300' },
  shipped: { label: 'تم الشحن', color: 'bg-purple-500/20 text-purple-700 border-purple-300' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-500/20 text-green-700 border-green-300' },
  cancelled: { label: 'ملغي', color: 'bg-red-500/20 text-red-700 border-red-300' },
};

const PASSWORD = '773335065';

const MohammedInvoicesPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const saved = sessionStorage.getItem('mohammed_auth');
    if (saved === 'true') {
      setAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchOrders();
    }
  }, [authenticated]);

  const handleLogin = () => {
    if (passwordInput === PASSWORD) {
      setAuthenticated(true);
      sessionStorage.setItem('mohammed_auth', 'true');
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders_archive')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as Order[]) || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4 text-center">
            <Lock className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-xl font-bold">صفحة محمية</h1>
            <p className="text-sm text-muted-foreground">أدخل كلمة المرور للوصول</p>
            <Input
              type="password"
              placeholder="كلمة المرور"
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="text-center"
            />
            {passwordError && <p className="text-sm text-destructive">كلمة المرور غير صحيحة</p>}
            <Button onClick={handleLogin} className="w-full">دخول</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Date filtering
  const now = new Date();
  const filteredByDate = orders.filter(o => {
    if (dateFilter === 'all') return true;
    const d = new Date(o.created_at);
    if (dateFilter === 'today') return isToday(d);
    if (dateFilter === 'week') return d >= subDays(now, 7);
    if (dateFilter === 'month') return d >= subDays(now, 30);
    return true;
  });

  const filtered = filteredByDate.filter(o =>
    o.order_number.includes(search) ||
    o.customer_name.includes(search) ||
    o.customer_phone.includes(search)
  );

  const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.total), 0);
  const todayOrders = orders.filter(o => isToday(new Date(o.created_at)));
  const yesterdayOrders = orders.filter(o => isYesterday(new Date(o.created_at)));
  const weekOrders = orders.filter(o => new Date(o.created_at) >= subDays(now, 7));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);

  // Group orders by date for daily breakdown
  const dailyStats = new Map<string, { count: number; revenue: number }>();
  orders.forEach(o => {
    const day = format(new Date(o.created_at), 'yyyy-MM-dd');
    const existing = dailyStats.get(day) || { count: 0, revenue: 0 };
    existing.count++;
    existing.revenue += Number(o.total);
    dailyStats.set(day, existing);
  });

  // Unique customers count
  const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size;

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
          </div>
          <Badge variant="outline" className="text-xs">
            {orders.length} طلب إجمالي
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <ShoppingCart className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{todayOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">طلبات اليوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-bold">{todayRevenue.toFixed(0)}</p>
              <p className="text-[10px] text-muted-foreground">إيرادات اليوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Calendar className="w-4 h-4 mx-auto mb-1 text-orange-600" />
              <p className="text-xl font-bold">{yesterdayOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">طلبات أمس</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-600" />
              <p className="text-xl font-bold">{weekOrders.length}</p>
              <p className="text-[10px] text-muted-foreground">آخر 7 أيام</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-purple-600" />
              <p className="text-xl font-bold">{uniqueCustomers}</p>
              <p className="text-[10px] text-muted-foreground">عملاء مختلفين</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <FileText className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{orders.length}</p>
              <p className="text-[10px] text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>
        </div>

        {/* Status breakdown */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3">حالة الطلبات</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusMap).map(([key, val]) => {
                const count = orders.filter(o => o.status === key).length;
                return (
                  <Badge key={key} className={`${val.color} border text-xs px-3 py-1`}>
                    {val.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily breakdown (last 7 days) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3">النشاط اليومي (آخر 7 أيام)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const day = subDays(now, i);
                const key = format(day, 'yyyy-MM-dd');
                const stat = dailyStats.get(key) || { count: 0, revenue: 0 };
                return (
                  <div key={key} className="bg-muted/50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-muted-foreground">{format(day, 'EEE dd/MM', { locale: ar })}</p>
                    <p className="text-lg font-bold">{stat.count}</p>
                    <p className="text-[10px] text-muted-foreground">{stat.revenue.toFixed(0)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Total revenue for filtered */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <span className="font-bold">إجمالي المبيعات (المعروضة)</span>
            <span className="text-xl font-bold text-primary">{totalRevenue.toFixed(0)}</span>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث برقم الطلب أو اسم العميل أو رقم الهاتف..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="flex gap-1">
            {([['all', 'الكل'], ['today', 'اليوم'], ['week', 'أسبوع'], ['month', 'شهر']] as const).map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={dateFilter === val ? 'default' : 'outline'}
                onClick={() => setDateFilter(val)}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders list */}
        <div className="space-y-3">
          {filtered.map(order => {
            const items = Array.isArray(order.items) ? order.items : [];
            const status = statusMap[order.status] || statusMap.pending;
            const isExpanded = expandedOrder === order.id;

            return (
              <Card
                key={order.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-bold text-sm">#{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${status.color} border text-xs`}>{status.label}</Badge>
                      <span className="font-bold text-sm">{order.total} {order.country === 'SA' ? 'ر.س' : 'ر.ي'}</span>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{order.customer_name}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.customer_phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{order.customer_address}</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">المنتج</TableHead>
                            <TableHead className="text-center">الكمية</TableHead>
                            <TableHead className="text-center">المقاس</TableHead>
                            <TableHead className="text-left">السعر</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-right text-sm">{item.name_ar || item.name || '-'}</TableCell>
                              <TableCell className="text-center">{item.quantity || 1}</TableCell>
                              <TableCell className="text-center">{item.size || '-'}</TableCell>
                              <TableCell className="text-left">{item.price || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="text-sm space-y-1 bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between"><span>المجموع الفرعي</span><span>{order.subtotal}</span></div>
                        <div className="flex justify-between"><span>التوصيل</span><span>{order.delivery_fee}</span></div>
                        {order.discount_amount && Number(order.discount_amount) > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>الخصم {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                            <span>-{order.discount_amount}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t pt-1 mt-1">
                          <span>الإجمالي</span>
                          <span>{order.total} {order.country === 'SA' ? 'ر.س' : 'ر.ي'}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>طريقة الدفع: <span className="text-foreground">{order.payment_method === 'cod' ? 'الدفع عند الاستلام' : order.payment_method}</span></p>
                        {order.customer_notes && (
                          <p>ملاحظات: <span className="text-foreground">{order.customer_notes}</span></p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد طلبات</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MohammedInvoicesPage;
