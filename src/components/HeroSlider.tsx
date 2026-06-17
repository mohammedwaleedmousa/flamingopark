import { Link } from "react-router-dom";

const HeroSlider = () => {
  return (
    <section className="relative w-full h-[78vh] min-h-[480px] overflow-hidden bg-muted">
      <img
        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=85"
        alt="Flamingo - أناقة عصرية"
        className="absolute inset-0 w-full h-full object-cover"
        fetchPriority="high"
      />
      {/* Vertical pink gradient overlay on the right (RTL = start) */}
      <div className="absolute inset-y-0 right-0 w-full md:w-3/5 bg-gradient-to-l from-primary/85 via-primary/55 to-transparent" />

      <div className="relative z-10 container mx-auto h-full px-6 flex flex-col justify-end pb-14 md:pb-20">
        <div className="max-w-md text-right">
          <span className="block text-primary-foreground/80 text-xs tracking-[0.3em] font-body mb-3">
            مجموعة خريف 2026
          </span>
          <h1 className="font-heading text-primary-foreground text-4xl md:text-5xl lg:text-6xl leading-tight mb-4">
            أناقة عصرية<br />تُعاد تعريفها
          </h1>
          <p className="font-body text-primary-foreground/85 text-sm md:text-base leading-relaxed mb-6">
            اكتشف قطعاً مصممة بحرفية عالية لمن يقدّرن الذوق الرفيع والتفاصيل الراقية.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center justify-center bg-primary-container text-primary font-medium px-7 py-3 rounded-full hover:bg-card hover:text-primary transition-all"
            >
              تسوّقي الآن
            </Link>
            <Link
              to="/products?filter=featured"
              className="inline-flex items-center justify-center border border-primary-foreground/70 text-primary-foreground font-medium px-7 py-3 rounded-full hover:bg-primary-foreground hover:text-primary transition-all"
            >
              المجموعة
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSlider;