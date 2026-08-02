import { Phone, Mail, Clock, MapPin, Shield, Truck, Sparkles, MessageCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSiteText, useSiteContent } from '@/hooks/useSiteContent';

const StoreInfoPage = () => {
  const { data: content } = useSiteContent('store_info_');
  const { data: storeInfo } = useQuery({
    queryKey: ['store-info'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['store_info', 'whatsapp', 'whatsapp_ye', 'whatsapp_sa']);

      let storeData: Record<string, unknown> = {};
      data?.forEach((item) => {
        if (item.key === 'store_info') {
          if (typeof item.value === 'string') {
            try {
              storeData = JSON.parse(item.value) as Record<string, unknown>;
            } catch {
              storeData = { name: 'Flamingo Park' };
            }
          } else if (item.value && typeof item.value === 'object' && !Array.isArray(item.value)) {
            storeData = item.value;
          }
        } else {
          storeData[item.key] = item.value;
        }
      });
      return storeData;
    },
  });

  const whatsappNumber = storeInfo?.whatsapp || storeInfo?.whatsapp_ye || storeInfo?.whatsapp_sa;
  const phone = String(storeInfo?.phone_sa || storeInfo?.phone_ye || storeInfo?.phone || '+967778579777');
  const email = String(storeInfo?.email || 'info@flamingopark.com');

  const pillars = [
    { icon: Sparkles, title: getSiteText(content, 'store_info_pillar_1_title', 'انتقاء عالمي'), desc: getSiteText(content, 'store_info_pillar_1_desc', 'قطع مختارة من دور أزياء ومصادر موثوقة حول العالم.') },
    { icon: Shield, title: getSiteText(content, 'store_info_pillar_2_title', 'أصالة مضمونة'), desc: getSiteText(content, 'store_info_pillar_2_desc', 'كل منتج يمرّ بفحص جودة قبل أن يصل إليك.') },
    { icon: Truck, title: getSiteText(content, 'store_info_pillar_3_title', 'شحن دولي'), desc: getSiteText(content, 'store_info_pillar_3_desc', 'توصيل سريع ومتتبَّع إلى أغلب الدول التي نخدمها.') },
  ];

  const facts = [
    { label: getSiteText(content, 'store_info_phone_label', 'الهاتف'), value: phone, icon: Phone },
    { label: getSiteText(content, 'store_info_email_label', 'البريد الإلكتروني'), value: email, icon: Mail },
    { label: getSiteText(content, 'store_info_hours_label', 'ساعات العمل'), value: getSiteText(content, 'store_info_hours_value', 'السبت – الخميس · 10:00 – 22:00'), icon: Clock },
    { label: getSiteText(content, 'store_info_shipping_label', 'الشحن'), value: getSiteText(content, 'store_info_shipping_value', 'خدمة توصيل دولية'), icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pt-24 pb-24">
        {/* Editorial hero */}
        <section className="container mx-auto px-6">
          <div className="max-w-3xl">
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-6">Flamingo Park · Maison</p>
            <h1 className="font-heading text-4xl md:text-7xl leading-[1.1] text-foreground whitespace-pre-line">{getSiteText(content, 'store_info_hero_title', 'متجر يصنع الأناقة\nبلغة عالمية.')}</h1>
            <div className="h-px w-20 bg-border my-10" />
            <p className="text-sm md:text-base text-muted-foreground leading-8 max-w-xl">
              {getSiteText(content, 'store_info_hero_description', 'فلامنجو بارك وجهة للأزياء والإكسسوارات المنتقاة بعناية. نؤمن أن التفصيل الصغير هو ما يصنع الفرق، ولذلك نختار كل قطعة كما لو كانت لنا.')}
            </p>
          </div>
        </section>

        {/* Pillars */}
        <section className="container mx-auto px-6 mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-border">
            {pillars.map((p) => (
              <div key={p.title} className="py-10 md:px-8 border-b md:border-b-0 md:border-l last:md:border-l-0 border-border">
                <p.icon className="w-5 h-5 text-muted-foreground mb-6" strokeWidth={1.2} />
                <h2 className="font-heading text-xl text-foreground mb-3">{p.title}</h2>
                <p className="text-sm text-muted-foreground leading-7">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Facts table */}
        <section className="container mx-auto px-6 mt-24">
          <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-8">Contact</p>
          <dl className="border-t border-border">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-6 py-6 border-b border-border">
                <f.icon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.2} />
                <dt className="w-32 md:w-48 text-xs tracking-[0.15em] uppercase text-muted-foreground">{f.label}</dt>
                <dd className="text-sm md:text-base text-foreground">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 mt-24">
          <div className="border border-border p-10 md:p-16 text-center">
            <h2 className="font-heading text-2xl md:text-4xl text-foreground mb-4">{getSiteText(content, 'store_info_cta_title', 'هل تحتاج مساعدة في الاختيار؟')}</h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-7 mb-8">
              {getSiteText(content, 'store_info_cta_description', 'فريق خدمة العملاء متاح للإجابة على استفساراتك حول المقاسات، التوفر، أو الشحن.')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${String(whatsappNumber).replace(/^0+/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-unified inline-flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> {getSiteText(content, 'store_info_cta_whatsapp', 'تواصل عبر واتساب')}
                </a>
              )}
              <Link to="/products" className="btn-unified inline-flex items-center justify-center gap-2">
                {getSiteText(content, 'store_info_cta_products', 'تصفح المجموعة')} <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StoreInfoPage;