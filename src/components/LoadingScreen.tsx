const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
      <div className="text-center">

        {/* اسم المتجر */}
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.6em] uppercase text-black">
          Flamingo
        </h1>

        <p className="text-xs tracking-[0.8em] text-neutral-500 mt-2 uppercase">
          Park
        </p>

        {/* الخط المتحرك */}
        <div className="mt-4 w-52 h-[1px] bg-neutral-200 overflow-hidden mx-auto">
          <div className="h-full bg-black animate-line" />
        </div>

      </div>
    </div>
  );
};

export default LoadingScreen;