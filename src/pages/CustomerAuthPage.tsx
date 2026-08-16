import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, Globe2, Loader2, LockKeyhole, Mail, MapPin, MessageCircle, Phone, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { COUNTRIES } from "@/lib/countries";
import { loginCustomer, registerCustomer, resendCustomerRegistrationOtp, verifyCustomerRegistration, type PendingCustomerRegistration, type VerificationChannel } from "@/lib/customerAuth";
import { clearCustomerSession, type CustomerSession } from "@/lib/customerSession";

type AuthMode = "login" | "register";
type AuthStep = "credentials" | "otp";

const channelLabels: Record<VerificationChannel, string> = {
  whatsapp: "واتساب",
  sms: "رسالة نصية",
  email: "البريد الإلكتروني",
};

const channelDescriptions: Record<VerificationChannel, string> = {
  whatsapp: "استلام الرمز عبر واتساب",
  sms: "استلام الرمز برسالة SMS",
  email: "استلام الرمز عبر البريد",
};

const inputClass = "h-12 w-full rounded-xl border border-[#E7E1DE] bg-white px-4 text-[14px] text-[#302A28] outline-none transition-colors placeholder:text-[#B1A8A4] hover:border-[#D9CECA] focus:border-[#C98B91] focus:ring-2 focus:ring-[#C98B91]/10";
const labelClass = "mb-2 block text-[12px] font-medium text-[#625956]";

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<AuthStep>("credentials");
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
    setPendingRegistration(null);
    setOtp("");
    setShowPassword(false);
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
    <main className="min-h-[100svh] bg-[#F7F6F4] text-[#302A28]" dir="rtl">
      <div className="mx-auto grid min-h-[100svh] w-full max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden overflow-hidden border-l border-[#EAE4E1] bg-[#EEE9E6] lg:flex lg:min-h-[100svh] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div className="absolute -left-28 -top-32 h-[420px] w-[420px] rounded-full bg-white/55 blur-3xl" />
          <div className="absolute -bottom-36 -right-28 h-[460px] w-[460px] rounded-full bg-[#DFAEB0]/20 blur-3xl" />
          <button type="button" onClick={() => navigate("/home")} className="relative z-10 flex w-fit items-center gap-3" aria-label="العودة إلى متجر فلامنجو بارك">
            <img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={58} height={58} className="h-[58px] w-[58px] rounded-2xl object-contain" />
            <div className="text-right"><p className="font-serif text-[17px] tracking-[0.16em] text-[#443A37]">FLAMINGO PARK</p><p className="mt-1 text-[11px] text-[#8B7E79]">Curated luxury, delivered globally</p></div>
          </button>

          <div className="relative z-10 max-w-[500px] py-16">
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/70"><Globe2 className="h-5 w-5 text-[#A8646B]" strokeWidth={1.5} /></div>
            <h2 className="max-w-[470px] text-[42px] font-semibold leading-[1.22] tracking-[-0.045em] text-[#322A28] xl:text-[48px]">حساب واحد لتجربة تسوق أينما كنت.</h2>
            <p className="mt-5 max-w-[440px] text-[14px] leading-7 text-[#786D69]">احفظ طلباتك ومفضلاتك وعناوينك، وتابع مشترياتك من اليمن والسعودية والولايات المتحدة وباقي الدول من حساب موثّق وآمن.</p>
            <div className="mt-9 grid gap-4 text-[13px] text-[#5F5652]">
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75"><Check className="h-4 w-4 text-[#A8646B]" /></span><span>تحقق آمن عبر واتساب أو SMS أو البريد</span></div>
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75"><ShieldCheck className="h-4 w-4 text-[#A8646B]" /></span><span>بيانات الحساب والطلبات محمية بجلسة موثقة</span></div>
              <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/75"><Globe2 className="h-4 w-4 text-[#A8646B]" /></span><span>أرقام دولية وحسابات للعملاء حول العالم</span></div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-[#988B86]">© Flamingo Park · Secure global customer access</p>
        </aside>

        <section className="flex min-h-[100svh] flex-col bg-[#FCFBFA]">
          <header className="flex h-[76px] items-center justify-between border-b border-[#EEE9E6] px-5 sm:px-8 lg:px-12">
            <button type="button" onClick={() => navigate("/home")} className="flex items-center gap-2 text-[12px] font-medium text-[#756A66] transition-colors hover:text-[#A85E66]"><ArrowLeft className="h-4 w-4" />العودة للمتجر</button>
            <button type="button" onClick={() => navigate("/home")} aria-label="Flamingo Park" className="flex items-center gap-2 lg:hidden"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={38} height={38} className="h-[38px] w-[38px] rounded-xl object-contain" /><span className="font-serif text-[11px] tracking-[0.12em] text-[#6A5D59]">FLAMINGO PARK</span></button>
            <div className="hidden items-center gap-2 text-[11px] text-[#9A8E89] lg:flex"><ShieldCheck className="h-4 w-4" />تسجيل آمن</div>
          </header>

          <div className="flex flex-1 items-start justify-center px-5 py-8 sm:px-8 sm:py-12 lg:items-center lg:px-12 lg:py-14">
            <div className="w-full max-w-[520px]">
              {step === "otp" && pendingRegistration ? (
                <div className="rounded-[24px] border border-[#ECE6E3] bg-white p-5 shadow-[0_18px_60px_rgba(68,50,45,0.06)] sm:p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F9EFEE]"><ShieldCheck className="h-6 w-6 text-[#A95F67]" strokeWidth={1.6} /></div>
                  <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.035em] text-[#302A28] sm:text-[31px]">تحقق من حسابك</h1>
                  <p className="mt-3 text-[13px] leading-6 text-[#7D726E]">أرسلنا رمز التحقق عبر <span className="font-semibold text-[#4D4441]">{channelLabels[pendingRegistration.channel]}</span> إلى <span dir="ltr" className="font-semibold text-[#4D4441]">{verificationTarget}</span>.</p>

                  <form onSubmit={handleOtpVerification} className="mt-7 space-y-5">
                    <div><label htmlFor="auth-otp" className={labelClass}>رمز التحقق</label><input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="000000" dir="ltr" autoFocus className="h-14 w-full rounded-xl border border-[#E4DDDA] bg-[#FCFBFA] px-4 text-center text-[24px] font-semibold tracking-[0.34em] text-[#302A28] outline-none transition-colors placeholder:text-[16px] placeholder:font-normal placeholder:tracking-[0.18em] placeholder:text-[#BDB4B0] focus:border-[#C98B91] focus:ring-2 focus:ring-[#C98B91]/10" /></div>
                    <button type="submit" disabled={isLoading || otp.length < 6} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#B8666E] text-[14px] font-semibold text-white transition-colors hover:bg-[#A85A62] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "تأكيد وإنشاء الحساب"}</button>
                  </form>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EBE8] pt-5"><button type="button" onClick={() => { setStep("credentials"); setPendingRegistration(null); setOtp(""); }} disabled={isLoading} className="text-[12px] font-medium text-[#716662] transition-colors hover:text-[#A85E66]">تعديل البيانات أو الطريقة</button><button type="button" onClick={handleResendOtp} disabled={isLoading} className="flex items-center gap-2 text-[12px] font-semibold text-[#A85E66] disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5" />إعادة إرسال الرمز</button></div>
                </div>
              ) : (
                <>
                  <div className="mb-7">
                    <p className="mb-2 text-[12px] font-semibold tracking-[0.08em] text-[#A8666D]">FLAMINGO ACCOUNT</p>
                    <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-[#302A28] sm:text-[34px]">{mode === "login" ? "مرحباً بعودتك" : "أنشئ حساب فلامنجو"}</h1>
                    <p className="mt-3 max-w-[470px] text-[13px] leading-6 text-[#837874]">{mode === "login" ? "سجّل الدخول بالبريد الإلكتروني أو رقم الهاتف الدولي للوصول إلى طلباتك ومفضلاتك." : "أنشئ حسابًا موثّقًا يعمل من أي دولة، واختر طريقة استلام رمز التحقق المناسبة لك."}</p>
                  </div>

                  <div className="mb-7 grid grid-cols-2 rounded-xl border border-[#EAE4E1] bg-[#F4F1EF] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-10 rounded-lg text-[13px] font-semibold transition-all ${mode === "login" ? "bg-white text-[#342D2A] shadow-[0_1px_4px_rgba(50,42,40,0.08)]" : "text-[#8B807B]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-10 rounded-lg text-[13px] font-semibold transition-all ${mode === "register" ? "bg-white text-[#342D2A] shadow-[0_1px_4px_rgba(50,42,40,0.08)]" : "text-[#8B807B]"}`}>إنشاء حساب</button></div>

                  <form onSubmit={handleCredentials} className="space-y-4">
                    {mode === "register" && <div><label htmlFor="auth-name" className={labelClass}>الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-name" type="text" autoComplete="name" maxLength={100} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="أدخل اسمك الكامل" className={`${inputClass} pr-11`} /></div></div>}

                    {mode === "register" && <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="auth-country" className={labelClass}>الدولة</label><select id="auth-country" value={formData.country} onChange={(event) => updateField("country", event.target.value)} className={`${inputClass} appearance-none`}>{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name} — {country.code}</option>)}</select></div><div><label htmlFor="auth-region" className={labelClass}>المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} maxLength={100} placeholder="الرياض، عدن، نيويورك" className={`${inputClass} pr-11`} /></div></div></div>}

                    {mode === "register" && <div><label htmlFor="auth-phone" className={labelClass}>رقم الهاتف الدولي</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+9677...  /  +9665...  /  +1..." dir="ltr" className={`${inputClass} pr-11 text-left`} /></div><p className="mt-1.5 px-1 text-[11px] text-[#9A8F8A]">اكتب الرقم بصيغته الدولية مع مفتاح الدولة.</p></div>}

                    {mode === "register" && <div><label htmlFor="auth-email" className={labelClass}>البريد الإلكتروني <span className="font-normal text-[#9B908B]">— اختياري إلا عند اختيار البريد للتحقق</span></label><div className="relative"><Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-email" type="email" autoComplete="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@example.com" dir="ltr" className={`${inputClass} pr-11 text-left`} /></div></div>}

                    {mode === "register" && <div><p className={labelClass}>استلام رمز التحقق</p><div className="grid grid-cols-3 gap-2.5">{(["whatsapp", "sms", "email"] as VerificationChannel[]).map((channel) => <button key={channel} type="button" onClick={() => updateField("channel", channel)} aria-pressed={formData.channel === channel} className={`min-h-[70px] rounded-xl border px-2 py-3 text-center transition-colors ${formData.channel === channel ? "border-[#C98B91] bg-[#FBF1F0] text-[#9E535B]" : "border-[#E7E1DE] bg-white text-[#746965] hover:border-[#D6CBC7]"}`}><span className="mx-auto flex h-7 w-7 items-center justify-center">{channel === "email" ? <Mail className="h-4.5 w-4.5" /> : channel === "whatsapp" ? <MessageCircle className="h-4.5 w-4.5" /> : <Phone className="h-4.5 w-4.5" />}</span><span className="mt-1 block text-[12px] font-semibold">{channelLabels[channel]}</span><span className="mt-0.5 hidden text-[9px] text-current/70 sm:block">{channelDescriptions[channel]}</span></button>)}</div></div>}

                    {mode === "login" && <div><label htmlFor="auth-identifier" className={labelClass}>البريد الإلكتروني أو رقم الهاتف</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-identifier" value={formData.identifier} onChange={(event) => updateField("identifier", event.target.value)} autoComplete="username" placeholder="name@example.com أو +9665..." dir="ltr" className={`${inputClass} pr-11 text-left`} /></div></div>}

                    <div><div className="mb-2 flex items-center justify-between"><label htmlFor="auth-password" className="text-[12px] font-medium text-[#625956]">كلمة المرور</label>{mode === "login" && <span className="text-[11px] text-[#9B908B]">6 خانات على الأقل</span>}</div><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#998D88]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="أدخل كلمة المرور" dir="ltr" className={`${inputClass} pr-11 pl-12 text-left`} /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8F827D] transition-colors hover:bg-[#F5F1EF] hover:text-[#5D524E]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                    {mode === "register" && <div className="flex items-start gap-3 rounded-xl border border-[#EEE5E2] bg-[#FBF7F5] px-3.5 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#A85E66]" /><p className="text-[11px] leading-5 text-[#7C706C]">لن يُنشأ ملف العميل قبل نجاح التحقق. رقم الهاتف مطلوب للتواصل والطلبات حتى إذا اخترت البريد الإلكتروني كوسيلة تحقق.</p></div>}

                    <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center rounded-xl bg-[#B8666E] text-[14px] font-semibold text-white shadow-[0_8px_22px_rgba(184,102,110,0.18)] transition-colors hover:bg-[#A85A62] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "login" ? "تسجيل الدخول" : "إرسال رمز التحقق"}</button>
                  </form>

                  <div className="mt-5 text-center"><button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")} className="text-[12px] font-medium text-[#746965] transition-colors hover:text-[#A85E66]">{mode === "login" ? "ليس لديك حساب؟ إنشاء حساب جديد" : "لديك حساب بالفعل؟ تسجيل الدخول"}</button></div>

                  <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-[#ECE6E3]" /><span className="text-[10px] text-[#A39995]">أو</span><span className="h-px flex-1 bg-[#ECE6E3]" /></div>
                  <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E4DDDA] bg-white text-[12px] font-semibold text-[#5F5551] transition-colors hover:bg-[#F8F5F3] disabled:opacity-50">{isGuestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "متابعة التصفح كضيف"}</button>

                  <p className="mt-6 text-center text-[10px] leading-5 text-[#A09591]">بالمتابعة، أنت تستخدم حساب فلامنجو الآمن لإدارة الطلبات والمفضلات وبيانات التوصيل.</p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
