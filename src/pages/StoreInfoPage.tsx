import { useEffect } from "react";
import { ArrowLeft, Clock, Mail, MapPin, MessageCircle, Phone, Shield, Sparkles, Truck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

import { supabase } from "@/integrations/supabase/client";
import { getSiteText, useSiteContent } from "@/hooks/useSiteContent";

const StoreInfoPage = () => {
  const location = useLocation();
  const { data: content } = useSiteContent("store_info_");

  const { data: storeInfo } = useQuery({
    queryKey: ["store-info"],

    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value").in("key", ["store_info", "whatsapp", "whatsapp_ye", "whatsapp_sa"]);

      if (error) throw error;

      let storeData: Record<string, unknown> = {};

      data?.forEach((item) => {
        if (item.key === "store_info") {
          if (typeof item.value === "string") {
            try {
              storeData = JSON.parse(item.value) as Record<string, unknown>;
            } catch {
              storeData = { name: "Flamingo Park" };
            }
          } else if (item.value && typeof item.value === "object" && !Array.isArray(item.value)) {
            storeData = item.value as Record<string, unknown>;
          }
        } else {
          storeData[item.key] = item.value;
        }
      });

      return storeData;
    },

    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (!location.hash) return;
    const targetId = decodeURIComponent(location.hash.slice(1));
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "auto" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const whatsappNumber = storeInfo?.whatsapp || storeInfo?.whatsapp_ye || storeInfo?.whatsapp_sa;
  const phone = String(storeInfo?.phone_sa || storeInfo?.phone_ye || storeInfo?.phone || "+967778579777");
  const email = String(storeInfo?.email || "info@flamingopark.com");
  const whatsappDigits = whatsappNumber ? String(whatsappNumber).replace(/\D/g, "") : "";

  const pillars = [
    {
      icon: Sparkles,
      number: "01",
      title: getSiteText(content, "store_info_pillar_1_title", "انتقاء عالمي"),
      desc: getSiteText(content, "store_info_pillar_1_desc", "قطع مختارة من دور أزياء ومصادر موثوقة حول العالم."),
    },
    {
      icon: Shield,
      number: "02",
      title: getSiteText(content, "store_info_pillar_2_title", "أصالة مضمونة"),
      desc: getSiteText(content, "store_info_pillar_2_desc", "كل منتج يمرّ بفحص جودة قبل أن يصل إليك."),
    },
    {
      icon: Truck,
      number: "03",
      title: getSiteText(content, "store_info_pillar_3_title", "شحن موثوق"),
      desc: getSiteText(content, "store_info_pillar_3_desc", "توصيل سريع ومتتبَّع إلى المناطق التي نخدمها."),
    },
  ];

  const facts = [
    {
      label: getSiteText(content, "store_info_phone_label", "الهاتف"),
      value: phone,
      icon: Phone,
      href: `tel:${phone}`,
    },
    {
      label: getSiteText(content, "store_info_email_label", "البريد الإلكتروني"),
      value: email,
      icon: Mail,
      href: `mailto:${email}`,
    },
    {
      label: getSiteText(content, "store_info_hours_label", "ساعات العمل"),
      value: getSiteText(content, "store_info_hours_value", "السبت – الخميس · 10:00 – 22:00"),
      icon: Clock,
      href: "",
    },
    {
      label: getSiteText(content, "store_info_shipping_label", "الشحن"),
      value: getSiteText(content, "store_info_shipping_value", "اختر شركة التوصيل أثناء إتمام الطلب"),
      icon: MapPin,
      href: "",
    },
  ];

  const faq = [
    {
      q: getSiteText(content, "store_info_faq_1_q", "كيف أعرف حالة طلبي؟"),
      a: getSiteText(content, "store_info_faq_1_a", "استخدم صفحة تتبع الطلب وأدخل بيانات الطلب المطلوبة لمعرفة آخر حالة مسجلة."),
    },
    {
      q: getSiteText(content, "store_info_faq_2_q", "كيف أعرف رسوم ومدة التوصيل؟"),
      a: getSiteText(content, "store_info_faq_2_a", "تظهر شركة التوصيل ورسومها والمعلومات المتاحة عنها أثناء إتمام الطلب قبل التأكيد النهائي."),
    },
    {
      q: getSiteText(content, "store_info_faq_3_q", "كيف أطلب إرجاعاً أو استبدالاً؟"),
      a: getSiteText(content, "store_info_faq_3_a", "تواصل مع خدمة العملاء وأرسل رقم الطلب وتفاصيل المنتج، وسيتم التحقق من الطلب وحالة المنتج وإرشادك للخطوة المناسبة."),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-20 md:pt-24">
        <section id="about" className="scroll-mt-24 border-b border-[#F0E6E2] bg-[#FFF8F6]">
          <div className="mx-auto w-full max-w-[1200px] px-4 pb-7 pt-6 md:px-6 md:pb-12 md:pt-10">
            <div className="max-w-[720px]">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-[2px] w-5 rounded-full bg-[#D4777D]" />
                <span className="font-serif text-[7px] tracking-[0.27em] text-[#B86168] md:text-[8px]">FLAMINGO PARK · MAISON</span>
              </div>

              <h1 className="max-w-[580px] whitespace-pre-line text-[29px] font-semibold leading-[1.28] tracking-[-0.045em] text-[#403130] md:text-[48px] md:leading-[1.2]">{getSiteText(content, "store_info_hero_title", "متجر يصنع الأناقة\nبلغة عالمية.")}</h1>

              <p className="mt-4 max-w-[540px] text-[9px] leading-6 text-[#8F7E79] md:mt-5 md:text-[12px] md:leading-7">{getSiteText(content, "store_info_hero_description", "فلامنجو بارك وجهة للأزياء والإكسسوارات المنتقاة بعناية. نؤمن أن التفصيل الصغير هو ما يصنع الفرق، ولذلك نختار كل قطعة كما لو كانت لنا.")}</p>

              <div className="mt-5 flex items-center gap-2 md:mt-7">
                <span className="h-px w-8 bg-[#DABBB7]" />
                <span className="text-[6px] tracking-[0.16em] text-[#AA8D88]">CURATED WITH CARE</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-3 pt-6 md:px-6 md:pt-10">
          <div className="mb-4 md:mb-6">
            <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">OUR STANDARD</span>
            <h2 className="mt-1 text-[17px] font-semibold text-[#443633] md:text-[22px]">ما الذي يميز فلامنجو؟</h2>
          </div>

          <div className="overflow-hidden rounded-[17px] border border-[#EAE0DC] bg-white md:grid md:grid-cols-3">
            {pillars.map((pillar, index) => (
              <div key={pillar.title} className={`relative px-4 py-5 md:px-6 md:py-7 ${index !== pillars.length - 1 ? "border-b border-[#F0E8E5] md:border-b-0 md:border-l" : ""}`}>
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9]">
                    <pillar.icon className="h-4 w-4 stroke-[1.4] text-[#C66C72]" />
                  </span>
                  <span className="font-serif text-[7px] tracking-[0.12em] text-[#C8B1AC]">{pillar.number}</span>
                </div>
                <h3 className="mt-4 text-[13px] font-semibold text-[#493B38] md:text-[15px]">{pillar.title}</h3>
                <p className="mt-1.5 max-w-[310px] text-[8px] leading-5 text-[#94857F] md:text-[9px] md:leading-6">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-3 pt-8 md:px-6 md:pt-12">
          <div className="mb-4 flex items-end justify-between md:mb-6">
            <div>
              <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">CONTACT</span>
              <h2 className="mt-1 text-[17px] font-semibold text-[#443633] md:text-[22px]">معلومات المتجر</h2>
            </div>
            <span className="hidden text-[7px] text-[#A49792] sm:block">نحن هنا لمساعدتك</span>
          </div>

          <div className="overflow-hidden rounded-[17px] border border-[#EAE0DC] bg-white">
            {facts.map((fact, index) => {
              const row = (
                <div className="flex min-h-[62px] items-center gap-3 px-3.5 py-3 md:min-h-[70px] md:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F3F1]">
                    <fact.icon className="h-4 w-4 stroke-[1.4] text-[#B96A70]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[7px] text-[#A49792] md:text-[8px]">{fact.label}</span>
                    <span className="mt-1 block truncate text-[9px] font-medium text-[#51433F] md:text-[11px]">{fact.value}</span>
                  </div>
                  {fact.href && <ChevronIndicator />}
                </div>
              );

              return (
                <div key={fact.label} className={index !== facts.length - 1 ? "border-b border-[#F0E8E5]" : ""}>
                  {fact.href ? <a href={fact.href} className="block transition-colors active:bg-[#FFF8F6]">{row}</a> : row}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-3 px-3 pt-8 md:grid-cols-2 md:px-6 md:pt-12">
          <article id="shipping" className="scroll-mt-24 rounded-[17px] border border-[#EAE0DC] bg-white p-4 md:p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9]">
              <Truck className="h-4 w-4 stroke-[1.4] text-[#C66C72]" />
            </span>
            <span className="mt-4 block font-serif text-[6px] tracking-[0.2em] text-[#B86168]">SHIPPING</span>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[#493B38] md:text-[18px]">{getSiteText(content, "store_info_shipping_details_title", "الشحن والتوصيل")}</h2>
            <p className="mt-2 text-[8px] leading-6 text-[#94857F] md:text-[10px]">{getSiteText(content, "store_info_shipping_details_desc", "اختر شركة التوصيل أثناء إتمام الطلب. تظهر الرسوم والمعلومات المتاحة عن التوصيل قبل تأكيد الطلب، وبعد الإنشاء يمكنك متابعة حالة الطلب من صفحة التتبع.")}</p>
            <Link to="/order-tracking" className="mt-4 inline-flex items-center gap-1.5 text-[8px] font-semibold text-[#B86168]">
              تتبع طلبك
              <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            </Link>
          </article>

          <article id="returns" className="scroll-mt-24 rounded-[17px] border border-[#EAE0DC] bg-white p-4 md:p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4F7F1]">
              <Shield className="h-4 w-4 stroke-[1.4] text-[#6E876E]" />
            </span>
            <span className="mt-4 block font-serif text-[6px] tracking-[0.2em] text-[#6E876E]">RETURNS</span>
            <h2 className="mt-1.5 text-[15px] font-semibold text-[#493B38] md:text-[18px]">{getSiteText(content, "store_info_returns_title", "الإرجاع والاستبدال")}</h2>
            <p className="mt-2 text-[8px] leading-6 text-[#94857F] md:text-[10px]">{getSiteText(content, "store_info_returns_desc", "إذا احتجت إرجاعاً أو استبدالاً، تواصل مع خدمة العملاء وشارك رقم الطلب وتفاصيل المنتج. يتم التحقق من الطلب وحالة المنتج قبل تنفيذ الإجراء المناسب.")}</p>
            {whatsappDigits ? (
              <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[8px] font-semibold text-[#B86168]">
                تواصل عبر واتساب
                <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
              </a>
            ) : (
              <Link to="/store-info#contact" className="mt-4 inline-flex items-center gap-1.5 text-[8px] font-semibold text-[#B86168]">تواصل معنا<ArrowLeft className="h-3 w-3" strokeWidth={1.5} /></Link>
            )}
          </article>
        </section>

        <section id="faq" className="mx-auto w-full max-w-[1200px] scroll-mt-24 px-3 pt-8 md:px-6 md:pt-12">
          <div className="mb-4 md:mb-6">
            <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">FAQ</span>
            <h2 className="mt-1 text-[17px] font-semibold text-[#443633] md:text-[22px]">الأسئلة الشائعة</h2>
          </div>
          <div className="overflow-hidden rounded-[17px] border border-[#EAE0DC] bg-white">
            {faq.map((item, index) => (
              <details key={item.q} className={index !== faq.length - 1 ? "border-b border-[#F0E8E5]" : ""}>
                <summary className="cursor-pointer list-none px-4 py-4 text-[9px] font-semibold text-[#51433F] md:px-5 md:text-[11px]">{item.q}</summary>
                <p className="px-4 pb-4 text-[8px] leading-6 text-[#94857F] md:px-5 md:text-[10px]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-3 pt-8 md:px-6 md:pt-12">
          <div className="border-y border-[#E8D5D0] bg-[#FFF5F2] px-4 py-6 md:px-8 md:py-8">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                <Shield className="h-4 w-4 stroke-[1.4] text-[#C66C72]" />
              </span>
              <div>
                <span className="font-serif text-[6px] tracking-[0.2em] text-[#B86168]">FLAMINGO PROMISE</span>
                <h3 className="mt-1.5 text-[14px] font-semibold text-[#553E3E] md:text-[17px]">تجربة تسوق تستحق ثقتك</h3>
                <p className="mt-1.5 max-w-[650px] text-[8px] leading-5 text-[#9A7F7D] md:text-[10px] md:leading-6">من اختيار المنتج وحتى وصوله إليك، نهتم بالتفاصيل التي تجعل تجربتك مع فلامنجو أكثر وضوحًا وراحة.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-3 py-8 md:px-6 md:py-12">
          <div className="rounded-[20px] border border-[#E8D8D3] bg-white px-5 py-7 text-center md:px-8 md:py-10">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAECE9]">
              <MessageCircle className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
            </div>
            <span className="mt-4 block font-serif text-[6px] tracking-[0.22em] text-[#B86168]">PERSONAL SERVICE</span>
            <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.025em] text-[#493837] md:text-[25px]">{getSiteText(content, "store_info_cta_title", "هل تحتاج مساعدة في الاختيار؟")}</h2>
            <p className="mx-auto mt-2 max-w-[480px] text-[8px] leading-5 text-[#988782] md:text-[10px] md:leading-6">{getSiteText(content, "store_info_cta_description", "فريق خدمة العملاء متاح للإجابة على استفساراتك حول المقاسات، التوفر، أو الشحن.")}</p>

            <div className="mx-auto mt-5 flex max-w-[430px] flex-col gap-2 sm:flex-row sm:justify-center">
              {whatsappDigits && (
                <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[13px] bg-[#D4777D] px-5 text-[9px] font-semibold text-white active:bg-[#C96A71]">
                  <MessageCircle className="h-3.5 w-3.5 stroke-[1.6]" />
                  {getSiteText(content, "store_info_cta_whatsapp", "تواصل عبر واتساب")}
                </a>
              )}

              <Link to="/products" className="flex h-[44px] flex-1 items-center justify-center gap-2 rounded-[13px] border border-[#DDD1CC] bg-white px-5 text-[9px] font-semibold text-[#655651] active:bg-[#FFF8F6]">
                {getSiteText(content, "store_info_cta_products", "تصفح المجموعة")}
                <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

const ChevronIndicator = () => (
  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#E9DEDA] text-[#B56A6E]">
    <ArrowLeft className="h-3 w-3 stroke-[1.5]" />
  </span>
);

export default StoreInfoPage;
