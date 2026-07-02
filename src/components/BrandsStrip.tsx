const BRANDS = [
  "NIKE", "ADIDAS", "ZARA", "GUCCI", "PUMA",
  "LOUIS VUITTON", "DIOR", "CHANEL", "PRADA", "BALENCIAGA",
];

const BrandsStrip = () => {
  // duplicate for seamless loop
  const items = [...BRANDS, ...BRANDS];
  return (
    <section className="py-8 md:py-12 border-y border-border/60 bg-background overflow-hidden" dir="ltr">
      <div className="container mx-auto px-6 mb-6">
        <p className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground text-center">
          — علاماتنا المميزة · Our Brands —
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex gap-14 md:gap-20 whitespace-nowrap animate-[brand-scroll_40s_linear_infinite] hover:[animation-play-state:paused]">
          {items.map((b, i) => (
            <span
              key={i}
              className="font-heading text-lg md:text-2xl tracking-[0.4em] text-foreground/50 hover:text-foreground transition"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes brand-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default BrandsStrip;