import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Eye, MessageCircle, Search, ShoppingCart, X, Phone, MapPin, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  { value: 'pending', label: 'قيد الانتظار', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30' },
  { value: 'confirmed', label: 'مؤكد', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  { value: 'processing', label: 'قيد التجهيز', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  { value: 'shipped', label: 'تم الشحن', color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' },
  { value: 'delivered', label: 'تم التوصيل', color: 'bg-green-500/15 text-green-600 border-green-500/30' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
];

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find(s => s.value === status);
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", statusInfo?.color)}>
        {statusInfo?.label || status}
      </span>
    );
  };

  const openWhatsApp = (order: Order) => {
    const message = `مرحباً ${order.customer_name}، بخصوص طلبك رقم ${order.order_number}`;
    const phone = order.customer_phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.includes(search) || 
                         order.customer_name.includes(search) ||
                         order.customer_phone.includes(search);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl text-foreground">الطلبات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} طلب • {stats.pending} قيد الانتظار
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'الكل', value: stats.total, filter: 'all', color: 'from-primary/20 to-primary/10 border-primary/20' },
          { label: 'قيد الانتظار', value: stats.pending, filter: 'pending', color: 'from-yellow-500/20 to-yellow-500/10 border-yellow-500/20' },
          { label: 'قيد المعالجة', value: stats.processing, filter: 'processing', color: 'from-blue-500/20 to-blue-500/10 border-blue-500/20' },
          { label: 'مكتملة', value: stats.completed, filter: 'delivered', color: 'from-green-500/20 to-green-500/10 border-green-500/20' },
        ].map((stat) => (
          <button
            key={stat.filter}
            onClick={() => setStatusFilter(stat.filter === 'processing' ? 'confirmed' : stat.filter)}
            className={cn(
              "p-4 rounded-xl text-center transition-all border bg-gradient-to-br",
              stat.color,
              statusFilter === stat.filter && 'ring-2 ring-offset-2 ring-primary'
            )}
          >
            <p className="text-2xl font-heading">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الطلب أو اسم العميل..."
            className="pr-10 bg-card"
            dir="rtl"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-card">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredOrders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-mono text-sm text-primary">{order.order_number}</p>
                <p className="font-heading text-foreground">{order.customer_name}</p>
              </div>
              {getStatusBadge(order.status)}
            </div>
            
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">
                {order.country === 'SA' ? '🇸🇦' : '🇾🇪'} • {order.payment_method === 'cod' ? 'عند الاستلام' : 'بنكي'}
              </span>
              <span className="font-heading text-primary text-lg">{parseFloat(String(order.total)).toFixed(0)} ر.س</span>
            </div>

            <div className="text-xs text-muted-foreground mb-4">
              {new Date(order.created_at).toLocaleDateString('ar-SA', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <Select
                value={order.status}
                onValueChange={(value) => updateStatus(order.id, value)}
              >
                <SelectTrigger className="flex-1 h-9 text-xs">
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
              <Button
                size="icon"
                variant="outline"
                onClick={() => setSelectedOrder(order)}
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="text-green-600 border-green-600/30 hover:bg-green-600/10"
                onClick={() => openWhatsApp(order)}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{isLoading ? 'جاري التحميل...' : 'لا توجد طلبات'}</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
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
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-mono text-sm text-primary">{order.order_number}</td>
                  <td className="p-4">
                    <p className="font-body">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                  </td>
                  <td className="p-4 text-lg">{order.country === 'SA' ? '🇸🇦' : '🇾🇪'}</td>
                  <td className="p-4 font-heading text-primary">{parseFloat(String(order.total)).toFixed(0)} ر.س</td>
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
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="hover:bg-muted"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-green-600 hover:bg-green-600/10"
                        onClick={() => openWhatsApp(order)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{isLoading ? 'جاري التحميل...' : 'لا توجد طلبات'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-secondary/80 backdrop-blur-sm"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-background border-t md:border border-border rounded-t-2xl md:rounded-xl w-full md:max-w-2xl max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm p-4 md:p-6 border-b border-border flex items-center justify-between z-10">
                <div>
                  <h2 className="font-heading text-lg md:text-xl">تفاصيل الطلب</h2>
                  <p className="text-sm text-primary font-mono">#{selectedOrder.order_number}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelectedOrder(null)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-4 md:p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <span className="text-sm text-muted-foreground">حالة الطلب</span>
                  <Select
                    value={selectedOrder.status}
                    onValueChange={(value) => updateStatus(selectedOrder.id, value)}
                  >
                    <SelectTrigger className="w-40 h-9">
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
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <h3 className="font-heading text-sm text-muted-foreground">معلومات العميل</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-lg">{selectedOrder.country === 'SA' ? '🇸🇦' : '🇾🇪'}</span>
                      </div>
                      <div>
                        <p className="font-heading">{selectedOrder.customer_name}</p>
                        <p className="text-xs text-muted-foreground">العميل</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                        <Phone className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p dir="ltr" className="font-mono">{selectedOrder.customer_phone}</p>
                        <p className="text-xs text-muted-foreground">الهاتف</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600/30"
                        onClick={() => openWhatsApp(selectedOrder)}
                      >
                        <MessageCircle className="w-4 h-4 ml-2" />
                        واتساب
                      </Button>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm">{selectedOrder.customer_address}</p>
                        <p className="text-xs text-muted-foreground mt-1">العنوان</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products */}
                <div className="space-y-3">
                  <h3 className="font-heading text-sm text-muted-foreground flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    المنتجات
                  </h3>
                  <div className="space-y-2">
                    {(selectedOrder.items as any[])?.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                        {item.image && (
                          <img src={item.image} alt="" className="w-14 h-14 object-cover rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} × {item.price} ر.س</p>
                        </div>
                        <span className="font-heading text-primary shrink-0">
                          {(item.quantity * item.price).toFixed(0)} ر.س
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-border pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{parseFloat(String(selectedOrder.subtotal)).toFixed(0)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">التوصيل</span>
                    <span>{parseFloat(String(selectedOrder.delivery_fee)).toFixed(0)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-heading text-lg pt-3 border-t border-border">
                    <span>الإجمالي</span>
                    <span className="text-primary">{parseFloat(String(selectedOrder.total)).toFixed(0)} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
                    <span>طريقة الدفع</span>
                    <span className="bg-muted px-2 py-1 rounded">
                      {selectedOrder.payment_method === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOrdersPage;