import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Heart, Shield, Truck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const StoreInfoPage = () => {
  const { data: storeInfo } = useQuery({
    queryKey: ['store-info'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['store_info', 'whatsapp_ye', 'whatsapp_sa']);
      
      let storeData: any = {};
      data?.forEach(item => {
        if (item.key === 'store_info' && typeof item.value === 'string') {
          try {
            storeData = JSON.parse(item.value);
          } catch {
            storeData = { name: 'Flamingo Park' };
          }
        } else if (item.key === 'whatsapp_ye') {
          storeData.whatsapp_ye = item.value;
        } else if (item.key === 'whatsapp_sa') {
          storeData.whatsapp_sa = item.value;
        }
      });
      return storeData;
    }
  });

  const contactInfo = [
    {
      icon: Phone,
      title: 'رقم الهاتف',
      content: [
        { label: 'السعودية', value: storeInfo?.phone_sa || '+966123456789' },
        { label: 'اليمن', value: storeInfo?.phone_ye || '+967123456789' }
      ]
    },
    {
      icon: Mail,
      title: 'البريد الإلكتروني',
      content: [{ label: '', value: storeInfo?.email || 'info@flamingopark.com' }]
    },
    {
      icon: Clock,
      title: 'ساعات العمل',
      content: [
        { label: 'السبت - الخميس', value: '10:00 - 22:00' },
        { label: 'الجمعة', value: '14:00 - 22:00' }
      ]
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'منتجات أصلية',
      description: 'جميع منتجاتنا مضمونة 100% أصلية ومفحوصة'
    },
    {
      icon: Truck,
      title: 'توصيل سريع',
      description: 'توصيل آمن وسريع إلى جميع المناطق'
    },
    {
      icon: Heart,
      title: 'خدمة العملاء',
      description: 'فريق دعم متخصص متوفر على مدار الساعة'
    }
  ];

  const handleWhatsApp = (number: string) => {
    window.open(`https://wa.me/${number}?text=مرحباً بك في فلامينجو بارك`, '_blank');
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
          className="relative bg-gradient-to-b from-gold/5 via-muted/30 to-background border-b border-border/50 overflow-hidden"
        >
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 py-16 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              <h1 className="font-heading text-4xl md:text-5xl text-foreground">
                معلومات <span className="text-gold">المتجر</span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto text-lg">
                تعرف على فلامينجو بارك وكيفية التواصل معنا
              </p>
            </motion.div>
          </div>
        </motion.section>

        <div className="container mx-auto px-4 py-16">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="font-heading text-3xl text-foreground mb-8 text-center">
              تواصل معنا
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactInfo.map((info, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-6 text-center hover:border-gold/50 transition-colors"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center">
                      <info.icon className="w-6 h-6 text-gold" />
                    </div>
                  </div>
                  <h3 className="font-heading text-lg text-foreground mb-4">{info.title}</h3>
                  <div className="space-y-2">
                    {info.content.map((item, i) => (
                      <div key={i}>
                        {item.label && (
                          <p className="text-sm text-muted-foreground font-body">{item.label}</p>
                        )}
                        <p className="text-foreground font-medium font-body">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="font-heading text-3xl text-foreground mb-8 text-center">
              لماذا تختار <span className="text-gold">فلامينجو بارك</span>؟
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-b from-gold/5 to-background border border-border rounded-xl p-8 text-center hover:-translate-y-2 transition-transform"
                >
                  <div className="flex justify-center mb-4">
                    <feature.icon className="w-12 h-12 text-gold" />
                  </div>
                  <h3 className="font-heading text-xl text-foreground mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground font-body">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* WhatsApp CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-gold/10 to-pink/10 border border-gold/20 rounded-xl p-8 text-center"
          >
            <h2 className="font-heading text-2xl text-foreground mb-4">
              هل لديك أي استفسار؟
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              تواصل معنا عبر WhatsApp للإجابة السريعة على جميع أسئلتك
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {storeInfo?.whatsapp_ye && (
                <Button
                  onClick={() => handleWhatsApp(storeInfo.whatsapp_ye)}
                  className="btn-gold px-8 py-3 rounded-lg"
                >
                  WhatsApp اليمن
                </Button>
              )}
              {storeInfo?.whatsapp_sa && (
                <Button
                  onClick={() => handleWhatsApp(storeInfo.whatsapp_sa)}
                  className="btn-gold px-8 py-3 rounded-lg"
                >
                  WhatsApp السعودية
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoreInfoPage;
