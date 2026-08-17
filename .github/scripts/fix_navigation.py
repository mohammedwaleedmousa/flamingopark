from pathlib import Path

p=Path('src/App.tsx')
s=p.read_text(encoding='utf-8')
a='import { useEffect, lazy, Suspense, useState } from "react";\n'
b='import { useEffect, lazy as reactLazy, Suspense, useState, type ComponentType } from "react";\n'
assert a in s
s=s.replace(a,b,1)
marker='// Temporary launch switch: keep the assistant implementation ready without showing its entry button.\n'
helper='''const isLazyImportError = (error: unknown) => {\n  const message = String((error as { message?: unknown })?.message || error || "");\n  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk|Load failed/i.test(message);\n};\n\nconst lazy = <T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) =>\n  reactLazy(async () => {\n    const retryKey = typeof window !== "undefined" ? `flamingo-lazy-retry:${window.location.pathname}` : "flamingo-lazy-retry";\n    try {\n      const module = await factory();\n      if (typeof window !== "undefined") window.sessionStorage.removeItem(retryKey);\n      return module;\n    } catch {\n      await new Promise((resolve) => window.setTimeout(resolve, 300));\n      try {\n        const module = await factory();\n        if (typeof window !== "undefined") window.sessionStorage.removeItem(retryKey);\n        return module;\n      } catch (error) {\n        if (typeof window !== "undefined" && isLazyImportError(error) && !window.sessionStorage.getItem(retryKey)) {\n          window.sessionStorage.setItem(retryKey, "1");\n          window.location.reload();\n          return await new Promise<never>(() => undefined);\n        }\n        throw error;\n      }\n    }\n  });\n\n'''
assert marker in s
p.write_text(s.replace(marker,helper+marker,1),encoding='utf-8')

p=Path('src/lib/prefetchRoutes.ts')
s=p.read_text(encoding='utf-8')
a='''    productDetailPagePromise = import("@/pages/ProductDetailPage").catch((error) => {\n      productDetailPagePromise = null;\n      throw error;\n    });\n'''
b='''    productDetailPagePromise = import("@/pages/ProductDetailPage").catch(() => {\n      productDetailPagePromise = null;\n      return undefined;\n    });\n'''
assert a in s
p.write_text(s.replace(a,b,1),encoding='utf-8')

Path('src/components/AppErrorBoundary.tsx').write_text('''import { Component, type ErrorInfo, type ReactNode } from "react";\n\ntype Props = { children: ReactNode };\ntype State = { hasError: boolean };\n\nclass AppErrorBoundary extends Component<Props, State> {\n  state: State = { hasError: false };\n  static getDerivedStateFromError(): State { return { hasError: true }; }\n  componentDidCatch(error: Error, info: ErrorInfo) { console.error("APP_RENDER_ERROR", error, info); }\n  render() {\n    if (!this.state.hasError) return this.props.children;\n    return <main className="flex min-h-[100svh] items-center justify-center bg-[#FFFDFC] px-5" dir="rtl"><div className="w-full max-w-[360px] rounded-[20px] border border-[#EEE4E0] bg-white p-6 text-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" className="mx-auto h-16 w-16 object-contain" /><h1 className="mt-4 text-[18px] font-semibold text-[#403432]">تعذر فتح الصفحة</h1><p className="mt-2 text-[10px] leading-6 text-[#948681]">حدث انقطاع مؤقت أثناء الانتقال. أعد المحاولة ولن تفقد سلتك أو حسابك.</p><button type="button" onClick={() => window.location.reload()} className="mt-5 h-11 w-full rounded-[12px] bg-[#D4777D] text-[10px] font-semibold text-white">إعادة المحاولة</button><button type="button" onClick={() => window.location.assign("/home")} className="mt-2 h-10 w-full rounded-[12px] border border-[#E8DEDA] bg-white text-[9px] font-medium text-[#746761]">العودة للرئيسية</button></div></main>;\n  }\n}\n\nexport default AppErrorBoundary;\n''',encoding='utf-8')

p=Path('src/main.tsx')
s=p.read_text(encoding='utf-8')
if 'import AppErrorBoundary from "./components/AppErrorBoundary";' not in s:
    s=s.replace('import App from "./App.tsx";\n','import App from "./App.tsx";\nimport AppErrorBoundary from "./components/AppErrorBoundary";\n',1)
a='createRoot(document.getElementById("root")!).render(<App />);\n'
b='createRoot(document.getElementById("root")!).render(<AppErrorBoundary><App /></AppErrorBoundary>);\n'
assert a in s
p.write_text(s.replace(a,b,1),encoding='utf-8')
print('navigation fixed')