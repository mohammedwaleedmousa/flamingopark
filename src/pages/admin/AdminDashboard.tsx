import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  DollarSign,
  Plus,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Stats {
  products: number;
  orders: number;
  customers: number;
  revenue: number;
  pendingOrders: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({
    products: 0,
    orders: 0,
    customers: 0,
    revenue: 0,
    pendingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentOrders();
  }, []);

  const fetchStats = async () => {
    const [productsRes, ordersRes, customersRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact' }),
      supabase.from('orders').select('id, total, status', { count: 'exact' }),
      supabase.from('customers').select('id', { count: 'exact' }),
    ]);

    const orders = ordersRes.data || [];
    const revenue = orders.reduce((sum, o) => sum + (parseFloat(String(o.total)) || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    setStats({
      products: productsRes.count || 0,
      orders: ordersRes.count || 0,
      customers: customersRes.count || 0,
      revenue,
      pendingOrders,
    });
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setRecentOrders(data);
  };

  const statCards = [
    { title: 'المنتجات', value: stats.products, icon: Package, color: 'bg-blue-500/10 text-blue-500' },
    { title: 'الطلبات', value: stats.orders, icon: ShoppingCart, color: 'bg-green-500/10 text-green-500' },
    { title: 'العملاء', value: stats.customers, icon: Users, color: 'bg-purple-500/10 text-purple-500' },
    { title: 'الإيرادات', value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: 'bg-gold/10 text-gold' },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      confirmed: 'bg-blue-500/10 text-blue-600',
      processing: 'bg-purple-500/10 text-purple-600',
      shipped: 'bg-indigo-500/10 text-indigo-600',
      delivered: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600',
    };
    const labels: Record<string, string> = {
      pending: 'قيد الانتظار',
      confirmed: 'مؤكد',
      processing: 'قيد التجهيز',
      shipped: 'تم الشحن',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-body ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground font-body">مرحباً بك في لوحة تحكم ERMGOLD</p>
        </div>
        <div className="flex gap-3">
          <Button asChild className="btn-gold gap-2">
            <Link to="/admin/products/new">
              <Plus className="w-4 h-4" />
              إضافة منتج
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-card border border-border rounded p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <h3 className="text-2xl font-heading text-foreground">{stat.value}</h3>
            <p className="text-sm text-muted-foreground font-body">{stat.title}</p>
          </motion.div>
        ))}
      </div>

      {/* Pending Orders Alert */}
      {stats.pendingOrders > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-700 font-body">
              لديك <strong>{stats.pendingOrders}</strong> طلبات قيد الانتظار
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">عرض الطلبات</Link>
          </Button>
        </motion.div>
      )}

      {/* Recent Orders */}
      <div className="bg-card border border-border rounded">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">آخر الطلبات</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/orders">عرض الكل</Link>
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-right p-4 font-heading text-sm text-foreground">رقم الطلب</th>
                <th className="text-right p-4 font-heading text-sm text-foreground">العميل</th>
                <th className="text-right p-4 font-heading text-sm text-foreground">المجموع</th>
                <th className="text-right p-4 font-heading text-sm text-foreground">الحالة</th>
                <th className="text-right p-4 font-heading text-sm text-foreground">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                  <td className="p-4 font-mono text-sm">{order.order_number}</td>
                  <td className="p-4 font-body">{order.customer_name}</td>
                  <td className="p-4 font-heading text-gold">${parseFloat(order.total).toFixed(2)}</td>
                  <td className="p-4">{getStatusBadge(order.status)}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('ar-SA')}
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    لا توجد طلبات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
