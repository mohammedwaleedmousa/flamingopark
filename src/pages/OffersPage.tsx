import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { useStore, Product } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { Percent, Clock, Loader2, Sparkles, Tag, Flame, Gift, Zap, Timer, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  end_date: string | null;
  start_date: string | null;
  countries: string[];
}

interface OffersSettings {
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

const calculateTimeLeft = (endDate: string | null): TimeLeft => {
  if (!endDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  
  const end = new Date(endDate).getTime();
  const now = new Date().getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  };
};

// Timer component for individual offers
const OfferTimer = ({ endDate, label }: { endDate: string | null; label?: string }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(endDate));

  useEffect(() => {
    if (!endDate) return;
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  if (!endDate || timeLeft.expired) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Timer className="w-4 h-4 text-gold" />
      {label && <span className="text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-1 font-mono">
        <span className="bg-secondary/80 px-2 py-1 rounded text-gold">{timeLeft.days}d</span>
        <span className="text-gold">:</span>
        <span className="bg-secondary/80 px-2 py-1 rounded text-gold">{String(timeLeft.hours).padStart(2, '0')}h</span>
        <span className="text-gold">:</span>
        <span className="bg-secondary/80 px-2 py-1 rounded text-gold">{String(timeLeft.minutes).padStart(2, '0')}m</span>
        <span className="text-gold">:</span>
        <span className="bg-secondary/80 px-2 py-1 rounded text-gold">{String(timeLeft.seconds).padStart(2, '0')}s</span>
      </div>
    </div>
  );
};

// Copy coupon button
const CopyCodeButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "تم النسخ!", description: `تم نسخ كود الخصم: ${code}` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-2 bg-gold/20 hover:bg-gold/30 border border-gold/40 px-4 py-2 rounded-lg transition-colors"
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gold" />}
      <span className="font-mono font-bold text-gold">{code}</span>
    </button>
  );
};

const OffersPage = () => {
  const { country } = useStore();
  const queryClient = useQueryClient();
  const [mainTimeLeft, setMainTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  // Fetch offers settings
  const { data: settings } = useQuery({
    queryKey: ["offers-settings", country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as OffersSettings | null;
    },
    enabled: !!country,
  });

  // Fetch active offers that haven't expired
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ["offers", country],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_active", true)
        .or(`end_date.is.null,end_date.gt.${now}`)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []).filter(offer => {
        // Double check end_date
        if (offer.end_date) {
          return new Date(offer.end_date) > new Date();
        }
        return true;
      }) as Offer[];
    },
    enabled: !!country,
    refetchInterval: 60000, // Refetch every minute to check for expired offers
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
        costPrice: p.cost_price ? Number(p.cost_price) : undefined,
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
    enabled: offerProductIds.length > 0 && !!country,
  });

  // Main countdown timer
  useEffect(() => {
    if (!settings?.countdown_end_date || !settings.show_countdown) return;

    const updateTimer = () => {
      const timeLeft = calculateTimeLeft(settings.countdown_end_date);
      setMainTimeLeft(timeLeft);
      
      // If main timer expired, hide all offers
      if (timeLeft.expired) {
        queryClient.invalidateQueries({ queryKey: ["offers"] });
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [settings?.countdown_end_date, settings?.show_countdown, queryClient]);

  // Check if main timer has expired - but only hide offers if there's a valid countdown date set
  // Don't block offers if countdown expired but offers still have valid end_dates
  const mainTimerExpired = settings?.show_countdown && settings?.countdown_end_date && mainTimeLeft.expired && offers.length === 0;

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 md:py-24 bg-gradient-to-b from-secondary via-secondary to-charcoal overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0">
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
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />
            <div className="absolute top-20 left-10 w-64 h-64 bg-gold/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gold/20 to-gold/10 rounded-full mb-8 border border-gold/30"
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

              {/* Main Countdown Timer */}
              {settings?.show_countdown && settings?.countdown_end_date && !mainTimeLeft.expired && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-12"
                >
                  <p className="text-gold-light/60 text-sm mb-4 font-body flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    تنتهي جميع العروض خلال
                  </p>
                  <div className="flex items-center justify-center gap-3 md:gap-6">
                    <TimeBox value={mainTimeLeft.days} label="يوم" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={mainTimeLeft.hours} label="ساعة" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={mainTimeLeft.minutes} label="دقيقة" />
                    <span className="text-gold text-2xl font-heading mt-[-20px]">:</span>
                    <TimeBox value={mainTimeLeft.seconds} label="ثانية" />
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

        {/* Content */}
        {offersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-gold" />
            <p className="text-muted-foreground font-body">جاري تحميل العروض...</p>
          </div>
        ) : mainTimerExpired ? (
          <section className="py-20">
            <div className="container mx-auto px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Clock className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-2xl text-foreground mb-3">انتهت العروض</h3>
                <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
                  ترقبوا عروضنا القادمة! سنُعلمكم فور توفر عروض جديدة
                </p>
              </motion.div>
            </div>
          </section>
        ) : offers.length === 0 ? (
          <section className="py-20">
            <div className="container mx-auto px-4">
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
            </div>
          </section>
        ) : (
          <>
            {/* Individual Offers */}
            {offers.map((offer, offerIndex) => {
              const offerLinkedProducts = offerProducts.filter((p) => offer.product_ids?.includes(p.id));
              const hasProducts = offerLinkedProducts.length > 0 || (offer.product_ids === null || offer.product_ids.length === 0);

              return (
                <section key={offer.id} className="py-12 md:py-16 border-b border-border/30 last:border-b-0">
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
                          <div className="md:w-1/3 aspect-video md:aspect-auto relative">
                            <img src={offer.image_url} alt={offer.title_ar} className="w-full h-full object-cover" />
                            {offer.discount_percentage > 0 && (
                              <div className="absolute top-4 left-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-lg font-bold">
                                {offer.discount_percentage}% خصم
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`p-6 md:p-8 flex flex-col justify-center ${offer.image_url ? "md:w-2/3" : "w-full text-center"}`}
                        >
                          {!offer.image_url && offer.discount_percentage > 0 && (
                            <span className="inline-block w-fit bg-destructive text-destructive-foreground px-4 py-1.5 rounded-full text-sm font-bold mb-4 mx-auto">
                              {offer.discount_percentage}% خصم
                            </span>
                          )}
                          <h2 className="font-heading text-2xl md:text-3xl text-gold mb-2">{offer.title_ar}</h2>
                          {offer.subtitle_ar && <p className="text-gold-light/70 text-base mb-4">{offer.subtitle_ar}</p>}
                          {offer.description_ar && (
                            <p className="text-muted-foreground text-sm mb-4">{offer.description_ar}</p>
                          )}
                          
                          {/* Offer-specific timer */}
                          {offer.end_date && (
                            <div className="mb-4">
                              <OfferTimer endDate={offer.end_date} label="ينتهي خلال:" />
                            </div>
                          )}
                          
                          {/* Coupon code */}
                          {offer.discount_code && (
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-gold-light/70">كود الخصم:</span>
                              <CopyCodeButton code={offer.discount_code} />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* Offer Products */}
                    {offerLinkedProducts.length > 0 ? (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {offerLinkedProducts.map((product, index) => (
                          <ProductCard key={product.id} product={product} index={index} />
                        ))}
                      </div>
                    ) : offer.product_ids && offer.product_ids.length > 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        جاري تحميل المنتجات...
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </>
        )}

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
              <p className="text-muted-foreground">تابعنا للحصول على آخر العروض والخصومات الحصرية</p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default OffersPage;
