import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useStore } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, Banknote, Truck, Copy, MessageCircle, Loader2 } from 'lucide-react';

interface DeliveryCompany {
  id: string;
  name: string;
  base_fee: number;
  delivery_days: string | null;
}

interface BankAccount {
  bank: string;
  account: string;
  name: string;
}

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { country, customer, cart, getCartTotal, clearCart } = useStore();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
  const [selectedDelivery, setSelectedDelivery] = useState('');
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    address: '',
    notes: '',
  });

  // Fetch delivery companies
  const { data: deliveryCompanies = [] } = useQuery({
    queryKey: ['delivery-companies', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_companies')
        .select('*')
        .eq('country', country)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as DeliveryCompany[];
    },
    enabled: !!country,
  });

  // Fetch bank accounts from site settings
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', country],
    queryFn: async () => {
      const key = country === 'SA' ? 'bank_accounts_sa' : 'bank_accounts_ye';
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      if (data?.value && Array.isArray(data.value)) {
        return (data.value as unknown) as BankAccount[];
      }
      return [] as BankAccount[];
    },
    enabled: !!country,
  });

  // Fetch WhatsApp number from site settings
  const { data: whatsappNumber } = useQuery({
    queryKey: ['whatsapp-number', country],
    queryFn: async () => {
      const key = country === 'SA' ? 'whatsapp_sa' : 'whatsapp_ye';
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as string) || (country === 'SA' ? '966123456789' : '967123456789');
    },
    enabled: !!country,
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      order_number: string;
      customer_id: string;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      customer_notes: string;
      country: string;
      items: any;
      subtotal: number;
      delivery_fee: number;
      total: number;
      delivery_company_id: string;
      payment_method: string;
    }) => {
      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

  const selectedCompany = deliveryCompanies.find(c => c.id === selectedDelivery);
  const subtotal = getCartTotal();
  const deliveryFee = selectedCompany?.base_fee || 0;
  const total = subtotal + deliveryFee;
  const currency = country === 'SA' ? 'ريال' : 'ريال';

  const handleCopyAccount = (account: string) => {
    navigator.clipboard.writeText(account);
    toast({
      title: 'تم النسخ',
      description: 'تم نسخ رقم الحساب',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.address || !selectedDelivery) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول المطلوبة',
        variant: 'destructive',
      });
      return;
    }

    const orderNumber = `ORD-${Date.now()}`;
    
    // Prepare cart items with product images
    const orderItems = cart.map(item => ({
      product_id: item.product.id,
      product_name: item.product.nameAr,
      product_image: item.product.images[0],
      quantity: item.quantity,
      price: item.product.discount
        ? item.product.price * (1 - item.product.discount / 100)
        : item.product.price,
    }));

    try {
      await createOrderMutation.mutateAsync({
        order_number: orderNumber,
        customer_id: customer!.id,
        customer_name: customer!.name,
        customer_phone: customer!.phone,
        customer_address: formData.address,
        customer_notes: formData.notes,
        country: country!,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        delivery_company_id: selectedDelivery,
        payment_method: paymentMethod,
      });

      // Build WhatsApp message with product details
      const itemsList = orderItems.map(item => 
        `• ${item.product_name} (${item.quantity}x) - ${item.price.toFixed(2)} ${currency}`
      ).join('\n');

      const message = `🛒 طلب جديد #${orderNumber}

👤 العميل: ${customer!.name}
📱 الهاتف: ${customer!.phone}
📍 العنوان: ${formData.address}
${formData.notes ? `📝 ملاحظات: ${formData.notes}` : ''}

📦 المنتجات:
${itemsList}

💰 المجموع الفرعي: ${subtotal.toFixed(2)} ${currency}
🚚 التوصيل: ${deliveryFee.toFixed(2)} ${currency}
💵 الإجمالي: ${total.toFixed(2)} ${currency}

💳 طريقة الدفع: ${paymentMethod === 'cod' ? 'عند الاستلام' : 'تحويل بنكي'}`;
      
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      clearCart();
      navigate('/home');
      
      toast({
        title: 'تم إرسال الطلب',
        description: 'سيتم التواصل معك قريباً',
      });
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال الطلب',
        variant: 'destructive',
      });
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <CartDrawer />
        <main className="pt-32 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-heading text-2xl text-foreground mb-4">السلة فارغة</h1>
            <Button onClick={() => navigate('/products')} className="btn-gold">
              تسوق الآن
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl md:text-4xl text-foreground mb-8 text-center"
          >
            إتمام <span className="text-gold">الطلب</span>
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Customer Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6">معلومات التوصيل</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-body text-muted-foreground mb-2">الاسم الكامل</label>
                    <Input
                      value={customer?.name || ''}
                      disabled
                      className="bg-muted border-border"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-body text-muted-foreground mb-2">رقم الهاتف</label>
                    <Input
                      value={customer?.phone || ''}
                      disabled
                      className="bg-muted border-border"
                      dir="ltr"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-body text-muted-foreground mb-2">العنوان *</label>
                    <Textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="bg-muted border-border"
                      rows={3}
                      dir="rtl"
                      placeholder={country === 'SA' ? 'جدة، المملكة العربية السعودية' : 'عدن، اليمن'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-body text-muted-foreground mb-2">ملاحظات</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="bg-muted border-border"
                      rows={2}
                      dir="rtl"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Delivery */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gold" />
                  شركة التوصيل
                </h2>
                {deliveryCompanies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deliveryCompanies.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => setSelectedDelivery(company.id)}
                        className={`p-4 border rounded-lg text-right transition-all ${
                          selectedDelivery === company.id
                            ? 'border-gold bg-gold/5'
                            : 'border-border hover:border-gold/50'
                        }`}
                      >
                        <h3 className="font-heading text-foreground">{company.name}</h3>
                        <p className="text-sm text-muted-foreground font-body mt-1">
                          {company.base_fee} {currency} {company.delivery_days && `• ${company.delivery_days}`}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">لا توجد شركات توصيل متاحة</p>
                )}
              </motion.div>

              {/* Payment */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card border border-border rounded-lg p-6"
              >
                <h2 className="font-heading text-xl text-foreground mb-6">طريقة الدفع</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-gold bg-gold/5'
                        : 'border-border hover:border-gold/50'
                    }`}
                  >
                    <Banknote className="w-6 h-6 text-gold" />
                    <div className="text-right">
                      <h3 className="font-heading text-foreground">الدفع عند الاستلام</h3>
                      <p className="text-xs text-muted-foreground font-body">Cash on Delivery</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setPaymentMethod('bank')}
                    className={`p-4 border rounded-lg flex items-center gap-3 transition-all ${
                      paymentMethod === 'bank'
                        ? 'border-gold bg-gold/5'
                        : 'border-border hover:border-gold/50'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-gold" />
                    <div className="text-right">
                      <h3 className="font-heading text-foreground">تحويل بنكي</h3>
                      <p className="text-xs text-muted-foreground font-body">Bank Transfer</p>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'bank' && bankAccounts.length > 0 && (
                  <div className="bg-muted rounded-lg p-4 space-y-4">
                    <p className="text-sm text-muted-foreground font-body">
                      يرجى التحويل إلى أحد الحسابات التالية:
                    </p>
                    {bankAccounts.map((acc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background rounded-md">
                        <div>
                          <p className="font-heading text-sm text-foreground">{acc.bank}</p>
                          <p className="text-xs text-muted-foreground font-mono" dir="ltr">{acc.account}</p>
                        </div>
                        <button
                          onClick={() => handleCopyAccount(acc.account)}
                          className="p-2 text-gold hover:bg-gold/10 rounded-md transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-1"
            >
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="font-heading text-xl text-foreground mb-6">ملخص الطلب</h2>
                
                <div className="space-y-4 mb-6">
                  {cart.map((item) => {
                    const price = item.product.discount
                      ? item.product.price * (1 - item.product.discount / 100)
                      : item.product.price;
                    return (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <img
                          src={item.product.images[0]}
                          alt={item.product.nameAr}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                        <div className="flex-1">
                          <h3 className="font-heading text-sm text-foreground">{item.product.nameAr}</h3>
                          <p className="text-xs text-muted-foreground font-body">
                            {item.quantity} × {price.toFixed(2)} {currency}
                          </p>
                        </div>
                        <span className="font-heading text-sm text-gold">
                          {(price * item.quantity).toFixed(2)} {currency}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="h-px bg-border mb-4" />

                <div className="space-y-2 text-sm font-body mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span className="text-foreground">{subtotal.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التوصيل</span>
                    <span className="text-foreground">{deliveryFee.toFixed(2)} {currency}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between text-lg">
                    <span className="font-heading text-foreground">المجموع</span>
                    <span className="font-heading text-gold">{total.toFixed(2)} {currency}</span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={createOrderMutation.isPending || !selectedDelivery}
                  className="w-full btn-gold py-6 font-heading tracking-wider"
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 ml-2" />
                      تأكيد الطلب
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
