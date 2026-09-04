import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, CheckCircle2, Copy, FileText, Home, MapPin, PackageCheck, Phone, ReceiptText, Truck } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { toast } from "@/hooks/use-toast";
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
  paymentMethodName?: string;
  deliveryCompany: string;
  selectedRegion?: string | null;
  country: string;
  currencyMode?: string;
  totalBase?: number;
  amountsAreNative?: boolean;
  createdAt: string;
}

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const flamingoLogo = "/icons/flamingo.jpeg";

  const currencyMode = orderData?.currencyMode || "SAR";
  const currencyConfig = CURRENCY_RATES[currencyMode as keyof typeof CURRENCY_RATES];
  const currency = currencyConfig?.symbol || "ر.س";

  const fmt = (amount: number) => {
    try {
      const displayAmount = orderData?.amountsAreNative ? Number(amount || 0) : convertPrice(amount, currencyMode as any);
      return displayAmount.toLocaleString("en-US", { maximumFractionDigits: 2 });
    } catch {
      return Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
    }
  };

  useEffect(() => {
    void hydrateCurrencies();
  }, []);

  useEffect(() => {
    const incomingOrder = location.state?.orderData as OrderData | undefined;

    if (!incomingOrder) {
      navigate("/home", { replace: true });
      return;
    }

    setOrderData(incomingOrder);

    track({
      event_type: "purchase",
      value: Number(incomingOrder.totalBase ?? incomingOrder.total) || 0,
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

  const handleCopyOrderNumber = async () => {
    if (!orderData) return;

    try {
      await navigator.clipboard.writeText(orderData.orderNumber);
      toast({ title: "تم نسخ رقم الطلب" });
    } catch {
      toast({ title: "تعذر نسخ رقم الطلب", variant: "destructive" });
    }
  };

  const trackingUrl = orderData ? `/order-tracking?order=${encodeURIComponent(orderData.orderNumber)}&token=${encodeURIComponent(orderData.trackingToken)}` : "/order-tracking";

  const paymentLabel = orderData?.paymentMethodName || (orderData?.paymentMethod === "cod" ? "الدفع عند الاستلام" : orderData?.paymentMethod === "bank" ? "تحويل بنكي أو عبر صراف" : orderData?.paymentMethod || "—");

  const createWhatsAppMessage = () => {
    if (!orderData) return "";

    const shownItems = orderData.items.slice(0, 20);
    const items = shownItems
      .map((item, index) => {
        const details = [item.selected_size ? `مقاس ${item.selected_size}` : "", item.selected_color ? `لون ${item.selected_color}` : ""].filter(Boolean).join(" • ");
        return `${index + 1}. ${item.product_name} ×${item.quantity}${details ? ` (${details})` : ""}`;
      })
      .join("\n");
    const remaining = orderData.items.length > shownItems.length ? `\n+ ${orderData.items.length - shownItems.length} منتجات أخرى` : "";
    const absoluteTrackingUrl = typeof window !== "undefined" ? `${window.location.origin}${trackingUrl}` : trackingUrl;
    const region = orderData.selectedRegion ? `\nمنطقة الاستلام: ${orderData.selectedRegion}` : "";

    return `فاتورة Flamingo Park\nرقم الطلب: ${orderData.orderNumber}\nالعميل: ${orderData.customerName}\nالهاتف: ${orderData.customerPhone}\n\nالمنتجات:\n${items}${remaining}\n\nشركة التوصيل: ${orderData.deliveryCompany}\nطريقة الدفع: ${paymentLabel}${region}\nرسوم التوصيل: ${fmt(orderData.deliveryFee)} ${currency}\nالإجمالي: ${fmt(orderData.total)} ${currency}\n\nتتبع الطلب:\n${absoluteTrackingUrl}`;
  };

  const openWhatsApp = () => {
    if (!orderData) return;
    const whatsappUrl = `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(createWhatsAppMessage())}`;
    window.location.assign(whatsappUrl);
  };

  const handleConfirmOrder = () => {
    if (!orderData || isConfirmed) return;
    setIsConfirmed(true);
    toast({ title: "تم تأكيد الطلب", description: "سيتم فتح واتساب مباشرة بدون انتظار تحميل ملف." });
    openWhatsApp();
  };

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
      <div className="print:hidden">
        <Navbar />
        <CartDrawer />
      </div>

      <main className="pb-12 pt-5 print:bg-white print:p-0 md:pb-16 md:pt-7">
        <div className="mx-auto w-full max-w-[820px] px-3 print:max-w-none print:px-0 md:px-6">
          <section className="mb-5 print:hidden">
            {isConfirmed ? (
              <div className="rounded-[16px] border border-[#D9E8DB] bg-[#F8FCF8] px-4 py-5 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF4EC]">
                  <CheckCircle2 className="h-6 w-6 text-[#63856A]" strokeWidth={1.5} />
                </span>
                <h1 className="mt-3 text-[17px] font-semibold text-[#3F4E42] md:text-[21px]">تم تأكيد طلبك بنجاح</h1>
                <p className="mx-auto mt-1.5 max-w-[390px] text-[8px] leading-5 text-[#829086]">تم تجهيز تفاصيل الطلب بشكل خفيف وسريع لتعمل جيداً حتى مع الإنترنت البطيء.</p>
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
                    <p className="mt-1 text-[8px] text-[#9B8D88]">راجع الفاتورة ثم أكّد الطلب. واتساب سيفتح فوراً برسالة فاتورة خفيفة بدون PDF ثقيل.</p>
                  </div>
                  <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9] md:flex">
                    <ReceiptText className="h-4 w-4 text-[#C66C72]" strokeWidth={1.5} />
                  </span>
                </div>
              </div>
            )}
          </section>

          <div id="invoice" className="overflow-hidden rounded-[16px] border border-[#E9DFDB] bg-white print:rounded-none print:border-0">
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
                  {new Date(orderData.createdAt).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

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
                <p className="mt-1 truncate text-[8px] font-semibold text-[#514540]">{orderData.deliveryCompany}</p>
              </div>
            </div>

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

            <div className="px-4 py-4 md:px-6 md:py-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[9px] font-semibold text-[#514540]">المنتجات</h3>
                <span className="text-[6px] text-[#A0938E]">{orderData.items.length} {orderData.items.length === 1 ? "منتج" : "منتجات"}</span>
              </div>

              <div>
                {(orderData.items || []).map((item, index) => (
                  <div key={`${item.product_id}-${index}`} className={`py-3 ${index !== orderData.items.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#EEE7E4] bg-[#F7F5F3] p-1 print:h-[52px] print:w-[52px]">
                        <img src={optimizeImage(item.product_image || "/placeholder.svg", 180, 72)} alt={item.product_name} loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-contain object-center" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-[9px] font-semibold text-[#4A3E3A]">{item.product_name}</h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[6px] text-[#948681]">
                          <span>الكمية: {item.quantity}</span>
                          {item.selected_size && <><span className="text-[#D2C8C4]">•</span><span>المقاس: {item.selected_size}</span></>}
                          {item.selected_color && <><span className="text-[#D2C8C4]">•</span><span>اللون: {item.selected_color}</span></>}
                        </div>
                        <p className="mt-1.5 text-[6px] text-[#A0938E]">{item.quantity} × {fmt(item.price)} {currency}</p>
                      </div>

                      <span className="shrink-0 text-[9px] font-semibold text-[#A95B61]">{fmt(item.price * item.quantity)} {currency}</span>
                    </div>

                    {item.selected_accessories && item.selected_accessories.length > 0 && (
                      <div className="mr-[76px] mt-3 rounded-[9px] bg-[#FAF8F7] px-3 py-2.5 print:mr-[62px]">
                        <p className="mb-2 text-[6px] font-medium text-[#9B8D88]">الإضافات</p>
                        <div className="space-y-2">
                          {item.selected_accessories.map((accessory, accessoryIndex) => (
                            <div key={`${accessory.name_ar}-${accessoryIndex}`} className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[6px] font-medium text-[#685A55]">{accessory.name_ar || accessory.name}</p>
                                <p className="mt-0.5 text-[5px] text-[#A0938E]">الكمية ×{accessory.quantity}</p>
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

            <div className="border-t border-[#EEE5E1] bg-[#FFFCFB] px-4 py-4 md:px-6 md:py-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[7px] text-[#746661]"><span>المجموع الفرعي</span><span>{fmt(orderData.subtotal)} {currency}</span></div>
                <div className="flex items-center justify-between gap-3 text-[7px] text-[#746661]"><span className="truncate">رسوم التوصيل ({orderData.deliveryCompany})</span><span className="shrink-0">{fmt(orderData.deliveryFee)} {currency}</span></div>
                {Number(orderData.discountAmount || 0) > 0 && (
                  <div className="flex items-center justify-between text-[7px] font-medium text-[#5F8066]">
                    <div className="flex items-center gap-1.5"><span>الخصم</span>{orderData.couponCode && <span className="rounded-[4px] bg-[#EAF4EC] px-1.5 py-0.5 font-mono text-[5px] text-[#58735D]">{orderData.couponCode}</span>}</div>
                    <span>-{fmt(Number(orderData.discountAmount))} {currency}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between border-t border-[#E8DFDB] pt-4">
                <div><p className="text-[8px] font-semibold text-[#514540]">الإجمالي</p><p className="mt-0.5 text-[5px] text-[#A99C97]">الإجمالي النهائي للطلب</p></div>
                <span className="text-[16px] font-bold text-[#B86168] md:text-[18px]">{fmt(orderData.total)} {currency}</span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EEE5E1] pt-3 sm:grid-cols-2">
                <div className="flex items-center justify-between gap-3"><span className="text-[6px] text-[#9A8C87]">طريقة الدفع</span><span className="text-[7px] font-medium text-[#5D504B]">{paymentLabel}</span></div>
                {orderData.selectedRegion && <div className="flex items-center justify-between gap-3 sm:border-r sm:border-[#E8DFDB] sm:pr-3"><span className="text-[6px] text-[#9A8C87]">منطقة الاستلام</span><span className="text-[7px] font-medium text-[#5D504B]">{orderData.selectedRegion}</span></div>}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#EEE5E1] px-4 py-3 md:px-6">
              <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#6E9274]" strokeWidth={1.7} /><span className="text-[5px] text-[#9B8D88]">تم إنشاء الطلب إلكترونياً</span></div>
              <span className="text-[5px] tracking-[0.08em] text-[#B5AAA6]">FLAMINGO PARK</span>
            </div>
          </div>

          <div className="mt-4 print:hidden">
            {!isConfirmed ? (
              <button type="button" onClick={handleConfirmOrder} className="flex h-[50px] w-full items-center justify-center gap-2.5 rounded-[12px] bg-[#D4777D] px-4 text-[9px] font-semibold text-white active:bg-[#C96B72]">
                <Check className="h-4 w-4" strokeWidth={2} />
                تأكيد الطلب وإرساله عبر واتساب
              </button>
            ) : (
              <button type="button" onClick={openWhatsApp} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#4F9167] px-4 text-[9px] font-semibold text-white active:bg-[#467F5A]">
                <FileText className="h-4 w-4" strokeWidth={1.7} />
                فتح الفاتورة في واتساب مرة أخرى
              </button>
            )}

            <button type="button" onClick={() => window.print()} className="mt-2 flex h-[42px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E5DAD6] bg-white text-[8px] font-medium text-[#655752] active:bg-[#FAF8F7]">
              <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
              طباعة أو حفظ الفاتورة PDF
            </button>

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

          <div className="mt-4 flex items-center justify-center gap-1.5 text-center print:hidden">
            <FileText className="h-3 w-3 text-[#A99B96]" strokeWidth={1.4} />
            <p className="text-[6px] text-[#9C8E89]">واتساب يستخدم رسالة نصية خفيفة لتقليل استهلاك الإنترنت.</p>
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
