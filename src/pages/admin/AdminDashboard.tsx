import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  Plus,
  TrendingUp,
  Eye,
  Image,
  Star,
  Settings,
  ArrowUpLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

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

  const [revenueData, setRevenueData] = useState([
    { name: "الإثنين", value: 120 },
    { name: "الثلاثاء", value: 300 },
    { name: "الأربعاء", value: 200 },
    { name: "الخميس", value: 450 },
    { name: "الجمعة", value: 380 },
  ]);

  const fetchStats = async () => {
    const [productsRes, ordersRes, customersRes] = await Promise.all([
      supabase.from("products").select("id", { count: "exact" }),
      supabase.from("orders").select("id, total, status", { count: "exact" }),
      supabase.from("customers").select("id", { count: "exact" }),
    ]);

    const orders = ordersRes.data || [];
    const grouped: Record<string, number> = {
      الإثنين: 0,
      الثلاثاء: 0,
      الأربعاء: 0,
      الخميس: 0,
      الجمعة: 0,
      السبت: 0,
      الأحد: 0,
    };
    orders.forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("ar-SA", {
        weekday: "long",
      });

      if (grouped[day] !== undefined) {
        grouped[day] += parseFloat(String(o.total)) || 0;
      }
    });
    setRevenueData(
      Object.keys(grouped).map((key) => ({
        name: key,
        value: grouped[key],
      })),
    );
    const revenue = orders.reduce((sum, o) => sum + (parseFloat(String(o.total)) || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === "pending").length;

    setStats({
      products: productsRes.count || 0,
      orders: ordersRes.count || 0,
      customers: customersRes.count || 0,
      revenue,
      pendingOrders,
    });
  };

  const fetchRecentOrders = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5);
    if (data) setRecentOrders(data);
  };

  const statCards = [
    {
      title: "المنتجات",
      value: stats.products,
      icon: Package,
      color: "from-blue-500/20 to-blue-600/10",
      iconColor: "text-blue-500",
      borderColor: "border-blue-500/20",
    },
    {
      title: "الطلبات",
      value: stats.orders,
      icon: ShoppingCart,
      color: "from-green-500/20 to-green-600/10",
      iconColor: "text-green-500",
      borderColor: "border-green-500/20",
    },
    {
      title: "العملاء",
      value: stats.customers,
      icon: Users,
      color: "from-purple-500/20 to-purple-600/10",
      iconColor: "text-purple-500",
      borderColor: "border-purple-500/20",
    },
    {
      title: "الإيرادات",
      value: `${stats.revenue.toFixed(0)} ر.س/ر.ي`,
      icon: DollarSign,
      color: "from-primary/20 to-primary/10",
      iconColor: "text-primary",
      borderColor: "border-primary/20",
    },
  ];

  const quickActions = [
    { title: "إضافة منتج", icon: Plus, url: "/admin/products/new", color: "bg-primary hover:bg-primary/90" },
    { title: "عرض الطلبات", icon: Eye, url: "/admin/orders", color: "bg-green-600 hover:bg-green-700" },
    { title: "إدارة البانرات", icon: Image, url: "/admin/banners", color: "bg-blue-600 hover:bg-blue-700" },
    { title: "التقييمات", icon: Star, url: "/admin/reviews", color: "bg-purple-600 hover:bg-purple-700" },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/15 text-yellow-600 border border-yellow-500/30",
      confirmed: "bg-blue-500/15 text-blue-600 border border-blue-500/30",
      processing: "bg-purple-500/15 text-purple-600 border border-purple-500/30",
      shipped: "bg-indigo-500/15 text-indigo-600 border border-indigo-500/30",
      delivered: "bg-green-500/15 text-green-600 border border-green-500/30",
      cancelled: "bg-red-500/15 text-red-600 border border-red-500/30",
    };
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      confirmed: "مؤكد",
      processing: "قيد التجهيز",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };
    return (
      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", styles[status] || "")}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-10 text-right min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl md:text-3xl text-foreground">لوحة التحكم</h1>
              <p className="text-muted-foreground text-sm mt-1">مرحباً بك في لوحة تحكم فلامنجو</p>
            </div>
            <Button asChild className="btn-gold gap-2 w-full sm:w-auto">
              <Link to="/admin/products/new">
                <Plus className="w-4 h-4" />
                إضافة منتج جديد
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative overflow-hidden rounded-2xl p-5 border backdrop-blur-xl",
                  "bg-white/5 hover:bg-white/10 transition-all duration-300",
                  "hover:-translate-y-1 hover:shadow-xl",
                  stat.borderColor,
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", stat.color)} />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("p-2.5 rounded-lg bg-background/80", stat.iconColor)}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-heading text-foreground">{stat.value}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">نمو هذا الأسبوع</span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{stat.title}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="text-lg font-heading mb-4">نظرة على الإيرادات</h2>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <XAxis dataKey="name" stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      textAlign: "right",
                      direction: "rtl",
                    }}
                    formatter={(value) => [`${value} ر.س`, "الإيرادات"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 7, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Actions - Mobile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
              >
                <Link
                  to={action.url}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-white transition-all hover:scale-105",
                    action.color,
                  )}
                >
                  <action.icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">{action.title}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Pending Orders Alert */}
          {stats.pendingOrders > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-l from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-yellow-700 font-medium text-sm">طلبات قيد الانتظار</p>
                  <p className="text-yellow-600/80 text-xs">
                    لديك <strong>{stats.pendingOrders}</strong> طلبات تحتاج مراجعة
                  </p>
                </div>
              </div>
              <Button asChild size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto">
                <Link to="/admin/orders" className="gap-2">
                  <ArrowUpLeft className="w-4 h-4" />
                  عرض الطلبات
                </Link>
              </Button>
            </motion.div>
          )}

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h2 className="font-heading text-base md:text-lg text-foreground">آخر الطلبات</h2>
              <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Link to="/admin/orders">عرض الكل</Link>
              </Button>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-primary">{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{order.customer_name}</span>
                    <span className="font-heading text-primary">{parseFloat(order.total).toFixed(0)} ر.س</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("ar-SA")}
                  </p>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">لا توجد طلبات بعد</div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
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
                    <tr key={order.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono text-sm text-primary">{order.order_number}</td>
                      <td className="p-4">{order.customer_name}</td>
                      <td className="p-4 font-heading text-primary">{parseFloat(order.total).toFixed(0)} ر.س</td>
                      <td className="p-4">{getStatusBadge(order.status)}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("ar-SA")}
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
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
