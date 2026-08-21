import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, CheckCircle2, Clock3, Home, MapPin, MessageCircle, Package, RefreshCw, Truck, XCircle } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";

interface TrackingStep {
  title: string;
  description: string;
  date?: string;
  time?: string;
  completed: boolean;
  active: boolean;
  icon: typeof Package;
}

type NormalizedStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const STORE_WHATSAPP = "967778579777";

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

const STATUS_STEPS: NormalizedStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

const STATUS_LABELS: Record<NormalizedStatus, string> = {
  pending: "تم استقبال الطلب",
  confirmed: "تم تأكيد الطلب",
  processing: "جاري تجهيز الطلب",
  shipped: "قيد التوصيل",
  delivered: "تم التسليم",
  cancelled: "تم إلغاء الطلب",
};

const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();

  const selectedOrder = searchParams.get("order")?.trim() || "";
  const trackingToken = searchParams.get("token")?.trim() || "";

  /* =========================================================
     ORDER
  ========================================================= */

  const { data: order, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["tracking-order", selectedOrder, trackingToken],
    enabled: Boolean(selectedOrder),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    queryFn: async () => {
      let resolvedToken = trackingToken;

      if (!resolvedToken) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) return null;

        const { data: customer, error: customerError } = await (supabase as any)
          .from("customers")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (customerError) throw customerError;
        if (!customer?.id) return null;

        const { data: ownedOrder, error: ownedOrderError } = await (supabase as any)
          .from("orders")
          .select("tracking_token")
          .eq("customer_id", customer.id)
          .eq("order_number", selectedOrder)
          .maybeSingle();

        if (ownedOrderError) throw ownedOrderError;

        resolvedToken = String(ownedOrder?.tracking_token || "").trim();
        if (!resolvedToken) return null;
      }

      const { data, error } = await (supabase as any).rpc("get_order_tracking", {
        p_order_number: selectedOrder,
        p_tracking_token: resolvedToken,
      });

      if (error) throw error;

      return Array.isArray(data) ? data[0] ?? null : data;
    },
  });

  /* =========================================================
     STATUS
  ========================================================= */

  const normalizedStatus = normalizeStatus(String(order?.status || "pending"));
  const isCancelled = normalizedStatus === "cancelled";

  const activeIndex = useMemo(() => {
    if (isCancelled) return 0;

    const index = STATUS_STEPS.findIndex((status) => status === normalizedStatus);

    return index >= 0 ? index : 0;
  }, [isCancelled, normalizedStatus]);

  const progressPercentage = isCancelled ? 0 : (activeIndex / (STATUS_STEPS.length - 1)) * 100;

  /* =========================================================
     DATE
  ========================================================= */

  const createdDate = useMemo(() => {
    if (!order?.created_at) return null;

    const date = new Date(order.created_at);

    return Number.isNaN(date.getTime()) ? null : date;
  }, [order?.created_at]);

  /* =========================================================
     TRACKING STEPS
  ========================================================= */

  const trackingSteps = useMemo<TrackingStep[]>(() => {
    const steps: TrackingStep[] = [
      {
        title: "تم استقبال الطلب",
        description: `استلمنا طلبك رقم ${order?.order_number || selectedOrder || "—"}`,
        date: createdDate ? createdDate.toLocaleDateString("ar-YE", { day: "numeric", month: "short", year: "numeric" }) : undefined,
        time: createdDate ? createdDate.toLocaleTimeString("ar-YE", { hour: "2-digit", minute: "2-digit" }) : undefined,
        completed: true,
        active: activeIndex === 0 && !isCancelled,
        icon: Package,
      },
      {
        title: "تم تأكيد الطلب",
        description: "تمت مراجعة الطلب وتأكيد بياناته.",
        completed: !isCancelled && activeIndex >= 1,
        active: !isCancelled && activeIndex === 1,
        icon: CheckCircle2,
      },
      {
        title: "جاري تجهيز الطلب",
        description: "يتم الآن تجهيز المنتجات وتسليمها للشحن.",
        completed: !isCancelled && activeIndex >= 2,
        active: !isCancelled && activeIndex === 2,
        icon: Clock3,
      },
      {
        title: "قيد التوصيل",
        description: "تم تسليم الطلب إلى شركة التوصيل.",
        completed: !isCancelled && activeIndex >= 3,
        active: !isCancelled && activeIndex === 3,
        icon: Truck,
      },
      {
        title: "تم التسليم",
        description: "تم تسليم طلبك بنجاح.",
        completed: !isCancelled && activeIndex >= 4,
        active: !isCancelled && activeIndex === 4,
        icon: MapPin,
      },
    ];

    if (isCancelled) {
      steps.splice(1, 0, {
        title: "تم إلغاء الطلب",
        description: "تم إلغاء الطلب ولن تتم متابعة الشحن.",
        completed: true,
        active: true,
        icon: XCircle,
      });
    }

    return steps;
  }, [activeIndex, createdDate, isCancelled, order?.order_number, selectedOrder]);

  /* =========================================================
     WHATSAPP
  ========================================================= */

  const handleContact = () => {
    const message = `مرحباً، أحتاج للاستعلام عن طلبي${selectedOrder ? ` رقم ${selectedOrder}` : ""}.`;
    const url = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  /* =========================================================
     INVALID LINK
  ========================================================= */

  const missingTrackingInfo = !selectedOrder;

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-14 pt-5 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[760px] px-3 md:px-6">
          {/* =================================================
              HEADER
          ================================================= */}

          <header className="mb-5">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">ORDER TRACKING</span>
            </div>

            <div className="mt-1.5 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[19px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[25px]">تتبع طلبك</h1>

                <p className="mt-1 text-[8px] leading-5 text-[#9B8D88]">تابع حالة طلبك منذ استلامه وحتى وصوله إليك.</p>
              </div>

              {!missingTrackingInfo && (
                <button type="button" onClick={() => void refetch()} disabled={isFetching} aria-label="تحديث حالة الطلب" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#E5DAD6] bg-white text-[#8A7772] active:bg-[#FFF7F5] disabled:opacity-50">
                  <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </header>

          {/* =================================================
              MISSING DATA
          ================================================= */}

          {missingTrackingInfo && (
            <div className="rounded-[14px] border border-[#E8DDD9] bg-white px-4 py-5 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAECE9]">
                <Package className="h-4 w-4 text-[#C66C72]" strokeWidth={1.5} />
              </span>

              <h2 className="mt-3 text-[11px] font-semibold text-[#4A3E3A]">رابط التتبع غير مكتمل</h2>

              <p className="mx-auto mt-1.5 max-w-[320px] text-[7px] leading-5 text-[#998B86]">يجب أن يحتوي رابط التتبع على رقم الطلب.</p>

              <Link to="/home" className="mx-auto mt-4 flex h-[38px] w-fit items-center justify-center gap-1.5 rounded-[9px] border border-[#D9AEAA] bg-white px-5 text-[8px] font-semibold text-[#A95B61]">
                <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
                العودة للرئيسية
              </Link>
            </div>
          )}

          {/* =================================================
              LOADING
          ================================================= */}

          {!missingTrackingInfo && isLoading && (
            <div className="space-y-3">
              <div className="h-[118px] animate-pulse rounded-[15px] border border-[#EEE5E1] bg-white p-4">
                <div className="h-3 w-20 rounded-full bg-[#EEE8E5]" />
                <div className="mt-4 h-5 w-36 rounded-full bg-[#E9E3E0]" />
                <div className="mt-3 h-2.5 w-28 rounded-full bg-[#F0EAE7]" />
              </div>

              <div className="h-[340px] animate-pulse rounded-[15px] border border-[#EEE5E1] bg-white" />
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {!missingTrackingInfo && !isLoading && isError && (
            <div className="rounded-[14px] border border-[#E9D0CE] bg-[#FFF8F7] px-4 py-5 text-center">
              <XCircle className="mx-auto h-7 w-7 text-[#B86565]" strokeWidth={1.4} />

              <p className="mt-2 text-[9px] font-semibold text-[#8E5555]">تعذر تحميل حالة الطلب</p>

              <p className="mt-1 text-[7px] text-[#A47A76]">تحقق من اتصال الإنترنت ثم حاول مرة أخرى.</p>

              <button type="button" onClick={() => void refetch()} className="mt-3 h-9 rounded-[9px] border border-[#DDBDB9] bg-white px-4 text-[8px] font-semibold text-[#A45D5D]">
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* =================================================
              NOT FOUND
          ================================================= */}

          {!missingTrackingInfo && !isLoading && !isError && !order && (
            <div className="rounded-[14px] border border-[#E9D0CE] bg-[#FFF8F7] px-4 py-5 text-center">
              <Package className="mx-auto h-7 w-7 text-[#A76D68]" strokeWidth={1.4} />

              <p className="mt-2 text-[9px] font-semibold text-[#815953]">لم يتم العثور على الطلب</p>

              <p className="mt-1 text-[7px] text-[#A08782]">تأكد أن الطلب يخص حسابك أو استخدم رابط التتبع الأصلي.</p>
            </div>
          )}

          {!missingTrackingInfo && !isLoading && !isError && order && (
            <>
              {/* =================================================
                  ORDER STATUS CARD
              ================================================= */}

              <section className="overflow-hidden rounded-[15px] border border-[#E9DFDB] bg-white">
                <div className="px-4 py-4 md:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[6px] text-[#A0938E]">رقم الطلب</p>

                      <p dir="ltr" className="mt-1 text-right font-mono text-[11px] font-semibold text-[#4B3F3B]">{order.order_number || selectedOrder}</p>
                    </div>

                    <div className={`flex h-[27px] items-center gap-1.5 rounded-full px-2.5 ${isCancelled ? "bg-[#FFF0EF] text-[#A95F5F]" : normalizedStatus === "delivered" ? "bg-[#EFF7F1] text-[#58785F]" : "bg-[#FFF5F3] text-[#A95B61]"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isCancelled ? "bg-[#BD6A6A]" : normalizedStatus === "delivered" ? "bg-[#6F9576]" : "bg-[#D4777D]"}`} />

                      <span className="text-[7px] font-semibold">{STATUS_LABELS[normalizedStatus]}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#F0E8E5] pt-3">
                    <div>
                      <p className="text-[6px] text-[#A0938E]">تاريخ الطلب</p>

                      <p className="mt-1 text-[7px] font-medium text-[#625550]">{createdDate ? createdDate.toLocaleDateString("ar-YE", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
                    </div>

                    <div>
                      <p className="text-[6px] text-[#A0938E]">شركة التوصيل</p>

                      <p className="mt-1 truncate text-[7px] font-medium text-[#625550]">{order.delivery_company_name || "سيتم تحديدها"}</p>
                    </div>
                  </div>
                </div>

                {!isCancelled && (
                  <div className="border-t border-[#EEE5E1] bg-[#FFFCFB] px-4 py-3 md:px-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[6px] text-[#9C8E89]">تقدم الطلب</span>
                      <span className="text-[6px] font-medium text-[#A95B61]">{Math.round(progressPercentage)}%</span>
                    </div>

                    <div className="h-[4px] overflow-hidden rounded-full bg-[#EEE9E6]">
                      <div className="h-full rounded-full bg-[#D4777D] transition-[width] duration-500" style={{ width: `${progressPercentage}%` }} />
                    </div>
                  </div>
                )}
              </section>

              {/* =================================================
                  TIMELINE
              ================================================= */}

              <section className="mt-4 overflow-hidden rounded-[15px] border border-[#E9DFDB] bg-white px-4 py-4 md:px-5 md:py-5">
                <div className="mb-4">
                  <h2 className="text-[10px] font-semibold text-[#493D39]">رحلة الطلب</h2>

                  <p className="mt-1 text-[6px] text-[#A0938E]">يتم تحديث الحالة تلقائيًا كل عدة ثوانٍ.</p>
                </div>

                <div>
                  {trackingSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isCancelStep = isCancelled && step.title.includes("إلغاء");
                    const last = index === trackingSteps.length - 1;

                    return (
                      <div key={`${step.title}-${index}`} className="relative flex gap-3">
                        {!last && <div className={`absolute right-[15px] top-[30px] h-[calc(100%-6px)] w-px ${step.completed && !isCancelled ? "bg-[#D8AAA7]" : isCancelStep ? "bg-[#D5A2A0]" : "bg-[#E7DFDC]"}`} />}

                        <div className={`relative z-10 flex h-[31px] w-[31px] shrink-0 items-center justify-center rounded-full border ${isCancelStep ? "border-[#D69491] bg-[#FFF0EF] text-[#AE6262]" : step.completed || step.active ? "border-[#D9A7A4] bg-[#FFF5F3] text-[#B86168]" : "border-[#E5DCD8] bg-[#FAF8F7] text-[#ACA09B]"}`}>
                          {step.completed && !step.active && !isCancelStep ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
                          {step.active && !isCancelStep && normalizedStatus !== "delivered" && <span className="absolute inset-[-4px] animate-pulse rounded-full border border-[#D9A7A4]/45" />}
                        </div>

                        <div className={`min-w-0 flex-1 ${last ? "pb-0" : "pb-6"}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className={`text-[9px] font-semibold ${isCancelStep ? "text-[#A95F5F]" : step.completed || step.active ? "text-[#514540]" : "text-[#A29590]"}`}>{step.title}</h3>
                              <p className={`mt-1 text-[7px] leading-5 ${step.completed || step.active ? "text-[#8C7E79]" : "text-[#B2A6A1]"}`}>{step.description}</p>
                            </div>
                            {step.active && <span className={`shrink-0 rounded-full px-2 py-1 text-[5px] font-semibold ${isCancelStep ? "bg-[#FFF0EF] text-[#A95F5F]" : "bg-[#FFF5F3] text-[#A95B61]"}`}>الحالة الحالية</span>}
                          </div>

                          {step.date && (
                            <div className="mt-1.5 flex items-center gap-1 text-[6px] text-[#A0938E]">
                              <Clock3 className="h-2.5 w-2.5" strokeWidth={1.4} />
                              <span>{step.date}</span>
                              {step.time && <><span className="text-[#D2C7C3]">•</span><span>{step.time}</span></>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="mt-4 rounded-[15px] border border-[#E9DFDB] bg-white px-4 py-4 md:px-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                    <Truck className="h-4 w-4 text-[#C66C72]" strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[6px] text-[#9B8D88]">شركة التوصيل</p>
                    <p className="mt-1 truncate text-[9px] font-semibold text-[#514540]">{order.delivery_company_name || "سيتم تحديد شركة التوصيل"}</p>
                  </div>
                  {!isCancelled && normalizedStatus === "shipped" && <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#FFF5F3] px-2 py-1.5 text-[6px] font-medium text-[#A95B61]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4777D]" />في الطريق</span>}
                </div>
              </section>

              <section className="mt-4 overflow-hidden rounded-[15px] border border-[#E9DFDB] bg-[#FFFCFB]">
                <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-5">
                  <div>
                    <p className="text-[9px] font-semibold text-[#514540]">هل تحتاج إلى مساعدة؟</p>
                    <p className="mt-1 text-[6px] text-[#9B8D88]">تواصل معنا وساعدنا برقم الطلب لتسريع الخدمة.</p>
                  </div>
                  <button type="button" onClick={handleContact} className="flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[#568C68] px-3.5 text-[7px] font-semibold text-white active:bg-[#4C7D5D]">
                    <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    واتساب
                  </button>
                </div>
              </section>

              <div className="mt-4 text-center">
                <Link to="/home" className="inline-flex h-9 items-center justify-center gap-1.5 px-3 text-[7px] font-medium text-[#887A75] active:text-[#A95B61]">
                  <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
                  العودة للرئيسية
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTrackingPage;