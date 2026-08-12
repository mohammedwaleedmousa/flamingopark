import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const FlamingoServices = () => {
  return (
    <section className="bg-white py-8 md:py-16" dir="rtl">
      <div className="container mx-auto px-4 md:px-6">

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 0.85,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="
            relative
            overflow-hidden
            bg-[#F6F1EE]
            md:grid
            md:grid-cols-[0.82fr_1.18fr]
            md:min-h-[560px]
          "
        >

          {/* IMAGE */}
          <div className="relative h-[430px] md:h-full md:order-2 overflow-hidden">

            <img
              src="/images/flamingo.png"
              alt="Flamingo luxury handbag"
              loading="lazy"
              decoding="async"
              className="
                w-full
                h-full
                object-cover
                object-center
                transition-transform
                duration-[1800ms]
                hover:scale-[1.025]
              "
            />

            {/* MOBILE OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent md:hidden" />

            {/* SMALL EDITORIAL LABEL */}
            <span
              dir="ltr"
              className="
                absolute
                top-5
                left-5
                text-[8px]
                tracking-[0.34em]
                text-white
                drop-shadow
                md:hidden
              "
            >
              FLAMINGO / EDIT
            </span>

          </div>

          {/* CONTENT */}
          <div
            className="
              relative
              z-10
              -mt-16
              mx-4
              bg-white
              px-6
              py-8
              text-center

              md:order-1
              md:m-0
              md:bg-transparent
              md:px-12
              md:py-16
              md:text-right
              md:flex
              md:flex-col
              md:justify-center
            "
          >

            <p
              dir="ltr"
              className="
                hidden
                md:block
                text-[9px]
                tracking-[0.36em]
                text-[#A59A9E]
                mb-8
              "
            >
              FLAMINGO / EDIT
            </p>

            <div className="hidden md:block w-10 h-px bg-[#E8547C] mb-8" />

            <h2
              className="
                font-heading
                text-[27px]
                md:text-[46px]
                lg:text-[54px]
                font-light
                leading-[1.55]
                tracking-[-0.02em]
                text-[#211D1F]
              "
            >
              قطعة واحدة
              <br />
              قد تغيّر
              <br />

              <span className="text-[#E8547C]">
                الإطلالة كلها.
              </span>
            </h2>

            <p
              className="
                max-w-sm
                mx-auto
                md:mx-0
                mt-4
                text-[11px]
                md:text-[13px]
                leading-7
                text-[#8E8588]
              "
            >
              اكتشف مختارات الموسم والقطع التي تستحق مكانًا في خزانتك.
            </p>

            <div className="mt-6 md:mt-8">
              <Link
                to="/new-arrivals"
                className="
                  group
                  inline-flex
                  items-center
                  gap-2
                  text-[10px]
                  md:text-[11px]
                  font-medium
                  text-[#211D1F]
                  border-b
                  border-[#211D1F]
                  pb-1.5
                  transition-colors
                  duration-300
                  hover:text-[#E8547C]
                  hover:border-[#E8547C]
                "
              >
                اكتشف الجديد

                <ArrowLeft
                  className="
                    w-3
                    h-3
                    transition-transform
                    duration-300
                    group-hover:-translate-x-1
                  "
                />
              </Link>
            </div>

          </div>

        </motion.div>

      </div>
    </section>
  );
};

export default FlamingoServices;