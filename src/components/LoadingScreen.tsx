const LoadingScreen = ({ label = "جاري التحميل" }: { label?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border border-foreground/10" />
        <div className="absolute inset-0 rounded-full border-t border-foreground animate-spin" />
        <div className="absolute inset-2 rounded-full border-b border-foreground/40 animate-spin [animation-direction:reverse] [animation-duration:1.4s]" />
      </div>
      <p className="text-[10px] tracking-[0.5em] uppercase text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default LoadingScreen;