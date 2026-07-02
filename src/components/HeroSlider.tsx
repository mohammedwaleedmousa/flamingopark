import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const slides = [
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB17rZoAKdh6xzkPmcre-fyzoQaMvSwYza3RP0tdzew44HqFSkCZDUqdeB_BMukNUwD-6FDPKvjJG8VC9-BseJEoTtweNq3rTLsLk9UBm68oOzy1VLXIZu5t_td3LYj135_2-1A-LRM355Qa2IQ8QC1AoxbVYDuL-UhFcGF5q_CnIPl7Cu5o4sEiHbZPQ7q4eZODOroykjUqtZBOj_yfpLUuoxQXtbi0E1VuYZLbHG2IcKE4uHRKfXyY11eauDju1rlDfCrpdEoUQ",
    tag: "فلامنجو عدن بارك",
    title: "إرث يُعاد صياغته\nبلغة الفخامة المعاصرة",
    desc: "رحلة بصرية تنسج بين الأصالة والحداثة، حيث تتحول التفاصيل إلى تجربة شعورية تُشبه عروض الأزياء العالمية.",
  },
];

export default function VisionProHero() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const s = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 25,
  });

  const bgScale = useTransform(s, [0, 1], [1.15, 1.05]);
  const bgY = useTransform(s, [0, 1], ["0%", "20%"]);
  const bgBlur = useTransform(s, [0, 1], ["0px", "12px"]);

  const glowY = useTransform(s, [0, 1], ["0%", "40%"]);
  const glowOpacity = useTransform(s, [0, 0.6, 1], [0.5, 0.7, 0]);

  const contentY = useTransform(s, [0, 1], ["0%", "-30%"]);
  const contentScale = useTransform(s, [0, 1], [1, 0.92]);
  const contentOpacity = useTransform(s, [0, 0.8, 1], [1, 1, 0]);

  const vignetteOpacity = useTransform(s, [0, 1], [0.2, 0.9]);

  return (
    <div ref={ref} className="relative bg-black">

      <div className="sticky top-0 h-screen overflow-hidden">

        {/* BACKGROUND */}
        <motion.div
          style={{ scale: bgScale, y: bgY, filter: bgBlur }}
          className="absolute inset-0"
        >
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${slides[0].image})` }}
          />
        </motion.div>

        {/* LIGHT DEPTH */}
        <motion.div style={{ y: glowY, opacity: glowOpacity }} className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(236,72,153,0.18),transparent_55%)]" />
        </motion.div>

        {/* VIGNETTE */}
        <motion.div
          style={{ opacity: vignetteOpacity }}
          className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black"
        />

        {/* CONTENT */}
        <motion.div
          style={{ y: contentY, scale: contentScale, opacity: contentOpacity }}
          className="relative h-full flex items-center justify-end px-6 md:px-24 text-right"
        >
          <div className="max-w-xl text-white">

            <p className="text-[10px] tracking-[0.6em] text-pink-300/70 mb-4 uppercase">
              {slides[0].tag}
            </p>

            <h1 className="text-5xl md:text-7xl font-light leading-tight whitespace-pre-line">
              {slides[0].title}
            </h1>

            <p className="mt-6 text-white/70 text-sm max-w-md leading-relaxed">
              {slides[0].desc}
            </p>

            {/* ✨ NEW LUX CTA BUTTON */}
            <div className="mt-10 flex justify-end">
              <button className="group relative px-7 py-3 rounded-full border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden transition-all duration-500 hover:border-pink-300/40">

                <span className="relative z-10 text-sm tracking-[0.3em] text-white/80 group-hover:text-white transition">
                  اكتشف المجموعة
                </span>

                {/* glow effect */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.25),transparent_70%)]" />
              </button>
            </div>

          </div>
        </motion.div>

        {/* INDICATOR */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="absolute bottom-10 right-10 flex flex-col items-end"
        >
          <span className="text-[10px] text-pink-200/60 mb-2">
            تجربة فلامنجو البصرية · عدن بارك
          </span>

          <div className="w-56 h-[1px] bg-white/10 overflow-hidden relative">
            <motion.div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-pink-400 to-white"
              style={{ scaleX: s, transformOrigin: "right" }}
            />
          </div>
        </motion.div>

      </div>
    </div>
  );
}