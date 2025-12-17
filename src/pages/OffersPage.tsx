import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { useStore, Product } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Percent, Clock, Loader2, Sparkles, Tag, Flame, Gift, Zap } from "lucide-react";
import { Link } from "react-router-dom";

interface Offer {
  id: string;
  title_ar: string;
  subtitle_ar: string | null;
  description_ar: string | null;
  image_url: string | null;
  discount_code: string | null;
  discount_percentage: number;
  is_featured: boolean;
  product_ids: string[] | null;
}

interface OffersSettings {
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
}

const OffersPage = () => {
  const { country } = useStore();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Fetch offers settings
  const { data: settings } = useQuery({
    queryKey: ["offers-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("offers_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as OffersSettings | null;
    },
  });

  // Fetch active offers
  const { data: offers = [] } = useQuery({
    queryKey: ["offers", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .contains("countries", [country])
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Offer[];
    },
    enabled: !!country,
  });

  // Collect all product IDs from offers
  const offerProductIds = offers.flatMap((o) => o.product_ids || []);

  // Fetch products linked to offers
  const { data: offerProducts = [] } = useQuery({
    queryKey: ["offer-products", offerProductIds],
    queryFn: async () => {
      if (offerProductIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .in("id", offerProductIds);
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "",
        descriptionAr: p.description_ar || "",
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["SA", "YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: offerProductIds.length > 0,
  });

  // Fetch discounted products
  const { data: discountedProducts = [], isLoading } = useQuery({
    queryKey: ["discounted-products", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .gt("discount", 0)
        .contains("countries", [country])
        .order("discount", { ascending: false });
      if (error) throw error;
      return data.map((p) => ({
        id: p.id,
        name: p.name,
        nameAr: p.name_ar,
        slug: p.slug,
        price: Number(p.price),
        originalPrice: p.original_price ? Number(p.original_price) : undefined,
        discount: p.discount || undefined,
        description: p.description || "",
        descriptionAr: p.description_ar || "",
        images: p.images || [],
        category: p.category,
        brand: p.brand,
        inStock: p.in_stock ?? true,
        countries: (p.countries || ["SA", "YE"]) as ("SA" | "YE")[],
        isFeatured: p.is_featured,
        isBestSeller: p.is_best_seller,
      })) as Product[];
    },
    enabled: !!country,
  });

  // Countdown timer
  useEffect(() => {
    if (!settings?.countdown_end_date || !settings.show_countdown) return;

    const calculateTimeLeft = () => {
      const endDate = new Date(settings.countdown_end_date!).getTime();
      const now = new Date().getTime();
      const diff = endDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [settings?.countdown_end_date, settings?.show_countdown]);

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-secondary rounded-xl flex items-center justify-center border border-gold/30 shadow-[0_0_20px_hsl(var(--gold)/0.2)]">
          <span className="font-heading text-2xl md:text-3xl text-gold">{value.toString().padStart(2, "0")}</span>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full animate-pulse" />
      </div>
      <span className="text-xs md:text-sm text-gold-light/70 mt-2 font-body">{label}</span>
    </div>
  );

  const features = [
    { icon: Tag, text: "خصومات تصل إلى 50%", color: "text-gold" },
    { icon: Gift, text: "هدايا مجانية", color: "text-emerald-400" },
    { icon: Zap, text: "شحن سريع", color: "text-blue-400" },
  ];

  const featuredOffers = offers.filter((o) => o.is_featured);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-secondary via-secondary to-charcoal overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
            {/* Gold Particles */}
            <div className="absolute inset-0 opacity-20">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-gold rounded-full"
                  initial={{
                    x: Math.random() * 100 + "%",
                    y: Math.random() * 100 + "%",
                    opacity: 0,
                  }}
                  animate={{
                    y: [null, "-100%"],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />

            {/* Glowing Orbs */}
            <div className="absolute top-20 left-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold/20 to-gold/10 backdrop-blur-sm rounded-full mb-8 border border-gold/30"
              >
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
                <span className="font-body text-sm text-gold">عروض محدودة المدة</span>
                <Sparkles className="w-4 h-4 text-gold" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="font-heading text-5xl md:text-7xl lg:text-8xl mb-6"
              >
                <span className="text-secondary-foreground">{settings?.page_title?.split(" ")[0] || "عروض"}</span>
                <br />
                <span className="text-gold-gradient">
                  {settings?.page_title?.split(" ").slice(1).join(" ") || "استثنائية"}
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-body text-lg md:text-xl text-gold-light/70 max-w-2xl mx-auto mb-12"
              >
                {settings?.page_subtitle || "اغتنم الفرصة واحصل على أفخم القطع الذهبية بأسعار لا تُقاوم"}
              </motion.p>

              {/* Countdown Timer */}
              {settings?.show_countdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-12"
                >
                  <p className="text-gold-light/60 text-sm mb-4 font-body flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    ينتهي العرض خلال
                  </p>
                  <div className="flex items-center justify-center gap-3 md:gap-6">
                    <TimeBox value={timeLeft.days} label="يوم" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={timeLeft.hours} label="ساعة" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={timeLeft.minutes} label="دقيقة" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={timeLeft.seconds} label="ثانية" />
                  </div>
                </motion.div>
              )}

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center justify-center gap-4 md:gap-8"
              >
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-gold-light/80">
                    <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    <span className="font-body text-sm">{feature.text}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>

          {/* Bottom Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M0 50L48 45.8C96 41.7 192 33.3 288 37.5C384 41.7 480 58.3 576 62.5C672 66.7 768 58.3 864 50C960 41.7 1056 33.3 1152 37.5C1248 41.7 1344 58.3 1392 66.7L1440 75V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z"
                fill="hsl(var(--background))"
              />
            </svg>
          </div>
        </section>

        {/* Promo Banner */}
        {settings?.show_promo_banner && settings.promo_banner_text && (
          <section className="py-6 bg-gradient-to-r from-gold via-gold-light to-gold relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBtLTIgMGEyIDIgMCAxIDAgNCAwIDIgMiAwIDEgMC00IDB6IiBmaWxsPSJyZ2JhKDAsMCwwLDAuMSkiLz48L2c+PC9zdmc+')] opacity-30" />
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-center gap-4 md:gap-8">
                <Percent className="w-6 h-6 text-secondary animate-bounce" />
                <span className="font-heading text-secondary text-lg md:text-xl">{settings.promo_banner_text}</span>
                <Percent className="w-6 h-6 text-secondary animate-bounce" />
              </div>
            </div>
          </section>
        )}

        {/* Featured Offers Section with Products */}
        {offers.length > 0 &&
          offers.map((offer, offerIndex) => {
            const offerLinkedProducts = offerProducts.filter((p) => offer.product_ids?.includes(p.id));

            return (
              <section key={offer.id} className="py-12 md:py-16">
                <div className="container mx-auto px-4">
                  {/* Offer Header Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-secondary via-charcoal to-secondary mb-8 border border-gold/20"
                  >
                    <div className="flex flex-col md:flex-row">
                      {offer.image_url && (
                        <div className="md:w-1/3 aspect-video md:aspect-auto">
                          <img src={offer.image_url} alt={offer.title_ar} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div
                        className={`p-6 md:p-8 flex flex-col justify-center ${offer.image_url ? "md:w-2/3" : "w-full text-center"}`}
                      >
                        {offer.discount_percentage > 0 && (
                          <span className="inline-block w-fit bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold mb-4">
                            {offer.discount_percentage}% خصم
                          </span>
                        )}
                        <h2 className="font-heading text-2xl md:text-3xl text-gold mb-2">{offer.title_ar}</h2>
                        {offer.subtitle_ar && <p className="text-gold-light/70 text-base mb-4">{offer.subtitle_ar}</p>}
                        {offer.description_ar && (
                          <p className="text-muted-foreground text-sm mb-4">{offer.description_ar}</p>
                        )}
                        {offer.discount_code && (
                          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 px-5 py-3 rounded-lg w-fit">
                            <span className="text-gold-light/70">كود الخصم:</span>
                            <span className="font-mono font-bold text-gold text-lg">{offer.discount_code}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>

                  {/* Offer Products */}
                  {offerLinkedProducts.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                      {offerLinkedProducts.map((product, index) => (
                        <ProductCard key={product.id} product={product} index={index} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            );
          })}

        {/* Products Section */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            {/* Section Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-4">
                جميع <span className="text-gold">العروض</span>
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto mb-4" />
              <p className="text-muted-foreground font-body max-w-lg mx-auto">
                اكتشف تشكيلتنا الفاخرة من المجوهرات الذهبية بأسعار مخفضة
              </p>
            </motion.div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                  <Loader2 className="w-12 h-12 animate-spin text-gold" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-gold/20 rounded-full" />
                </div>
                <p className="text-muted-foreground font-body">جاري تحميل العروض...</p>
              </div>
            ) : discountedProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Tag className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-2xl text-foreground mb-3">لا توجد عروض حالياً</h3>
                <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
                  ترقبوا عروضنا القادمة! سنُعلمكم فور توفر عروض جديدة
                </p>
              </motion.div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
                  {[
                    { value: discountedProducts.length, label: "منتج بالعرض" },
                    { value: Math.max(...discountedProducts.map((p) => p.discount || 0)), label: "% أعلى خصم" },
                    { value: discountedProducts.filter((p) => p.inStock).length, label: "متوفر حالياً" },
                  ].map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="text-center p-4 rounded-xl bg-muted/50 border border-border/30"
                    >
                      <span className="font-heading text-3xl text-gold">{stat.value}</span>
                      <p className="text-sm text-muted-foreground font-body mt-1">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {discountedProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center max-w-2xl mx-auto"
            >
              <Sparkles className="w-10 h-10 text-gold mx-auto mb-4" />
              <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-4">لا تفوت أي عرض!</h2>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;
