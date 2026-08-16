import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Globe2, Loader2, LockKeyhole, Mail, MapPin, MessageCircle, Phone, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { loginCustomer, registerCustomer, resendCustomerRegistrationOtp, verifyCustomerRegistration, type PendingCustomerRegistration, type VerificationChannel } from "@/lib/customerAuth";
import { clearCustomerSession, type CustomerSession } from "@/lib/customerSession";

type AuthMode = "login" | "register";
type AuthStep = "credentials" | "otp";
type RegisterStage = 1 | 2;

const channelLabels: Record<VerificationChannel, string> = {
  whatsapp: "واتساب",
  sms: "SMS",
  email: "البريد",
};

const fieldClass = "h-11 w-full rounded-[13px] border border-[#E8E3E0] bg-white px-3.5 text-[14px] text-[#302A28] outline-none transition-colors placeholder:text-[#B8B0AC] focus:border-[#C98B91] focus:ring-2 focus:ring-[#C98B91]/10";
const labelClass = "mb-1.5 block text-[11px] font-medium text-[#675F5B]";

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("credentials");
  const [registerStage, setRegisterStage] = useState<RegisterStage>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingRegistration, setPendingRegistration] = useState<PendingCustomerRegistration | null>(null);
  const [formData, setFormData] = useState({ name: "", identifier: "", phone: "", email: "", password: "", country: "YE", region: "", channel: "whatsapp" as VerificationChannel });

  const verificationTarget = useMemo(() => {
    if (!pendingRegistration) return "";
    if (pendingRegistration.channel === "email") return pendingRegistration.email;
    const phone = pendingRegistration.phone;
    if (phone.length < 7) return phone;
    return `${phone.slice(0, Math.min(6, phone.length - 4))}•••${phone.slice(-3)}`;
  }, [pendingRegistration]);

  const updateField = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => setFormData((previous) => ({ ...previous, [field]: value }));

  const persistCustomer = (customerData: CustomerSession) => {
    setCustomer({ id: customerData.id, userId: customerData.userId, name: customerData.name, phone: customerData.phone, region: customerData.region });
    setRegion(customerData.region);
    return customerData;
  };

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading) return;
    setMode(nextMode);
    setStep("credentials");
    setRegisterStage(1);
    setPendingRegistration(null);
    setOtp("");
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
        const pending = await registerCustomer({ name: formData.name, phone: formData.phone, email: formData.email, password: formData.password, country: formData.country, region: formData.region, channel: formData.channel });
        setPendingRegistration(pending);
        setOtp("");
        setStep("otp");
        toast({ title: "تم إرسال رمز التحقق", description: `أرسلنا الرمز عبر ${channelLabels[pending.channel]}.` });
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

  const handleOtpVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pendingRegistration) return;
    setIsLoading(true);

    try {
      const customerData = persistCustomer(await verifyCustomerRegistration(pendingRegistration, otp));
      toast({ title: "تم إنشاء الحساب", description: `تم توثيق الحساب بنجاح. أهلاً ${customerData.name}` });
      navigate("/home");
    } catch (error: unknown) {
      toast({ title: "تعذر التحقق", description: error instanceof Error ? error.message : "تحقق من الرمز وحاول مرة أخرى.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration || isLoading) return;
    setIsLoading(true);
    try {
      await resendCustomerRegistrationOtp(pendingRegistration);
      toast({ title: "أُعيد إرسال الرمز", description: `تحقق من ${channelLabels[pendingRegistration.channel]}.` });
    } catch (error: unknown) {
      toast({ title: "تعذر إعادة الإرسال", description: error instanceof Error ? error.message : "حاول بعد قليل.", variant: "destructive" });
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
    <main className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#F8F7F6] text-[#302A28]" dir="rtl">
      <div className="mx-auto grid h-full w-full max-w-[1440px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="hidden h-full border-l border-[#E9E4E1] bg-[#F0ECE9] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <button type="button" onClick={() => navigate("/home")} className="flex w-fit items-center gap-3" aria-label="العودة إلى متجر فلامنجو بارك"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={54} height={54} className="h-[54px] w-[54px] rounded-2xl object-contain" /><div className="text-right"><p className="font-serif text-[16px] tracking-[0.14em] text-[#443A37]">FLAMINGO PARK</p><p className="mt-1 text-[11px] text-[#8E837E]">Secure global account</p></div></button>

          <div className="max-w-[470px]"><div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/75"><Globe2 className="h-5 w-5 text-[#A8646B]" strokeWidth={1.5} /></div><h2 className="text-[40px] font-semibold leading-[1.24] tracking-[-0.04em] text-[#322A28] xl:text-[46px]">تجربة تسوق هادئة، وحساب واحد أينما كنت.</h2><p className="mt-5 max-w-[420px] text-[14px] leading-7 text-[#786D69]">احفظ الطلبات والمفضلة والعناوين، وسجّل من أي دولة باستخدام هاتفك الدولي أو بريدك الإلكتروني.</p><div className="mt-8 space-y-3 text-[13px] text-[#605753]"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><Check className="h-4 w-4 text-[#A8646B]" /></span><span>واتساب، SMS أو البريد الإلكتروني</span></div><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80"><ShieldCheck className="h-4 w-4 text-[#A8646B]" /></span><span>حساب موثّق قبل حفظ بيانات العميل</span></div></div></div>

          <p className="text-[11px] text-[#988D88]">© Flamingo Park</p>
        </aside>

        <section className="flex h-full min-h-0 flex-col bg-[#FCFBFA]">
          <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-[#EEEAE7] px-4 sm:h-[64px] sm:px-6 lg:h-[72px] lg:px-10">
            <button type="button" onClick={() => navigate("/home")} className="flex h-9 items-center gap-1.5 rounded-lg px-1 text-[12px] font-medium text-[#756B67] transition-colors hover:text-[#A85E66]"><ArrowLeft className="h-4 w-4" />المتجر</button>
            <button type="button" onClick={() => navigate("/home")} aria-label="Flamingo Park" className="flex items-center gap-2 lg:hidden"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={34} height={34} className="h-[34px] w-[34px] rounded-xl object-contain" /><span className="font-serif text-[10px] tracking-[0.12em] text-[#6A5D59]">FLAMINGO PARK</span></button>
            <div className="hidden items-center gap-2 text-[11px] text-[#978C87] lg:flex"><ShieldCheck className="h-4 w-4" />تسجيل آمن</div>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3 sm:px-6 sm:py-5 lg:px-10 lg:py-8">
            <div className="w-full max-w-[440px] lg:max-w-[500px]">
              {step === "otp" && pendingRegistration ? (
                <section className="rounded-[22px] border border-[#ECE7E4] bg-white p-5 shadow-[0_14px_45px_rgba(68,50,45,0.045)] sm:p-7">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#F9EFEE]"><ShieldCheck className="h-5 w-5 text-[#A95F67]" strokeWidth={1.6} /></div>
                  <div className="mt-4 text-center"><h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#302A28]">تحقق من حسابك</h1><p className="mx-auto mt-2 max-w-[330px] text-[12px] leading-5 text-[#817672]">أرسلنا الرمز عبر {channelLabels[pendingRegistration.channel]} إلى <span dir="ltr" className="font-semibold text-[#4D4441]">{verificationTarget}</span></p></div>

                  <form onSubmit={handleOtpVerification} className="mt-5 space-y-3"><div><label htmlFor="auth-otp" className={labelClass}>رمز التحقق</label><input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="000000" dir="ltr" autoFocus className="h-12 w-full rounded-[13px] border border-[#E5DEDB] bg-[#FCFBFA] px-4 text-center text-[22px] font-semibold tracking-[0.3em] text-[#302A28] outline-none placeholder:text-[15px] placeholder:font-normal placeholder:tracking-[0.15em] placeholder:text-[#BDB4B0] focus:border-[#C98B91] focus:ring-2 focus:ring-[#C98B91]/10" /></div><button type="submit" disabled={isLoading || otp.length < 6} className="flex h-11 w-full items-center justify-center rounded-[13px] bg-[#B96C73] text-[13px] font-semibold text-white transition-colors hover:bg-[#AA6068] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد الحساب"}</button></form>

                  <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => { setStep("credentials"); setPendingRegistration(null); setOtp(""); setRegisterStage(2); }} disabled={isLoading} className="text-[11px] font-medium text-[#756A66] hover:text-[#A85E66]">تعديل البيانات</button><button type="button" onClick={handleResendOtp} disabled={isLoading} className="flex items-center gap-1.5 text-[11px] font-semibold text-[#A85E66] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />إعادة الإرسال</button></div>
                </section>
              ) : (
                <section className="rounded-[22px] border border-[#ECE7E4] bg-white p-4 shadow-[0_14px_45px_rgba(68,50,45,0.04)] sm:p-6 lg:p-7">
                  <div className="text-center"><h1 className="text-[23px] font-semibold tracking-[-0.03em] text-[#302A28] sm:text-[26px]">{mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب"}</h1><p className="mt-1 text-[11px] leading-5 text-[#8A7F7A]">{mode === "login" ? "ادخل برقم الهاتف الدولي أو البريد." : registerStage === 1 ? "أخبرنا عنك أولاً." : "اختر وسيلة التحقق وأكمل حسابك."}</p></div>

                  <div className="mt-3 grid grid-cols-2 rounded-[12px] bg-[#F6F3F1] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-9 rounded-[9px] text-[12px] font-medium transition-colors ${mode === "login" ? "bg-white text-[#3C3431] shadow-[0_1px_4px_rgba(50,40,36,0.06)]" : "text-[#958A85]"}`}>دخول</button><button type="button" onClick={() => changeMode("register")} className={`h-9 rounded-[9px] text-[12px] font-medium transition-colors ${mode === "register" ? "bg-white text-[#3C3431] shadow-[0_1px_4px_rgba(50,40,36,0.06)]" : "text-[#958A85]"}`}>حساب جديد</button></div>

                  {mode === "register" && <div className="mt-3 flex items-center gap-2 px-1"><span className={`h-1.5 flex-1 rounded-full ${registerStage >= 1 ? "bg-[#B96C73]" : "bg-[#E8E2DF]"}`} /><span className={`h-1.5 flex-1 rounded-full ${registerStage >= 2 ? "bg-[#B96C73]" : "bg-[#E8E2DF]"}`} /></div>}

                  {mode === "login" ? (
                    <form onSubmit={handleCredentials} className="mt-4 space-y-3">
                      <div><label htmlFor="auth-identifier" className={labelClass}>البريد أو رقم الهاتف</label><div className="relative"><UserRound className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-identifier" value={formData.identifier} onChange={(event) => updateField("identifier", event.target.value)} autoComplete="username" placeholder="name@example.com أو +966..." dir="ltr" className={`${fieldClass} pr-10 text-left`} /></div></div>
                      <div><label htmlFor="auth-password" className={labelClass}>كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete="current-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="كلمة المرور" dir="ltr" className={`${fieldClass} pr-10 pl-11 text-left`} /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#958A85]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                      <button type="submit" disabled={isLoading} className="flex h-11 w-full items-center justify-center rounded-[13px] bg-[#B96C73] text-[13px] font-semibold text-white transition-colors hover:bg-[#AA6068] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تسجيل الدخول"}</button>
                    </form>
                  ) : registerStage === 1 ? (
                    <div className="mt-3 space-y-2.5">
                      <div><label htmlFor="auth-name" className={labelClass}>الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-name" type="text" autoComplete="name" maxLength={100} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="اسمك الكامل" className={`${fieldClass} pr-10`} /></div></div>
                      <div><label htmlFor="auth-country" className={labelClass}>الدولة</label><div className="relative"><Globe2 className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><select id="auth-country" value={formData.country} onChange={(event) => updateField("country", event.target.value)} className={`${fieldClass} appearance-none pr-10`}>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div></div>
                      <div><label htmlFor="auth-region" className={labelClass}>المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} maxLength={100} placeholder="مثال: الرياض، عدن، نيويورك" className={`${fieldClass} pr-10`} /></div></div>
                      <button type="button" onClick={goToRegisterStageTwo} className="flex h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-[#B96C73] text-[13px] font-semibold text-white transition-colors hover:bg-[#AA6068]">التالي<ChevronLeft className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <form onSubmit={handleCredentials} className="mt-3 space-y-2.5">
                      <div className="grid grid-cols-2 gap-2.5"><div><label htmlFor="auth-phone" className={labelClass}>رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A89D98]" /><input id="auth-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+966..." dir="ltr" className={`${fieldClass} pr-9 text-left text-[13px]`} /></div></div><div><label htmlFor="auth-email" className={labelClass}>البريد</label><div className="relative"><Mail className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A89D98]" /><input id="auth-email" type="email" autoComplete="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@..." dir="ltr" className={`${fieldClass} pr-9 text-left text-[13px]`} /></div></div></div>

                      <div><p className={labelClass}>رمز التحقق عبر</p><div className="grid grid-cols-3 gap-2">{(["whatsapp", "sms", "email"] as VerificationChannel[]).map((channel) => <button key={channel} type="button" onClick={() => updateField("channel", channel)} className={`flex h-10 items-center justify-center gap-1 rounded-[11px] border text-[11px] font-medium transition-colors ${formData.channel === channel ? "border-[#D5A1A5] bg-[#FCF2F1] text-[#A45E65]" : "border-[#E7E1DE] bg-white text-[#746A66]"}`}>{channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : channel === "sms" ? <Phone className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}{channelLabels[channel]}</button>)}</div></div>

                      <div><label htmlFor="auth-password" className={labelClass}>كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A89D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete="new-password" value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="6 خانات على الأقل" dir="ltr" className={`${fieldClass} pr-10 pl-11 text-left`} /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#958A85]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                      <button type="submit" disabled={isLoading} className="flex h-11 w-full items-center justify-center rounded-[13px] bg-[#B96C73] text-[13px] font-semibold text-white transition-colors hover:bg-[#AA6068] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال رمز التحقق"}</button>
                      <button type="button" onClick={() => setRegisterStage(1)} disabled={isLoading} className="mx-auto flex h-7 items-center justify-center gap-1 text-[11px] font-medium text-[#786E69]"><ChevronRight className="h-3.5 w-3.5" />رجوع للبيانات</button>
                    </form>
                  )}

                  <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[#8B817C]"><span>{mode === "login" ? "ليس لديك حساب؟" : "لديك حساب؟"}</span><button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")} className="font-semibold text-[#A45E65]">{mode === "login" ? "إنشاء حساب" : "تسجيل الدخول"}</button></div>

                  {mode === "login" && <div className="mt-3 flex items-center gap-3"><span className="h-px flex-1 bg-[#EEE9E6]" /><span className="text-[10px] text-[#B0A7A2]">أو</span><span className="h-px flex-1 bg-[#EEE9E6]" /></div>}
                  {mode === "login" && <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="mt-3 flex h-10 w-full items-center justify-center rounded-[12px] border border-[#E7E1DE] bg-white text-[12px] font-medium text-[#685F5B] disabled:opacity-50">{isGuestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "متابعة كضيف"}</button>}
                </section>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
