import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, ChevronLeft, Copy, FileText, Home, Loader2, MapPin, PackageCheck, Phone, ReceiptText, Truck } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";
import { CURRENCY_RATES, convertPrice, hydrateCurrencies } from "@/lib/currency";
import { handleImageError, optimizeImage } from "@/lib/imageUrl";

const STORE_WHATSAPP = "967778579777";

interface SelectedAccessory {
  name: string;
  name_ar: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
  selected_size?: string | null;
  selected_color?: string | null;
  selected_accessories?: SelectedAccessory[];
}

interface OrderData {
  orderId: string;
  orderNumber: string;
  trackingToken: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerNotes: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number;
  couponCode?: string | null;
  total: number;
  paymentMethod: string;
  deliveryCompany: string;
  selectedRegion?: string | null;
  country: string;
  currencyMode?: string;
  createdAt: string;
}

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  const flamingoLogo = "/icons/flamingo.jpeg";

  /* =========================================================
     CURRENCY
  ========================================================= */

  const currencyMode = orderData?.currencyMode || "SAR";
  const currencyConfig = CURRENCY_RATES[currencyMode as keyof typeof CURRENCY_RATES];
  const currency = currencyConfig?.symbol || "ر.س";

  const fmt = (amount: number) => {
    try {
      return convertPrice(amount, currencyMode as any).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    } catch {
      return Number(amount || 0).toLocaleString("en-US", {
        maximumFractionDigits: 2,
      });
    }
  };

  /* =========================================================
     CURRENCIES
  ========================================================= */

  useEffect(() => {
    void hydrateCurrencies();
  }, []);

  /* =========================================================
     ORDER DATA
  ========================================================= */

  useEffect(() => {
    const incomingOrder = location.state?.orderData as OrderData | undefined;

    if (!incomingOrder) {
      navigate("/home", {
        replace: true,
      });

      return;
    }

    setOrderData(incomingOrder);

    track({
      event_type: "purchase",
      value: Number(incomingOrder.total) || 0,
      metadata: {
        order_number: incomingOrder.orderNumber,
        items_count: incomingOrder.items?.length ?? 0,
        country: incomingOrder.country,
        currency_mode: incomingOrder.currencyMode || "SAR",
        payment_method: incomingOrder.paymentMethod,
        coupon_code: incomingOrder.couponCode ?? null,
      },
    });
  }, [location.state, navigate]);

  /* =========================================================
     COPY ORDER NUMBER
  ========================================================= */

  const handleCopyOrderNumber = async () => {
    if (!orderData) return;

    try {
      await navigator.clipboard.writeText(orderData.orderNumber);

      toast({
        title: "تم نسخ رقم الطلب",
      });
    } catch {
      toast({
        title: "تعذر نسخ رقم الطلب",
        variant: "destructive",
      });
    }
  };

  /* =========================================================
     TRACKING URL
  ========================================================= */

  const trackingUrl = orderData ? `/order-tracking?order=${encodeURIComponent(orderData.orderNumber)}&token=${encodeURIComponent(orderData.trackingToken)}` : "/order-tracking";

  /* =========================================================
     WHATSAPP MESSAGE
  ========================================================= */

  const createWhatsAppMessage = () => {
    if (!orderData) return "";

    return `طلب جديد من Flamingo Park

الاسم: ${orderData.customerName}
الهاتف: ${orderData.customerPhone}
رقم الطلب: ${orderData.orderNumber}
الإجمالي: ${fmt(orderData.total)} ${currency}

يرجى مراجعة تفاصيل الطلب من لوحة التحكم.`;
  };

  const openWhatsApp = () => {
    if (!orderData) return;

    const message = createWhatsAppMessage();
    const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(message)}`;

    window.location.href = whatsappUrl;
  };

  /* =========================================================
     CONFIRM + PDF
  ========================================================= */

  const handleConfirmOrder = async () => {
    if (!orderData || !invoiceRef.current || isConfirming) return;

    setIsConfirming(true);

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 1.25,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 5000,
      });

      const imageData = canvas.toDataURL("image/jpeg", 0.78);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imageHeight = (canvas.height * pageWidth) / canvas.width;

      if (imageHeight <= pageHeight) {
        pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, imageHeight);
      } else {
        let position = 0;
        let remainingHeight = imageHeight;

        pdf.addImage(imageData, "JPEG", 0, position, pageWidth, imageHeight);

        remainingHeight -= pageHeight;

        while (remainingHeight > 0) {
          position -= pageHeight;

          pdf.addPage();
          pdf.addImage(imageData, "JPEG", 0, position, pageWidth, imageHeight);

          remainingHeight -= pageHeight;
        }
      }

      /* =====================================================
         UPLOAD INVOICE
      ===================================================== */

      try {
        const pdfBlob = pdf.output("blob");

        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not encode invoice"));

          reader.readAsDataURL(pdfBlob);
        });

        const pdfBase64 = dataUrl.split(",")[1];

        const { error: uploadError } = await supabase.functions.invoke("invoice-access", {
          body: {
            action: "upload",
            orderId: orderData.orderId,
            trackingToken: orderData.trackingToken,
            pdfBase64,
          },
        });

        if (uploadError) {
          console.warn("Invoice upload warning:", uploadError);
        }
      } catch (uploadError) {
        console.warn("Invoice upload failed:", uploadError);
      }

      setIsConfirmed(true);

      toast({
        title: "تم تأكيد الطلب",
        description: "سيتم تحويلك إلى واتساب الآن.",
      });

      window.setTimeout(() => {
        openWhatsApp();
      }, 450);
    } catch (error) {
      console.error("Invoice confirmation error:", error);

      setIsConfirmed(true);

      toast({
        title: "تم تأكيد الطلب",
        description: "سيتم فتح واتساب لمتابعة الطلب.",
      });

      window.setTimeout(() => {
        openWhatsApp();
      }, 350);
    } finally {
      setIsConfirming(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (!orderData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDFC]" dir="rtl">
        <div className="text-center">
          <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-[#E7D3D0] border-t-[#D4777D]" />

          <p className="mt-3 text-[8px] text-[#958782]">جاري تحميل تفاصيل الطلب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDFC]" dir="rtl">
      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <div className="print:hidden">
        <Navbar />
        <CartDrawer />
      </div>

      <main className="pb-12 pt-5 print:bg-white print:p-0 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[820px] px-3 print:max-w-none print:px-0 md:px-6">
          {/* =================================================
              STATUS
          ================================================= */}

          <section className="mb-5 print:hidden">
            {isConfirmed ? (
              <div className="rounded-[16px] border border-[#D9E8DB] bg-[#F8FCF8] px-4 py-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF4EC]">
                  <CheckCircle2 className="h-6 w-6 text-[#63856A]" strokeWidth={1.5} />
                </span>

                <h1 className="mt-3 text-[17px] font-semibold text-[#3F4E42] md:text-[21px]">تم تأكيد طلبك بنجاح</h1>

                <p className="mx-auto mt-1.5 max-w-[390px] text-[8px] leading-5 text-[#829086]">شكراً لاختيارك فلامنجو بارك. سيتم التواصل معك لتأكيد تفاصيل الطلب والتوصيل.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">ORDER RECEIVED</span>
                </div>

                <div className="mt-1.5 flex items-end justify-between gap-4">
                  <div>
                    <h1 className="text-[19px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[25px]">تفاصيل طلبك</h1>

                    <p className="mt-1 text-[8px] text-[#9B8D88]">راجع الفاتورة ثم أكّد الطلب للمتابعة عبر واتساب.</p>
                  </div>

                  <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9] md:flex">
                    <ReceiptText className="h-4 w-4 text-[#C66C72]" strokeWidth={1.5} />
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* =================================================
              INVOICE
          ================================================= */}

          <div ref={invoiceRef} id="invoice" className="overflow-hidden rounded-[16px] border border-[#E9DFDB] bg-white print:rounded-none print:border-0">
            {/* =================================================
                INVOICE HEADER
            ================================================= */}

            <div className="flex items-start justify-between gap-4 border-b border-[#EEE5E1] px-4 py-4 md:px-6 md:py-5">
              <div className="min-w-0">
                <img src={flamingoLogo} alt="Flamingo Park" className="h-[48px] w-auto object-contain md:h-[58px]" />

                <p className="mt-1 text-[7px] text-[#A0938E]">فاتورة طلب Flamingo Park</p>
              </div>

              <div className="min-w-0 text-left">
                <p className="text-[6px] uppercase tracking-[0.12em] text-[#A79A95]">ORDER NUMBER</p>

                <div className="mt-1 flex items-center justify-end gap-1.5">
                  <span dir="ltr" className="font-mono text-[9px] font-semibold text-[#514540]">{orderData.orderNumber}</span>

                  <button type="button" onClick={handleCopyOrderNumber} aria-label="نسخ رقم الطلب" className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[#A76A6D] active:bg-[#FFF5F3] print:hidden">
                    <Copy className="h-3 w-3" strokeWidth={1.5} />
                  </button>
                </div>

                <p className="mt-1.5 text-[6px] leading-4 text-[#A0938E]">
                  {new Date(orderData.createdAt).toLocaleDateString("ar", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            {/* =================================================
                ORDER META
            ================================================= */}

            <div className="grid grid-cols-2 border-b border-[#EEE5E1] bg-[#FFFCFB]">
              <div className="border-l border-[#EEE5E1] px-4 py-3 md:px-6">
                <div className="flex items-center gap-1.5">
                  <PackageCheck className="h-3 w-3 text-[#C66C72]" strokeWidth={1.5} />
                  <span className="text-[6px] text-[#9D8F8A]">حالة الطلب</span>
                </div>

                <p className="mt-1 text-[8px] font-semibold text-[#527258]">تم استلام الطلب</p>
              </div>

              <div className="px-4 py-3 md:px-6">
                <div className="flex items-center gap-1.5">
                  <Truck className="h-3 w-3 text-[#C66C72]" strokeWidth={1.5} />
                  <span className="text-[6px] text-[#9D8F8A]">شركة التوصيل</span>
                </div>

                <p className="mt-1 truncate text-[8px] font-semibold text-[#514540]">{orderData.deliveryCompany || "سيتم تحديدها"}</p>
              </div>
            </div>

            {/* =================================================
                CUSTOMER
            ================================================= */}

            <div className="grid grid-cols-1 border-b border-[#EEE5E1] md:grid-cols-2">
              <div className="px-4 py-4 md:border-l md:border-[#EEE5E1] md:px-6">
                <p className="text-[7px] font-medium text-[#A0938E]">معلومات العميل</p>

                <p className="mt-2 text-[9px] font-semibold text-[#514540]">{orderData.customerName}</p>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-[#A76A6D]" strokeWidth={1.4} />

                  <span dir="ltr" className="text-[7px] text-[#7E706B]">{orderData.customerPhone}</span>
                </div>
              </div>

              <div className="border-t border-[#EEE5E1] px-4 py-4 md:border-t-0 md:px-6">
                <p className="text-[7px] font-medium text-[#A0938E]">عنوان التوصيل</p>

                <div className="mt-2 flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#A76A6D]" strokeWidth={1.4} />

                  <div>
                    {orderData.customerCity && <p className="text-[8px] font-medium text-[#514540]">{orderData.customerCity}</p>}

                    <p className="text-[8px] leading-5 text-[#625550]">{orderData.customerAddress}</p>
                  </div>
                </div>

                {orderData.customerNotes && <p className="mt-2 rounded-[7px] bg-[#F8F5F3] px-2.5 py-2 text-[6px] leading-4 text-[#8C7E79]">ملاحظة: {orderData.customerNotes}</p>}
              </div>
            </div>

            {/* =================================================
                PRODUCTS
            ================================================= */}

            <div className="px-4 py-4 md:px-6 md:py-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[9px] font-semibold text-[#514540]">المنتجات</h3>

                <span className="text-[6px] text-[#A0938E]">{orderData.items.length} {orderData.items.length === 1 ? "منتج" : "منتجات"}</span>
              </div>

              <div>
                {(orderData.items || []).map((item, index) => (
                  <div key={`${item.product_id}-${index}`} className={`py-3 ${index !== orderData.items.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                    <div className="flex items-center gap-3">
                      {/* PRODUCT IMAGE */}
                      <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#EEE7E4] bg-[#F7F5F3] p-1 print:h-[52px] print:w-[52px]">
                        <img src={optimizeImage(item.product_image || "/placeholder.svg", 220, 82)} alt={item.product_name} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-[9px] font-semibold text-[#4A3E3A]">{item.product_name}</h4>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[6px] text-[#948681]">
                          <span>الكمية: {item.quantity}</span>

                          {item.selected_size && (
                            <>
                              <span className="text-[#D2C8C4]">•</span>
                              <span>المقاس: {item.selected_size}</span>
                            </>
                          )}

                          {item.selected_color && (
                            <>
                              <span className="text-[#D2C8C4]">•</span>
                              <span>اللون: {item.selected_color}</span>
                            </>
                          )}
                        </div>

                        <p className="mt-1.5 text-[6px] text-[#A0938E]">{item.quantity} × {fmt(item.price)} {currency}</p>
                      </div>

                      <span className="shrink-0 text-[9px] font-semibold text-[#A95B61]">{fmt(item.price * item.quantity)} {currency}</span>
                    </div>

                    {/* ACCESSORIES */}

                    {item.selected_accessories && item.selected_accessories.length > 0 && (
                      <div className="mr-[76px] mt-3 rounded-[9px] bg-[#FAF8F7] px-3 py-2.5 print:mr-[62px]">
                        <p className="mb-2 text-[6px] font-medium text-[#9B8D88]">الإضافات</p>

                        <div className="space-y-2">
                          {item.selected_accessories.map((accessory, accessoryIndex) => (
                            <div key={`${accessory.name_ar}-${accessoryIndex}`} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                {accessory.image_url && (
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-[#ECE3DF] bg-white p-0.5">
                                    <img src={optimizeImage(accessory.image_url, 120, 76)} alt={accessory.name_ar || accessory.name} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center" />
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <p className="truncate text-[6px] font-medium text-[#685A55]">{accessory.name_ar || accessory.name}</p>

                                  <p className="mt-0.5 text-[5px] text-[#A0938E]">الكمية ×{accessory.quantity}</p>
                                </div>
                              </div>

                              <span className="shrink-0 text-[6px] font-medium text-[#A95B61]">+{fmt(accessory.price * accessory.quantity)} {currency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* =================================================
                TOTALS
            ================================================= */}

            <div className="border-t border-[#EEE5E1] bg-[#FFFCFB] px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[7px] text-[#746661]">
                  <span>المجموع الفرعي</span>

                  <span>{fmt(orderData.subtotal)} {currency}</span>
                </div>

                <div className="flex items-center justify-between gap-3 text-[7px] text-[#746661]">
                  <span className="truncate">رسوم التوصيل {orderData.deliveryCompany ? `(${orderData.deliveryCompany})` : ""}</span>

                  <span className="shrink-0">{fmt(orderData.deliveryFee)} {currency}</span>
                </div>

                {Number(orderData.discountAmount || 0) > 0 && (
                  <div className="flex items-center justify-between text-[7px] font-medium text-[#5F8066]">
                    <div className="flex items-center gap-1.5">
                      <span>الخصم</span>

                      {orderData.couponCode && <span className="rounded-[4px] bg-[#EAF4EC] px-1.5 py-0.5 font-mono text-[5px] text-[#58735D]">{orderData.couponCode}</span>}
                    </div>

                    <span>-{fmt(Number(orderData.discountAmount))} {currency}</span>
                  </div>
                )}
              </div>

              {/* TOTAL */}

              <div className="mt-4 flex items-end justify-between border-t border-[#E8DFDB] pt-4">
                <div>
                  <p className="text-[8px] font-semibold text-[#514540]">الإجمالي</p>

                  <p className="mt-0.5 text-[5px] text-[#A99C97]">الإجمالي النهائي للطلب</p>
                </div>

                <span className="text-[16px] font-bold text-[#B86168] md:text-[18px]">{fmt(orderData.total)} {currency}</span>
              </div>

              {/* PAYMENT */}

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EEE5E1] pt-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[6px] text-[#9A8C87]">طريقة الدفع</span>

                  <span className="text-[7px] font-medium text-[#5D504B]">{orderData.paymentMethod === "cod" ? "الدفع عند الاستلام" : "تحويل بنكي"}</span>
                </div>

                {orderData.selectedRegion && (
                  <div className="flex items-center justify-between gap-3 sm:border-r sm:border-[#E8DFDB] sm:pr-3">
                    <span className="text-[6px] text-[#9A8C87]">منطقة الاستلام</span>

                    <span className="text-[7px] font-medium text-[#5D504B]">{orderData.selectedRegion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                INVOICE FOOTER
            ================================================= */}

            <div className="flex items-center justify-between gap-4 border-t border-[#EEE5E1] px-4 py-3 md:px-6">
              <div className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-[#6E9274]" strokeWidth={1.7} />

                <span className="text-[5px] text-[#9B8D88]">تم إنشاء الطلب إلكترونياً</span>
              </div>

              <span className="text-[5px] tracking-[0.08em] text-[#B5AAA6]">FLAMINGO PARK</span>
            </div>
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="mt-4 print:hidden">
            {!isConfirmed ? (
              <button type="button" onClick={handleConfirmOrder} disabled={isConfirming} className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[12px] bg-[#D4777D] px-4 text-[9px] font-semibold text-white transition-colors active:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-60">
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تجهيز الفاتورة...
                  </>
                ) : (
                  <>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>

                    تأكيد الطلب والمتابعة عبر واتساب
                  </>
                )}
              </button>
            ) : (
              <button type="button" onClick={openWhatsApp} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#4F9167] px-4 text-[9px] font-semibold text-white active:bg-[#467F5A]">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>

                متابعة عبر واتساب
              </button>
            )}

            {/* SECONDARY ACTIONS */}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link to={trackingUrl} className="flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] border border-[#D9AEAA] bg-white text-[8px] font-semibold text-[#A95B61] active:bg-[#FFF7F5]">
                <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
                تتبع الطلب
              </Link>

              <Link to="/home" className="flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] border border-[#E5DAD6] bg-white text-[8px] font-medium text-[#655752] active:bg-[#FAF8F7]">
                <Home className="h-3.5 w-3.5" strokeWidth={1.5} />
                العودة للرئيسية
              </Link>
            </div>
          </div>

          {/* =================================================
              ORDER HELP
          ================================================= */}

          <div className="mt-4 flex items-center justify-center gap-1.5 text-center print:hidden">
            <FileText className="h-3 w-3 text-[#A99B96]" strokeWidth={1.4} />

            <p className="text-[6px] text-[#9C8E89]">احتفظ برقم الطلب لاستخدامه في صفحة التتبع.</p>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default OrderConfirmationPage;