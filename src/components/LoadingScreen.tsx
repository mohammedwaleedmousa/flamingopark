const LoadingScreen = ({ label = "FLAMINGO" }: { label?: string }) => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background" dir="rtl" role="status" aria-live="polite" aria-label="جاري التحميل">
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-px w-7 bg-[#D9C9C4]" />
          <span className="h-[3px] w-[3px] rounded-full bg-[#D4777D]" />
          <span className="h-px w-7 bg-[#D9C9C4]" />
        </div>

        <div className="relative overflow-hidden px-2 py-1">
          <h1 className="select-none font-serif text-[20px] font-medium tracking-[0.34em] text-[#403633] sm:text-[23px] md:text-[28px]">{label}</h1>

          <span className="flamingo-loading-sheen pointer-events-none absolute inset-y-0 -left-[35%] w-[25%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
        </div>

        <p className="mt-2 font-serif text-[5px] uppercase tracking-[0.28em] text-[#A99C97]">FLAMINGO PARK</p>

        <div className="mt-6 h-[2px] w-[72px] overflow-hidden rounded-full bg-[#E8E0DC]">
          <span className="flamingo-loading-line block h-full w-[28px] rounded-full bg-[#D4777D]" />
        </div>

        <span className="mt-3 text-[6px] text-[#9D908A]">جاري التحميل...</span>
      </div>

      <style>{`
        .flamingo-loading-sheen {
          animation: flamingo-sheen 1.8s ease-in-out infinite;
        }

        .flamingo-loading-line {
          animation: flamingo-line 1.35s ease-in-out infinite;
        }

        @keyframes flamingo-sheen {
          0% {
            transform: translateX(0) skewX(-18deg);
            opacity: 0;
          }

          20% {
            opacity: 0.75;
          }

          75% {
            opacity: 0.75;
          }

          100% {
            transform: translateX(550%) skewX(-18deg);
            opacity: 0;
          }
        }

        @keyframes flamingo-line {
          0% {
            transform: translateX(46px);
          }

          50% {
            transform: translateX(-2px);
          }

          100% {
            transform: translateX(46px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flamingo-loading-sheen,
          .flamingo-loading-line {
            animation: none;
          }

          .flamingo-loading-line {
            width: 100%;
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;