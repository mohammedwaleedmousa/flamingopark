import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (roleData) navigate("/admin");
    };

    checkSession();
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      toast({ title: "البيانات غير مكتملة", description: "أدخل البريد الإلكتروني وكلمة المرور.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: formData.email, password: formData.password });
      if (error) throw error;

      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("ليس لديك صلاحيات الأدمن");
      }

      toast({ title: "تم تسجيل الدخول", description: "مرحباً بك في لوحة إدارة فلامنجو." });
      navigate("/admin");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      const errorMessage = message.includes("Invalid login credentials") ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : message || "حدث خطأ أثناء تسجيل الدخول";
      toast({ title: "تعذر تسجيل الدخول", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-[#F4F6F2] text-[#20231F]" dir="rtl">
      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1440px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden border-l border-[#E1E5DD] bg-[#E9EEE7] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="absolute -left-32 -top-28 h-[440px] w-[440px] rounded-full bg-white/65 blur-3xl" />
          <div className="absolute -bottom-40 -right-32 h-[480px] w-[480px] rounded-full bg-[#A9B7A3]/20 blur-3xl" />

          <button type="button" onClick={() => navigate("/home")} className="relative z-10 flex w-fit items-center gap-3" aria-label="العودة إلى متجر فلامنجو بارك">
            <img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={56} height={56} className="h-14 w-14 rounded-2xl object-contain" />
            <div className="text-right"><p className="font-serif text-[16px] tracking-[0.14em] text-[#344033]">FLAMINGO PARK</p><p className="mt-1 text-[11px] text-[#788276]">Commerce Administration</p></div>
          </button>

          <div className="relative z-10 max-w-[500px] py-16">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/75"><ShieldCheck className="h-5 w-5 text-[#59634D]" strokeWidth={1.6} /></div>
            <p className="text-[12px] font-semibold tracking-[0.12em] text-[#647057]">SECURE ADMIN ACCESS</p>
            <h1 className="mt-4 max-w-[470px] text-[42px] font-semibold leading-[1.22] tracking-[-0.045em] text-[#283026] xl:text-[48px]">إدارة المتجر من مساحة واضحة وآمنة.</h1>
            <p className="mt-5 max-w-[440px] text-[14px] leading-7 text-[#6E796B]">وصول مخصص لفريق الإدارة لمتابعة الطلبات والعملاء والمخزون والمالية من خلال حسابات موثقة وصلاحيات محددة.</p>

            <div className="mt-9 grid gap-4">
              <div className="flex items-center gap-3 text-[13px] text-[#566052]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><ShieldCheck className="h-4 w-4 text-[#59634D]" /></span><span>التحقق من صلاحية الأدمن بعد تسجيل الدخول</span></div>
              <div className="flex items-center gap-3 text-[13px] text-[#566052]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><LockKeyhole className="h-4 w-4 text-[#59634D]" /></span><span>جلسة Supabase Auth موثقة ومحميّة</span></div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-[#899285]">Flamingo Park Admin · Authorized personnel only</p>
        </aside>

        <section className="flex min-h-[100svh] flex-col bg-[#FBFCFA]">
          <header className="flex h-[76px] items-center justify-between border-b border-[#E7EAE4] px-5 sm:px-8 lg:px-12">
            <button type="button" onClick={() => navigate("/home")} className="flex items-center gap-2 text-[12px] font-medium text-[#6C7568] transition-colors hover:text-[#46503D]"><ArrowLeft className="h-4 w-4" />العودة للمتجر</button>
            <button type="button" onClick={() => navigate("/home")} aria-label="Flamingo Park" className="flex items-center gap-2 lg:hidden"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={38} height={38} className="h-[38px] w-[38px] rounded-xl object-contain" /><span className="font-serif text-[11px] tracking-[0.12em] text-[#59634D]">FLAMINGO PARK</span></button>
            <div className="hidden items-center gap-2 text-[11px] text-[#7D8779] lg:flex"><ShieldCheck className="h-4 w-4" />منطقة إدارة محمية</div>
          </header>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
            <div className="w-full max-w-[460px]">
              <div className="mb-8">
                <p className="mb-2 text-[12px] font-semibold tracking-[0.1em] text-[#647057]">ADMIN PORTAL</p>
                <h2 className="text-[31px] font-semibold tracking-[-0.04em] text-[#252B23] sm:text-[35px]">تسجيل دخول الإدارة</h2>
                <p className="mt-3 max-w-[420px] text-[13px] leading-6 text-[#758071]">استخدم حساب الإدارة المصرح له للوصول إلى لوحة التحكم وإدارة عمليات المتجر.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 rounded-[24px] border border-[#E2E6DE] bg-white p-5 shadow-[0_18px_60px_rgba(54,62,48,0.055)] sm:p-7">
                <div><label htmlFor="admin-email" className="mb-2 block text-[12px] font-medium text-[#525B4E]">البريد الإلكتروني</label><div className="relative"><Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C9688]" /><input id="admin-email" type="email" autoComplete="username" value={formData.email} onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))} placeholder="admin@flamingopark.com" dir="ltr" className="h-12 w-full rounded-xl border border-[#DDE2D8] bg-[#FCFDFC] pr-11 pl-4 text-left text-[14px] text-[#2B3128] outline-none transition-colors placeholder:text-[#A9B0A5] hover:border-[#CBD2C6] focus:border-[#7D8A73] focus:ring-2 focus:ring-[#7D8A73]/10" /></div></div>

                <div><div className="mb-2 flex items-center justify-between"><label htmlFor="admin-password" className="text-[12px] font-medium text-[#525B4E]">كلمة المرور</label><span className="text-[10px] text-[#929B8F]">حسابات الإدارة فقط</span></div><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8C9688]" /><input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={formData.password} onChange={(event) => setFormData((previous) => ({ ...previous, password: event.target.value }))} placeholder="أدخل كلمة المرور" dir="ltr" className="h-12 w-full rounded-xl border border-[#DDE2D8] bg-[#FCFDFC] pr-11 pl-12 text-left text-[14px] text-[#2B3128] outline-none transition-colors placeholder:text-[#A9B0A5] hover:border-[#CBD2C6] focus:border-[#7D8A73] focus:ring-2 focus:ring-[#7D8A73]/10" /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#7F897B] transition-colors hover:bg-[#EFF2EC] hover:text-[#46503D]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#59634D] text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(89,99,77,0.16)] transition-colors hover:bg-[#46503D] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ShieldCheck className="h-4 w-4" />دخول آمن</>}</button>

                <div className="flex items-start gap-3 rounded-xl border border-[#E8EBE5] bg-[#F8FAF7] px-3.5 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#647057]" /><p className="text-[11px] leading-5 text-[#707A6D]">يتم التحقق من دور الأدمن بعد المصادقة. أي حساب بدون صلاحية إدارة يتم تسجيل خروجه تلقائيًا.</p></div>
              </form>

              <p className="mt-6 text-center text-[10px] leading-5 text-[#939B90]">هذه المنطقة مخصصة للمستخدمين المصرح لهم فقط.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminLoginPage;
