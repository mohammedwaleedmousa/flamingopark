import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore, detectCountryFromPhone } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserX } from "lucide-react";
import Logo from "@/components/Logo";
const CustomerAuthPage = () => {
  const [searchParams] = useSearchParams();
  
  const navigate = useNavigate();
  const { customer, setCustomer, setRegion, region } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  // Redirect if already logged in and region is available
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session?.user) {
        navigate("/home", { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone.trim() || !formData.password.trim() || (mode === "register" && !formData.name.trim())) {
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
      const rpcName = mode === "login" ? "customer_login" : "customer_register";
      const args = mode === "login"
      ? { 
          _phone: formData.phone, 
          _password: formData.password 
        }
      : { 
          _name: formData.name,
          _phone: formData.phone,
          _region: detectedCountry,
          _password: formData.password
        };
      const { data, error } = await (supabase as any).rpc(rpcName, args);
      if (error) throw error;
      const customer = Array.isArray(data) ? data[0] : data;
      if (!customer) {
        toast({
          title: mode === "login" ? "بيانات الدخول غير صحيحة" : "تعذّر إنشاء الحساب",
          description: mode === "login" ? "تأكد من رقم الهاتف وكلمة السر" : "قد يكون الرقم مسجّلاً مسبقاً",
          variant: "destructive",
        });
        return;
      }

      setCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        region: customer.region,
      });
      setRegion(customer.region);

      toast({
        title: "مرحباً بك",
        description: `أهلاً ${customer.name}`,
      });

      navigate("/home");
    } catch (error: any) {
      console.error("Auth error:", error);
      toast({
        title: "خطأ",
        description: error?.message === "phone_exists" ? "الرقم مسجّل مسبقاً — سجّل الدخول" : "حدث خطأ أثناء العملية",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const handleSkipLogin = async () => {
    setIsDetectingLocation(true);
    
    const detectRegionFromIP = async (): Promise<string> => {
      return "عدن";
    };
    
    try {
      const detectedRegion = await detectRegionFromIP();
      
      setCustomer({
        id: "guest",
        name: "ضيف",
        phone: "",
        region: detectedRegion,
      });
      setRegion(detectedRegion);
      
      toast({
        title: "مرحباً بك",
        description: "تم تحديد موقعك تلقائياً",
      });
      
      navigate("/home");
    } catch (error) {
      console.log('All geolocation APIs failed, using default');
      
      setCustomer({
        id: "guest",
        name: "ضيف",
        phone: "",
        region: "عدن",
      });
      setRegion("عدن");
      
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
            <h1 className="text-2xl font-heading text-primary">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" ? "أدخل رقم هاتفك وكلمة السر" : "أدخل بياناتك لإنشاء حساب جديد"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="الاسم"
                  className="bg-background/50 border-0 ring-1 ring-border/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12 rounded-xl text-center"
                  dir="rtl"
                />
              </div>
            )}

            <div className="relative">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="رقم الهاتف"
                className="bg-background/50 border-0 ring-1 ring-border/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12 rounded-xl text-center"
                dir="ltr"
              />
            </div>

            <div className="relative">
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="كلمة السر"
                className="bg-background/50 border-0 ring-1 ring-border/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary h-12 rounded-xl text-center"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 rounded-xl font-heading tracking-wider text-base shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === "login" ? "دخول" : "إنشاء حساب")}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="w-full text-sm text-primary hover:underline"
            >
              {mode === "login" ? "ليس لديك حساب؟ سجّل الآن" : "لديك حساب؟ سجّل الدخول"}
            </button>
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
