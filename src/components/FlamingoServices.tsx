import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const FlamingoServices = () => {
  return (
    <section className="bg-white py-8 md:py-14" dir="rtl">
      <div className="mx-auto w-full max-w-[1500px] px-4 md:px-6">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            relative
            min-h-[520px]
            overflow-hidden
            bg-[#F4F0EC]
            md:min-h-[650px]
          "
        >

          {/* IMAGE */}
          <img
            src="/images/flamingo.png"
            alt="Flamingo luxury brands"
            loading="lazy"
            decoding="async"
            className="
              absolute
              inset-0
              h-full
              w-full
              object-cover
              object-center
            "
          />

          {/* OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" />

          {/* LOGO */}
          <span
            dir="ltr"
            className="
              absolute
              left-5
              top-5
              z-10
              text-[8px]
              tracking-[0.34em]
              text-white/80
              md:left-8
              md:top-8
              md:text-[9px]
            "
          >
            FLAMINGO PARK
          </span>

          {/* CONTENT */}
          <div
            className="
              absolute
              bottom-7
              right-5
              z-10
              md:bottom-10
              md:right-8
            "
          >
            <h2
              className="
                font-heading
                text-[31px]
                font-light
                leading-[1.45]
                tracking-[-0.03em]
                text-white
                md:text-[50px]
              "
            >
              علامات تعرفها.
              <br />
              <span className="text-white/70">
                اختيارات تستحقها.
              </span>
            </h2>

            <Link
              to="/brands"
              className="
                group
                mt-5
                inline-flex
                items-center
                gap-2
                text-[9px]
                font-medium
                text-white
                md:text-[10px]
              "
            >
              اكتشف الماركات

              <ArrowLeft
                className="
                  h-3
                  w-3
                  transition-transform
                  duration-300
                  group-hover:-translate-x-1
                "
                strokeWidth={1.5}
              />
            </Link>
          </div>

        </motion.div>

      </div>
    </section>
  );
};

export default FlamingoServices;