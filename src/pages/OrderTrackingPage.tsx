import { motion } from 'framer-motion';
import { Package, CheckCircle2, Truck, MapPin, Clock, Phone, MessageCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface TrackingStep {
  title: string;
  description: string;
  date?: string;
  time?: string;
  completed: boolean;
  active: boolean;
  icon: typeof Package;
}

const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderFromQuery = searchParams.get('order');
  const [selectedOrder] = useState(orderFromQuery || 'ORD-1735683676054');

  const trackingSteps: TrackingStep[] = [
    {
      title: 'تم استقبال الطلب',
      description: 'تم استقبال طلبك برقم ORD-1735683676054',
      date: '2025-01-01',
      time: '14:30',
      completed: true,
      active: false,
      icon: Package
    },
    {
      title: 'جاري المعالجة',
      description: 'نحن نجهز طلبك للشحن',
      date: '2025-01-02',
      time: '09:15',
      completed: true,
      active: false,
      icon: Clock
    },
    {
      title: 'تم التسليم للمندوب',
      description: 'تسليم الطلب إلى شركة التوصيل',
      date: '2025-01-02',
      time: '16:45',
      completed: true,
      active: false,
      icon: Truck
    },
    {
      title: 'قيد التوصيل',
      description: 'الطلب في الطريق إليك',
      date: '2025-01-03',
      time: '11:20',
      completed: true,
      active: true,
      icon: MapPin
    },
    {
      title: 'تم التسليم',
      description: 'سيتم تسليم الطلب إليك قريباً',
      completed: false,
      active: false,
      icon: CheckCircle2
    }
  ];

  const handleContact = () => {
    window.open('https://wa.me/967782676054?text=مرحباً، أحتاج للاستعلام عن طلبي', '_blank');
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />
      
      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative bg-gradient-to-b from-gold/5 via-muted/30 to-background border-b border-border/50"
        >
          <div className="container mx-auto px-4 py-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h1 className="font-heading text-4xl md:text-5xl text-foreground">
                تتبع <span className="text-gold">طلبك</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                تابع رحلة طلبك من المتجر إلى باب منزلك
              </p>
            </motion.div>
          </div>
        </motion.section>

        <div className="container mx-auto px-4 py-12">
          {/* Order Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl p-6 mb-12 max-w-2xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">رقم الطلب</p>
                <p className="font-heading text-lg text-gold">{selectedOrder}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">تاريخ الطلب</p>
                <p className="font-body text-foreground">2025-01-01</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">الحالة</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <p className="font-body text-yellow-600">قيد التوصيل</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Timeline */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-6 top-8 bottom-0 w-0.5 bg-gradient-to-b from-gold via-gold/50 to-muted" />

              {/* Steps */}
              <div className="space-y-6">
                {trackingSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-6"
                    >
                      {/* Icon */}
                      <div className="flex flex-col items-center">
                        <motion.div
                          animate={step.active ? { scale: [1, 1.2, 1] } : {}}
                          transition={{ duration: 2, repeat: Infinity }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center relative z-10 flex-shrink-0 ${
                            step.completed || step.active
                              ? 'bg-gold text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className="pb-6">
                        <h3 className={`font-heading text-lg mb-1 ${
                          step.completed || step.active ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2 font-body">
                          {step.description}
                        </p>
                        {step.date && step.time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {step.date} - {step.time}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Delivery Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-gold/5 to-pink/5 border border-gold/20 rounded-xl p-8 max-w-2xl mx-auto mt-12"
          >
            <h2 className="font-heading text-2xl text-foreground mb-6">معلومات التوصيل</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">عنوان التسليم</p>
                  <p className="text-foreground font-body">صنعاء - الحي القديم - الشارع الرئيسي</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم التواصل</p>
                  <p className="text-foreground font-body">+967 77 1234 567</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">شركة التوصيل</p>
                  <p className="text-foreground font-body">فاست كوريير</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto mt-12 text-center"
          >
            <p className="text-muted-foreground mb-6">هل تحتاج إلى مساعدة؟</p>
            <Button
              onClick={handleContact}
              className="btn-gold gap-2 px-6 py-3 rounded-lg"
            >
              <MessageCircle className="w-5 h-5" />
              تواصل معنا عبر WhatsApp
            </Button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderTrackingPage;
