import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { User, Phone, Mail, Lock, ArrowRight, UserPlus, LogIn } from "lucide-react";

const BeneficiaryAuthPage = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Registration form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Login form
  const [loginCode, setLoginCode] = useState("");
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
      
      // Create beneficiary with default commission/discount
      const { error } = await supabase
        .from("beneficiaries")
        .insert({
          name: name.trim(),
          code: finalCode,
          phone: phone.trim(),
          email: email.trim() || null,
          password_hash: password, // In production, should use proper hashing
          commission_percentage: 10, // Default commission
          discount_percentage: 10, // Default discount
          is_active: true,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("البريد الإلكتروني مستخدم بالفعل");
        } else {
          throw error;
        }
        return;
      }

      toast.success(`تم إنشاء حسابك بنجاح! كودك هو: ${finalCode}`);
      
      // Store code in localStorage for session
      localStorage.setItem("beneficiary_code", finalCode);
      
      // Navigate to dashboard
      navigate(`/bene/${finalCode}`);
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("حدث خطأ أثناء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginCode.trim() || !loginPassword.trim()) {
      toast.error("يرجى إدخال الكود وكلمة المرور");
      return;
    }

    setLoading(true);

    try {
      const { data: beneficiary, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("code", loginCode.trim().toUpperCase())
        .eq("password_hash", loginPassword)
        .maybeSingle();

      if (error) throw error;

      if (!beneficiary) {
        toast.error("الكود أو كلمة المرور غير صحيحة");
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
                ? "أدخل الكود وكلمة المرور للدخول إلى حسابك"
                : "أنشئ حسابك الآن وابدأ في الربح"
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {isLogin ? (
              // Login Form
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginCode">كود المستفيد</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="loginCode"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                      placeholder="أدخل الكود الخاص بك"
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
                  <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="pr-10"
                      dir="ltr"
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

        {/* Benefits Info */}
        {!isLogin && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-bold text-primary mb-2 text-center">مميزات البرنامج</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                احصل على رمز QR خاص بك لمشاركته
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                عمولة 10% من كل عملية بيع
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                خصم 10% لعملائك
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full"></span>
                تتبع مبيعاتك وأرباحك مباشرة
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeneficiaryAuthPage;
