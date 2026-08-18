import { Link } from "react-router-dom";
import { ArrowUp, ChevronLeft } from "lucide-react";

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "خدمة العملاء",
    links: [
      { label: "اتصل بنا", href: "/store-info" },
      { label: "الشحن والتوصيل", href: "/store-info" },
      { label: "الإرجاع والاستبدال", href: "/store-info" },
      { label: "الأسئلة الشائعة", href: "/store-info" },
    ],
  },
  {
    title: "فلامنجو",
    links: [
      { label: "عن فلامنجو", href: "/store-info" },
      { label: "معلومات المتجر", href: "/store-info" },
      { label: "الماركات", href: "/brands" },
      { label: "باركود المتجر", href: "/qr-code" },
    ],
  },
  {
    title: "اكتشف",
    links: [
      { label: "نساء", href: "/categories?parent=women" },
      { label: "رجال", href: "/categories?parent=men" },
      { label: "الأقسام", href: "/categories" },
      { label: "العروض", href: "/seasonal-offers" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-[#E7DED9] bg-background text-[#403633]" dir="rtl">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
        <div className="border-b border-[#E8E0DC] py-8 md:py-10">
          <Link to="/home" className="inline-flex">
            <img src="/icons/flamingo.jpeg" alt="Flamingo Park" loading="lazy" decoding="async" className="h-[62px] w-auto object-contain md:h-[70px]" />
          </Link>
          <p className="mt-3 max-w-[370px] text-[13px] leading-7 text-[#857873]">متجر أزياء يجمع بين الماركات العالمية، الجودة، والتفاصيل التي تصنع أناقة مختلفة.</p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-9 py-8 sm:grid-cols-3 md:gap-x-16 md:py-10">
          {cols.map((col) => (
            <div key={col.title}>
              <div className="mb-4 flex items-center gap-2">
                <span className="h-[18px] w-[3px] rounded-full bg-[#D4777D]" />
                <h3 className="text-[14px] font-semibold text-[#403633]">{col.title}</h3>
              </div>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="group inline-flex items-center gap-1 text-[13px] text-[#857873] transition-colors hover:text-[#B86168]">
                      <span>{link.label}</span>
                      <ChevronLeft className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-[-2px] group-hover:opacity-100" strokeWidth={1.5} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E8E0DC] py-3.5 sm:flex-row">
          <p className="text-center text-[11px] text-[#948781] sm:text-right">© 2026 فلامنجو بارك — جميع الحقوق محفوظة.</p>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="العودة للأعلى" className="flex h-9 items-center gap-2 rounded-[10px] border border-[#DED3CE] bg-background px-3.5 text-[11px] font-medium text-[#675A55] transition-colors hover:border-[#D3AAA7] hover:text-[#B86168]">
            العودة للأعلى
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
