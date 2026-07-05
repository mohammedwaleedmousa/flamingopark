const LoadingScreen = ({ label = "FLAMINGO" }: { label?: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-pink-50 via-gold/5 to-purple-50 flex items-center justify-center relative overflow-hidden" dir="rtl">
    {/* Animated background circles */}
    <div className="absolute top-[-10%] right-[-10%] w-96 h-96 rounded-full bg-gradient-to-br from-gold/15 to-pink/15 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
    <div className="absolute bottom-[-15%] left-[-8%] w-80 h-80 rounded-full bg-gradient-to-tl from-primary/10 to-gold/10 blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />

    {/* Top progress bar */}
    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-gold/10 via-primary/10 to-pink/10 overflow-hidden">
      <div className="h-full w-1/3 bg-gradient-to-r from-gold via-primary to-pink animate-[loading-bar_1.4s_ease-in-out_infinite]" />
    </div>

    {/* Main content */}
    <div className="flex flex-col items-center gap-8 relative z-10">
      {/* Flamingo icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold via-primary to-pink flex items-center justify-center animate-bounce" style={{ animationDuration: "2s" }}>
          <span className="text-4xl">🦩</span>
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gold rounded-full flex items-center justify-center animate-pulse">
          <span className="text-sm">✨</span>
        </div>
      </div>

      {/* Animated title */}
      <div className="flex items-center gap-1">
        {label.split("").map((ch, i) => (
          <span
            key={i}
            className="font-heading text-2xl md:text-3xl tracking-[0.3em] bg-gradient-to-r from-gold via-primary to-pink bg-clip-text text-transparent animate-[letter-fade_1.6s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Loading bar */}
      <div className="w-32 h-1 bg-gradient-to-r from-gold/20 via-primary/20 to-pink/20 rounded-full overflow-hidden">
        <div className="h-full w-1/2 bg-gradient-to-r from-gold via-primary to-pink rounded-full animate-[loading-bar_1.2s_ease-in-out_infinite]" />
      </div>

      {/* Status text */}
      <p className="text-xs md:text-sm tracking-[0.6em] uppercase text-primary/60 font-body">جاري التحميل</p>

      {/* Dot indicators */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-gold to-primary animate-pulse"
            style={{ animationDelay: `${i * 200}ms`, animationDuration: "1.4s" }}
          />
        ))}
      </div>
    </div>

    <style>{`
      @keyframes loading-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
      @keyframes letter-fade {
        0%, 100% { opacity: 0.35; transform: translateY(0); }
        50% { opacity: 1; transform: translateY(-4px); }
      }
    `}</style>
  </div>
);

export default LoadingScreen;