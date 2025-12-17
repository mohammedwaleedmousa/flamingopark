import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import HeroSlider from "@/components/HeroSlider";
import BrandsStrip from "@/components/BrandsStrip";
import ReviewsSection from "@/components/ReviewsSection";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import DynamicSection from "@/components/DynamicSection";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Gem, Shield, Truck, Star, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface HomepageSection {
  id: string;
  title: string;
  title_ar: string;
  section_type: string;
  filter_type: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
  max_products: number;
  show_view_all: boolean;
  view_all_link: string | null;
}

const HomePage = () => {
  const { country } = useStore();

  // Fetch homepage sections
  const { data: sections = [] } = useQuery({
    queryKey: ["homepage-sections", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .eq("is_active", true)
        .contains("countries", [country])
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as HomepageSection[];
    },
    enabled: !!country,
  });

  // Fetch categories for the categories section
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!country,
  });

  if (!country) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-16 md:pt-18">
        {/* Hero Slider */}
        <HeroSlider />

        {/* Brands Strip - Right after banner */}
        <BrandsStrip />

        {/* Categories Section - Horizontal scrolling */}
        {categories.length > 0 && (
          <section className="py-10 md:py-14 bg-gradient-to-b from-muted/30 to-background overflow-hidden">
            <div className="container mx-auto px-4 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <span className="text-gold font-body text-sm tracking-widest uppercase">تصفح</span>
                <h2 className="font-heading text-3xl md:text-4xl text-foreground mt-2">
                  الفئات <span className="text-gold">الرئيسية</span>
                </h2>
              </motion.div>
            </div>

            {/* Draggable Categories Strip */}
            {/* Draggable Categories Strip */}
            <div
              className="relative overflow-x-auto px-4 scrollbar-hide cursor-grab active:cursor-grabbing"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <div className="flex items-start gap-4 md:gap-6 pb-2">
                {categories.map((category, index) => (
                  <Link
                    key={`${category.name}-${index}`}
                    to={`/products?category=${category.slug}`}
                    className="group flex-shrink-0 bg-card rounded-xl border-2 border-gold/30 hover:border-gold transition-all duration-300 hover:shadow-[0_10px_30px_-8px_hsl(var(--gold)/0.4)] min-w-[100px] md:min-w-[130px]"
                  >
                    {/* الصورة تغطي كامل الإطار */}
                    <div className="w-full h-32 md:h-36 overflow-hidden rounded-t-xl">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name_ar}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-3xl md:text-4xl">
                          ✨
                        </div>
                      )}
                    </div>

                    {/* الاسم تحت الصورة */}
                    <h3 className="font-heading text-base md:text-lg text-foreground group-hover:text-gold transition-colors text-center py-2">
                      {category.name_ar}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Product Sections */}
        {sections.map((section, index) => (
          <DynamicSection key={section.id} section={section} country={country} index={index} />
        ))}

        {/* CTA Banner */}
        <section className="py-20 md:py-28 bg-secondary text-gold-light relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            {/* Floating Particles */}
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-gold rounded-full"
                initial={{
                  x: `${Math.random() * 100}%`,
                  y: `${Math.random() * 100}%`,
                  opacity: 0,
                }}
                animate={{
                  y: [null, "-50%"],
                  opacity: [0, 0.5, 0],
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}

            {/* Pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />

            {/* Glowing Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 mx-auto mb-8 rounded-full bg-gold/10 flex items-center justify-center"
              >
                <Gem className="w-10 h-10 text-gold" />
              </motion.div>

              <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl mb-6">
                <span className="text-secondary-foreground">انضم إلى عائلة</span>
                <br />
                <span className="text-gold-gradient">ERMGOLD</span>
              </h2>

              <p className="font-body text-lg md:text-xl text-gold-light/70 mb-10 max-w-xl mx-auto">
                احصل على آخر العروض والمنتجات الحصرية واستمتع بتجربة تسوق فريدة
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-3 px-10 py-4 bg-gold text-secondary font-heading tracking-wider text-sm uppercase hover:bg-gold-light transition-all duration-300 rounded-lg hover:shadow-[0_10px_30px_-10px_hsl(var(--gold)/0.5)]"
                >
                  تسوق الآن
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-3 px-10 py-4 border border-gold/30 text-gold font-heading tracking-wider text-sm uppercase hover:bg-gold/10 transition-all duration-300 rounded-lg"
                >
                  اعرف المزيد
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 md:gap-10 mt-12 pt-12 border-t border-gold/10">
                {[
                  { icon: Shield, text: "دفع آمن" },
                  { icon: Truck, text: "شحن مضمون وسريع" },
                  { icon: Star, text: "عملاء مميزون" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-gold-light/60">
                    <item.icon className="w-4 h-4 text-gold" />
                    <span className="text-xs font-body">{item.text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Reviews Section */}
        <ReviewsSection />
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
