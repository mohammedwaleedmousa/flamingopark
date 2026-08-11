import { motion } from "framer-motion";

const FlamingoHighlight = () => {
  return (
    <section className="bg-white py-4 md:py-8" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{
          duration: 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full overflow-hidden bg-[#F7E7E2] h-[300px] sm:h-[230px] md:h-[360px]"
      >
        <img
          src="public\images\ChatGPT_Image.png"
          alt="Flamingo Highlight"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </motion.div>
    </section>
  );
};

export default FlamingoHighlight;