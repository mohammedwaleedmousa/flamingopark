import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore, detectCountryFromPhone, Country } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserX } from "lucide-react";
import Logo from "@/components/Logo";
const CustomerAuthPage = () => {
  const [searchParams] = useSearchParams();
  
  const navigate = useNavigate();
  const { customer, setCustomer, setCountry, country } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  // Redirect if already logged in and country is available
  useEffect(() => {
    if (!customer) return;

    const fallbackCountry = customer.country === "SA" || customer.country === "YE" ? customer.country : null;

    if (!country && fallbackCountry) {
      setCountry(fallbackCountry);
      navigate("/home", { replace: true });
      return;
    }

    if (country) {
      navigate("/home", { replace: true });
    }
  }, [customer, country, setCountry, navigate]);

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

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleSkipLogin = async () => {
    setIsDetectingLocation(true);
    
    // Helper function to try multiple geolocation APIs
    const detectCountryFromIP = async (): Promise<Country> => {
      // List of APIs to try in order
      const apis = [
        {
          url: 'https://ipwho.is/',
          getCountry: (data: any) => data.country_code
        },
        {
          url: 'https://ip-api.com/json/?fields=countryCode',
          getCountry: (data: any) => data.countryCode
        },
        {
          url: 'https://ipapi.co/json/',
          getCountry: (data: any) => data.country_code
        }
      ];
      
      for (const api of apis) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(api.url, { 
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            const countryCode = api.getCountry(data);
            console.log(`Country detected from ${api.url}:`, countryCode);
            
            if (countryCode === 'SA') return 'SA';
            if (countryCode === 'YE') return 'YE';
          }
        } catch (error) {
          console.log(`API ${api.url} failed, trying next...`);
        }
      }
      
      // Default fallback
      return 'SA';
    };
    
    try {
      const detectedCountry = await detectCountryFromIP();
      
      setCustomer({
        id: "guest",
        name: "ضيف",
        phone: "",
        country: detectedCountry,
      });
      setCountry(detectedCountry);
      
      toast({
        title: "مرحباً بك",
        description: `تم تحديد موقعك: ${detectedCountry === 'SA' ? 'السعودية 🇸🇦' : 'اليمن 🇾🇪'}`,
      });
      
      navigate("/home");
    } catch (error) {
      console.log('All geolocation APIs failed, using default');
      
      setCustomer({
        id: "guest",
        name: "ضيف",
        phone: "",
        country: "SA",
      });
      setCountry("SA");
      
      toast({
        title: "مرحباً بك",
        description: "ستحتاج لإدخال بياناتك عند إتمام الطلب",
      });
      
      navigate("/home");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="bg-card rounded-2xl shadow-2xl shadow-primary/10 p-8 space-y-8 border border-primary/40">
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
              disabled={isDetectingLocation}
              className="w-full text-muted-foreground hover:text-foreground h-10 rounded-xl font-body text-sm gap-2"
            >
              {isDetectingLocation ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحديد الموقع...
                </>
              ) : (
                <>
                  <UserX className="w-4 h-4" />
                  تخطي التسجيل والتصفح كضيف
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground/70 text-center mt-2">
              سيتم تحديد موقعك تلقائياً
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default CustomerAuthPage;
