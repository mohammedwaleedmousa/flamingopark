import { Truck, ShieldCheck, RotateCcw, Headphones } from "lucide-react";

const items = [
  { icon: Truck, title: "شحن سريع", desc: "خلال 2-5 أيام عمل" },
  { icon: ShieldCheck, title: "دفع آمن", desc: "حماية كاملة لبياناتك" },
  { icon: RotateCcw, title: "إرجاع مجاني", desc: "خلال 14 يوم" },
  { icon: Headphones, title: "دعم 24/7", desc: "خدمة عملاء مميزة" },
];

const TrustBar = () => (
  <section className="py-10 md:py-14 bg-muted/40 border-y border-border/40" dir="rtl">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {items.map((it, i) => (
          <div
            key={it.title}
            className="flex items-center gap-3 md:gap-4 p-4 rounded-2xl bg-background/60 hover:bg-background border border-transparent hover:border-border transition-all duration-300 animate-card-rise"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-foreground text-background flex items-center justify-center flex-shrink-0">
              <it.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-sm md:text-base text-foreground truncate">
                {it.title}
              </p>
              <p className="text-[11px] md:text-xs text-muted-foreground truncate">
                {it.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TrustBar;