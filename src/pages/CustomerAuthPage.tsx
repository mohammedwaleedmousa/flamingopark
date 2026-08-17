import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, LockKeyhole, MapPin, Phone, UserRound } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { clearCustomerSession, setCustomerSession } from "@/lib/customerSession";

type AuthMode = "login" | "register";
type RecoveryStep = "idle" | "code" | "password";

type CustomerRow = {
  id: string;
  user_id?: string | null;
  name: string;
  phone: string;
  country?: string | null;
  region?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

const PHONE_COUNTRIES = [
  { iso: "YE", name: "اليمن", dial: "+967", flag: "🇾🇪" },
  { iso: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦" },
  { iso: "US", name: "أمريكا / كندا", dial: "+1", flag: "🇺🇸" },
  { iso: "MY", name: "ماليزيا", dial: "+60", flag: "🇲🇾" },
  { iso: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪" },
  { iso: "OM", name: "عُمان", dial: "+968", flag: "🇴🇲" },
  { iso: "QA", name: "قطر", dial: "+974", flag: "🇶🇦" },
  { iso: "KW", name: "الكويت", dial: "+965", flag: "🇰🇼" },
  { iso: "BH", name: "البحرين", dial: "+973", flag: "🇧🇭" },
  { iso: "EG", name: "مصر", dial: "+20", flag: "🇪🇬" },
  { iso: "JO", name: "الأردن", dial: "+962", flag: "🇯🇴" },
  { iso: "GB", name: "بريطانيا", dial: "+44", flag: "🇬🇧" },
  { iso: "DE", name: "ألمانيا", dial: "+49", flag: "🇩🇪" },
  { iso: "NL", name: "هولندا", dial: "+31", flag: "🇳🇱" },
  { iso: "TR", name: "تركيا", dial: "+90", flag: "🇹🇷" },
  { iso: "IN", name: "الهند", dial: "+91", flag: "🇮🇳" },
  { iso: "PK", name: "باكستان", dial: "+92", flag: "🇵🇰" },
  { iso: "ID", name: "إندونيسيا", dial: "+62", flag: "🇮🇩" },
  { iso: "CN", name: "الصين", dial: "+86", flag: "🇨🇳" },
  { iso: "OTHER", name: "دولة أخرى", dial: "", flag: "🌍" },
] as const;

const arabicDigitsToLatin = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizePhone = (value: string) => {
  const latin = arabicDigitsToLatin(value).trim();
  let compact = latin.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\D/g, "");
    if (/^0?7\d{8}$/.test(digits)) {
      if (digits.startsWith("0")) digits = digits.slice(1);
      return `+967${digits}`;
    }
    throw new Error("أدخل رقم الهاتف مع رمز الدولة.");
  }
  if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw new Error("أدخل رقم هاتف دولي صحيح.");
  return compact;
};

const countryFromPhone = (phone: string) => {
  if (phone.startsWith("+967")) return "YE";
  if (phone.startsWith("+966")) return "SA";
  if (phone.startsWith("+60")) return "MY";
  if (phone.startsWith("+1")) return "US";
  return "XX";
};

const authPasswordFor = async (phone: string, password: string) => {
  if (password.length >= 6) return password;
  const source = new TextEncoder().encode(`flamingopark:v1:${phone}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", source);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [claimExisting, setClaimExisting] = useState(true);
  const [phoneCountry, setPhoneCountry] = useState("YE");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "عدن" });

  const [recoveryStep, setRecoveryStep] = useState<RecoveryStep>("idle");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

  const selectedPhoneCountry = useMemo(() => PHONE_COUNTRIES.find((country) => country.iso === phoneCountry) || PHONE_COUNTRIES[0], [phoneCountry]);

  const persistCustomer = (raw: CustomerRow) => {
    const customerData = { ...raw, region: raw.region || "عدن", country: raw.country || "YE" };
    setCustomer({ id: customerData.id, name: customerData.name, phone: customerData.phone, region: customerData.region || "عدن" });
    setRegion(customerData.region || "عدن");
    setCustomerSession({ id: customerData.id, name: customerData.name, phone: customerData.phone, region: customerData.region || undefined, country: customerData.country || undefined, avatar_url: customerData.avatar_url || null, user_id: customerData.user_id || undefined });
    return customerData;
  };

  const getOwnCustomer = async (userId: string) => {
    const { data, error } = await (supabase as any).from("customers").select("id,user_id,name,phone,country,region,avatar_url,created_at").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data as CustomerRow | null;
  };

  const finalizeRegistration = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("customer-registration-finalize", { body });
    if (error) throw error;
    if (!data?.customer) throw new Error(data?.error || "تعذر إنشاء ملف العميل");
    return data.customer as CustomerRow;
  };

  const buildPhone = () => {
    const rawPhone = formData.phone.trim();
    const composedPhone = rawPhone.startsWith("+") || rawPhone.startsWith("00") || phoneCountry === "OTHER" ? rawPhone : `${selectedPhoneCountry.dial}${arabicDigitsToLatin(rawPhone).replace(/\D/g, "").replace(/^0+/, "")}`;
    return normalizePhone(composedPhone);
  };

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const { data } = await supabase.auth.getUser();
      if (!active || !data.user) return;
      try {
        const own = await getOwnCustomer(data.user.id);
        if (!active || !own) return;
        persistCustomer(own);
        navigate("/home", { replace: true });
      } catch {
        // Keep auth page open if recovery is required.
      }
    };
    void restore();
    return () => { active = false; };
  }, [navigate]);

  const updateField = (field: keyof typeof formData, value: string) => setFormData((previous) => ({ ...previous, [field]: value }));

  const migrateLegacyCustomer = async (phone: string, rawPassword: string, authPassword: string) => {
    const { data: migration, error: migrationError } = await supabase.functions.invoke("legacy-customer-migrate", { body: { phone, password: rawPassword } });
    if (migrationError || !migration?.ok) return null;
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ phone, password: authPassword });
    if (loginError || !loginData.user) return null;
    return getOwnCustomer(loginData.user.id);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = formData.name.trim();
    const password = formData.password;
    const selectedRegion = formData.region.trim();

    if (!password || (mode === "register" && (!name || !selectedRegion))) {
      toast({ title: "البيانات غير مكتملة", description: "يرجى تعبئة جميع الحقول المطلوبة.", variant: "destructive" });
      return;
    }

    let phone = "";
    try {
      phone = buildPhone();
    } catch (error: any) {
      toast({ title: "رقم الهاتف غير صحيح", description: error?.message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const authPassword = await authPasswordFor(phone, password);
      const signInCompatible = async () => {
        const candidates = Array.from(new Set([password, authPassword]));
        for (const candidate of candidates) {
          const result = await supabase.auth.signInWithPassword({ phone, password: candidate });
          if (!result.error && result.data.user) return result;
        }
        return null;
      };

      if (mode === "register") {
        await supabase.auth.signOut();
        const existing = await signInCompatible();
        if (existing?.data.user) {
          let existingCustomer = await getOwnCustomer(existing.data.user.id);
          if (!existingCustomer) existingCustomer = await finalizeRegistration({ name, phone, region: selectedRegion, country: phoneCountry === "OTHER" ? countryFromPhone(phone) : phoneCountry, channel: "none", legacyPassword: password });
          persistCustomer(existingCustomer);
          toast({ title: "الحساب موجود بالفعل", description: "تم تسجيل الدخول إلى حسابك الحالي." });
          navigate("/home", { replace: true });
          return;
        }

        await supabase.auth.signOut();
        const country = phoneCountry === "OTHER" ? countryFromPhone(phone) : phoneCountry;
        const { data, error } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { name, full_name: name, contact_phone: phone, customer_signup: "flamingo_customer", region: selectedRegion, country } } });
        if (error) throw error;
        if (!data.session || !data.user) throw new Error("تعذر بدء جلسة الحساب. حاول تسجيل الدخول مرة أخرى.");

        let customerData = await getOwnCustomer(data.user.id);
        if (!customerData) customerData = await finalizeRegistration({ name, phone, region: selectedRegion, country, channel: "none" });
        persistCustomer(customerData);
        toast({ title: "تم إنشاء الحساب", description: `أهلاً ${customerData.name}` });
        navigate("/home", { replace: true });
        return;
      }

      await supabase.auth.signOut();
      const compatibleLogin = await signInCompatible();
      const loginData = compatibleLogin?.data;

      if (loginData?.user) {
        let customerData = await getOwnCustomer(loginData.user.id);
        if (!customerData && claimExisting) customerData = await finalizeRegistration({ name: "عميل فلامنجو", phone, region: "غير محدد", country: phoneCountry === "OTHER" ? countryFromPhone(phone) : phoneCountry, channel: "none", legacyPassword: password });
        if (!customerData) throw new Error("ملف العميل غير مكتمل. تواصل مع خدمة العملاء.");
        persistCustomer(customerData);
        toast({ title: "مرحباً بعودتك", description: `أهلاً ${customerData.name}` });
        navigate("/home", { replace: true });
        return;
      }

      if (claimExisting) {
        const migrated = await migrateLegacyCustomer(phone, password, authPassword);
        if (migrated) {
          persistCustomer(migrated);
          toast({ title: "تم ربط حسابك القديم", description: `أهلاً ${migrated.name}` });
          navigate("/home", { replace: true });
          return;
        }
      }

      throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
    } catch (error: any) {
      await supabase.auth.signOut().catch(() => undefined);
      const message = String(error?.message || "حدث خطأ أثناء تسجيل الدخول.");
      toast({ title: "تعذر المتابعة", description: message.includes("already registered") ? "رقم الهاتف مستخدم مسبقاً. استخدم تسجيل الدخول أو استعادة كلمة المرور." : message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecovery = async () => {
    let phone = "";
    try {
      phone = buildPhone();
    } catch (error: any) {
      toast({ title: "رقم الهاتف غير صحيح", description: error?.message, variant: "destructive" });
      return;
    }

    setRecoveryLoading(true);
    try {
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false } });
      if (error) throw error;
      setRecoveryPhone(phone);
      setRecoveryCode("");
      setRecoveryPassword("");
      setRecoveryStep("code");
      toast({ title: "تم إرسال رمز التحقق", description: "أدخل الرمز المرسل إلى رقم هاتفك." });
    } catch (error: any) {
      toast({ title: "تعذر إرسال الرمز", description: String(error?.message || "حاول مرة أخرى."), variant: "destructive" });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const verifyRecoveryCode = async () => {
    const token = arabicDigitsToLatin(recoveryCode).replace(/\D/g, "");
    if (token.length < 4) {
      toast({ title: "رمز التحقق غير مكتمل", variant: "destructive" });
      return;
    }

    setRecoveryLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: recoveryPhone, token, type: "sms" });
      if (error || !data.session || !data.user) throw error || new Error("تعذر التحقق من الرمز.");
      setRecoveryStep("password");
      toast({ title: "تم التحقق من الرقم", description: "اختر كلمة المرور الجديدة." });
    } catch (error: any) {
      toast({ title: "رمز التحقق غير صحيح", description: String(error?.message || "أعد المحاولة."), variant: "destructive" });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const finishRecovery = async () => {
    if (!recoveryPassword) {
      toast({ title: "اكتب كلمة المرور الجديدة", variant: "destructive" });
      return;
    }

    setRecoveryLoading(true);
    try {
      const authPassword = await authPasswordFor(recoveryPhone, recoveryPassword);
      const { data, error } = await supabase.auth.updateUser({ password: authPassword });
      if (error || !data.user) throw error || new Error("تعذر تحديث كلمة المرور.");

      let customerData = await getOwnCustomer(data.user.id);
      if (!customerData) {
        const meta = data.user.user_metadata || {};
        customerData = await finalizeRegistration({ name: String(meta.full_name || meta.name || "عميل فلامنجو"), phone: recoveryPhone, region: String(meta.region || "عدن"), country: String(meta.country || countryFromPhone(recoveryPhone)), channel: "none" });
      }

      persistCustomer(customerData);
      toast({ title: "تم تغيير كلمة المرور", description: "تم تسجيل دخولك بنجاح." });
      navigate("/home", { replace: true });
    } catch (error: any) {
      toast({ title: "تعذر تغيير كلمة المرور", description: String(error?.message || "حاول مرة أخرى."), variant: "destructive" });
    } finally {
      setRecoveryLoading(false);
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

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading || recoveryLoading) return;
    setMode(nextMode);
    setShowPassword(false);
    setRecoveryStep("idle");
  };

  return (
    <main className="min-h-[100svh] bg-background" dir="rtl">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        <div className="flex justify-center"><button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" /></button></div>
        <div className="mt-2 flex items-center justify-center gap-2.5"><span className="h-px w-5 bg-[#E0B7B4]" /><span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span><span className="h-px w-5 bg-[#E0B7B4]" /></div>

        <section className="mt-8 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="text-center"><h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">{recoveryStep !== "idle" ? "استعادة كلمة المرور" : mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</h1><p className="mx-auto mt-2 max-w-[340px] text-[10px] leading-5 text-[#958883] sm:text-[11px] sm:leading-6">{recoveryStep === "code" ? `أدخل رمز التحقق المرسل إلى ${recoveryPhone}` : recoveryStep === "password" ? "اختر كلمة مرور جديدة للحساب." : mode === "login" ? "سجّل دخولك برقم هاتفك لمتابعة الطلبات والمفضلة." : "أنشئ حسابك برقم هاتفك وكلمة المرور التي تختارها."}</p></div>

          {recoveryStep === "idle" ? (
            <>
              <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>حساب جديد</button></div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                {mode === "register" && <div><label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-name" value={formData.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>}

                {mode === "register" && <div><label htmlFor="auth-region" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} autoComplete="address-level2" placeholder="مثال: عدن، الرياض" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>}

                <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الدولة ورقم الهاتف</label><div className="grid grid-cols-[145px_1fr] gap-2" dir="ltr"><select aria-label="الدولة" value={phoneCountry} onChange={(event) => { const next = event.target.value; setPhoneCountry(next); setFormData((previous) => ({ ...previous, region: next === "YE" && !previous.region ? "عدن" : next !== "YE" && previous.region === "عدن" ? "" : previous.region })); }} className="h-[50px] rounded-[12px] border border-[#E8DEDA] bg-white px-2 text-[11px] text-[#443936] outline-none focus:border-[#D7AAA7]" dir="rtl">{PHONE_COUNTRIES.map((country) => <option key={country.iso} value={country.iso}>{country.flag} {country.name}{country.dial ? ` ${country.dial}` : ""}</option>)}</select><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={phoneCountry === "OTHER" ? "+رمز الدولة والرقم" : phoneCountry === "YE" ? "77xxxxxxx" : "رقم الهاتف"} dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div><p className="mt-1.5 px-1 text-[8px] leading-4 text-[#A19590]">اليمن محددة افتراضيًا. غيّر الدولة فقط إذا كان رقمك من خارج اليمن.</p></div>

                <div><label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="كلمة المرور" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#A99D98]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

                {mode === "login" && <div className="flex items-center justify-between px-1"><button type="button" onClick={() => setClaimExisting((value) => !value)} className="flex items-center gap-2.5 text-right"><span className={`flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border ${claimExisting ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D8CECA] bg-white"}`}>{claimExisting && <Check className="h-2.5 w-2.5 text-white" />}</span><span className="text-[9px] leading-5 text-[#978984]">ربط الحساب القديم تلقائياً</span></button><button type="button" onClick={startRecovery} disabled={recoveryLoading || isLoading} className="text-[9px] font-medium text-[#C1646C] disabled:opacity-50">نسيت كلمة المرور؟</button></div>}

                <button type="submit" disabled={isLoading || recoveryLoading} className="mt-2 flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white disabled:opacity-60">{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</button>
              </form>

              <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading || recoveryLoading} className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8DEDA] bg-white text-[10px] font-medium text-[#746761] disabled:opacity-60">{isGuestLoading && <Loader2 className="h-4 w-4 animate-spin" />}الدخول كضيف</button>
            </>
          ) : recoveryStep === "code" ? (
            <div className="mt-6 space-y-3">
              <div><label htmlFor="recovery-code" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رمز التحقق</label><input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} placeholder="أدخل الرمز" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white px-4 text-center text-[16px] tracking-[0.28em] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div>
              <button type="button" onClick={verifyRecoveryCode} disabled={recoveryLoading} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white disabled:opacity-60">{recoveryLoading && <Loader2 className="h-4 w-4 animate-spin" />}تحقق من الرمز</button>
              <div className="grid grid-cols-2 gap-2"><button type="button" onClick={startRecovery} disabled={recoveryLoading} className="h-[44px] rounded-[12px] border border-[#E8DEDA] bg-white text-[9px] text-[#746761]">إعادة إرسال الرمز</button><button type="button" onClick={() => setRecoveryStep("idle")} disabled={recoveryLoading} className="h-[44px] rounded-[12px] border border-[#E8DEDA] bg-white text-[9px] text-[#746761]">العودة للدخول</button></div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div><label htmlFor="recovery-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور الجديدة</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="recovery-password" type={showRecoveryPassword ? "text" : "password"} autoComplete="new-password" value={recoveryPassword} onChange={(event) => setRecoveryPassword(event.target.value)} placeholder="اختر كلمة المرور" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /><button type="button" onClick={() => setShowRecoveryPassword((value) => !value)} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#A99D98]">{showRecoveryPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><p className="mt-1.5 px-1 text-[8px] text-[#A19590]">يمكنك اختيار كلمة مرور بسيطة؛ يتم تخزينها في نظام المصادقة بشكل آمن.</p></div>
              <button type="button" onClick={finishRecovery} disabled={recoveryLoading} className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white disabled:opacity-60">{recoveryLoading && <Loader2 className="h-4 w-4 animate-spin" />}حفظ كلمة المرور والدخول</button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
