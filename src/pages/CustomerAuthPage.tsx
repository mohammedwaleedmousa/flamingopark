import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore, detectCountryFromPhone } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UserX } from "lucide-react";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
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
  <div
    className="min-h-screen bg-background flex items-center justify-center px-6 relative overflow-hidden"
    dir="rtl"
  >
    {/* Luxury Background */}
    <div className="absolute inset-0">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
    </div>


    <div className="relative z-10 w-full max-w-md">

      {/* Logo */}
      <div className="flex justify-center mb-12">
        <Logo size="lg" variant="auth" />
      </div>


      {/* Title */}
      <div className="text-center mb-10">

        <h1 className="font-heading text-4xl tracking-wide text-foreground mb-4">
          {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
        </h1>

        <div className="w-16 h-px bg-primary mx-auto mb-5" />

        <p className="text-muted-foreground text-sm font-body">
          {mode === "login"
            ? "سجل دخولك للوصول إلى مجموعتك المفضلة"
            : "انضم إلينا واستمتع بتجربة تسوق فاخرة"}
        </p>

      </div>



      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">


        {mode === "register" && (
          <div className="relative">

            <Input
              value={formData.name}
              onChange={(e)=>setFormData({
                ...formData,
                name:e.target.value
              })}
              placeholder="الاسم الكامل"
              dir="rtl"
              className="
              h-14
              rounded-none
              border-0
              border-b
              border-border
              bg-transparent
              text-center
              text-base
              focus-visible:ring-0
              focus-visible:border-primary
              transition-all
              "
            />

          </div>
        )}



        <Input
          value={formData.phone}
          onChange={(e)=>setFormData({
            ...formData,
            phone:e.target.value
          })}
          placeholder="رقم الهاتف"
          dir="ltr"
          className="
          h-14
          rounded-none
          border-0
          border-b
          border-border
          bg-transparent
          text-center
          text-base
          focus-visible:ring-0
          focus-visible:border-primary
          transition-all
          "
        />



        <Input
          type="password"
          value={formData.password}
          onChange={(e)=>setFormData({
            ...formData,
            password:e.target.value
          })}
          placeholder="كلمة المرور"
          dir="ltr"
          className="
          h-14
          rounded-none
          border-0
          border-b
          border-border
          bg-transparent
          text-center
          text-base
          focus-visible:ring-0
          focus-visible:border-primary
          transition-all
          "
        />



        {/* Luxury Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="
          group
          relative
          w-full
          h-14
          rounded-none
          bg-black
          text-white
          overflow-hidden
          font-heading
          tracking-widest
          text-sm
          hover:bg-black/90
          transition-all
          duration-500
          shadow-xl
          "
        >

          <span className="
          absolute
          inset-0
          bg-gradient-to-r
          from-transparent
          via-white/20
          to-transparent
          translate-x-[-100%]
          group-hover:translate-x-[100%]
          transition-transform
          duration-700
          "/>


          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto"/>
          ) : (
            mode === "login"
              ? "تسجيل الدخول"
              : "إنشاء الحساب"
          )}

        </Button>



        {/* Switch Mode */}
        <button
          type="button"
          onClick={() =>
            setMode(mode === "login" ? "register" : "login")
          }
          className="
          w-full
          text-sm
          text-muted-foreground
          hover:text-primary
          transition-colors
          "
        >

          {mode === "login"
            ? "ليس لديك حساب؟ إنشاء حساب"
            : "لديك حساب؟ تسجيل الدخول"}

        </button>


      </form>




      {/* Guest Access */}

      <div className="mt-12 pt-8 border-t border-border/40 text-center">

        <button
          type="button"
          onClick={handleSkipLogin}
          disabled={isDetectingLocation}
          className="
          text-xs
          tracking-wide
          text-muted-foreground
          hover:text-primary
          transition-colors
          flex
          items-center
          justify-center
          gap-2
          mx-auto
          "
        >

          {isDetectingLocation ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin"/>
              جاري الدخول...
            </>
          ) : (
            <>
              <UserX className="w-4 h-4"/>
              متابعة التصفح كضيف
            </>
          )}

        </button>

        <p className="mt-3 text-[11px] text-muted-foreground/60">
          يمكنك إنشاء حساب لاحقاً عند إتمام الطلب
        </p>

      </div>


    </div>

  </div>
);
};

export default CustomerAuthPage;
