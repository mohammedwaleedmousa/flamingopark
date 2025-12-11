import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';
import { CheckCircle, MessageCircle, FileText, Home, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  product_id: string;
  product_name: string;
  product_image: string;
  quantity: number;
  price: number;
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

    const itemsList = orderData.items.map(item => 
      `• ${item.product_name} (${item.quantity}x) - ${item.price.toFixed(2)} ${currency}`
    ).join('\n');

    const message = `🛒 طلب جديد #${orderData.orderNumber}

👤 العميل: ${orderData.customerName}
📱 الهاتف: ${orderData.customerPhone}
📍 العنوان: ${orderData.customerAddress}
${orderData.customerNotes ? `📝 ملاحظات: ${orderData.customerNotes}` : ''}

📦 المنتجات:
${itemsList}

💰 المجموع الفرعي: ${orderData.subtotal.toFixed(2)} ${currency}
🚚 التوصيل: ${orderData.deliveryFee.toFixed(2)} ${currency}
💵 الإجمالي: ${orderData.total.toFixed(2)} ${currency}

💳 طريقة الدفع: ${orderData.paymentMethod === 'cod' ? 'عند الاستلام' : 'تحويل بنكي'}`;
    
    const whatsappUrl = `https://wa.me/${orderData.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
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
                <h2 className="font-heading text-2xl text-amber-600">ERMGOLD</h2>
                <p className="text-sm text-gray-500">فاتورة طلب</p>
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
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-md print:w-12 print:h-12"
                    />
                    <div className="flex-1">
                      <h4 className="font-heading text-gray-900">{item.product_name}</h4>
                      <p className="text-sm text-gray-500">
                        {item.quantity} × {item.price.toFixed(2)} {currency}
                      </p>
                    </div>
                    <span className="font-heading text-amber-600">
                      {(item.price * item.quantity).toFixed(2)} {currency}
                    </span>
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
            className="grid grid-cols-3 gap-3 print:hidden"
          >
            <Button
              onClick={handleWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="hidden sm:inline">واتساب</span>
            </Button>
            <Button
              onClick={handlePrintInvoice}
              className="bg-gold hover:bg-gold/90 text-black gap-2"
            >
              <FileText className="w-5 h-5" />
              <span className="hidden sm:inline">طباعة/PDF</span>
            </Button>
            <Link to="/home">
              <Button
                variant="outline"
                className="w-full border-border text-foreground hover:bg-muted gap-2"
              >
                <Home className="w-5 h-5" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Button>
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
