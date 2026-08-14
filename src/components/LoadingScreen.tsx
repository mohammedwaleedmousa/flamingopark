import { useEffect } from "react";

const LoadingScreen = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyLeft = body.style.left;
    const previousBodyRight = body.style.right;
    const previousBodyWidth = body.style.width;
    const previousHtmlOverflow = html.style.overflow;
    const previousOverscroll = html.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.left = previousBodyLeft;
      body.style.right = previousBodyRight;
      body.style.width = previousBodyWidth;

      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousOverscroll;

      window.scrollTo({
        top: scrollY,
        left: 0,
        behavior: "auto",
      });
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen touch-none items-center justify-center overflow-hidden overscroll-none bg-background" dir="rtl" role="status" aria-live="polite" aria-label="جاري التحميل">
      <div className="flex flex-col items-center">
        <div className="relative h-[150px] w-[116px] sm:h-[170px] sm:w-[132px]">
          {/* الفلامنجو الأساسي */}
          <div className="absolute inset-0 bg-[#F0D7D6] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />

          {/* اللون الغامق */}
          <div className="flamingo-loader-reveal absolute inset-0 bg-[#C96F79] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />

          {/* خط الرسم المتحرك */}
          <div className="flamingo-loader-sweep absolute inset-0 [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />
        </div>

        <p className="mt-5 font-serif text-[7px] tracking-[0.3em] text-[#A99B96]">FLAMINGO PARK</p>
      </div>

      <style>{`
        .flamingo-loader-reveal {
          clip-path: inset(0 0 100% 0);
          animation: flamingo-loader-reveal 2.15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        .flamingo-loader-sweep {
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

          animation: flamingo-loader-sweep 2.15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        @keyframes flamingo-loader-reveal {
          0% {
            clip-path: inset(0 0 100% 0);
            opacity: 1;
          }

          10% {
            clip-path: inset(0 0 100% 0);
            opacity: 1;
          }

          72% {
            clip-path: inset(0 0 0% 0);
            opacity: 1;
          }

          84% {
            clip-path: inset(0 0 0% 0);
            opacity: 1;
          }

          100% {
            clip-path: inset(0 0 0% 0);
            opacity: 0;
          }
        }

        @keyframes flamingo-loader-sweep {
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