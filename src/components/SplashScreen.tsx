import { useEffect, useState } from "react";

const SplashScreen = ({ onDone }: { onDone: () => void }) => {
  const [leaving, setLeaving] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReduceMotion(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const leaveAt = reduceMotion ? 450 : 1850;
    const doneAt = reduceMotion ? 650 : 2150;

    const leaveTimer = window.setTimeout(() => {
      setLeaving(true);
    }, leaveAt);

    const doneTimer = window.setTimeout(() => {
      onDone();
    }, doneAt);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone, reduceMotion]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background transition-opacity duration-300 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`} dir="rtl" role="status" aria-live="polite" aria-label="جاري فتح فلامنجو بارك">
      <div className={`flex flex-col items-center ${reduceMotion ? "" : "flamingo-splash-enter"}`}>
        <div className="relative h-[150px] w-[116px] sm:h-[170px] sm:w-[132px]">
          {/* الشكل الأساسي الفاتح */}
          <div className="absolute inset-0 bg-[#F0D7D6] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />

          {/* نفس الفلامنجو باللون الأغمق */}
          <div className={`absolute inset-0 bg-[#C96F79] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] ${reduceMotion ? "" : "flamingo-splash-reveal"}`} />

          {/* خط اللون الذي يمر أثناء الرسم */}
          {!reduceMotion && <div className="flamingo-splash-sweep absolute inset-0 [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />}
        </div>

      </div>

      <style>{`
        .flamingo-splash-enter {
          animation: flamingo-splash-enter 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .flamingo-splash-reveal {
          clip-path: inset(0 0 100% 0);
          animation: flamingo-splash-reveal 2.15s cubic-bezier(0.65, 0, 0.35, 1) both;
        }

        .flamingo-splash-sweep {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 34%,
            rgba(169, 91, 97, 0.12) 40%,
            rgba(169, 91, 97, 0.95) 48%,
            rgba(169, 91, 97, 1) 50%,
            rgba(169, 91, 97, 0.95) 52%,
            rgba(169, 91, 97, 0.12) 60%,
            transparent 66%,
            transparent 100%
          );

          background-size: 100% 52%;
          background-repeat: no-repeat;
          background-position: center -80%;

          animation: flamingo-splash-sweep 2.15s cubic-bezier(0.65, 0, 0.35, 1) both;
        }

        @keyframes flamingo-splash-enter {
          0% {
            opacity: 0;
            transform: scale(0.965);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes flamingo-splash-reveal {
          0% {
            clip-path: inset(0 0 100% 0);
          }

          10% {
            clip-path: inset(0 0 100% 0);
          }

          72% {
            clip-path: inset(0 0 0% 0);
          }

          100% {
            clip-path: inset(0 0 0% 0);
          }
        }

        @keyframes flamingo-splash-sweep {
          0% {
            background-position: center -80%;
            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          74% {
            background-position: center 180%;
            opacity: 1;
          }

          88% {
            opacity: 0;
          }

          100% {
            background-position: center 180%;
            opacity: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flamingo-splash-enter,
          .flamingo-splash-reveal,
          .flamingo-splash-sweep {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;