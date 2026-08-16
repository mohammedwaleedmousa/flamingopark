import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, LockKeyhole, MapPin, Phone, RotateCcw, ShieldCheck, UserRound } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { loginCustomer, registerCustomer, resendCustomerRegistrationOtp, verifyCustomerRegistration, type PendingCustomerRegistration } from "@/lib/customerAuth";
import { clearCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { toYemenLocalPhone } from "@/lib/yemenPhone";

type AuthMode = "login" | "register";
type AuthStep = "credentials" | "otp";

const REGIONS = ["عدن", "صنعاء", "تعز", "حضرموت", "إب", "الحديدة", "لحج", "أبين", "شبوة", "مأرب", "ذمار", "البيضاء", "الضالع", "صعدة", "عمران", "ريمة", "المحويت", "الجوف"];

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
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "" });

  const maskedPhone = useMemo(() => {
    if (!pendingRegistration?.phone) return "";
    return `${pendingRegistration.phone.slice(0, 7)}•••${pendingRegistration.phone.slice(-2)}`;
  }, [pendingRegistration]);

  const updateField = (field: keyof typeof formData, value: string) => setFormData((previous) => ({ ...previous, [field]: value }));

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
    const phone = `+967${formData.phone}`;
    const password = formData.password;
    const name = formData.name.trim();
    const region = formData.region.trim();

    if (!formData.phone || !password || (mode === "register" && (!name || !region))) {
      toast({ title: "البيانات غير مكتملة", description: "يرجى تعبئة جميع الحقول المطلوبة.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "register") {
        const pending = await registerCustomer({ name, phone, password, region });
        setPendingRegistration(pending);
        setOtp("");
        setStep("otp");
        toast({ title: "تم إرسال رمز التحقق", description: "أدخل الرمز المرسل إلى رقم هاتفك لإكمال إنشاء الحساب." });
        return;
      }

      const customerData = persistCustomer(await loginCustomer(phone, password));
      toast({ title: "مرحباً بعودتك", description: `أهلاً ${customerData.name}` });
      navigate("/home");
    } catch (error: unknown) {
      toast({ title: "تعذر المتابعة", description: error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول.", variant: "destructive" });
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
      toast({ title: "تم تأكيد رقم الهاتف", description: `تم إنشاء حسابك بأمان. أهلاً ${customerData.name}` });
      navigate("/home");
    } catch (error: unknown) {
      toast({ title: "تعذر تأكيد الرقم", description: error instanceof Error ? error.message : "تحقق من الرمز وحاول مرة أخرى.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration || isLoading) return;
    setIsLoading(true);
    try {
      await resendCustomerRegistrationOtp(pendingRegistration);
      toast({ title: "أُعيد إرسال الرمز", description: "تحقق من رسائل SMS على هاتفك." });
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
      setCustomer({ id: "guest", name: "ضيف", phone: "", region: "عدن" });
      setRegion("عدن");
      navigate("/home");
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <main className="min-h-[100svh] bg-background" dir="rtl">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        <div className="flex justify-center"><button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" /></button></div>
        <div className="mt-2 flex items-center justify-center gap-2.5"><span className="h-px w-5 bg-[#E0B7B4]" /><span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span><span className="h-px w-5 bg-[#E0B7B4]" /></div>

        <section className="mt-8 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          {step === "otp" && pendingRegistration ? (
            <>
              <div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3F1]"><ShieldCheck className="h-6 w-6 text-[#B86168]" strokeWidth={1.6} /></div><h1 className="mt-4 text-[24px] font-semibold tracking-[-0.035em] text-[#382F2C]">تأكيد رقم الهاتف</h1><p className="mx-auto mt-2 max-w-[330px] text-[10px] leading-5 text-[#958883]">أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى <span dir="ltr" className="font-semibold text-[#655853]">{maskedPhone}</span>. لن يتم إنشاء ملف العميل قبل نجاح التحقق.</p></div>

              <form onSubmit={handleOtpVerification} className="mt-6 space-y-3">
                <div><label htmlFor="auth-otp" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رمز التحقق</label><input id="auth-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" dir="ltr" autoFocus className="h-[54px] w-full rounded-[12px] border border-[#E8DEDA] bg-white px-4 text-center text-[20px] font-semibold tracking-[0.45em] text-[#443936] outline-none placeholder:text-[#D0C4BF] focus:border-[#D7AAA7]" /></div>
                <button type="submit" disabled={isLoading || otp.length !== 6} className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white hover:bg-[#C96F79] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد وإنشاء الحساب"}</button>
              </form>

              <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={() => { setStep("credentials"); setOtp(""); }} disabled={isLoading} className="text-[9px] font-medium text-[#8F817C] hover:text-[#A95B61]">تعديل البيانات</button><button type="button" onClick={handleResendOtp} disabled={isLoading} className="flex items-center gap-1.5 text-[9px] font-semibold text-[#A95B61] disabled:opacity-50"><RotateCcw className="h-3 w-3" />إعادة إرسال الرمز</button></div>
            </>
          ) : (
            <>
              <div className="text-center"><h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">{mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</h1><p className="mx-auto mt-2 max-w-[330px] text-[10px] leading-5 text-[#958883]">{mode === "login" ? "سجّل برقم هاتفك اليمني وكلمة المرور لمتابعة طلباتك." : "سيتم إرسال رمز SMS للتحقق من ملكية الرقم قبل إنشاء الحساب."}</p></div>

              <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>حساب جديد</button></div>

              <form onSubmit={handleCredentials} className="mt-5 space-y-3">
                {mode === "register" && <div><label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-name" type="text" autoComplete="name" maxLength={100} value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><label htmlFor="auth-region" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المحافظة</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><select id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} className="h-[50px] w-full appearance-none rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]"><option value="">اختر المحافظة</option>{REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}</select></div></div>}

                <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#746761]" dir="ltr">+967</span><input id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={9} value={formData.phone} onChange={(event) => updateField("phone", toYemenLocalPhone(event.target.value))} placeholder="7XXXXXXXX" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-[68px] text-left text-[12px] tracking-[0.08em] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /></div></div>

                <div><label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="6 خانات على الأقل" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" /><button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#A99D98]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                {mode === "register" && <div className="flex items-start gap-2.5 rounded-[10px] bg-[#FFF8F6] px-3 py-2.5"><span className="mt-[2px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F1DAD7]"><Check className="h-2.5 w-2.5 text-[#A95B61]" /></span><p className="text-[8.5px] leading-5 text-[#8F817C]">رقم الهاتف سيُتحقق منه عبر SMS. كلمة المرور تبقى داخل Supabase Auth ولا تُخزن كنص مكشوف في جدول العملاء.</p></div>}

                <button type="submit" disabled={isLoading} className="flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white hover:bg-[#C96F79] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? "تسجيل الدخول" : "إرسال رمز التحقق"}</button>
              </form>

              <div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-[#EDE5E1]" /><span className="text-[8px] text-[#B2A7A2]">أو</span><span className="h-px flex-1 bg-[#EDE5E1]" /></div>
              <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[11px] border border-[#E6DDD9] bg-white text-[10px] font-medium text-[#655853] hover:bg-[#FFF8F6] disabled:opacity-50">{isGuestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "متابعة التصفح كضيف"}</button>
            </>
          )}
        </section>

        <div className="mt-auto pt-7 text-center md:mt-6"><p className="font-serif text-[7px] tracking-[0.25em] text-[#B1A49F]">FLAMINGO PARK · ADEN</p><p className="mt-2 text-[8px] text-[#B7ABA6]">تسوق بأناقة، بسهولة.</p></div>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
