import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ReviewsSection from '@/components/ReviewsSection';
import { Heart, Award, Users, Globe } from 'lucide-react';

const AboutPage = () => {
  const values = [
    {
      icon: Heart,
      title: 'الجودة',
      titleEn: 'Quality',
      description: 'نلتزم بأعلى معايير الجودة في جميع منتجاتنا',
    },
    {
      icon: Award,
      title: 'الأصالة',
      titleEn: 'Authenticity',
      description: 'ذهب حقيقي بشهادات معتمدة من أفضل المختبرات',
    },
    {
      icon: Users,
      title: 'خدمة العملاء',
      titleEn: 'Customer Service',
      description: 'فريق متخصص لخدمتك على مدار الساعة',
    },
    {
      icon: Globe,
      title: 'توصيل عالمي',
      titleEn: 'Global Delivery',
      description: 'نوصل إلى جميع أنحاء المنطقة بأمان',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero */}
        <section className="relative py-24 bg-secondary overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-heading text-4xl md:text-6xl text-gold mb-6"
            >
              من نحن
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="font-body text-lg text-gold-light/80 max-w-2xl mx-auto"
            >
              رحلة من التميز والأناقة في عالم المجوهرات الذهبية
            </motion.p>
          </div>
        </section>

        {/* Story */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <img
                  src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800"
                  alt="ERMGOLD Story"
                  className="rounded-lg shadow-elegant"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h2 className="font-heading text-3xl md:text-4xl text-foreground">
                  قصة <span className="text-gold">ERMGOLD</span>
                </h2>
                <div className="w-20 h-px bg-gold" />
                <p className="font-body text-foreground/80 leading-relaxed">
                  بدأت رحلتنا من شغف عميق بفن صناعة المجوهرات وتقديم أفضل ما في عالم الذهب. 
                  منذ تأسيسنا، نسعى لنكون الوجهة الأولى لعشاق المجوهرات الفاخرة في المنطقة.
                </p>
                <p className="font-body text-foreground/80 leading-relaxed">
                  نفخر بتقديم تشكيلة متميزة من المجوهرات المصممة بعناية فائقة، 
                  حيث يجتمع الإبداع مع الحرفية العالية لخلق قطع استثنائية تدوم مدى الحياة.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section-beige">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                <span className="text-gold">قيمنا</span> ومبادئنا
              </h2>
              <div className="w-20 h-px bg-gold mx-auto" />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center bg-background p-8 rounded-lg shadow-card"
                >
                  <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-gold/10 rounded-full">
                    <value.icon className="w-8 h-8 text-gold" />
                  </div>
                  <h3 className="font-heading text-xl text-foreground mb-2">{value.title}</h3>
                  <p className="font-body text-sm text-muted-foreground">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
