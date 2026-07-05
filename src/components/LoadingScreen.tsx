const LoadingScreen = ({ label = "FLAMINGO" }: { label?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden" dir="rtl">
    {/* top progress bar */}
    <div className="absolute top-0 inset-x-0 h-[2px] bg-foreground/5 overflow-hidden">
      <div className="h-full w-1/3 bg-foreground animate-[loading-bar_1.4s_ease-in-out_infinite]" />
    </div>

    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-[2px]">
        {"FLAMINGO".split("").map((ch, i) => (
          <span
            key={i}
            className="font-heading text-2xl tracking-[0.3em] text-foreground animate-[letter-fade_1.6s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <div className="w-24 h-px bg-foreground/10 overflow-hidden">
        <div className="h-full w-1/2 bg-foreground animate-[loading-bar_1.2s_ease-in-out_infinite]" />
      </div>
      <p className="text-[9px] tracking-[0.6em] uppercase text-muted-foreground">جاري التحميل</p>
    </div>

    <style>{`
      @keyframes loading-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      @keyframes letter-fade {
        0%, 100% { opacity: 0.25; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-2px); }
      }
    `}</style>
  </div>
);

export default LoadingScreen;