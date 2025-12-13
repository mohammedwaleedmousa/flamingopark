import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, FileText, Home, Copy, Download, Paperclip, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

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
  selected_accessories?: SelectedAccessory[];
}

interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  deliveryCompany: string;
  country: string;
  whatsappNumber: string;
  createdAt: string;
}

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [invoiceSaved, setInvoiceSaved] = useState(false);
  
  const currency = orderData?.country === 'SA' ? 'ريال' : 'ريال';

  useEffect(() => {
    if (location.state?.orderData) {
      setOrderData(location.state.orderData);
    } else {
      navigate('/home');
    }
  }, [location, navigate]);

  const handleCopyOrderNumber = () => {
    if (orderData) {
      navigator.clipboard.writeText(orderData.orderNumber);
      toast({
        title: 'تم النسخ',
        description: 'تم نسخ رقم الطلب',
      });
    }
  };

  const handleWhatsApp = () => {
    if (!orderData) return;

    const message = `مرحباً، أرغب في تأكيد الطلب رقم: ${orderData.orderNumber}

سأقوم بإرسال الفاتورة PDF في الرسالة التالية.`;
    
    const whatsappUrl = `https://wa.me/${orderData.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
    // Mark invoice as saved after printing
    setTimeout(() => {
      setInvoiceSaved(true);
      toast({
        title: 'تم حفظ الفاتورة',
        description: 'يمكنك الآن إرسالها عبر الواتساب لتأكيد الطلب',
      });
    }, 1000);
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Navbar />
        <CartDrawer />
      </div>

      <main className="pt-24 pb-16 print:pt-8">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8 print:hidden"
          >
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="font-heading text-3xl text-foreground mb-2">
              تم إرسال طلبك بنجاح!
            </h1>
            <p className="text-muted-foreground font-body">
              شكراً لك على طلبك. سيتم التواصل معك قريباً
            </p>
          </motion.div>

          {/* Invoice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border-2 border-gold rounded-lg p-6 md:p-8 mb-8"
            id="invoice"
          >
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <Logo size="md" />
                <p className="text-sm text-gray-500 mt-1">فاتورة طلب</p>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-900">{orderData.orderNumber}</span>
                  <button
                    onClick={handleCopyOrderNumber}
                    className="p-1 hover:bg-amber-50 rounded print:hidden"
                  >
                    <Copy className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(orderData.createdAt).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-heading text-gray-500 mb-2">معلومات العميل</h3>
                <p className="text-gray-900 font-body">{orderData.customerName}</p>
                <p className="text-gray-900 font-mono text-sm" dir="ltr">{orderData.customerPhone}</p>
              </div>
              <div>
                <h3 className="text-sm font-heading text-gray-500 mb-2">عنوان التوصيل</h3>
                <p className="text-gray-900 font-body">{orderData.customerAddress}</p>
                {orderData.customerNotes && (
                  <p className="text-gray-500 text-sm mt-1">{orderData.customerNotes}</p>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="text-sm font-heading text-gray-500 mb-4">المنتجات</h3>
              <div className="space-y-3">
                {orderData.items.map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-4">
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-16 h-16 object-cover rounded-md print:w-12 print:h-12"
                      />
                      <div className="flex-1">
                        <h4 className="font-heading text-gray-900">{item.product_name}</h4>
                        
                        {/* Size */}
                        {item.selected_size && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">الحجم:</span> {item.selected_size}
                          </p>
                        )}
                        
                        <p className="text-sm text-gray-500">
                          {item.quantity} × {item.price.toFixed(2)} {currency}
                        </p>
                      </div>
                      <span className="font-heading text-amber-600">
                        {(item.price * item.quantity).toFixed(2)} {currency}
                      </span>
                    </div>
                    
                    {/* Accessories with images */}
                    {item.selected_accessories && item.selected_accessories.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">الملحقات:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.selected_accessories.map((acc, i) => (
                            <div 
                              key={i} 
                              className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200"
                            >
                              {acc.image_url && (
                                <img 
                                  src={acc.image_url} 
                                  alt={acc.name_ar} 
                                  className="w-8 h-8 object-cover rounded"
                                />
                              )}
                              <div className="text-xs">
                                <span className="text-gray-700">{acc.name_ar}</span>
                                <span className="text-gray-500 mx-1">×{acc.quantity}</span>
                                <span className="text-amber-600">+{(acc.price * acc.quantity).toFixed(0)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-gray-500">المجموع الفرعي</span>
                <span className="text-gray-900">{orderData.subtotal.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-gray-500">رسوم التوصيل ({orderData.deliveryCompany})</span>
                <span className="text-gray-900">{orderData.deliveryFee.toFixed(2)} {currency}</span>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between font-heading text-lg">
                <span className="text-gray-900">الإجمالي</span>
                <span className="text-amber-600">{orderData.total.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-sm font-body pt-2">
                <span className="text-gray-500">طريقة الدفع</span>
                <span className="text-gray-900">
                  {orderData.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-4 print:hidden"
          >
            {/* Step 1: Save Invoice */}
            {!invoiceSaved && (
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-heading text-lg text-foreground mb-2">الخطوة ١</h3>
                <p className="text-foreground font-body mb-4">
                  اضغط الزر أدناه لحفظ الفاتورة كملف PDF على جهازك
                </p>
                <Button
                  onClick={handlePrintInvoice}
                  className="btn-gold gap-2"
                  size="lg"
                >
                  <FileText className="w-5 h-5" />
                  حفظ الفاتورة PDF
                </Button>
              </div>
            )}

            {/* Step 2: Send via WhatsApp (shown after saving) */}
            {invoiceSaved && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Success message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-green-700 font-heading">تم حفظ الفاتورة بنجاح!</p>
                </div>

                {/* Step 2 instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-4 text-center">الخطوة ٢: إرسال الفاتورة</h3>
                  
                  <div className="space-y-3 text-right mb-6">
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">1</span>
                      <p className="text-foreground text-sm">اضغط على زر "فتح الواتساب" أدناه</p>
                    </div>
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">2</span>
                      <div className="text-sm">
                        <p className="text-foreground">اضغط على أيقونة المرفقات</p>
                        <Paperclip className="w-4 h-4 text-muted-foreground mt-1 inline" />
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">3</span>
                      <p className="text-foreground text-sm">اختر ملف الفاتورة PDF الذي حفظته</p>
                    </div>
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm flex-shrink-0">4</span>
                      <div className="text-sm">
                        <p className="text-foreground">اضغط إرسال</p>
                        <Send className="w-4 h-4 text-muted-foreground mt-1 inline" />
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    فتح الواتساب
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Home button always visible */}
            <div className="flex justify-center">
              <Link to="/home">
                <Button
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted gap-2"
                >
                  <Home className="w-5 h-5" />
                  العودة للرئيسية
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

export default OrderConfirmationPage;
