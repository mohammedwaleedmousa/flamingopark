import { useEffect, useState } from "react";

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const leaveAt = reduceMotion ? 900 : 2000;
    const doneAt = reduceMotion ? 1300 : 2600;
    const t1 = setTimeout(() => setLeaving(true), leaveAt);
    const t2 = setTimeout(() => onDone(), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone, reduceMotion]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      dir="rtl"
    >
      {/* Flamingo gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-50 via-gold/10 to-purple-50" />
      
      {/* Animated background circles */}
      <div className={`absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-gradient-to-br from-gold/20 to-pink/20 blur-3xl ${!reduceMotion ? "animate-pulse" : ""}`} style={!reduceMotion ? { animationDuration: "4s" } : undefined} />
      <div className={`absolute bottom-[-15%] left-[-8%] w-80 h-80 rounded-full bg-gradient-to-tl from-primary/10 to-gold/10 blur-3xl ${!reduceMotion ? "animate-pulse" : ""}`} style={!reduceMotion ? { animationDuration: "5s", animationDelay: "1s" } : undefined} />

      {/* Main card - responsive sizing */}
      <div className="relative flex flex-col items-center gap-6 md:gap-8 w-full md:w-auto md:rounded-3xl md:border md:border-gold/30 md:bg-card/80 px-6 md:px-10 py-12 md:py-16 md:shadow-2xl md:backdrop-blur-xl">
        <div className="absolute inset-0 md:rounded-3xl bg-gradient-to-b from-white/30 md:from-white/40 to-transparent pointer-events-none hidden md:block" />

        {/* Logo and tagline - animated entrance */}
        <div className="relative space-y-4 md:space-y-6">
          {/* Flamingo graphic indicator */}
          <div className={`flex justify-center mb-4 ${!reduceMotion ? "animate-bounce" : ""}`} style={!reduceMotion ? { animationDuration: "2s" } : undefined}>
            <div className="relative">
              {/* Flamingo-inspired icon */}
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-gold via-primary to-pink flex items-center justify-center">
                <span className="text-2xl md:text-3xl">🦩</span>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gold rounded-full flex items-center justify-center">
                <span className="text-lg">✨</span>
              </div>
            </div>
          </div>

          {/* Main title */}
          <div className="relative overflow-hidden">
            <h1
              className={`text-center font-heading text-4xl md:text-6xl tracking-[0.45em] bg-gradient-to-r from-gold via-primary to-pink bg-clip-text text-transparent ${
                reduceMotion ? "" : "animate-splash-rise"
              }`}
              style={{ letterSpacing: "0.45em" }}
            >
              FLAMINGO
            </h1>
          </div>

          {/* Decorative line */}
          <div className="h-1 w-24 md:w-28 mx-auto bg-gradient-to-r from-transparent via-gold to-transparent overflow-hidden">
            <div className={`h-full w-full ${reduceMotion ? "" : "animate-splash-line"}`} />
          </div>

          {/* Subtitle */}
          <p className="text-center text-primary/70 text-sm md:text-base font-body">مقر الفخامة والأناقة</p>
        </div>

        {/* Loading indicators */}
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full bg-gradient-to-r from-gold to-primary ${
                reduceMotion ? "bg-gold" : "animate-pulse"
              }`}
              style={
                reduceMotion
                  ? undefined
                  : {
                      animationDelay: `${i * 200}ms`,
                      animationDuration: "1.4s"
                    }
              }
            />
          ))}
        </div>

        {/* Footer text */}
        <p className="text-center text-muted-foreground text-xs md:text-sm tracking-widest uppercase">
          جودة × أناقة × ثقة
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;