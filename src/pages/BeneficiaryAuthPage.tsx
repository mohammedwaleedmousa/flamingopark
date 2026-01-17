import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { User, Phone, Lock, ArrowRight, UserPlus, LogIn } from "lucide-react";
import { detectCountryFromPhone, Country } from "@/store/useStore";

const BeneficiaryAuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Registration form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // Login form
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const generateCode = (name: string) => {
    // Generate a unique code from name + random numbers
    const cleanName = name.trim().toUpperCase().replace(/\s+/g, "").slice(0, 4);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}${randomNum}`;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim() || !password.trim()) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (password.length < 4) {
      toast.error("كلمة المرور يجب أن تكون 4 أحرف على الأقل");
      return;
    }

    setLoading(true);

    try {
      const code = generateCode(name);
      
      // Check if code already exists
      const { data: existingCode } = await supabase
        .from("beneficiaries")
        .select("code")
        .eq("code", code)
        .maybeSingle();
      
      const finalCode = existingCode ? `${code}${Math.floor(10 + Math.random() * 90)}` : code;
      
      // Detect country from phone number
      const detectedCountry = detectCountryFromPhone(phone.trim());
      if (!detectedCountry) {
        toast.error("يرجى إدخال رقم هاتف صحيح (سعودي أو يمني)");
        setLoading(false);
        return;
      }
      
      // Create beneficiary with default commission/discount
      const { error } = await supabase
        .from("beneficiaries")
        .insert({
          name: name.trim(),
          code: finalCode,
          phone: phone.trim(),
          password_hash: password, // In production, should use proper hashing
          commission_percentage: 10, // Default commission
          discount_percentage: 10, // Default discount
          is_active: true,
          is_approved: false, // Requires admin approval
          country: detectedCountry, // Add country based on phone
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("رقم الجوال مستخدم بالفعل");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`تم إرسال طلبك بنجاح! سيتم مراجعته من قبل الإدارة. كودك هو: ${finalCode}`);
      
      // Don't navigate - show pending message
      setName("");
      setPhone("");
      setPassword("");
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginPhone.trim() || !loginPassword.trim()) {
      toast.error("يرجى إدخال رقم الجوال وكلمة المرور");
      return;
    }

    setLoading(true);

    try {
      const { data: beneficiary, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("phone", loginPhone.trim())
        .eq("password_hash", loginPassword)
        .maybeSingle();

      if (error) throw error;

      if (!beneficiary) {
        toast.error("الكود أو كلمة المرور غير صحيحة");
        return;
      }

      // Check if approved first
      if (!(beneficiary as any).is_approved) {
        toast.error("طلبك قيد المراجعة، يرجى انتظار موافقة الإدارة");
        return;
      }

      if (!beneficiary.is_active) {
        toast.error("الحساب غير نشط، يرجى التواصل مع الإدارة");
        return;
      }

      // Store code in localStorage for session
      localStorage.setItem("beneficiary_code", beneficiary.code);
      
      toast.success(`مرحباً ${beneficiary.name}!`);
      navigate(`/bene/${beneficiary.code}`);
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size="sm" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary">برنامج المستفيدين</h1>
          <p className="text-muted-foreground mt-2">
            انضم إلينا واحصل على عمولة من كل عملية بيع
          </p>
        </div>

        <Card className="border-2 shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              {isLogin ? (
                <>
                  <LogIn className="h-5 w-5" />
                  تسجيل الدخول
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" />
                  إنشاء حساب جديد
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "أدخل رقم الجوال وكلمة المرور للدخول إلى حسابك"
                : "أنشئ حسابك الآن وابدأ في الربح"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {isLogin ? (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginPhone">رقم الجوال</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginPhone"
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="أدخل رقم الجوال"
                      className="pr-10"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loginPassword">كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      className="pr-10"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </form>
            ) : (
              // Registration Form
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">الاسم الكامل *</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="pr-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الجوال *</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="pr-10"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>


                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور *</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أنشئ كلمة مرور (4 أحرف على الأقل)"
                      className="pr-10"
                      required
                      minLength={4}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Toggle between login and register */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب؟ تسجيل الدخول"}
              </button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default BeneficiaryAuthPage;
