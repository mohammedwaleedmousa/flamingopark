import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

const FRESH_RELOAD_PARAM = "__flamingo_reload";

const isChunkLoadError = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message || error || "");
  return /Failed to fetch dynamically imported module|Expected a JavaScript-or-Wasm module script|Importing a module script failed|ChunkLoadError|Loading chunk|Load failed/i.test(message);
};

const forceFreshReload = () => {
  const url = new URL(window.location.href);
  url.searchParams.set(FRESH_RELOAD_PARAM, Date.now().toString());
  window.location.replace(url.toString());
};

class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("APP_RENDER_ERROR", error, info);

    if (isChunkLoadError(error)) {
      const url = new URL(window.location.href);
      if (!url.searchParams.has(FRESH_RELOAD_PARAM)) {
        forceFreshReload();
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="flex min-h-[100svh] items-center justify-center bg-[#FFFDFC] px-5" dir="rtl"><div className="w-full max-w-[360px] rounded-[20px] border border-[#EEE4E0] bg-white p-6 text-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" className="mx-auto h-16 w-16 object-contain" /><h1 className="mt-4 text-[18px] font-semibold text-[#403432]">تعذر فتح الصفحة</h1><p className="mt-2 text-[10px] leading-6 text-[#948681]">حدث انقطاع مؤقت أثناء الانتقال. أعد المحاولة ولن تفقد سلتك أو حسابك.</p><button type="button" onClick={forceFreshReload} className="mt-5 h-11 w-full rounded-[12px] bg-[#D4777D] text-[10px] font-semibold text-white">إعادة المحاولة</button><button type="button" onClick={() => window.location.assign("/home")} className="mt-2 h-10 w-full rounded-[12px] border border-[#E8DEDA] bg-white text-[9px] font-medium text-[#746761]">العودة للرئيسية</button></div></main>;
  }
}

export default AppErrorBoundary;
