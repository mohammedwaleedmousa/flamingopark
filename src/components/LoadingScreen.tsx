const LoadingScreen = () => {
  return (
    <div className="flex min-h-[100svh] items-center justify-center overflow-hidden bg-background" dir="rtl" role="status" aria-live="polite" aria-label="جاري التحميل">
      <div className="flex flex-col items-center">
        <div className="relative h-[150px] w-[116px] sm:h-[170px] sm:w-[132px]">
          {/* Flamingo الأساسي */}
          <div className="absolute inset-0 bg-[#F0D7D6] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />

          {/* اللون الغامق الذي يعيد رسم الطائر */}
          <div className="flamingo-loader-reveal absolute inset-0 bg-[#C96F79] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />

          {/* اللمعة التي تمر فوق الرسم */}
          <div className="flamingo-loader-sweep absolute inset-0 [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />
        </div>

      </div>

      <style>{`
        .flamingo-loader-reveal {
          clip-path: inset(0 0 100% 0);
          animation: flamingoReveal 2.15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .flamingo-loader-sweep {
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 34%,
            rgba(169, 91, 97, 0.15) 40%,
            rgba(169, 91, 97, 0.95) 49%,
            rgba(169, 91, 97, 0.95) 51%,
            rgba(169, 91, 97, 0.15) 60%,
            transparent 66%,
            transparent 100%
          );

          background-size: 100% 55%;
          background-repeat: no-repeat;
          background-position: center -80%;
          animation: flamingoSweep 2.15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        @keyframes flamingoReveal {
          0% {
            clip-path: inset(0 0 100% 0);
            opacity: 1;
          }

          68% {
            clip-path: inset(0 0 0% 0);
            opacity: 1;
          }

          82% {
            clip-path: inset(0 0 0% 0);
            opacity: 1;
          }

          100% {
            clip-path: inset(0 0 0% 0);
            opacity: 0;
          }
        }

        @keyframes flamingoSweep {
          0% {
            background-position: center -80%;
            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          72% {
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
          .flamingo-loader-reveal {
            animation: none;
            clip-path: inset(0);
            opacity: 1;
          }

          .flamingo-loader-sweep {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;