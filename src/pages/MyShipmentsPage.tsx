import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LoadingScreen from "@/components/LoadingScreen";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/lib/customerSession";

type ShipmentRow = { id: string; order_number: string; status: string; created_at: string; tracking_token: string | null };

const statusText: Record<string, string> = { pending: "بانتظار التأكيد", confirmed: "تم التأكيد", processing: "قيد التجهيز", shipped: "قيد الشحن", out_for_delivery: "خرج للتسليم", delivered: "تم التسليم", cancelled: "ملغي", canceled: "ملغي" };
const progressMap: Record<string, number> = { pending: 20, confirmed: 35, processing: 55, shipped: 80, out_for_delivery: 90, delivered: 100, cancelled: 0, canceled: 0 };
const toneMap: Record<string, string> = { pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", shipped: "bg-sky-100 text-sky-700", out_for_delivery: "bg-cyan-100 text-cyan-700", delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700", canceled: "bg-red-100 text-red-700" };
const barMap: Record<string, string> = { pending: "bg-amber-500", confirmed: "bg-blue-500", processing: "bg-indigo-500", shipped: "bg-sky-500", out_for_delivery: "bg-cyan-500", delivered: "bg-emerald-500", cancelled: "bg-red-500", canceled: "bg-red-500" };

const MyShipmentsPage = () => {
  const navigate = useNavigate();
  const [authLoading, setAuthLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const session = getCustomerSession();
    if (!session) { navigate("/auth", { replace: true }); return; }
    setCustomerId(String(session.id));
    setCustomerPhone(String(session.phone || "").trim());
    setAuthLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!customerId) return;
    let active = true;
    const fetchShipments = async () => {
      setLoading(true);
      try {
        let query = supabase.from("orders").select("id,order_number,status,created_at,tracking_token").order("created_at", { ascending: false }).limit(100);
        if (customerPhone) query = query.or(`customer_id.eq.${customerId},customer_phone.eq.${customerPhone}`);
        else query = query.eq("customer_id", customerId);
        const { data, error } = await query;
        if (error) throw error;
        if (!active) return;
        setShipments(((data || []) as ShipmentRow[]).filter((row) => !["delivered", "cancelled", "canceled"].includes(String(row.status || "").toLowerCase())));
      } catch (error) {
        console.error("Error loading shipments:", error);
        if (active) setShipments([]);
      } finally { if (active) setLoading(false); }
    };
    void fetchShipments();
    return () => { active = false; };
  }, [customerId, customerPhone]);

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar /><CartDrawer />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl space-y-4">
          <h1 className="font-heading text-2xl">شحناتي</h1>
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2"><p className="text-sm font-heading">متابعة الشحن</p><span className="text-xs text-muted-foreground">{shipments.length} شحنة نشطة</span></div>
            <div className="divide-y divide-border/60">
              {loading && <p className="p-4 text-sm text-muted-foreground">جاري تحميل الشحنات...</p>}
              {!loading && shipments.length === 0 && <p className="p-4 text-sm text-muted-foreground">لا توجد شحنات جارية الآن</p>}
              {!loading && shipments.map((inv) => {
                const status = String(inv.status || "").toLowerCase();
                const progress = progressMap[status] ?? 15;
                const canTrack = Boolean(inv.tracking_token);
                return (
                  <div key={`ship-${inv.id}`} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex-1"><p className="font-medium text-sm">{inv.order_number}</p><div className="mt-1 flex items-center gap-2"><span className={`text-[11px] px-2 py-0.5 rounded-full ${toneMap[status] || "bg-muted text-muted-foreground"}`}>{statusText[status] || inv.status}</span><span className="text-[11px] text-muted-foreground">{progress}%</span></div><div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className={`h-full ${barMap[status] || "bg-primary"} transition-all duration-500`} style={{ width: `${progress}%` }} /></div></div>
                    <button type="button" disabled={!canTrack} onClick={() => canTrack && navigate(`/order-tracking?order=${encodeURIComponent(inv.order_number)}&token=${encodeURIComponent(inv.tracking_token!)}`)} className="text-xs px-2.5 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40">{canTrack ? "تتبع الآن" : "التتبع غير متاح"}</button>
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

export default MyShipmentsPage;
