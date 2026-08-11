import { motion } from "framer-motion";

const FlamingoHighlight = () => {
  return (
    <section className="bg-white py-4 md:py-8" dir="rtl">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="w-full overflow-hidden"
        >
          <img
            src="/images/ChatGPT_Image.png"
            alt="Flamingo Highlight"
            loading="lazy"
            decoding="async"
            className="block w-full h-auto"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default FlamingoHighlight;