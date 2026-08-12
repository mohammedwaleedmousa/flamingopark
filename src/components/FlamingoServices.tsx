import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpLeft } from "lucide-react";

const FlamingoServices = () => {
  return (
    <section className="bg-white py-10 md:py-24" dir="rtl">
      <div className="mx-auto w-full max-w-[1500px] px-4 md:px-8">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.9 }}
          className="relative"
        >

          {/* =========================
              DESKTOP EDITORIAL INDEX
          ========================= */}
          <div className="mb-5 hidden items-center justify-between md:flex">
            <span
              dir="ltr"
              className="text-[9px] tracking-[0.42em] text-[#A49DA0]"
            >
              FLAMINGO — 01
            </span>

            <span className="text-[10px] tracking-[0.08em] text-[#AAA2A5]">
              مختارات فلامنجو
            </span>
          </div>

          {/* =========================
              MAIN VISUAL
          ========================= */}
          <div className="relative">

            <motion.div
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              whileInView={{ clipPath: "inset(0 0 0% 0)" }}
              viewport={{ once: true }}
              transition={{
                duration: 1.15,
                ease: [0.76, 0, 0.24, 1],
              }}
              className="
                relative
                h-[470px]
                overflow-hidden
                bg-[#E9E4DE]
                sm:h-[560px]
                md:h-[720px]
                lg:h-[780px]
              "
            >

              <img
                src="/images/flamingo.png"
                alt="Flamingo luxury handbag"
                loading="lazy"
                decoding="async"
                className="
                  h-full
                  w-full
                  object-cover
                  object-[50%_48%]
                  scale-[1.01]
                  transition-transform
                  duration-[2200ms]
                  ease-out
                  md:hover:scale-[1.025]
                "
              />

              {/* SOFT CINEMATIC FADE */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.20] via-transparent to-transparent" />

              {/* MOBILE NUMBER */}
              <span
                dir="ltr"
                className="
                  absolute
                  left-4
                  top-4
                  text-[8px]
                  tracking-[0.38em]
                  text-white/75
                  md:hidden
                "
              >
                01 / EDIT
              </span>

              {/* SMALL SIDE WORD */}
              <span
                dir="ltr"
                className="
                  absolute
                  right-[-28px]
                  top-1/2
                  hidden
                  -translate-y-1/2
                  rotate-90
                  text-[8px]
                  tracking-[0.5em]
                  text-white/70
                  md:block
                "
              >
                FLAMINGO PARK
              </span>

            </motion.div>

            {/* =========================
                FLOATING TYPOGRAPHY
            ========================= */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="
                relative
                z-10
                -mt-9
                mr-4
                max-w-[310px]
                md:absolute
                md:bottom-[-72px]
                md:right-[6%]
                md:m-0
                md:max-w-[560px]
              "
            >

              <h2
                className="
                  font-heading
                  text-[30px]
                  font-light
                  leading-[1.5]
                  tracking-[-0.035em]
                  text-[#171416]

                  md:text-[54px]
                  lg:text-[64px]
                  md:leading-[1.38]
                "
              >
                ليست كل القطع
                <br />
                بحاجة إلى
                <span className="relative mx-2 inline-block">
                  تعريف.
                  <span
                    className="
                      absolute
                      bottom-[5px]
                      left-0
                      -z-10
                      h-[7px]
                      w-full
                      bg-[#F7CBD8]
                      md:bottom-[9px]
                      md:h-[10px]
                    "
                  />
                </span>
              </h2>

            </motion.div>

          </div>

          {/* =========================
              BOTTOM INFORMATION
          ========================= */}
          <div
            className="
              mt-8
              flex
              items-end
              justify-between
              gap-5

              md:mt-28
              md:grid
              md:grid-cols-[1fr_auto]
              md:items-end
            "
          >

            <p
              className="
                max-w-[220px]
                text-[10px]
                leading-6
                text-[#817A7D]

                md:max-w-[360px]
                md:text-[12px]
                md:leading-7
              "
            >
              تفاصيل مختارة بهدوء، لتترك القطعة حضورها قبل أن تقول أي شيء.
            </p>

            <Link
              to="/new-arrivals"
              className="
                group
                flex
                shrink-0
                items-center
                gap-3
                text-[10px]
                font-medium
                text-[#181517]
                md:text-[11px]
              "
            >
              <span className="relative pb-1">
                شاهد المختارات

                <span
                  className="
                    absolute
                    bottom-0
                    right-0
                    h-px
                    w-full
                    origin-right
                    bg-[#181517]
                    transition-transform
                    duration-500
                    group-hover:scale-x-0
                  "
                />
              </span>

              <span
                className="
                  flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-black/15
                  transition-all
                  duration-500
                  group-hover:-translate-x-1
                  group-hover:border-black
                "
              >
                <ArrowUpLeft className="h-3 w-3" strokeWidth={1.4} />
              </span>
            </Link>

          </div>

        </motion.div>

      </div>
    </section>
  );
};

export default FlamingoServices;