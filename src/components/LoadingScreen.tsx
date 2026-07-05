const LoadingScreen = ({ label = "FLAMINGO" }: { label?: string }) => (
  <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden" dir="rtl">
    <style>{`
      @keyframes shimmer {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }
      .shimmer-text {
        animation: shimmer 1.5s ease-in-out infinite;
      }
    `}</style>

    <div className="flex flex-col items-center justify-center gap-3">
      <h1 className="shimmer-text text-5xl md:text-7xl font-bold text-black">
        flamingo
      </h1>
      <p className="shimmer-text text-lg md:text-xl text-gray-600 tracking-widest">
        park
      </p>
      <div className="mt-8 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-gray-400 rounded-full"
            style={{
              animation: `shimmer 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  </div>
);

export default LoadingScreen;