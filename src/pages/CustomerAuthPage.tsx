import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Eye, EyeOff, Globe2, Loader2, LockKeyhole, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { loginCustomer, registerCustomer } from "@/lib/customerAuth";
import { clearCustomerSession, type CustomerSession } from "@/lib/customerSession";

type AuthMode = "login" | "register";
type RegisterStage = 1 | 2;

const fieldClass = "h-11 w-full rounded-[14px] border border-[#E9E4E1] bg-[#FBFAF9] px-3.5 text-[14px] text-[#302A28] outline-none transition-all placeholder:text-[#B8B0AC] focus:border-[#C88B91] focus:bg-white focus:ring-2 focus:ring-[#C88B91]/10";
const labelClass = "mb-1.5 block text-[11px] font-medium text-[#655D59]";

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStage, setRegisterStage] = useState<RegisterStage>(1);
  const [countryOpen, setCountryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", identifier: "", phone: "", password: "", country: "YE", region: "" });

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  const selectedCountry = useMemo(() => COUNTRIES.find((country) => country.code === formData.country), [formData.country]);
  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => setFormData((previous) => ({ ...previous, [field]: value }));

  const persistCustomer = (customerData: CustomerSession) => {
    setCustomer({ id: customerData.id, userId: customerData.userId, name: customerData.name, phone: customerData.phone, region: customerData.region });
    setRegion(customerData.region);
    return customerData;
  };

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading) return;
    setMode(nextMode);
    setRegisterStage(1);
    setShowPassword(false);
  };

  const goToRegisterStageTwo = () => {
    if (formData.name.trim().length < 2) {
      toast({ title: "أدخل الاسم الكامل", description: "اكتب اسمًا صحيحًا للمتابعة.", variant: "destructive" });
      return;
    }
    if (formData.region.trim().length < 2) {
      toast({ title: "أدخل المدينة أو المنطقة", description: "نحتاجها لإكمال بيانات الحساب.", variant: "destructive" });
      return;
    }
    setRegisterStage(2);
  };

  const handleCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "register") {
        const customerData = persistCustomer(await registerCustomer({ name: formData.name, phone: formData.phone, password: formData.password, country: formData.country, region: formData.region }));
        toast({ title: "تم إنشاء الحساب", description: `أهلًا ${customerData.name}` });
        navigate("/home");
        return;
      }

      const customerData = persistCustomer(await loginCustomer(formData.identifier, formData.password));
      toast({ title: "مرحباً بعودتك", description: `أهلاً ${customerData.name}` });
      navigate("/home");
    } catch (error: unknown) {
      toast({ title: "تعذر المتابعة", description: error instanceof Error ? error.message : "حدث خطأ أثناء المصادقة.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsGuestLoading(true);
    try {
      await supabase.auth.signOut();
      clearCustomerSession();
      setCustomer({ id: "guest", name: "ضيف", phone: "", region: "" });
      setRegion("");
      navigate("/home");
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 z-50 h-[100dvh] overflow-hidden bg-[#FCFBFA] text-[#302A28]" dir="rtl">
      <div className="grid h-full min-h-0 w-full lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden h-full overflow-hidden border-l border-[#E9E4E1] bg-[#F1ECE9] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="absolute -left-32 -top-28 h-[440px] w-[440px] rounded-full bg-white/60 blur-3xl" />
          <div className="absolute -bottom-40 -right-28 h-[460px] w-[460px] rounded-full bg-[#D6A7AA]/20 blur-3xl" />
          <button type="button" onClick={() => navigate("/home")} className="relative z-10 flex w-fit items-center gap-3" aria-label="العودة إلى متجر فلامنجو بارك"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={54} height={54} className="h-[54px] w-[54px] rounded-2xl object-contain" /><div className="text-right"><p className="font-serif text-[16px] tracking-[0.14em] text-[#443A37]">FLAMINGO PARK</p><p className="mt-1 text-[11px] text-[#8E837E]">Secure global account</p></div></button>
          <div className="relative z-10 max-w-[470px]"><div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/80"><Globe2 className="h-5 w-5 text-[#A8646B]" strokeWidth={1.5} /></div><h2 className="text-[40px] font-semibold leading-[1.24] tracking-[-0.04em] text-[#322A28] xl:text-[46px]">حسابك، أينما كنت.</h2><p className="mt-5 max-w-[420px] text-[14px] leading-7 text-[#786D69]">تسجيل عالمي سريع برقم هاتف دولي وكلمة مرور، بدون انتظار رمز تحقق عند إنشاء الحساب.</p><div className="mt-8 space-y-3 text-[13px] text-[#605753]"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><Check className="h-4 w-4 text-[#A8646B]" /></span><span>لا توجد رسوم رسائل عند إنشاء الحساب</span></div><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><ShieldCheck className="h-4 w-4 text-[#A8646B]" /></span><span>التحقق يُستخدم لاحقًا فقط عند الحاجة</span></div></div></div>
          <p className="relative z-10 text-[11px] text-[#988D88]">© Flamingo Park</p>
        </aside>

        <section className="flex h-full min-h-0 flex-col bg-[#FCFBFA]">
          <header className="relative flex h-[54px] shrink-0 items-center justify-between border-b border-[#F0ECEA] px-4 sm:h-[62px] sm:px-6 lg:h-[72px] lg:px-10">
            <button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-9 w-9 items-center justify-center rounded-full text-[#776C68] transition-colors hover:bg-[#F4F0EE] hover:text-[#A85E66]"><ArrowLeft className="h-[18px] w-[18px]" /></button>
            <button type="button" onClick={() => navigate("/home")} aria-label="Flamingo Park" className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 lg:hidden"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={32} height={32} className="h-8 w-8 rounded-xl object-contain" /><span className="font-serif text-[10px] tracking-[0.12em] text-[#5E5350]">FLAMINGO</span></button>
            <div className="hidden items-center gap-2 text-[11px] text-[#978C87] lg:flex"><ShieldCheck className="h-4 w-4" />تسجيل آمن</div>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 sm:px-7 sm:py-5 lg:px-10 lg:py-8">
            <div className="w-full max-w-[420px] lg:max-w-[500px]">
              <section className="mx-auto w-full rounded-[24px] bg-transparent px-0 py-1 sm:border sm:border-[#ECE7E4] sm:bg-white sm:p-6 sm:shadow-[0_16px_50px_rgba(68,50,45,0.04)] lg:p-7">
                <div className="text-center"><p className="mb-1 text-[9px] font-semibold tracking-[0.18em] text-[#B1787C]">FLAMINGO PARK</p><h1 className="text-[25px] font-semibold tracking-[-0.04em] text-[#302A28]">{mode === "login" ? "أهلًا بك" : "إنشاء حساب"}</h1><p className="mt-1 text-[11px] leading-5 text-[#8A7F7A]">{mode === "login" ? "ادخل برقم هاتفك للمتابعة." : registerStage === 1 ? "بيانات بسيطة للبدء." : "أدخل رقم الهاتف وكلمة المرور."}</p></div>

                <div className="mt-3 grid grid-cols-2 rounded-[13px] bg-[#F5F2F0] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-9 rounded-[10px] text-[12px] font-medium transition-all ${mode === "login" ? "bg-white text-[#3B3330] shadow-[0_2px_8px_rgba(56,42,37,0.06)]" : "text-[#938884]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-9 rounded-[10px] text-[12px] font-medium transition-all ${mode === "register" ? "bg-white text-[#3B3330] shadow-[0_2px_8px_rgba(56,42,37,0.06)]" : "text-[#938884]"}`}>حساب جديد</button></div>

                {mode === "register" && <div className="mt-3 flex items-center gap-2 px-1"><span className="text-[10px] font-semibold text-[#A45E65]">{registerStage}/2</span><div className="flex flex-1 gap-1.5"><span className="h-1 flex-1 rounded-full bg-[#B96C73]" /><span className={`h-1 flex-1 rounded-full ${registerStage === 2 ? "bg-[#B96C73]" : "bg-[#E9E3E0]"}`} /></div></div>}

                {mode === "login" ? (
                  <form onSubmit={handleCredentials} className="mt-4 space-y-3">
                    <div><label htmlFor="auth-identifier" className={labelClass}>رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-identifier" type="tel" value={formData.identifier} onChange={(event) => updateField("identifier", event.target.value)} autoComplete="tel" placeholder="+967 7XX XXX XXX" dir="ltr" className={`${fieldClass} pr-10 text-left`} /></div></div>
                    <div><label htmlFor="auth-password" className={labelClass}>كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete="current-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="كلمة المرور" dir="ltr" className={`${fieldClass} pr-10 pl-11 text-left`} /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#958A85]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <button type="submit" disabled={isLoading} className="flex h-11 w-full items-center justify-center rounded-[14px] bg-[#B96C73] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(185,108,115,0.16)] transition-colors hover:bg-[#AA6068] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدخول"}</button>
                  </form>
                ) : registerStage === 1 ? (
                  <div className="mt-3 space-y-2.5">
                    <div><label htmlFor="auth-name" className={labelClass}>الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-name" type="text" autoComplete="name" maxLength={100} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="مثال: محمد وليد" className={`${fieldClass} pr-10`} /></div></div>

                    <div><label className={labelClass}>الدولة</label><Popover open={countryOpen} onOpenChange={setCountryOpen}><PopoverTrigger asChild><button type="button" className="flex h-11 w-full items-center justify-between rounded-[14px] border border-[#E9E4E1] bg-[#FBFAF9] px-3.5 text-[13px] text-[#302A28] outline-none transition-all hover:border-[#DDD4D0] focus:border-[#C88B91] focus:ring-2 focus:ring-[#C88B91]/10"><span className="flex min-w-0 items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F1ECEA]"><Globe2 className="h-3.5 w-3.5 text-[#A06469]" /></span><span className="truncate">{selectedCountry?.name || "اليمن"}</span><span className="shrink-0 text-[10px] text-[#A79D98]">{selectedCountry?.code || "YE"}</span></span><ChevronDown className="h-4 w-4 shrink-0 text-[#998E89]" /></button></PopoverTrigger><PopoverContent align="start" sideOffset={7} className="w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[18px] border border-[#E7E1DE] bg-white p-0 shadow-[0_18px_55px_rgba(55,42,37,0.15)]" dir="rtl"><Command className="rounded-[18px] bg-white"><CommandInput placeholder="ابحث عن دولة..." className="h-11 text-[13px]" /><CommandList className="max-h-[250px] overscroll-contain p-1.5"><CommandEmpty className="py-8 text-[12px] text-[#8C817D]">لم يتم العثور على الدولة.</CommandEmpty><CommandGroup>{COUNTRIES.map((country) => <CommandItem key={country.code} value={`${country.name} ${country.code}`} onSelect={() => { updateField("country", country.code); setCountryOpen(false); }} className="flex min-h-10 items-center justify-between rounded-xl px-3 text-[13px] data-[selected=true]:bg-[#F8F1F0] data-[selected=true]:text-[#7C4D52]"><span className="flex items-center gap-2"><span className="w-8 text-[10px] font-semibold tracking-[0.08em] text-[#A49A95]">{country.code}</span><span>{country.name}</span></span>{formData.country === country.code && <CheckCircle2 className="h-4 w-4 text-[#A45E65]" />}</CommandItem>)}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>

                    <div><label htmlFor="auth-region" className={labelClass}>المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} maxLength={100} placeholder="مثال: عدن" className={`${fieldClass} pr-10`} /></div></div>
                    <button type="button" onClick={goToRegisterStageTwo} className="flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#B96C73] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(185,108,115,0.14)] transition-colors hover:bg-[#AA6068]">التالي<ChevronLeft className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <form onSubmit={handleCredentials} className="mt-3 space-y-2.5">
                    <div><label htmlFor="auth-phone" className={labelClass}>رقم الهاتف الدولي</label><div className="relative"><Phone className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={formData.country === "YE" ? "+967 7XX XXX XXX" : "+966 5XX XXX XXX"} dir="ltr" className={`${fieldClass} pr-10 text-left`} /></div></div>
                    <div><label htmlFor="auth-password" className={labelClass}>كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete="new-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="6 خانات على الأقل" dir="ltr" className={`${fieldClass} pr-10 pl-11 text-left`} /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#958A85]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                    <p className="px-1 text-[10px] leading-4 text-[#978C87]">لن نرسل رمز SMS عند إنشاء الحساب. يمكن طلب التحقق لاحقًا فقط للحالات الحساسة.</p>
                    <button type="submit" disabled={isLoading} className="flex h-11 w-full items-center justify-center rounded-[14px] bg-[#B96C73] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(185,108,115,0.14)] transition-colors hover:bg-[#AA6068] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "إنشاء الحساب"}</button>
                    <button type="button" onClick={() => setRegisterStage(1)} disabled={isLoading} className="mx-auto flex h-6 items-center justify-center gap-1 text-[11px] font-medium text-[#786E69]"><ChevronRight className="h-3.5 w-3.5" />رجوع</button>
                  </form>
                )}

                <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#8B817C]"><span>{mode === "login" ? "ليس لديك حساب؟" : "لديك حساب؟"}</span><button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")} className="font-semibold text-[#A45E65]">{mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}</button></div>
                {mode === "login" && <div className="mt-3 flex items-center gap-3"><span className="h-px flex-1 bg-[#EEE9E6]" /><span className="text-[10px] text-[#B0A7A2]">أو</span><span className="h-px flex-1 bg-[#EEE9E6]" /></div>}
                {mode === "login" && <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="mt-3 flex h-10 w-full items-center justify-center rounded-[13px] border border-[#E8E2DF] bg-[#FBFAF9] text-[12px] font-medium text-[#685F5B] transition-colors hover:bg-white disabled:opacity-50">{isGuestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "متابعة كضيف"}</button>}
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
