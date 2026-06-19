import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";

const AuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/home", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/home", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast({ title: "تم إنشاء الحساب", description: "أهلاً بك في فلامنجو" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "مرحباً بعودتك" });
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل تسجيل الدخول", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/home` });
      if (res.error) throw res.error;
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل تسجيل الدخول بـ Google", variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-background" dir="rtl">
      {/* Editorial panel */}
      <div className="relative hidden md:block bg-black overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=85"
          alt="Flamingo"
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-12 text-white">
          <p className="text-[10px] tracking-[0.5em] uppercase opacity-70 mb-3">Maison Flamingo</p>
          <h2 className="logo-flamingo text-5xl">FLAMINGO</h2>
          <p className="mt-4 text-sm opacity-80 max-w-sm">انضم إلى عالم من الأناقة الفاخرة والتصاميم الحصرية</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <Link to="/home" className="inline-flex items-center gap-2 text-[10px] tracking-[0.4em] uppercase text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> العودة للرئيسية
          </Link>

          <div>
            <h1 className="font-heading text-4xl text-foreground mb-2">
              {mode === "signin" ? "تسجيل الدخول" : "إنشاء حساب"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin" ? "أهلاً بعودتك إلى فلامنجو" : "ابدأ رحلتك مع أفخم القطع"}
            </p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-12 border border-foreground/20 hover:border-foreground transition-colors flex items-center justify-center gap-3 text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            متابعة عبر Google
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] tracking-[0.4em] uppercase text-muted-foreground">أو</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم الكامل" required className="h-12 pr-10 bg-transparent" dir="rtl" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" required className="h-12 pr-10 bg-transparent" dir="ltr" />
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور" required minLength={6} className="h-12 pr-10 bg-transparent" dir="ltr" />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 text-[11px] tracking-[0.4em] uppercase">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "signin" ? "دخول" : "إنشاء حساب"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-foreground underline underline-offset-4">
              {mode === "signin" ? "أنشئ حساب" : "تسجيل الدخول"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;