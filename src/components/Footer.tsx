import { Link } from "react-router-dom";
import { FaInstagram, FaWhatsapp, FaFacebookF, FaSnapchatGhost } from "react-icons/fa";
import { Instagram, Mail, ArrowUp } from "lucide-react";

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "خدمة العملاء",
    links: [
      { label: "اتصل بنا", href: "/contact" },
      { label: "الشحن والتوصيل", href: "/about" },
      { label: "الإرجاع والاستبدال", href: "/about" },
      { label: "الأسئلة الشائعة", href: "/about" },
    ],
  },
  {
    title: "الرئيسية",
    links: [
      { label: "عن فلامنجو", href: "/about" },
      { label: "متاجرنا", href: "/about" },
      { label: "الوظائف", href: "/about" },
      { label: "الاستدامة", href: "/about" },
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
    <footer className="bg-background text-foreground border-t border-border">
      {/* Newsletter */}
      <section className="border-b border-border">
        <div className="container mx-auto px-6 py-20 md:py-28 text-center max-w-2xl">
          <p className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground mb-5">النشرة البريدية</p>
          <h2 className="font-heading text-3xl md:text-5xl leading-tight mb-6">
            انضم/ي إلى عالم فلامنجو
          </h2>
          <p className="text-sm text-muted-foreground mb-10 leading-relaxed">
            احصل/ي على آخر إصداراتنا وقصص الموضة الحصرية مباشرةً في بريدك.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 bg-transparent border-b border-border px-2 py-3 text-sm focus:outline-none focus:border-foreground"
              dir="ltr"
            />
            <button
              type="button"
              className="bg-foreground text-background text-[11px] tracking-[0.3em] uppercase px-8 py-3 hover:bg-foreground/90 transition-colors"
            >
              إشتراك
            </button>
          </form>
        </div>
      </section>

      {/* Link columns */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div>
            <Link to="/home" className="flex items-center">
              <img
                src="/icons/flamingo.jpeg"
                alt="Flamingo"
                className="h-20 md:h-10 w-auto object-contain pr-12"
              />
            </Link>
            <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
              دار أزياء تجمع بين الحرفة الفاخرة والروح المعاصرة.
            </p>
            <div className="flex items-center gap-3 mt-6">

  {/* Instagram */}
  <a
    href="#"
    aria-label="Instagram"
    className="w-9 h-9 rounded-full border border-border flex items-center justify-center
    hover:bg-pink-500 hover:text-white transition"
  >
    <FaInstagram />
  </a>

  {/* WhatsApp */}
  <a
    href="#"
    aria-label="WhatsApp"
    className="w-9 h-9 rounded-full border border-border flex items-center justify-center
    hover:bg-green-500 hover:text-white transition"
  >
    <FaWhatsapp />
  </a>

  {/* Facebook */}
  <a
    href="#"
    aria-label="Facebook"
    className="w-9 h-9 rounded-full border border-border flex items-center justify-center
    hover:bg-blue-600 hover:text-white transition"
  >
    <FaFacebookF />
  </a>

  {/* Snapchat */}
  <a
    href="#"
    aria-label="Snapchat"
    className="w-9 h-9 rounded-full border border-border flex items-center justify-center
    hover:bg-yellow-400 hover:text-black transition"
  >
    <FaSnapchatGhost />
  </a>

</div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h3 className="text-[10px] tracking-[0.35em] uppercase text-foreground mb-5">{col.title}</h3>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center text-[11px] text-muted-foreground gap-4 -mb-20">
          <p>© 2026 فلامنجو بارك — جميع الحقوق محفوظة.</p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 hover:text-foreground transition-colors"
          >
            عودة للأعلى <ArrowUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
