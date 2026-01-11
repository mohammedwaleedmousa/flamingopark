import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore, detectCountryFromPhone, Country } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserX, MapPin } from "lucide-react";
import Logo from "@/components/Logo";

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { customer, setCustomer, setCountry } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (customer) {
      navigate("/home", { replace: true });
    }
  }, [customer, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول",
        variant: "destructive",
      });
      return;
    }

    const detectedCountry = detectCountryFromPhone(formData.phone);
    if (!detectedCountry) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم هاتف صحيح",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use edge function for customer auth since customers table is protected
      const response = await supabase.functions.invoke("customer-auth", {
        body: {
          name: formData.name,
          phone: formData.phone,
          country: detectedCountry,
        },
      });

      if (response.error) throw response.error;

      const customer = response.data.customer;

      setCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        country: customer.country as "YE" | "SA",
      });
      setCountry(customer.country as "YE" | "SA");

      toast({
        title: "مرحباً بك",
        description: `أهلاً ${customer.name}`,
      });

      navigate("/home");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء التسجيل",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [showCountrySelect, setShowCountrySelect] = useState(false);

  const handleSkipLogin = () => {
    // Show country selection modal
    setShowCountrySelect(true);
  };

  const handleSelectCountry = (selectedCountry: Country) => {
    setCustomer({
      id: "guest",
      name: "ضيف",
      phone: "",
      country: selectedCountry,
    });
    setCountry(selectedCountry);
    
    toast({
      title: "مرحباً بك",
      description: "ستحتاج لإدخال بياناتك عند إتمام الطلب",
    });
    
    setShowCountrySelect(false);
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="backdrop-blur-sm bg-card/80 rounded-2xl shadow-2xl shadow-primary/10 p-8 space-y-8 border border-primary/40">
          {/* Logo */}
          <div className="flex justify-center">
            <Logo size="lg" variant="auth" />
          </div>

          {/* Welcome Text */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-heading text-primary">مرحباً</h1>
            <p className="text-sm text-muted-foreground">أدخل بياناتك للمتابعة</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="الاسم"
                className="bg-background/50 border-0 ring-1 ring-border/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12 rounded-xl text-center"
                dir="rtl"
              />
            </div>

            <div className="relative">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="رقم الهاتف"
                className="bg-background/50 border-0 ring-1 ring-border/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12 rounded-xl text-center"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-heading tracking-wider text-base shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
            </Button>
          </form>

          {/* Skip Login Button */}
          <div className="pt-2 border-t border-border/30">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkipLogin}
              className="w-full text-muted-foreground hover:text-foreground h-10 rounded-xl font-body text-sm gap-2"
            >
              <UserX className="w-4 h-4" />
              تخطي التسجيل والتصفح كضيف
            </Button>
            <p className="text-xs text-muted-foreground/70 text-center mt-2">
              ستحتاج لإدخال بياناتك عند إتمام الطلب
            </p>
          </div>

          {/* Country Selection Modal */}
          <AnimatePresence>
            {showCountrySelect && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowCountrySelect(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-card rounded-2xl p-6 w-full max-w-sm border border-primary/40 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center mb-6">
                    <MapPin className="w-10 h-10 text-primary mx-auto mb-3" />
                    <h2 className="text-xl font-heading text-foreground">اختر دولتك</h2>
                    <p className="text-sm text-muted-foreground mt-1">لعرض المنتجات والأسعار المناسبة</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => handleSelectCountry("SA")}
                      className="h-24 flex-col gap-2 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <span className="text-3xl">🇸🇦</span>
                      <span className="font-heading">السعودية</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => handleSelectCountry("YE")}
                      className="h-24 flex-col gap-2 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
                    >
                      <span className="text-3xl">🇾🇪</span>
                      <span className="font-heading">اليمن</span>
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
