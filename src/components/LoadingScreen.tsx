const LoadingScreen = ({ label = "FLAMINGO" }: { label?: string }) => (
  <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden" dir="rtl">
    <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_60%)]" />

    <div className="relative flex flex-col items-center gap-6 z-10">
      <div className="relative">
        <h1 className="font-heading text-4xl md:text-6xl tracking-[0.45em] text-foreground select-none">{label}</h1>
        <div className="absolute inset-0 shimmer-text" />
      </div>
    </div>

    <style>{`
      .shimmer-text {
        background: linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.45) 50%, transparent 100%);
        mix-blend-mode: screen;
        animation: shimmer-scan 1.9s ease-in-out infinite;
      }
      @keyframes shimmer-scan {
        0% { transform: translateX(-120%); opacity: 0; }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% { transform: translateX(120%); opacity: 0; }
      }
    `}</style>
  </div>
);

export default LoadingScreen;