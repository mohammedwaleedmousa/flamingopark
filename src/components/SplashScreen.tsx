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
    const leaveAt = reduceMotion ? 900 : 1800;
    const doneAt = reduceMotion ? 1300 : 2500;
    const t1 = setTimeout(() => setLeaving(true), leaveAt);
    const t2 = setTimeout(() => onDone(), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone, reduceMotion]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      dir="rtl"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f6f6f8_45%,#ececf0_100%)]" />

      <div className="absolute top-[-8%] left-[-10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-8%] h-72 w-72 rounded-full bg-foreground/5 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 rounded-3xl border border-border/70 bg-card/80 px-10 py-12 shadow-2xl backdrop-blur-xl">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        <div className="relative overflow-hidden">
          <h1
            className={`logo-flamingo text-foreground text-4xl md:text-6xl tracking-[0.45em] ${reduceMotion ? "" : "animate-splash-rise"}`}
            style={{ letterSpacing: "0.45em" }}
          >
            FLAMINGO
          </h1>
        </div>

        <div className="h-px w-28 bg-foreground/15 overflow-hidden">
          <div className={`h-full bg-foreground ${reduceMotion ? "w-full" : "animate-splash-line"}`} />
        </div>

        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full bg-foreground/55 ${reduceMotion ? "" : "animate-pulse"}`}
              style={reduceMotion ? undefined : { animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>

        <p className="text-foreground/55 text-[10px] tracking-[0.26em] uppercase">Maison de Luxe</p>
      </div>
    </div>
  );
};

export default SplashScreen;