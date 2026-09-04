import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, FileCheck2, LockKeyhole, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";

type PolicyKey = "privacy" | "terms" | "returns" | "shipping";

interface PolicySection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

interface PolicyDefinition {
  eyebrow: string;
  title: string;
  summary: string;
  icon: typeof ShieldCheck;
  sections: PolicySection[];
}

const policies: Record<PolicyKey, PolicyDefinition> = {
  privacy: {
    eyebrow: "PRIVACY",
    title: "سياسة الخصوصية",
    summary: "نوضح هنا ما نجمعه لإتمام طلبك، ولماذا نحتاجه، وكيف نحافظ عليه.",
    icon: LockKeyhole,
    sections: [
      {
        title: "البيانات التي نعالجها",
        items: [
          "الاسم ورقم الهاتف وعنوان التوصيل والمحافظة والمدينة.",
          "تفاصيل السلة والطلب والدفع المختار وحالة التوصيل.",
          "بيانات الحساب الأساسية عند تسجيل الدخول، والرسائل التي ترسلها لخدمة العملاء.",
          "بيانات تقنية محدودة تساعدنا على حماية المتجر وقياس أداء الصفحات ومنع إساءة الاستخدام.",
        ],
      },
      {
        title: "كيف نستخدم البيانات",
        items: [
          "إنشاء الطلب والتحقق من توفر المنتجات وحساب السعر ورسوم التوصيل.",
          "التواصل بشأن التأكيد أو الشحن أو الإرجاع وتقديم الدعم.",
          "حماية الحسابات والطلبات، وتحسين تجربة المتجر وموثوقيته.",
        ],
      },
      {
        title: "المشاركة والدفع",
        paragraphs: [
          "نشارك الحد الأدنى اللازم من بيانات الطلب مع شركة التوصيل ومزودي البنية التقنية الذين يساعدوننا على تشغيل المتجر. لا نبيع بياناتك الشخصية.",
          "طرق الدفع الحالية هي التحويل البنكي أو الدفع عند الاستلام عند توفره. لا يطلب الموقع رقم بطاقتك أو رمزها السري ولا يخزنهما.",
        ],
      },
      {
        title: "الحفظ وحقوقك",
        paragraphs: [
          "نحتفظ ببيانات الطلب للمدة اللازمة للتنفيذ وخدمة ما بعد البيع والالتزامات التشغيلية والنظامية. يمكنك طلب تصحيح بياناتك أو الاستفسار عن استخدامها عبر صفحة التواصل، وقد نطلب ما يثبت ملكيتك للطلب لحمايتك.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "TERMS",
    title: "الشروط والأحكام",
    summary: "قواعد واضحة تنظم استخدام المتجر وإنشاء الطلب والدفع والتوصيل.",
    icon: FileCheck2,
    sections: [
      {
        title: "المنتجات والأسعار",
        items: [
          "نبذل عناية معقولة لعرض الصور والوصف والمقاسات بدقة، وقد تختلف الألوان قليلًا باختلاف الشاشة والإضاءة.",
          "السعر والمخزون والخصم النهائي يعاد التحقق منها عند إنشاء الطلب، ولا يُعتمد أي سعر ناتج عن خطأ تقني واضح.",
          "وجود المنتج في السلة لا يحجزه؛ يتم حجز المخزون عند نجاح إنشاء الطلب.",
        ],
      },
      {
        title: "تأكيد الطلب والدفع",
        paragraphs: [
          "يُعد الطلب مستلمًا بعد ظهور رقم الطلب وصفحة التأكيد. قد نتواصل معك للتحقق من البيانات قبل التجهيز. تتوفر طرق الدفع بحسب المحافظة وإعدادات المتجر الظاهرة في خطوة الدفع.",
        ],
      },
      {
        title: "التوصيل والإلغاء",
        items: [
          "يجب تقديم عنوان ورقم هاتف صحيحين ومتاحين للتواصل.",
          "يمكن طلب الإلغاء قبل تسليم الشحنة لشركة التوصيل؛ بعد ذلك يخضع الطلب لسياسة الإرجاع وتكاليف الشحن المطبقة.",
          "قد يُلغى الطلب عند نفاد المخزون أو تعذر التحقق من البيانات أو وجود محاولة إساءة استخدام، مع إبلاغ العميل متى أمكن.",
        ],
      },
      {
        title: "الاستخدام المقبول",
        paragraphs: [
          "لا يجوز محاولة تعطيل الموقع أو التحايل على الأسعار أو المخزون أو الوصول إلى بيانات لا تخصك. لا تحد هذه الشروط من أي حقوق لا يجوز استبعادها بموجب الأنظمة السارية.",
        ],
      },
    ],
  },
  returns: {
    eyebrow: "RETURNS",
    title: "سياسة الإرجاع والاستبدال",
    summary: "يمكن بدء طلب الإرجاع أو الاستبدال خلال 7 أيام من استلام الطلب وفق الشروط أدناه.",
    icon: RefreshCcw,
    sections: [
      {
        title: "شروط القبول",
        items: [
          "التواصل معنا خلال 7 أيام من تاريخ الاستلام مع رقم الطلب وسبب الطلب.",
          "أن يكون المنتج غير مستخدم أو مغسول أو متضرر، وبحالته وتغليفه وبطاقاته الأصلية.",
          "تخضع القطعة للفحص قبل اعتماد الاستبدال أو رد المبلغ.",
        ],
      },
      {
        title: "الاستثناءات",
        paragraphs: [
          "لا تُقبل المنتجات الشخصية أو الصحية بعد فتح تغليفها، ولا المنتجات المعدلة بطلب العميل، إلا إذا وصل المنتج معيبًا أو مختلفًا عن الطلب. لا تُقبل القطع التي تعرضت للاستخدام أو فقدت ملحقاتها أو بطاقاتها.",
        ],
      },
      {
        title: "المنتج الخاطئ أو المعيب",
        paragraphs: [
          "إذا وصل منتج خاطئ أو بعيب ظاهر، أرسل صورًا واضحة خلال مدة الإرجاع ولا تستخدمه. بعد التحقق، يتحمل المتجر تكاليف الإرجاع أو الاستبدال المرتبطة بالخطأ. في حال تغيير الرأي أو المقاس يتحمل العميل رسوم الشحن ما لم نتفق على غير ذلك.",
        ],
      },
      {
        title: "رد المبلغ",
        paragraphs: [
          "يبدأ رد المبلغ بعد استلام المنتج وفحصه والموافقة على الطلب. تتم الإعادة بالطريقة المتاحة والمتفق عليها، وقد تختلف مدة وصول المبلغ بحسب جهة التحويل. رسوم التوصيل الأصلية لا تُرد في حالات تغيير الرأي.",
        ],
      },
    ],
  },
  shipping: {
    eyebrow: "SHIPPING",
    title: "سياسة الشحن والتوصيل",
    summary: "تتحدد شركة التوصيل ورسومها ومدتها حسب المحافظة، وتظهر التفاصيل قبل تأكيد الطلب.",
    icon: Truck,
    sections: [
      {
        title: "نطاق التوصيل",
        paragraphs: [
          "يظهر توصيل فلامنجو للطلبات داخل عدن، وتظهر شركات التوصيل الخارجية للمحافظات التي تخدمها. إذا لم يظهر خيار مناسب لمحافظتك فتواصل معنا قبل إنشاء الطلب.",
        ],
      },
      {
        title: "الرسوم والمدة",
        items: [
          "تعرض صفحة الدفع رسوم كل شركة والمدة التقديرية المتاحة قبل التأكيد.",
          "المدة تقديرية وتبدأ بعد تأكيد الطلب، وقد تتأثر بأيام العطل أو الأحوال الجوية أو ظروف الطريق وشركة النقل.",
          "لا تُضاف رسوم توصيل مخفية بعد إنشاء الطلب؛ أي خدمة إضافية تحتاج موافقة العميل.",
        ],
      },
      {
        title: "العنوان والاستلام",
        paragraphs: [
          "يتحمل العميل مسؤولية صحة المحافظة والمدينة والعنوان ورقم الهاتف. قد تؤدي البيانات الناقصة أو تعذر التواصل إلى التأخير أو إعادة الشحنة، وقد تستحق رسوم إعادة التوصيل.",
        ],
      },
      {
        title: "التتبع والمساعدة",
        paragraphs: [
          "بعد إنشاء الطلب احتفظ برابط التتبع ورقم الطلب. تتحدث حالة الطلب تلقائيًا عند تسجيل مراحل التجهيز والتوصيل، ويمكنك التواصل معنا إذا تأخرت الشحنة عن المدة المعروضة.",
        ],
      },
    ],
  },
};

const policyKeyForPath = (pathname: string): PolicyKey => {
  if (pathname === "/privacy-policy") return "privacy";
  if (pathname === "/returns-policy") return "returns";
  if (pathname === "/shipping-policy") return "shipping";
  return "terms";
};

const PolicyPage = () => {
  const { pathname } = useLocation();
  const policy = policies[policyKeyForPath(pathname)];
  const Icon = policy.icon;

  return (
    <div className="min-h-screen bg-[#FFFDFC] text-[#302725]" dir="rtl">
      <Navbar />
      <CartDrawer />

      <main className="pb-16 pt-5 md:pb-20 md:pt-8">
        <div className="mx-auto w-full max-w-[880px] px-3 md:px-6">
          <header className="overflow-hidden rounded-[20px] border border-[#E9DFDB] bg-[#FFF7F5] px-4 py-6 md:px-7 md:py-9">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#C66C72] shadow-[0_8px_24px_rgba(80,45,40,0.05)]">
              <Icon className="h-5 w-5" strokeWidth={1.4} />
            </span>
            <p className="mt-5 font-serif text-[7px] tracking-[0.24em] text-[#B86168]">{policy.eyebrow}</p>
            <h1 className="mt-1.5 text-[23px] font-semibold tracking-[-0.035em] text-[#403130] md:text-[34px]">{policy.title}</h1>
            <p className="mt-2 max-w-[620px] text-[9px] leading-6 text-[#8F7E79] md:text-[11px] md:leading-7">{policy.summary}</p>
            <p className="mt-4 text-[7px] text-[#AA928C]">آخر تحديث: 3 سبتمبر 2026</p>
          </header>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-[#EAE0DC] bg-white md:mt-5">
            {policy.sections.map((section, index) => (
              <section key={section.title} className={`px-4 py-5 md:px-7 md:py-6 ${index !== policy.sections.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-4 rounded-full bg-[#D4777D]" />
                  <h2 className="text-[12px] font-semibold text-[#493B38] md:text-[14px]">{section.title}</h2>
                </div>

                {section.paragraphs?.map((paragraph) => <p key={paragraph} className="mt-3 text-[9px] leading-7 text-[#81736E] md:text-[10px]">{paragraph}</p>)}

                {section.items && (
                  <ul className="mt-3 space-y-2.5">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[9px] leading-7 text-[#81736E] md:text-[10px]">
                        <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4777D]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <section className="mt-4 flex flex-col gap-3 rounded-[16px] border border-[#E8D8D3] bg-white px-4 py-5 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div>
              <p className="text-[10px] font-semibold text-[#493B38]">هل تحتاج توضيحًا؟</p>
              <p className="mt-1 text-[7px] leading-5 text-[#94857F]">تواصل معنا واذكر رقم الطلب إن كان استفسارك متعلقًا بطلب قائم.</p>
            </div>
            <Link to="/store-info#contact" className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-[#D4777D] px-4 text-[8px] font-semibold text-white">
              تواصل معنا
              <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PolicyPage;
