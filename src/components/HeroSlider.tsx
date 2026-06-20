import { Link } from "react-router-dom";

const HeroSlider = () => {
  return (
    <section className="relative w-full h-[97vh] min-h-[600px] overflow-hidden bg-background">
      <img
        src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1800&q=90"
        alt="Flamingo — The New Collection"
        className="absolute inset-0 w-full h-full object-cover"
        fetchPriority="high"
      />
      {/* Subtle bottom-to-top dark wash for legibility — no color tints */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

      <div className="relative z-10 container mx-auto h-full px-6 flex flex-col justify-end pb-16 md:pb-24">
        <div className="max-w-2xl">
          <span className="block text-white/85 text-[10px] md:text-xs tracking-[0.5em] uppercase font-body mb-5">
            The New Collection — Autumn 2026
          </span>
          <h1 className="font-heading font-medium text-white text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-6 tracking-tight">
            مجموعة الخريف<br />الجديدة
          </h1>
          <p className="font-body text-white/80 text-sm md:text-base max-w-md leading-relaxed mb-10">
            قطعٌ نادرة، صياغةٌ حِرفية، وحضورٌ يسبق الكلمات.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Link
              to="/products"
              className="inline-flex items-center justify-center bg-white text-black font-body text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-white/90 transition-colors"
            >
              تسوق الان
            </Link>
            <Link
              to="/products?filter=featured"
              className="inline-flex items-center justify-center border border-white/80 text-white font-body text-xs tracking-[0.3em] uppercase px-10 py-4 hover:bg-white hover:text-black transition-colors"
            >
              اكتشف الحملة
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;