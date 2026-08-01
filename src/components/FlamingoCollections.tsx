import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const FlamingoHighlight = () => {
  return (
    <section className="py-16 md:py-24 bg-white" dir="rtl">

      <div className="container mx-auto px-6">

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="max-w-4xl mx-auto text-center"
        >

          <p className="text-[10px] tracking-[0.5em] uppercase text-pink-500 mb-8">
            Flamingo Selection
          </p>


          <div className="relative overflow-hidden h-[320px] md:h-[480px]">

            <img
              src="https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?w=1400&q=85"
              alt="Flamingo"
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[1500ms] hover:scale-105"
            />

          </div>


          <div className="mt-8">



            <p className="mt-4 text-sm text-muted-foreground">
              اختيارات مصممة لمن يبحث عن الأناقة والتميز.
            </p>


            <Link
              to="/collections"
              className="inline-block mt-7 text-xs tracking-[0.35em] uppercase border-b border-black pb-2"
            >
              اكتشف الآن
            </Link>

          </div>

        </motion.div>

      </div>

    </section>
  );
};

export default FlamingoHighlight;