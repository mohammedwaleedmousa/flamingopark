import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useStore, detectCountryFromPhone } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setCountry } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

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
        description: "يرجى إدخال رقم هاتف صحيح (يبدأ بـ 5 للسعودية أو 7 لليمن)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("*")
        .eq("phone", formData.phone)
        .maybeSingle();

      let customer;

      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        const { data: newCustomer, error } = await supabase
          .from("customers")
          .insert({
            name: formData.name,
            phone: formData.phone,
            country: detectedCountry,
          })
          .select()
          .single();

        if (error) throw error;
        customer = newCustomer;
      }

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
            <Logo size="lg" />
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
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
