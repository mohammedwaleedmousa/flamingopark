import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const picks = [
  {
    title: "إطلالات الموسم",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80",
    link: "/new-season",
  },
  {
    title: "أناقة يومية",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
    link: "/collections",
  },
  {
    title: "هدايا مميزة",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&q=80",
    link: "/gifts",
  },
  {
    title: "قطع مختارة",
    image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&q=80",
    link: "/curated",
  },
];

const FlamingoCollections = () => {
  return (
    <section className="py-12 md:py-16 bg-[#FCFAF8]" dir="rtl">

      <div className="container mx-auto px-6">

        <div className="text-center mb-8">

          <p className="text-[10px] tracking-[0.4em] uppercase text-pink-500 mb-3">
            Flamingo Edit
          </p>

          <h2 className="text-3xl md:text-5xl font-light">
            اختيارات فلامنجو
          </h2>

        </div>


        <div className="grid md:grid-cols-12 gap-4 h-auto md:h-[50vh]">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="md:col-span-7 relative overflow-hidden group"
          >

            <Link
              to={picks[0].link}
              className="block h-full"
            >

              <img
                src={picks[0].image}
                alt={picks[0].title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />


              <div className="absolute inset-0 bg-black/20" />


              <div className="absolute bottom-8 right-8 text-white">

                <h3 className="text-2xl md:text-4xl font-light">
                  {picks[0].title}
                </h3>

                <span className="text-xs tracking-[0.3em] uppercase mt-3 inline-block border-b border-white pb-1">
                  اكتشف
                </span>

              </div>

            </Link>

          </motion.div>


          <div className="md:col-span-5 grid grid-cols-3 md:grid-cols-1 gap-4">

            {picks.slice(1).map((item) => (

              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden group"
              >

                <Link
                  to={item.link}
                  className="block h-full"
                >

                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full min-h-[150px] object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-black/20" />


                  <h3 className="absolute bottom-4 right-4 text-white text-sm md:text-lg font-light">
                    {item.title}
                  </h3>

                </Link>

              </motion.div>

            ))}

          </div>

        </div>

      </div>

    </section>
  );
};

export default FlamingoCollections;