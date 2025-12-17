import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, Home, Copy, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ermgoldLogo from '@/assets/ermgold-logo-new.jpeg';

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
  selectedRegion?: string | null;
  country: string;
  whatsappNumber: string;
  createdAt: string;
}

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  
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

  const handleConfirmOrder = async () => {
    if (!orderData || !invoiceRef.current) return;
    
    setIsConfirming(true);
    
    try {
      // Dynamic imports
      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      const html2canvasFn = html2canvasModule.default;
      const jsPDFClass = jsPDFModule.default;

      // Use lower scale for faster generation
      const canvas = await html2canvasFn(invoiceRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 5000,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDFClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, 297));
      
      // Upload to storage
      const pdfBlob = pdf.output('blob');
      const fileName = `invoice-${orderData.orderNumber}-${Date.now()}.pdf`;
      
      const { error } = await supabase.storage
        .from('invoices')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      setIsConfirmed(true);
      
      toast({
        title: 'تم تأكيد الطلب',
        description: 'جاري فتح الواتساب...',
      });

      // Open WhatsApp immediately
      const message = `طلب جديد ✨

الاسم: ${orderData.customerName}
الهاتف: ${orderData.customerPhone}
رقم الفاتورة: ${orderData.orderNumber}

يرجى مراجعة الطلب من لوحة التحكم`;
      
      const whatsappUrl = `https://wa.me/${orderData.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.location.href = whatsappUrl;
      
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تأكيد الطلب، حاول مرة أخرى',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
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
          {isConfirmed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8 print:hidden"
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h1 className="font-heading text-3xl text-foreground mb-2">
                تم تأكيد طلبك بنجاح!
              </h1>
              <p className="text-muted-foreground font-body">
                شكراً لك. سيتم التواصل معك قريباً
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mb-8 print:hidden"
            >
              <h1 className="font-heading text-3xl text-foreground mb-2">
                تفاصيل الطلب
              </h1>
              <p className="text-muted-foreground font-body">
                راجع الفاتورة ثم اضغط على زر تأكيد الطلب
              </p>
            </motion.div>
          )}

          {/* Invoice */}
          <motion.div
            ref={invoiceRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border-2 border-gold rounded-lg p-6 md:p-8 mb-6"
            id="invoice"
          >
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <img src={ermgoldLogo} alt="ERMGOLD" className="h-16 w-auto object-contain" />
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
              {orderData.selectedRegion && (
                <div className="flex justify-between text-sm font-body">
                  <span className="text-gray-500">منطقة الاستلام</span>
                  <span className="text-gray-900 font-medium">{orderData.selectedRegion}</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Confirm Button */}
          {!isConfirmed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="print:hidden"
            >
              <Button
                onClick={handleConfirmOrder}
                disabled={isConfirming}
                className="w-full btn-gold gap-3 text-lg py-6"
                size="lg"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جاري تحميل الفاتورة...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    قم بتحميل الفاتورة وارسل إلى الواتساب
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6 print:hidden"
          >
            <Link 
              to="/home" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-gold transition-colors font-body"
            >
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </Link>
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
