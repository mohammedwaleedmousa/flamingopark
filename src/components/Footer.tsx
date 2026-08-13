import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp, FaFacebookF, FaSnapchatGhost } from "react-icons/fa";
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
      { label: "متاجرنا", href: "/store-info" },
      { label: "الوظائف", href: "/store-info" },
      { label: "الاستدامة", href: "/store-info" },
    ],
  },
  {
    title: "اكتشف",
    links: [
      { label: "نساء", href: "/products?category=women" },
      { label: "رجال", href: "/products?category=men" },
      { label: "جمال", href: "/products?category=beauty" },
      { label: "العروض", href: "/offers" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-[#E7DED9] bg-background text-[#403633]" dir="rtl">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6">
        {/* BRAND */}

        <div className="flex flex-col gap-5 border-b border-[#E8E0DC] py-8 md:flex-row md:items-end md:justify-between md:py-10">
          <div>
            <Link to="/home" className="inline-flex">
              <img src="/icons/flamingo.jpeg" alt="Flamingo Park" loading="lazy" decoding="async" className="h-[62px] w-auto object-contain md:h-[70px]" />
            </Link>

            <p className="mt-3 max-w-[370px] text-[13px] leading-7 text-[#857873]">متجر أزياء يجمع بين الماركات العالمية، الجودة، والتفاصيل التي تصنع أناقة مختلفة.</p>
          </div>

          {/* SOCIAL */}

          <div>
            <p className="mb-3 text-[12px] font-medium text-[#675A55]">تابع فلامنجو</p>

            <div className="flex items-center gap-2.5">
              

              <a href="#" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#25D366] text-[18px] text-white shadow-[0_3px_12px_rgba(37,211,102,0.14)] transition-transform duration-200 hover:-translate-y-0.5">
                <FaWhatsapp />
              </a>

              <a href="#" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#1877F2] text-[17px] text-white shadow-[0_3px_12px_rgba(24,119,242,0.14)] transition-transform duration-200 hover:-translate-y-0.5">
                <FaFacebookF />
              </a>

              <a href="#" aria-label="Snapchat" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FFFC00] text-[18px] text-black shadow-[0_3px_12px_rgba(150,145,0,0.12)] transition-transform duration-200 hover:-translate-y-0.5">
                <FaSnapchatGhost />
              </a>
            </div>
          </div>
        </div>

        {/* LINKS */}

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

        {/* BOTTOM */}

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