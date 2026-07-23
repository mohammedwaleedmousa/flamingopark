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
      <div className="absolute inset-0 bg-white" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.09),transparent_60%)]" />

      <div className="relative flex flex-col items-center gap-6 px-6 py-12">
        <div className="relative">
          <h1
            className={`text-center font-heading text-4xl md:text-6xl tracking-[0.45em] text-foreground ${
              reduceMotion ? "" : "animate-splash-rise"
            }`}
          >
            FLAMINGO 
          </h1>
          <div className={`absolute inset-0 shimmer-text ${reduceMotion ? "opacity-40" : ""}`} />
        </div>
      </div>

      <style>{`
        .shimmer-text {
          background: linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.45) 50%, transparent 100%);
          mix-blend-mode: screen;
          animation: splash-shimmer 1.9s ease-in-out infinite;
        }
        @keyframes splash-shimmer {
          0% { transform: translateX(-120%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;