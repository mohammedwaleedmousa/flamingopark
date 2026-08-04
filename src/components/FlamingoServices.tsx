import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

import "swiper/css";
import "swiper/css/free-mode";

const fallbackServices = [
  {
    title: "مساعد التسوق الخاص",
    description: "نساعدك في اختيار القطعة المناسبة حسب ذوقك ومناسبتك بكل سهولة.",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=80",
    link: "/contact",
  },
  {
    title: "هدايا فلامنجو",
    description: "اختيارات مميزة للمناسبات الخاصة مع عناية بكل التفاصيل.",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80",
    link: "/gifts",
  },
  {
    title: "إلهام الإطلالات",
    description: "اكتشف تنسيقات الموسم واختياراتنا التي تناسب كل مناسبة.",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80",
    link: "/collections",
  },
];

const FlamingoServices = () => {
  const { data: managedServices = [] } = useQuery({
    queryKey: ["home-services"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("campaign_pages").select("slug,title_ar,description_ar,image_url").eq("page_type", "service").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return (data || []).map((service: any) => ({ title: service.title_ar, description: service.description_ar || "", image: service.image_url || "/icons/flamingo.jpeg", link: `/campaigns/${service.slug}` }));
    },
  });
  const services = managedServices.length ? managedServices : fallbackServices;
  return (
    <section
      className="py-16 md:py-24 bg-[#FCFAF8]"
      dir="rtl"
    >
      <div
        className="container mx-auto px-6"
      >

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >

          <h2
            className="text-3xl md:text-5xl font-light"
          >
            خدمات فلامنجو المميزة
          </h2>

          <p
            className="mt-5 text-sm text-muted-foreground max-w-xl mx-auto leading-8"
          >
            تجربة تسوق مصممة لتجعل كل لحظة أكثر تميزاً.
          </p>

        </motion.div>


        <Swiper
          modules={[FreeMode]}
          slidesPerView="auto"
          spaceBetween={24}
          freeMode={{
            enabled: true,
            momentum: true,
          }}
          breakpoints={{
            768: {
              slidesPerView: 3,
            },
          }}
        >

          {services.map((service) => (
            <SwiperSlide
              key={service.title}
              className="!w-[280px] md:!w-auto"
            >

              <article
                className="bg-white overflow-hidden group"
              >

                <div
                  className="aspect-[3/4] overflow-hidden"
                >

                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                </div>


                <div
                  className="p-7 text-center"
                >

                  <h3
                    className="text-xl font-light mb-4"
                  >
                    {service.title}
                  </h3>


                  <p
                    className="text-sm text-muted-foreground leading-7 mb-6"
                  >
                    {service.description}
                  </p>


                  <Link
                    to={service.link}
                    className="text-xs tracking-[0.25em] uppercase border-b border-black pb-2 hover:text-pink-500 hover:border-pink-500 transition"
                  >
                    اكتشف المزيد
                  </Link>

                </div>

              </article>

            </SwiperSlide>
          ))}

        </Swiper>

      </div>
    </section>
  );
};

export default FlamingoServices;