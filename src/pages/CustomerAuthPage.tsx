import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, LockKeyhole, Mail, MapPin, MessageCircle, Phone, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

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
    <main className="min-h-[100svh] bg-background" dir="rtl">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[540px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        <div className="flex justify-center"><button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" /></button></div>
        <div className="mt-2 flex items-center justify-center gap-2.5"><span className="h-px w-5 bg-[#E0B7B4]" /><span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span><span className="h-px w-5 bg-[#E0B7B4]" /></div>

        <section className="mt-6 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          {step === "otp" && pendingRegistration ? (
            <>
              <div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3F1]"><ShieldCheck className="h-6 w-6 text-[#B86168]" strokeWidth={1.6} /></div><h1 className="mt-4 text-[24px] font-semibold tracking-[-0.035em] text-[#382F2C]">تحقق من حسابك</h1><p className="mx-auto mt-2 max-w-[340px] text-[10px] leading-5 text-[#958883]">أرسلنا رمز التحقق عبر {channelLabels[pendingRegistration.channel]} إلى <span dir="ltr" className="font-semibold text-[#655853]">{verificationTarget}</span>. لن يتم إنشاء ملف العميل قبل نجاح التحقق.</p></div>

              <form onSubmit={handleOtpVerification} className="mt-6 space-y-3">
                <div><label htmlFor="auth-otp" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رمز التحقق</label><input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="رمز التحقق" dir="ltr" autoFocus className="h-[54px] w-full rounded-[12px] border border-[#E8DEDA] bg-white px-4 text-center text-[20px] font-semibold tracking-[0.32em] text-[#443936] outline-none placeholder:text-[12px] placeholder:tracking-normal placeholder:text-[#D0C4BF] focus:border-[#D7AAA7]" /></div>
                <button type="submit" disabled={isLoading || otp.length < 6} className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white hover:bg-[#C96F79] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد وإنشاء الحساب"}</button>
              </form>

              <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => { setStep("credentials"); setPendingRegistration(null); setOtp(""); }} disabled={isLoading} className="text-[9px] font-medium text-[#8F817C] hover:text-[#A95B61]">تعديل البيانات أو الطريقة</button><button type="button" onClick={handleResendOtp} disabled={isLoading} className="flex items-center gap-1.5 text-[9px] font-semibold text-[#A95B61] disabled:opacity-50"><RotateCcw className="h-3 w-3" />إعادة إرسال الرمز</button></div>
            </>
          ) : (
            <>
              <div className="text-center"><h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">{mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</h1><p className="mx-auto mt-2 max-w-[360px] text-[10px] leading-5 text-[#958883]">{mode === "login" ? "ادخل بالبريد الإلكتروني أو رقم الهاتف الدولي وكلمة المرور." : "متاح لجميع الدول. اختر واتساب أو رسالة SMS أو البريد الإلكتروني لتوثيق حسابك."}</p></div>

              <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>حساب جديد</button></div>

              <form onSubmit={handleCredentials} className="mt-5 space-y-3">
                {mode === "register" && <div><label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-name" type="text" autoComplete="name" maxLength={100} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><label htmlFor="auth-country" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الدولة</label><select id="auth-country" value={formData.country} onChange={(event) => updateField("country", event.target.value)} className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white px-4 text-[11px] text-[#443936] outline-none focus:border-[#D7AAA7]">{COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name} — {country.code}</option>)}</select></div>}

                {mode === "register" && <div><label htmlFor="auth-region" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} maxLength={100} placeholder="مثال: الرياض، نيويورك، عدن" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رقم الهاتف الدولي</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-phone" type="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+9677... أو +9665... أو +1..." dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><label htmlFor="auth-email" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">البريد الإلكتروني <span className="font-normal text-[#A99D98]">(اختياري إلا إذا اخترته للتحقق)</span></label><div className="relative"><Mail className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-email" type="email" autoComplete="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@example.com" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><p className="mb-2 px-1 text-[9px] font-medium text-[#746761]">أرسل رمز التحقق عبر</p><div className="grid grid-cols-3 gap-2">{(["whatsapp", "sms", "email"] as VerificationChannel[]).map((channel) => <button key={channel} type="button" onClick={() => updateField("channel", channel)} className={`flex h-[48px] items-center justify-center gap-1 rounded-[11px] border px-1 text-[8px] font-medium ${formData.channel === channel ? "border-[#D7AAA7] bg-[#FFF5F3] text-[#A95B61]" : "border-[#E8DEDA] bg-white text-[#776A65]"}`}>{channel === "email" ? <Mail className="h-3.5 w-3.5" /> : channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}{channelLabels[channel]}</button>)}</div></div>}

                {mode === "login" && <div><label htmlFor="auth-identifier" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">البريد أو رقم الهاتف</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-identifier" value={formData.identifier} onChange={(event) => updateField("identifier", event.target.value)} autoComplete="username" placeholder="name@example.com أو +9665..." dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                <div><label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="6 خانات على الأقل" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A99D98]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                {mode === "register" && <div className="flex items-start gap-2 rounded-[10px] bg-[#FFF8F6] px-3 py-2.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A95B61]" /><p className="text-[8.5px] leading-5 text-[#8F817C]">لن يُنشأ ملف العميل قبل نجاح OTP. رقم الهاتف مطلوب للتواصل والطلبات حتى إذا اخترت البريد الإلكتروني كوسيلة تحقق.</p></div>}

                <button type="submit" disabled={isLoading} className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white hover:bg-[#C96F79] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "تسجيل الدخول" : "إرسال رمز التحقق"}</button>
              </form>

              <div className="mt-4 text-center"><button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")} className="text-[9.5px] text-[#938681] hover:text-[#A95B61]">{mode === "login" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ تسجيل الدخول"}</button></div>

              <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#EDE5E1]" /><span className="text-[8px] text-[#B2A7A2]">أو</span><span className="h-px flex-1 bg-[#EDE5E1]" /></div>
              <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[11px] border border-[#E6DDD9] bg-white text-[10px] font-medium text-[#655853] disabled:opacity-50">{isGuestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "متابعة التصفح كضيف"}</button>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
