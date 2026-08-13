import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, FileText, Loader2, Package, Receipt, ShoppingBag, Truck } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import LoadingScreen from "@/components/LoadingScreen";

import { supabase } from "@/integrations/supabase/client";
import { getCustomerSession } from "@/lib/customerSession";
import { toast } from "@/hooks/use-toast";

type OrderRow = {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  invoice_url: string | null;
  tracking_token: string | null;
};

type NormalizedStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const normalizeStatus = (raw: string): NormalizedStatus => {
  const status = String(raw || "").trim().toLowerCase();

  if (["pending", "new"].includes(status)) return "pending";
  if (["confirmed", "paid"].includes(status)) return "confirmed";
  if (["processing", "preparing", "ready_for_shipping"].includes(status)) return "processing";
  if (["shipped", "out_for_delivery", "in_transit"].includes(status)) return "shipped";
  if (["delivered", "completed"].includes(status)) return "delivered";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";

  return "pending";
};

const STATUS_CONFIG: Record<NormalizedStatus, { label: string; className: string; dotClassName: string }> = {
  pending: {
    label: "تم استقبال الطلب",
    className: "bg-[#FFF5F3] text-[#A95B61]",
    dotClassName: "bg-[#D4777D]",
  },
  confirmed: {
    label: "تم تأكيد الطلب",
    className: "bg-[#FFF5F3] text-[#A95B61]",
    dotClassName: "bg-[#D4777D]",
  },
  processing: {
    label: "جاري التجهيز",
    className: "bg-[#FFF8EF] text-[#9A7046]",
    dotClassName: "bg-[#D59B5D]",
  },
  shipped: {
    label: "قيد التوصيل",
    className: "bg-[#F2F7FA] text-[#577383]",
    dotClassName: "bg-[#6C91A5]",
  },
  delivered: {
    label: "تم التسليم",
    className: "bg-[#EFF7F1] text-[#58785F]",
    dotClassName: "bg-[#6F9576]",
  },
  cancelled: {
    label: "تم الإلغاء",
    className: "bg-[#FFF0EF] text-[#A95F5F]",
    dotClassName: "bg-[#BD6A6A]",
  },
};

const MyOrdersPage = () => {
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [customerId, setCustomerId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(null);

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    const session = getCustomerSession();

    if (!session) {
      navigate("/auth", {
        replace: true,
      });

      return;
    }

    setCustomerId(String(session.id));
    setCustomerPhone(String(session.phone || "").trim());
    setAuthLoading(false);
  }, [navigate]);

  /* =========================================================
     ORDERS
  ========================================================= */

  useEffect(() => {
    if (!customerId) return;

    let mounted = true;

    const fetchOrders = async () => {
      setLoading(true);

      try {
        let query = supabase.from("orders").select("id,order_number,total,status,created_at,invoice_url,tracking_token").order("created_at", { ascending: false }).limit(100);

        if (customerPhone) {
          query = query.or(`customer_id.eq.${customerId},customer_phone.eq.${customerPhone}`);
        } else {
          query = query.eq("customer_id", customerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        if (mounted) {
          setOrders((data || []) as OrderRow[]);
        }
      } catch (error) {
        console.error("Error loading orders:", error);

        if (mounted) {
          setOrders([]);
        }

        toast({
          title: "تعذر تحميل الطلبات",
          description: "تحقق من اتصال الإنترنت ثم حاول مرة أخرى.",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      mounted = false;
    };
  }, [customerId, customerPhone]);

  /* =========================================================
     INVOICE
  ========================================================= */

  const openInvoice = async (orderId: string) => {
    if (invoiceLoadingId) return;

    setInvoiceLoadingId(orderId);

    try {
      const { data, error } = await supabase.functions.invoke("invoice-access", {
        body: {
          action: "signed_url",
          orderId,
        },
      });

      if (error || !data?.signedUrl) {
        throw error || new Error("Invoice unavailable");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Invoice error:", error);

      toast({
        title: "الفاتورة غير متاحة",
        description: "قد لا تكون الفاتورة قد تم إنشاؤها بعد.",
        variant: "destructive",
      });
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  /* =========================================================
     TRACK ORDER
  ========================================================= */

  const trackOrder = (order: OrderRow) => {
    if (!order.tracking_token) {
      toast({
        title: "رابط التتبع غير متاح",
        description: "تعذر العثور على رمز التتبع الخاص بهذا الطلب.",
        variant: "destructive",
      });

      return;
    }

    navigate(`/order-tracking?order=${encodeURIComponent(order.order_number)}&token=${encodeURIComponent(order.tracking_token)}`);
  };

  /* =========================================================
     STATS
  ========================================================= */

  const totalAmount = useMemo(() => {
    return orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [orders]);

  const activeOrdersCount = useMemo(() => {
    return orders.filter((order) => {
      const status = normalizeStatus(order.status);

      return status !== "delivered" && status !== "cancelled";
    }).length;
  }, [orders]);

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat("ar-YE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "";
    }
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-14 pt-5 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[880px] px-3 md:px-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <header className="mb-5 md:mb-6">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">MY ORDERS</span>
            </div>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-[19px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[25px]">طلباتي</h1>

                <p className="mt-1 text-[8px] text-[#9B8D88]">تابع طلباتك، حالة التوصيل والفواتير.</p>
              </div>

              <button type="button" onClick={() => navigate("/products")} className="hidden h-9 items-center gap-1.5 rounded-[9px] border border-[#E4DAD6] bg-white px-3 text-[7px] font-medium text-[#746661] active:bg-[#FFF8F6] sm:flex">
                متابعة التسوق
                <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
              </button>
            </div>
          </header>

          {/* =================================================
              STATS
          ================================================= */}

          <section className="mb-4 grid grid-cols-3 overflow-hidden rounded-[14px] border border-[#EAE0DC] bg-white">
            <div className="flex min-h-[72px] flex-col justify-center px-3 py-3 text-center">
              <span className="text-[18px] font-semibold leading-none text-[#403633] md:text-[22px]">{orders.length}</span>
              <span className="mt-1.5 text-[6px] text-[#9B8D88]">كل الطلبات</span>
            </div>

            <div className="flex min-h-[72px] flex-col justify-center border-x border-[#EEE5E1] px-3 py-3 text-center">
              <span className="text-[18px] font-semibold leading-none text-[#B86168] md:text-[22px]">{activeOrdersCount}</span>
              <span className="mt-1.5 text-[6px] text-[#9B8D88]">طلبات نشطة</span>
            </div>

            <div className="flex min-h-[72px] min-w-0 flex-col justify-center px-2 py-3 text-center">
              <span dir="ltr" className="truncate text-[13px] font-semibold leading-none text-[#403633] md:text-[18px]">{totalAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
              <span className="mt-1.5 text-[6px] text-[#9B8D88]">إجمالي المشتريات</span>
            </div>
          </section>

          {/* =================================================
              ORDERS
          ================================================= */}

          <section className="overflow-hidden rounded-[15px] border border-[#EAE0DC] bg-white">
            <div className="flex h-[48px] items-center justify-between border-b border-[#EEE5E1] px-4">
              <div className="flex items-center gap-2">
                <Receipt className="h-3.5 w-3.5 text-[#C66C72]" strokeWidth={1.5} />
                <h2 className="text-[9px] font-semibold text-[#493D39]">سجل الطلبات</h2>
              </div>

              {!loading && orders.length > 0 && <span className="text-[6px] text-[#A0938E]">{orders.length} {orders.length === 1 ? "طلب" : "طلبات"}</span>}
            </div>

            {/* LOADING */}

            {loading && (
              <div className="space-y-0">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className={`flex items-center gap-3 px-4 py-4 ${index !== 2 ? "border-b border-[#F0E8E5]" : ""}`}>
                    <div className="h-10 w-10 animate-pulse rounded-[9px] bg-[#F1ECE9]" />

                    <div className="min-w-0 flex-1">
                      <div className="h-2.5 w-28 animate-pulse rounded-full bg-[#EDE7E4]" />
                      <div className="mt-2 h-2 w-20 animate-pulse rounded-full bg-[#F1EBE8]" />
                    </div>

                    <div className="h-5 w-16 animate-pulse rounded-full bg-[#F1EBE8]" />
                  </div>
                ))}
              </div>
            )}

            {/* EMPTY */}

            {!loading && orders.length === 0 && (
              <div className="flex min-h-[230px] flex-col items-center justify-center px-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FAECE9]">
                  <ShoppingBag className="h-5 w-5 text-[#C66C72]" strokeWidth={1.4} />
                </span>

                <h3 className="mt-3 text-[11px] font-semibold text-[#493D39]">لا توجد طلبات بعد</h3>

                <p className="mt-1.5 max-w-[270px] text-[7px] leading-5 text-[#9B8D88]">عندما تقوم بإتمام أول طلب سيظهر هنا ويمكنك متابعة حالته وفاتورته.</p>

                <button type="button" onClick={() => navigate("/products")} className="mt-4 h-[38px] rounded-[9px] bg-[#D4777D] px-5 text-[8px] font-semibold text-white active:bg-[#C96B72]">
                  تصفح المنتجات
                </button>
              </div>
            )}

            {/* ORDER LIST */}

            {!loading && orders.length > 0 && (
              <div>
                {orders.map((order, index) => {
                  const normalizedStatus = normalizeStatus(order.status);
                  const status = STATUS_CONFIG[normalizedStatus];
                  const invoiceLoading = invoiceLoadingId === order.id;

                  return (
                    <article key={order.id} className={`px-4 py-4 md:px-5 ${index !== orders.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                      {/* TOP */}

                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span dir="ltr" className="font-mono text-[9px] font-semibold text-[#493D39]">{order.order_number}</span>

                            <span className={`flex h-[23px] items-center gap-1.5 rounded-full px-2 ${status.className}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${status.dotClassName}`} />
                              <span className="text-[6px] font-medium">{status.label}</span>
                            </span>
                          </div>

                          <div className="mt-2 flex items-center gap-1.5 text-[6px] text-[#9B8D88]">
                            <CalendarDays className="h-3 w-3" strokeWidth={1.4} />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-left">
                          <p dir="ltr" className="text-[11px] font-semibold text-[#B86168]">{Number(order.total || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                          <p className="mt-1 text-[5px] text-[#A0938E]">إجمالي الطلب</p>
                        </div>
                      </div>

                      {/* ACTIONS */}

                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => trackOrder(order)} disabled={!order.tracking_token} className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-[#D4777D] px-3 text-[7px] font-semibold text-white active:bg-[#C96B72] disabled:cursor-not-allowed disabled:bg-[#E6D9D6] disabled:text-[#AA9D98]">
                          <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
                          تتبع الطلب
                        </button>

                        <button type="button" onClick={() => void openInvoice(order.id)} disabled={!order.invoice_url || Boolean(invoiceLoadingId)} className="flex h-[36px] flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-[#E0D2CE] bg-white px-3 text-[7px] font-semibold text-[#786762] active:bg-[#FFF8F6] disabled:cursor-not-allowed disabled:opacity-40">
                          {invoiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          {invoiceLoading ? "جاري الفتح..." : "عرض الفاتورة"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* =================================================
              MOBILE SHOPPING
          ================================================= */}

          {!loading && orders.length > 0 && (
            <button type="button" onClick={() => navigate("/products")} className="mt-3 flex h-[40px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E5DAD6] bg-white text-[7px] font-medium text-[#756762] sm:hidden">
              متابعة التسوق
              <ChevronLeft className="h-3 w-3" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyOrdersPage;