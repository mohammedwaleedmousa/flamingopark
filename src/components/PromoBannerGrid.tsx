import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const BANNERS = {
  main: {
    eyebrow: "Autumn Winter 2026",
    title: "مجموعة الشتاء الجديدة",
    subtitle: "خصومات تصل إلى 40٪ على قطع مختارة",
    cta: "تسوّق الآن",
    href: "/products?filter=featured",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=90",
  },
  top: {
    tag: "New In",
    title: "وصل حديثاً",
    href: "/new-arrivals",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=85",
  },
  bottom: {
    tag: "Best Sellers",
    title: "الأكثر مبيعاً",
    href: "/best-sellers",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=900&q=85",
  },
};

const PromoBannerGrid = () => {
  return (
    <section className="py-10 md:py-16 bg-background" dir="rtl">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:h-[520px]">

          {/* Main hero banner (2/3 width) */}
          <Link
            to={BANNERS.main.href}
            className="relative md:col-span-2 group overflow-hidden rounded-3xl min-h-[280px] md:min-h-0"
          >
            <img
              src={BANNERS.main.image}
              alt={BANNERS.main.title}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-[1200ms] ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 md:p-10 text-white">
              <p className="text-[10px] tracking-[0.4em] uppercase opacity-80 mb-3">
                {BANNERS.main.eyebrow}
              </p>
              <h2 className="font-heading text-3xl md:text-5xl leading-tight mb-3 max-w-md">
                {BANNERS.main.title}
              </h2>
              <p className="text-sm md:text-base opacity-90 mb-5 max-w-sm">
                {BANNERS.main.subtitle}
              </p>
              <span className="inline-flex items-center gap-2 self-start px-6 py-3 rounded-full bg-white text-black text-[11px] tracking-[0.3em] uppercase font-medium hover:bg-pink-500 hover:text-white transition">
                {BANNERS.main.cta}
                <ArrowLeft className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>

          {/* Right column: two stacked banners */}
          <div className="grid grid-rows-2 gap-4 md:gap-5">
            {[BANNERS.top, BANNERS.bottom].map((b) => (
              <Link
                key={b.href}
                to={b.href}
                className="relative group overflow-hidden rounded-3xl min-h-[200px]"
              >
                <img
                  src={b.image}
                  alt={b.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-[1000ms] ease-out"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-5 text-white">
                  <p className="text-[9px] tracking-[0.4em] uppercase opacity-80 mb-1">{b.tag}</p>
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-xl md:text-2xl">{b.title}</h3>
                    <span className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition">
                      <ArrowLeft className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default PromoBannerGrid;