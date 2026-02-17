import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Package, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
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
  beneficiary_code: string | null;
  beneficiary_commission: number | null;
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

const MohammedInvoicesPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
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

  const filtered = orders.filter(o =>
    o.order_number.includes(search) ||
    o.customer_name.includes(search) ||
    o.customer_phone.includes(search)
  );

  const totalRevenue = filtered.reduce((sum, o) => sum + Number(o.total), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <h1 className="text-lg font-bold text-foreground">سجل الفواتير</h1>
          </div>
          <Badge variant="outline" className="text-xs">
            {filtered.length} فاتورة
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold">{totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-2xl font-bold">{filtered.filter(o => o.status === 'delivered').length}</p>
              <p className="text-xs text-muted-foreground">تم التوصيل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold">{filtered.filter(o => o.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">قيد الانتظار</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الطلب أو اسم العميل أو رقم الهاتف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Orders */}
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
                  {/* Summary row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-bold text-sm">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), 'dd MMM yyyy - hh:mm a', { locale: ar })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${status.color} border text-xs`}>
                        {status.label}
                      </Badge>
                      <span className="font-bold text-sm">{order.total} {order.country === 'SA' ? 'ر.س' : 'ر.ي'}</span>
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{order.customer_name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />{order.customer_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{order.customer_address}
                    </span>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      {/* Items table */}
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

                      {/* Totals */}
                      <div className="text-sm space-y-1 bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span>المجموع الفرعي</span>
                          <span>{order.subtotal}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>التوصيل</span>
                          <span>{order.delivery_fee}</span>
                        </div>
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

                      {/* Extra info */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>طريقة الدفع: <span className="text-foreground">{order.payment_method === 'cod' ? 'الدفع عند الاستلام' : order.payment_method}</span></p>
                        {order.beneficiary_code && (
                          <p>كود المستفيد: <span className="text-foreground">{order.beneficiary_code}</span> (عمولة: {order.beneficiary_commission})</p>
                        )}
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
              <p>لا توجد فواتير</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MohammedInvoicesPage;
