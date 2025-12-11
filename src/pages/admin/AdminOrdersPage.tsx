import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, MessageCircle } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  country: string;
  items: any;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const statusOptions = [
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'processing', label: 'قيد التجهيز' },
  { value: 'shipped', label: 'تم الشحن' },
  { value: 'delivered', label: 'تم التوصيل' },
  { value: 'cancelled', label: 'ملغي' },
];

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الطلبات', variant: 'destructive' });
    } else {
      setOrders(data || []);
    }
    setIsLoading(false);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' });
    } else {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      confirmed: 'bg-blue-500/10 text-blue-600',
      processing: 'bg-purple-500/10 text-purple-600',
      shipped: 'bg-indigo-500/10 text-indigo-600',
      delivered: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600',
    };
    const label = statusOptions.find(s => s.value === status)?.label || status;
    return (
      <span className={`px-2 py-1 rounded text-xs font-body ${styles[status] || ''}`}>
        {label}
      </span>
    );
  };

  const openWhatsApp = (order: Order) => {
    const message = `مرحباً ${order.customer_name}، بخصوص طلبك رقم ${order.order_number}`;
    const phone = order.customer_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl text-foreground">الطلبات</h1>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right p-4 font-heading text-sm">رقم الطلب</th>
                <th className="text-right p-4 font-heading text-sm">العميل</th>
                <th className="text-right p-4 font-heading text-sm">البلد</th>
                <th className="text-right p-4 font-heading text-sm">المجموع</th>
                <th className="text-right p-4 font-heading text-sm">الدفع</th>
                <th className="text-right p-4 font-heading text-sm">الحالة</th>
                <th className="text-right p-4 font-heading text-sm">التاريخ</th>
                <th className="text-right p-4 font-heading text-sm">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4 font-mono text-sm">{order.order_number}</td>
                  <td className="p-4">
                    <p className="font-body">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                  </td>
                  <td className="p-4">{order.country === 'SA' ? '🇸🇦' : '🇾🇪'}</td>
                  <td className="p-4 font-heading text-gold">${parseFloat(String(order.total)).toFixed(2)}</td>
                  <td className="p-4 text-sm">{order.payment_method === 'cod' ? 'عند الاستلام' : 'بنكي'}</td>
                  <td className="p-4">
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus(order.id, value)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openWhatsApp(order)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    {isLoading ? 'جاري التحميل...' : 'لا توجد طلبات'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/80 backdrop-blur-sm">
          <div className="bg-background border border-border rounded w-full max-w-2xl max-h-[80vh] overflow-auto">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="font-heading text-xl">تفاصيل الطلب #{selectedOrder.order_number}</h2>
              <Button variant="ghost" onClick={() => setSelectedOrder(null)}>✕</Button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">العميل</p>
                  <p className="font-heading">{selectedOrder.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الهاتف</p>
                  <p dir="ltr">{selectedOrder.customer_phone}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">العنوان</p>
                  <p>{selectedOrder.customer_address}</p>
                </div>
              </div>

              <div>
                <h3 className="font-heading mb-4">المنتجات</h3>
                <div className="space-y-3">
                  {(selectedOrder.items as any[])?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-muted rounded">
                      {item.image && (
                        <img src={item.image} alt="" className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-heading text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity}x ${item.price}</p>
                      </div>
                      <span className="font-heading text-gold">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>${parseFloat(String(selectedOrder.subtotal)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">التوصيل</span>
                  <span>${parseFloat(String(selectedOrder.delivery_fee)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-heading text-lg">
                  <span>الإجمالي</span>
                  <span className="text-gold">${parseFloat(String(selectedOrder.total)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
