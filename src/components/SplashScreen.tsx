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
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-white transition-opacity duration-500 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      dir="rtl"
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .flamingo-logo {
          animation: slideUp 0.8s ease-out;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .park-logo {
          animation: slideUp 0.8s ease-out 0.2s both;
          font-weight: 300;
          letter-spacing: 0.15em;
        }
      `}</style>
      <div className="flex flex-col items-center justify-center gap-2">
        <h1 className="flamingo-logo text-5xl md:text-7xl font-bold text-black">
          flamingo
        </h1>
        <p className="park-logo text-lg md:text-xl text-gray-600 tracking-wider">
          park
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;