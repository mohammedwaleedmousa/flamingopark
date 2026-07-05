import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";

const slides = [
  {
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB17rZoAKdh6xzkPmcre-fyzoQaMvSwYza3RP0tdzew44HqFSkCZDUqdeB_BMukNUwD-6FDPKvjJG8VC9-BseJEoTtweNq3rTLsLk9UBm68oOzy1VLXIZu5t_td3LYj135_2-1A-LRM355Qa2IQ8QC1AoxbVYDuL-UhFcGF5q_CnIPl7Cu5o4sEiHbZPQ7q4eZODOroykjUqtZBOj_yfpLUuoxQXtbi0E1VuYZLbHG2IcKE4uHRKfXyY11eauDju1rlDfCrpdEoUQ",
    tag: "فلامنجو بارك - عدن",
    title: "إرث يُعاد صياغته\nبلغة الفخامة المعاصرة",
    desc: "رحلة بصرية تنسج بين الأصالة والحداثة، بتجربة سينمائية على مستوى Apple Keynote.",
  },
];

export default function VisionProHero() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // smooth cinematic spring (important for Apple feel)
  const s = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.8,
  });

  /* ---------------- LAYERS ---------------- */

  // Background cinematic drift
  const bgScale = useTransform(s, [0, 1], [1.12, 1.02]);
  const bgY = useTransform(s, [0, 1], ["0%", "18%"]);

  // Glow field (depth light)
  const glowY = useTransform(s, [0, 1], ["0%", "35%"]);
  const glowOpacity = useTransform(s, [0, 0.6, 1], [0.6, 0.8, 0]);

  // Content float (Apple keynote motion)
  const contentY = useTransform(s, [0, 1], ["0%", "-25%"]);
  const contentScale = useTransform(s, [0, 1], [1, 0.94]);
  const contentOpacity = useTransform(s, [0, 0.85, 1], [1, 1, 0]);

  // Vignette depth
  const vignetteOpacity = useTransform(s, [0, 1], [0.15, 0.85]);

  return (
    <div ref={ref} className="relative bg-black">

      {/* STICKY SCENE */}
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* ================= BACKGROUND (FIXED iOS SAFE) ================= */}
        <motion.div
          style={{
            scale: bgScale,
            y: bgY,
          }}
          className="absolute inset-0 will-change-transform transform-gpu"
        >
          {/* iOS SAFE WRAPPER (prevents black edge bug) */}
          <div className="absolute -inset-10">
            <div
              className="w-full h-full bg-cover bg-center scale-110"
              style={{
                backgroundImage: `url(${slides[0].image})`,
              }}
            />
          </div>
        </motion.div>

        {/* ================= LIGHT FIELD (Apple Glow Depth) ================= */}
        <motion.div
          style={{ y: glowY, opacity: glowOpacity }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(236,72,153,0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.05),transparent_60%)]" />
        </motion.div>

        {/* ================= VIGNETTE (cinematic framing) ================= */}
        <motion.div
          style={{ opacity: vignetteOpacity }}
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black"
        />

        {/* ================= CONTENT (Apple keynote float UI) ================= */}
        <motion.div
          style={{
            y: contentY,
            scale: contentScale,
            opacity: contentOpacity,
          }}
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

            {/* Apple-style CTA */}
            <div className="mt-10 flex justify-end">
              <button className="group relative px-8 py-3 rounded-full border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden transition-all duration-500 hover:border-pink-300/40">

                <span className="relative z-10 text-sm tracking-[0.35em] text-white/80 group-hover:text-white">
                  اكتشف المجموعة
                </span>

                {/* subtle Apple glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.25),transparent_70%)]" />
              </button>
            </div>

          </div>
        </motion.div>

        {/* ================= INDICATOR ================= */}
        <motion.div
          style={{ opacity: contentOpacity }}
          className="absolute bottom-10 right-10 flex flex-col items-end" 
        >
          <span className="text-[10px] text-pink-200/60 mb-2">
            تجربة فلامنجو بارك · عدن
          </span>

          <div className="w-56 h-[1px] bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-pink-400 to-white"
              style={{ scaleX: s, transformOrigin: "right" }}
            />
          </div>
        </motion.div>

      </div>
    </div>
  );
}