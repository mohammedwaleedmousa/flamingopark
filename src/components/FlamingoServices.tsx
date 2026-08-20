import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const FlamingoServices = () => {
  return (
    <section className="w-full bg-white py-5 md:py-14" dir="rtl">
      <div className="relative h-[360px] w-full overflow-hidden bg-[#EAE4DE] sm:h-[420px] md:mx-auto md:h-[580px] md:max-w-[1450px]">
        <img src="/images/flamingo.png" alt="Flamingo luxury brands" loading="lazy" decoding="async" width={1450} height={580} className="absolute inset-0 h-full w-full object-cover object-center" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/[0.02] to-transparent" />

        <span dir="ltr" className="absolute left-4 top-4 z-10 text-[7px] font-medium tracking-[0.38em] text-white/80 md:left-8 md:top-7 md:text-[9px]">
          FLAMINGO PARK
        </span>

        <div className="absolute bottom-5 right-4 z-10 md:bottom-9 md:right-8">
          <h2 className="font-heading text-[22px] font-light leading-[1.55] tracking-[-0.025em] text-white sm:text-[25px] md:text-[42px]">
            علامات تعرفها.
            <br />
            <span className="text-white/70">اختيارات تستحقها.</span>
          </h2>

          <Link to="/brands" className="group mt-3 inline-flex items-center gap-1.5 text-[8px] font-medium text-white/90 md:mt-5 md:gap-2 md:text-[10px]">
            اكتشف الماركات
            <ArrowLeft className="h-2.5 w-2.5 md:h-3 md:w-3" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FlamingoServices;
