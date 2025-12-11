import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ReviewsSection from '@/components/ReviewsSection';
import { Heart, Award, Users, Globe, FileText, X, Gem, Shield, Truck, Clock, Star, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const AboutPage = () => {
  const [certPdfUrl, setCertPdfUrl] = useState<string | null>(null);
  const [certImages, setCertImages] = useState<string[]>([]);
  const [showPdfModal, setShowPdfModal] = useState(false);

  useEffect(() => {
    fetchCertificationData();
  }, []);

  const fetchCertificationData = async () => {
    try {
      const { data: pdfSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'certification_pdf_url')
        .maybeSingle();

      if (pdfSetting?.value) {
        const url = typeof pdfSetting.value === 'string' 
          ? JSON.parse(pdfSetting.value) 
          : pdfSetting.value;
        if (url) setCertPdfUrl(url);
      }

      const { data: images } = await supabase
        .from('certification_images')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(3);

      if (images) {
        setCertImages(images.map(img => img.image_url));
      }
    } catch (error) {
      console.error('Error fetching certification data:', error);
    }
  };

  const values = [
    {
      icon: Heart,
      title: 'الجودة',
      description: 'نلتزم بأعلى معايير الجودة في جميع منتجاتنا',
      color: 'from-rose-500/20 to-rose-500/5',
    },
    {
      icon: Award,
      title: 'الأصالة',
      description: 'ذهب حقيقي بشهادات معتمدة من أفضل المختبرات',
      color: 'from-gold/20 to-gold/5',
    },
    {
      icon: Users,
      title: 'خدمة العملاء',
      description: 'فريق متخصص لخدمتك على مدار الساعة',
      color: 'from-blue-500/20 to-blue-500/5',
    },
    {
      icon: Globe,
      title: 'توصيل عالمي',
      description: 'نوصل إلى جميع أنحاء المنطقة بأمان',
      color: 'from-emerald-500/20 to-emerald-500/5',
    },
  ];

  const stats = [
    { value: '+5000', label: 'عميل سعيد', icon: Users },
    { value: '+10', label: 'سنوات خبرة', icon: Clock },
    { value: '100%', label: 'ذهب أصلي', icon: Gem },
    { value: '4.9', label: 'تقييم العملاء', icon: Star },
  ];

  const features = [
    { icon: Shield, title: 'ضمان الجودة', desc: 'جميع منتجاتنا مضمونة 100%' },
    { icon: Truck, title: 'شحن مجاني', desc: 'للطلبات فوق 500 ريال' },
    { icon: Clock, title: 'دعم 24/7', desc: 'نحن هنا لمساعدتك دائماً' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920"
              alt="ERMGOLD Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
            
            {/* Subtle Gold Shimmer */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10 py-16">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 backdrop-blur-md rounded-full mb-6 border border-gold/30"
            >
              <Gem className="w-4 h-4 text-gold" />
              <span className="font-body text-sm text-gold-light">منذ 2014</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-heading text-4xl md:text-6xl lg:text-7xl mb-4"
            >
              <span className="text-white">من</span>
              <span className="text-gold mx-3">نحن</span>
            </motion.h1>

            {/* Decorative Line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-6"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="font-body text-base md:text-lg text-white/80 max-w-xl mx-auto mb-10"
            >
              رحلة من التميز والأناقة في عالم المجوهرات الذهبية الفاخرة
            </motion.p>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="bg-black/40 backdrop-blur-md border border-gold/30 rounded-xl p-4 hover:border-gold/60 transition-all duration-300"
                >
                  <stat.icon className="w-5 h-5 text-gold mx-auto mb-2" />
                  <div className="font-heading text-xl md:text-2xl text-gold">{stat.value}</div>
                  <div className="text-xs text-white/60 font-body">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ delay: 1, y: { repeat: Infinity, duration: 1.5 } }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="w-6 h-6 text-gold/60" />
          </motion.div>
        </section>

        {/* Story Section */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Image */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800"
                    alt="ERMGOLD Story"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent" />
                </div>
                
                {/* Floating Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="absolute -bottom-6 -left-6 md:left-auto md:-right-6 bg-card border border-border/50 rounded-xl p-5 shadow-elegant max-w-[200px]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                      <Award className="w-5 h-5 text-gold" />
                    </div>
                    <div className="font-heading text-2xl text-gold">+10</div>
                  </div>
                  <p className="text-sm text-muted-foreground font-body">سنوات من التميز في صناعة المجوهرات</p>
                </motion.div>
              </motion.div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
              >
                <div>
                  <span className="text-gold font-body text-sm tracking-widest uppercase">قصتنا</span>
                  <h2 className="font-heading text-4xl md:text-5xl text-foreground mt-3 leading-tight">
                    نصنع <span className="text-gold">الأناقة</span>
                    <br />
                    منذ عام 2014
                  </h2>
                </div>
                
                <div className="w-24 h-1 bg-gradient-to-r from-gold to-transparent" />
                
                <div className="space-y-5">
                  <p className="font-body text-foreground/80 leading-relaxed text-lg">
                    بدأت رحلتنا من شغف عميق بفن صناعة المجوهرات وتقديم أفضل ما في عالم الذهب. 
                    منذ تأسيسنا، نسعى لنكون الوجهة الأولى لعشاق المجوهرات الفاخرة في المنطقة.
                  </p>
                  <p className="font-body text-foreground/80 leading-relaxed text-lg">
                    نفخر بتقديم تشكيلة متميزة من المجوهرات المصممة بعناية فائقة، 
                    حيث يجتمع الإبداع مع الحرفية العالية لخلق قطع استثنائية تدوم مدى الحياة.
                  </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border/30"
                    >
                      <feature.icon className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-heading text-sm text-foreground">{feature.title}</h4>
                        <p className="text-xs text-muted-foreground font-body mt-1">{feature.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="text-gold font-body text-sm tracking-widest uppercase">مبادئنا</span>
              <h2 className="font-heading text-4xl md:text-5xl text-foreground mt-3 mb-4">
                قيمنا <span className="text-gold">ورؤيتنا</span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className={`absolute inset-0 bg-gradient-to-b ${value.color} rounded-2xl transition-opacity group-hover:opacity-100 opacity-50`} />
                  <div className="relative bg-card/80 backdrop-blur-sm border border-border/30 p-8 rounded-2xl text-center transition-all duration-300 group-hover:border-gold/30 group-hover:-translate-y-2">
                    <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                      <value.icon className="w-10 h-10 text-gold" />
                    </div>
                    <h3 className="font-heading text-xl text-foreground mb-3 group-hover:text-gold transition-colors">
                      {value.title}
                    </h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Certification Section */}
        <section className="py-20 bg-secondary relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }} />
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="text-gold font-body text-sm tracking-widest uppercase">موثوقية</span>
              <h2 className="font-heading text-4xl md:text-5xl text-secondary-foreground mt-3 mb-4">
                <span className="text-gold">توثيق</span> المتجر
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-6" />
              <p className="text-gold-light/70 font-body max-w-lg mx-auto">
                نفتخر بحصولنا على شهادات الجودة والتوثيق من الجهات المعتمدة
              </p>
            </motion.div>

            {/* PDF Button */}
            {certPdfUrl && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="text-center mb-12"
              >
                <Button
                  onClick={() => setShowPdfModal(true)}
                  size="lg"
                  className="btn-gold gap-3 px-8 py-6 text-lg rounded-xl"
                >
                  <FileText className="w-6 h-6" />
                  عرض شهادات التوثيق
                </Button>
              </motion.div>
            )}

            {/* Certification Images */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {certImages.length > 0 ? (
                certImages.map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative aspect-square rounded-2xl overflow-hidden border-2 border-gold/20 hover:border-gold/50 transition-colors"
                  >
                    <img
                      src={img}
                      alt={`توثيق ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                      <span className="text-gold font-heading">شهادة التوثيق {index + 1}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                [1, 2, 3].map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="aspect-square bg-charcoal rounded-2xl border border-gold/20 flex items-center justify-center"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 flex items-center justify-center">
                        <Award className="w-8 h-8 text-gold/50" />
                      </div>
                      <p className="text-sm font-body text-gold-light/50">صورة التوثيق {index + 1}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <ReviewsSection />

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto text-center"
            >
              <Gem className="w-12 h-12 text-gold mx-auto mb-6" />
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                ابدأ رحلتك معنا
              </h2>
              <p className="text-muted-foreground font-body text-lg mb-8 max-w-xl mx-auto">
                اكتشف تشكيلتنا الفاخرة من المجوهرات الذهبية واختر قطعتك المميزة
              </p>
              <Button
                onClick={() => window.location.href = '/products'}
                size="lg"
                className="btn-gold px-10 py-6 text-lg rounded-xl gap-2"
              >
                <Gem className="w-5 h-5" />
                تصفح المنتجات
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />

      {/* PDF Modal */}
      {showPdfModal && certPdfUrl && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/90 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-5xl h-[85vh] bg-background rounded-2xl shadow-elegant overflow-hidden"
          >
            <button
              onClick={() => setShowPdfModal(false)}
              className="absolute top-4 right-4 z-10 p-3 bg-secondary text-gold rounded-full hover:bg-charcoal transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <iframe
              src={certPdfUrl}
              className="w-full h-full"
              title="شهادات التوثيق"
            />
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AboutPage;
