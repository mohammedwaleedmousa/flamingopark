import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/home", { replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/home", { replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast({ title: "كلمة المرور قصيرة", description: "يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
    if (password !== confirm) return toast({ title: "غير متطابقة", description: "كلمتا المرور غير متطابقتين", variant: "destructive" });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    toast({ title: "تم تحديث كلمة المرور" });
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background" dir="rtl">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <p className="logo-flamingo text-3xl mb-4">FLAMINGO</p>
          <h1 className="font-heading text-3xl">إعادة تعيين كلمة المرور</h1>
          <p className="text-sm text-muted-foreground mt-2">{ready ? "أدخل كلمة مرور جديدة" : "جاري التحقق من الرابط..."}</p>
        </div>
        {ready && (
          <form onSubmit={submit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة المرور الجديدة" minLength={6} required className="h-12 pr-10" dir="ltr" />
            </div>
            <div className="relative">
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تأكيد كلمة المرور" minLength={6} required className="h-12 pr-10" dir="ltr" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 text-[11px] tracking-[0.4em] uppercase">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث كلمة المرور"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;