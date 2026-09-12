import { useEffect, useState } from "react";

const FLAMINGO_LOADER_SRC = "/icons/flamingo-loader.png";
const AUTO_RETRY_WINDOW_MS = 30_000;

const LoadingScreen = () => {
  const [slow, setSlow] = useState(false);
  const [flamingoReady, setFlamingoReady] = useState(false);

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

    const slowTimer = window.setTimeout(() => setSlow(true), 8000);
    const retryKey = `flamingo-stalled-route-retry:${window.location.pathname}`;
    const autoRetryTimer = window.setTimeout(() => {
      const previousRetry = Number(window.sessionStorage.getItem(retryKey) || 0);
      if (previousRetry && Date.now() - previousRetry < AUTO_RETRY_WINDOW_MS) return;

      window.sessionStorage.setItem(retryKey, String(Date.now()));
      window.location.reload();
    }, 12000);

    return () => {
      window.clearTimeout(slowTimer);
      window.clearTimeout(autoRetryTimer);

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
    <div className="fixed inset-0 z-[100] flex h-[100dvh] w-screen touch-none items-center justify-center overflow-hidden overscroll-none bg-white" dir="rtl" role="status" aria-live="polite" aria-label="جاري التحميل">
      <div className="flex max-w-[320px] flex-col items-center px-6 text-center">
        <img
          src={FLAMINGO_LOADER_SRC}
          alt=""
          aria-hidden="true"
          className="absolute h-px w-px opacity-0"
          onLoad={() => setFlamingoReady(true)}
          onError={() => setFlamingoReady(false)}
        />

        <div className="relative flex h-[170px] w-[132px] items-center justify-center">
          {!flamingoReady && (
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D8D9] bg-[#FFF8F8] shadow-sm">
              <span className="absolute h-8 w-8 animate-spin rounded-full border-[3px] border-[#F1D7DA] border-t-[#C96F79]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#C96F79]" />
            </div>
          )}

          {flamingoReady && (
            <>
              <div className="absolute inset-0 bg-[#F0D7D6] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />
              <div className="flamingo-loader-reveal absolute inset-0 bg-[#C96F79] [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />
              <div className="flamingo-loader-sweep absolute inset-0 [mask-image:url('/icons/flamingo-loader.png')] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] [-webkit-mask-image:url('/icons/flamingo-loader.png')] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain]" />
            </>
          )}
        </div>

        <p className="mt-1 text-[11px] font-semibold text-[#493A36]">جاري فتح الصفحة...</p>

        {slow && (
          <div className="mt-4 w-full rounded-xl border border-[#F0DFE1] bg-[#FFF9F9] p-3">
            <p className="text-[9px] leading-5 text-[#755F5B]">الاتصال بطيء أو ملف الصفحة لم يكتمل تحميله. سنحاول إعادة التحميل تلقائياً مرة واحدة.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 h-8 rounded-lg bg-[#C96F79] px-4 text-[9px] font-semibold text-white"
            >
              إعادة المحاولة الآن
            </button>
          </div>
        )}
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
          0%, 10% { clip-path: inset(0 0 100% 0); opacity: 1; }
          72%, 84% { clip-path: inset(0 0 0% 0); opacity: 1; }
          100% { clip-path: inset(0 0 0% 0); opacity: 0; }
        }

        @keyframes flamingo-loader-sweep {
          0% { background-position: center -80%; opacity: 0; }
          8% { opacity: 1; }
          74% { background-position: center 180%; opacity: 1; }
          88%, 100% { background-position: center 180%; opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .flamingo-loader-reveal {
            animation: none;
            clip-path: inset(0);
            opacity: 1;
          }

          .flamingo-loader-sweep { display: none; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
