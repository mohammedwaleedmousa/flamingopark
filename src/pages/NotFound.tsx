import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Home, ShoppingBag } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5" dir="rtl">
      <div className="relative z-10 w-full max-w-[430px] text-center">
        {/* LOGO */}

        <Link to="/home" className="mx-auto inline-flex items-center justify-center">
          <img src="/icons/flamingo.jpeg" alt="Flamingo Park" className="h-[64px] w-auto object-contain md:h-[76px]" />
        </Link>

        {/* 404 */}

        <div className="relative mt-8">
          <span className="select-none font-serif text-[92px] font-light leading-none tracking-[-0.06em] text-[#E8DFDB] sm:text-[110px]">404</span>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-[#E5D8D4] bg-background px-4 py-2 font-serif text-[7px] uppercase tracking-[0.22em] text-[#B86168]">PAGE NOT FOUND</span>
          </div>
        </div>

        {/* TEXT */}

        <h1 className="mt-6 text-[21px] font-semibold tracking-[-0.025em] text-[#403633] md:text-[25px]">هذه الصفحة غير موجودة</h1>

        <p className="mx-auto mt-2 max-w-[330px] text-[12px] leading-7 text-[#8D807B]">قد يكون الرابط غير صحيح أو تم نقل الصفحة. يمكنك العودة للرئيسية أو متابعة التسوق.</p>

        {/* ACTIONS */}

        <div className="mt-7 grid grid-cols-2 gap-2.5">
          <Link to="/home" className="flex h-[46px] items-center justify-center gap-2 rounded-[11px] bg-[#D4777D] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-[#C96B72] active:bg-[#B86168]">
            <Home className="h-4 w-4" strokeWidth={1.6} />
            الرئيسية
          </Link>

          <Link to="/products" className="flex h-[46px] items-center justify-center gap-2 rounded-[11px] border border-[#DED3CE] bg-background px-4 text-[12px] font-semibold text-[#655752] transition-colors hover:border-[#D8AAA7] hover:text-[#B86168]">
            <ShoppingBag className="h-4 w-4" strokeWidth={1.6} />
            تسوق الآن
          </Link>
        </div>

        {/* BACK */}

        <button type="button" onClick={() => window.history.back()} className="mx-auto mt-5 inline-flex items-center gap-1.5 text-[11px] text-[#958781] transition-colors hover:text-[#B86168]">
          العودة للصفحة السابقة
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>

        {/* PATH */}

        <div className="mt-8 border-t border-[#E8DFDB] pt-4">
          <p className="text-[9px] text-[#B0A39E]">
            المسار غير الموجود:
            <span dir="ltr" className="mr-1 font-mono text-[#91827D]">{location.pathname}</span>
          </p>
        </div>
      </div>
    </main>
  );
};

export default NotFound;