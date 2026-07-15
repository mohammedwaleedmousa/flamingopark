import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, User, Phone, MapPin, Package, Bell, MessageCircle, Loader2, Wallet, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useCurrency } from "@/lib/currency";

interface Customer {
  id: string;
  name: string;
  phone: string;
  country: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  customer_address: string | null;
  customer_city?: string | null;
  payment_method: string | null;
  items: any;
}

interface Notif {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const AdminCustomerDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notif[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: c } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
        setCustomer(c as Customer | null);

        if (c) {
          const { data: ordersData } = await supabase
            .from("orders")
            .select("id, order_number, status, total, created_at, customer_address, payment_method, items")
            .or(`customer_id.eq.${(c as Customer).id},customer_phone.eq.${(c as Customer).phone}`)
            .order("created_at", { ascending: false })
            .limit(50);
          setOrders((ordersData || []) as Order[]);

          const { data: notifData } = await (supabase as any)
            .from("customer_notifications")
            .select("id, title, body, type, is_read, created_at")
            .or(`customer_id.eq.${(c as Customer).id},customer_phone.eq.${(c as Customer).phone}`)
            .order("created_at", { ascending: false })
            .limit(30);
          setNotifications((notifData || []) as Notif[]);
        }
      } catch (err: any) {
        toast.error("فشل تحميل البيانات: " + (err?.message || ""));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const openWhatsApp = () => {
    if (!customer) return;
    let p = customer.phone.replace(/\D/g, "");
    if (p.startsWith("0")) p = p.substring(1);
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(`مرحباً ${customer.name}`)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">لم يتم العثور على العميل</p>
        <Button onClick={() => navigate("/admin/customers")} className="mt-4">العودة</Button>
      </div>
    );
  }

  const totalSpent = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const completedOrders = orders.filter((o) => ["delivered", "confirmed"].includes(String(o.status || "").toLowerCase())).length;

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto" dir="rtl">
      <Button variant="ghost" onClick={() => navigate("/admin/customers")} className="gap-2">
        <ArrowRight className="w-4 h-4" /> العودة للعملاء
      </Button>

      <AdminPageHeader
        category="تفاصيل العميل"
        title={customer.name}
        description={`عميل منذ ${new Date(customer.created_at).toLocaleDateString("ar-EG")}`}
        actions={[
          {
            label: "إرسال إشعار",
            icon: Bell,
            href: `/admin/customer-notifications?customerId=${customer.id}`,
            variant: "primary",
          },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
          <p className="text-2xl font-heading mt-1 text-primary">{format(totalSpent)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">عدد الطلبات</p>
          <p className="text-2xl font-heading mt-1">{orders.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">مكتملة</p>
          <p className="text-2xl font-heading mt-1 text-emerald-600">{completedOrders}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">إشعارات مُرسلة</p>
          <p className="text-2xl font-heading mt-1">{notifications.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-heading text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> البيانات الشخصية</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{customer.name}</span>
            </div>
            <div className="flex items-center gap-2 font-mono" dir="ltr">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{customer.country}</span>
            </div>
          </div>
          <Button onClick={openWhatsApp} variant="outline" className="w-full text-green-700 border-green-500/40">
            <MessageCircle className="w-4 h-4 ml-2" /> فتح واتساب
          </Button>
        </div>

        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-heading text-lg flex items-center gap-2 mb-4"><Package className="w-5 h-5 text-primary" /> سجل الطلبات</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {orders.map((o) => (
                <div key={o.id} className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{o.order_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleDateString("ar-EG")}</p>
                      {o.customer_address && <p className="text-xs text-muted-foreground mt-1 truncate max-w-xs">{o.customer_address}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">{o.status}</span>
                        {o.payment_method && <span className="text-[10px] text-muted-foreground">{o.payment_method}</span>}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> {Array.isArray(o.items) ? o.items.length : 0} منتج
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-sm text-primary flex items-center gap-1"><Wallet className="w-3 h-3" />{format(Number(o.total || 0))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-heading text-lg flex items-center gap-2 mb-4"><Bell className="w-5 h-5 text-primary" /> الإشعارات المُرسلة إليه</h2>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد إشعارات</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("ar-EG")}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${n.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                    {n.is_read ? "مقروء" : "غير مقروء"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCustomerDetailPage;