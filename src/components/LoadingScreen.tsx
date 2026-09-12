import { useEffect, useState } from "react";

const LoadingScreen = () => {
  const [slow, setSlow] = useState(false);

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

    return () => {
      window.clearTimeout(slowTimer);

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
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E8D8D9] bg-[#FFF8F8] shadow-sm">
          <span className="absolute h-8 w-8 animate-spin rounded-full border-[3px] border-[#F1D7DA] border-t-[#C96F79]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#C96F79]" />
        </div>

        <p className="mt-4 text-[12px] font-semibold text-[#493A36]">جاري فتح الصفحة...</p>
        <p className="mt-1.5 text-[9px] leading-5 text-[#8F7E79]">يرجى الانتظار لحظات</p>

        {slow && (
          <div className="mt-5 w-full rounded-xl border border-[#F0DFE1] bg-[#FFF9F9] p-3">
            <p className="text-[9px] leading-5 text-[#755F5B]">الاتصال بطيء أو ملف الصفحة لم يكتمل تحميله.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 h-8 rounded-lg bg-[#C96F79] px-4 text-[9px] font-semibold text-white"
            >
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
