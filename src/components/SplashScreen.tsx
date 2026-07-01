import { useEffect, useState } from "react";

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(() => onDone(), 2300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="overflow-hidden">
          <h1
            className="logo-flamingo text-white text-4xl md:text-6xl tracking-[0.4em] animate-splash-rise"
            style={{ letterSpacing: "0.45em" }}
          >
            FLAMINGO
          </h1>
        </div>
        <div className="h-px w-24 bg-white/30 overflow-hidden">
          <div className="h-full bg-white animate-splash-line" />
        </div>
        <p className="text-white/60 text-[10px] tracking-[0em] uppercase">Maison de Luxe</p>
      </div>
    </div>
  );
};

export default SplashScreen;