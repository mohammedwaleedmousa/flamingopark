import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  invoice_url: string | null;
};

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(String(data.user.id));
      setUserPhone(String(data.user.user_metadata?.phone_number || "").trim());
      setAuthLoading(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("orders")
          .select("id, order_number, total, status, created_at, invoice_url")
          .order("created_at", { ascending: false })
          .limit(100);

        if (userPhone) query = query.or(`customer_id.eq.${userId},customer_phone.eq.${userPhone}`);
        else query = query.eq("customer_id", userId);

        const { data, error } = await query;
        if (error) throw error;
        setOrders((data || []) as OrderRow[]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, userPhone]);

  const resolveInvoiceUrl = (raw: string | null) => {
    if (!raw) return null;
    const value = String(raw).trim();
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const { data } = supabase.storage.from("invoices").getPublicUrl(value);
    return data.publicUrl;
  };

  const totalAmount = useMemo(() => orders.reduce((s, o) => s + Number(o.total || 0), 0), [orders]);

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-4">
          <h1 className="font-heading text-2xl">طلباتي</h1>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-border rounded-xl p-4 bg-card">
              <p className="text-xs text-muted-foreground">عدد الطلبات</p>
              <p className="text-2xl font-heading mt-1">{orders.length}</p>
            </div>
            <div className="border border-border rounded-xl p-4 bg-card">
              <p className="text-xs text-muted-foreground">الإجمالي</p>
              <p className="text-2xl font-heading mt-1">{totalAmount.toLocaleString("ar-EG")}</p>
            </div>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              <p className="text-sm font-heading">سجل الطلبات</p>
            </div>

            <div className="divide-y divide-border/60">
              {loading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الطلبات...</p>}
              {!loading && orders.length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد طلبات بعد</p>}
              {!loading && orders.map((order) => {
                const invoiceUrl = resolveInvoiceUrl(order.invoice_url);
                return (
                  <div key={order.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar-EG")}</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/order-tracking?order=${encodeURIComponent(order.order_number)}`)}
                        className="mt-2 text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      >
                        تتبع الطلب
                      </button>
                      <button
                        type="button"
                        onClick={() => invoiceUrl && window.open(invoiceUrl, "_blank", "noopener,noreferrer")}
                        disabled={!invoiceUrl}
                        className="mt-2 mr-2 text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        عرض الفاتورة
                      </button>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{Number(order.total).toLocaleString("ar-EG")}</p>
                      <p className="text-xs text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyOrdersPage;
