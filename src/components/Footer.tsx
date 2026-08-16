import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp, FaFacebookF, FaSnapchatGhost } from "react-icons/fa";
import { ArrowUp, ChevronLeft } from "lucide-react";

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "خدمة العملاء", links: [{ label: "اتصل بنا", href: "/store-info" }, { label: "الشحن والتوصيل", href: "/store-info" }, { label: "الإرجاع والاستبدال", href: "/store-info" }, { label: "الأسئلة الشائعة", href: "/store-info" }] },
  { title: "فلامنجو", links: [{ label: "عن فلامنجو", href: "/store-info" }, { label: "متاجرنا", href: "/store-info" }, { label: "الوظائف", href: "/store-info" }, { label: "الاستدامة", href: "/store-info" }] },
  { title: "اكتشف", links: [{ label: "نساء", href: "/products?category=women" }, { label: "رجال", href: "/products?category=men" }, { label: "جمال", href: "/products?category=beauty" }, { label: "العروض", href: "/offers" }] },
];

const Footer = () => {
  return (
    <footer className="w-full border-t border-[#E7DED9] bg-background text-[#403633]" dir="rtl">
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:max-w-[1500px] lg:px-10 xl:px-12">
        <div className="flex flex-col gap-5 border-b border-[#E8E0DC] py-8 md:flex-row md:items-end md:justify-between md:py-10 lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-center lg:gap-16 lg:py-14">
          <div><Link to="/home" className="inline-flex"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" loading="lazy" decoding="async" className="h-[62px] w-auto object-contain md:h-[70px] lg:h-[86px]" /></Link><p className="mt-3 max-w-[370px] text-[13px] leading-7 text-[#857873] lg:mt-4 lg:max-w-[520px] lg:text-[15px] lg:leading-8">متجر أزياء يجمع بين الماركات العالمية، الجودة، والتفاصيل التي تصنع أناقة مختلفة.</p></div>
          <div className="lg:justify-self-end"><p className="mb-3 text-[12px] font-medium text-[#675A55] lg:text-[14px]">تابع فلامنجو</p><div className="flex items-center gap-2.5 lg:gap-3"><a href="#" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#E1306C] text-[18px] text-white transition-transform duration-200 hover:-translate-y-0.5 lg:h-11 lg:w-11"><FaInstagram /></a><a href="#" aria-label="WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#25D366] text-[18px] text-white transition-transform duration-200 hover:-translate-y-0.5 lg:h-11 lg:w-11"><FaWhatsapp /></a><a href="#" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#1877F2] text-[17px] text-white transition-transform duration-200 hover:-translate-y-0.5 lg:h-11 lg:w-11"><FaFacebookF /></a><a href="#" aria-label="Snapchat" className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#FFFC00] text-[18px] text-black transition-transform duration-200 hover:-translate-y-0.5 lg:h-11 lg:w-11"><FaSnapchatGhost /></a></div></div>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-9 py-8 sm:grid-cols-3 md:gap-x-16 md:py-10 lg:grid-cols-3 lg:gap-x-24 lg:py-12">
          {cols.map((col) => <div key={col.title}><div className="mb-4 flex items-center gap-2 lg:mb-5"><span className="h-[18px] w-[3px] rounded-full bg-[#D4777D] lg:h-6" /><h3 className="text-[14px] font-semibold text-[#403633] lg:text-[16px]">{col.title}</h3></div><ul className="space-y-3 lg:space-y-4">{col.links.map((link) => <li key={link.label}><Link to={link.href} className="group inline-flex items-center gap-1 text-[13px] text-[#857873] transition-colors hover:text-[#B86168] lg:text-[14px]"><span>{link.label}</span><ChevronLeft className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-[-2px] group-hover:opacity-100" strokeWidth={1.5} /></Link></li>)}</ul></div>)}
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#E8E0DC] py-3.5 sm:flex-row lg:py-5"><p className="text-center text-[11px] text-[#948781] sm:text-right lg:text-[12px]">© 2026 فلامنجو بارك — جميع الحقوق محفوظة.</p><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="العودة للأعلى" className="flex h-9 items-center gap-2 rounded-[10px] border border-[#DED3CE] bg-background px-3.5 text-[11px] font-medium text-[#675A55] transition-colors hover:border-[#D3AAA7] hover:text-[#B86168] lg:h-10 lg:px-4 lg:text-[12px]">العودة للأعلى<ArrowUp className="h-3.5 w-3.5" strokeWidth={1.6} /></button></div>
      </div>
    </footer>
  );
};

export default Footer;
