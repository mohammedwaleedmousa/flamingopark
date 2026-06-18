import { Link } from "react-router-dom";
import { Instagram, Mail, ArrowUp, Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="bg-white text-black relative overflow-hidden">
      {/* خلفية خفيفة فخمة */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.03),transparent_70%)]" />

      <div className="container mx-auto px-6 py-32 relative">
        {/* ================= الهوية ================= */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-5xl md:text-7xl"
            style={{ fontFamily: "serif" }}
          >
            Flamingo Park
          </motion.h2>

          <div className="w-24 h-[1px] bg-black mx-auto my-10" />

          <p className="text-sm md:text-base text-black/70 leading-loose">
            تجربة تسوق فاخرة تجمع بين الذوق العصري والتفاصيل الراقية لنقدم لك أسلوب حياة يعكس هويتك بكل بساطة وأناقة.
          </p>
        </div>

        {/* ================= معلومات رئيسية ================= */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-14 text-center">
          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase mb-4 text-black/60">الموقع</h3>
            <div className="flex items-center justify-center gap-2 text-black/70">
              <MapPin className="w-4 h-4" />
              اليمن - متجر إلكتروني
            </div>
          </div>

          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase mb-4 text-black/60">الهاتف</h3>
            <div className="flex items-center justify-center gap-2 text-black/70">
              <Phone className="w-4 h-4" />
              +967 777 777 777
            </div>
          </div>

          <div>
            <h3 className="text-xs tracking-[0.3em] uppercase mb-4 text-black/60">البريد الإلكتروني</h3>
            <div className="flex items-center justify-center gap-2 text-black/70">
              <Mail className="w-4 h-4" />
              support@flamingo.com
            </div>
          </div>
        </div>

        {/* ================= الروابط ================= */}
        <div className="mt-28 flex flex-wrap justify-center gap-10 text-sm">
          {[
            { label: "الرئيسية", href: "/home" },
            { label: "المنتجات", href: "/products" },
            { label: "العروض", href: "/offers" },
            { label: "المفضلة", href: "/favorites" },
            { label: "من نحن", href: "/about" },
            { label: "التقييمات", href: "/reviews" },
            { label: "تواصل معنا", href: "/contact" },
          ].map((item, i) => (
            <motion.div key={i} whileHover={{ y: -4 }}>
              <Link to={item.href} className="text-black/60 hover:text-black transition">
                {item.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ================= السوشيال ================= */}
        <div className="mt-28 flex justify-center gap-6">
          <motion.a
            whileHover={{ scale: 1.2 }}
            href="#"
            className="w-12 h-12 border border-black/10 rounded-full flex items-center justify-center hover:border-black transition"
          >
            <Instagram className="w-5 h-5" />
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.2 }}
            href="mailto:support@flamingo.com"
            className="w-12 h-12 border border-black/10 rounded-full flex items-center justify-center hover:border-black transition"
          >
            <Mail className="w-5 h-5" />
          </motion.a>
        </div>

        {/* ================= النهاية ================= */}
        <div className="mt-32 border-t border-black/10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-black/50">
          <p>© 2026 Flamingo Park — جميع الحقوق محفوظة</p>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-1 hover:text-black transition mt-4 md:mt-0"
          >
            العودة للأعلى
            <ArrowUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
