import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, LockKeyhole, MapPin, Phone, UserRound } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { clearCustomerSession, setCustomerSession } from "@/lib/customerSession";

type AuthMode = "login" | "register";

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
  { iso: "YE", name: "اليمن", dial: "+967", flag: "🇾🇪", placeholder: "77xxxxxxx" },
  { iso: "SA", name: "السعودية", dial: "+966", flag: "🇸🇦", placeholder: "5xxxxxxxx" },
  { iso: "AE", name: "الإمارات", dial: "+971", flag: "🇦🇪", placeholder: "5xxxxxxxx" },
  { iso: "OM", name: "عُمان", dial: "+968", flag: "🇴🇲", placeholder: "9xxxxxxx" },
  { iso: "QA", name: "قطر", dial: "+974", flag: "🇶🇦", placeholder: "xxxxxxxx" },
  { iso: "KW", name: "الكويت", dial: "+965", flag: "🇰🇼", placeholder: "xxxxxxxx" },
  { iso: "BH", name: "البحرين", dial: "+973", flag: "🇧🇭", placeholder: "xxxxxxxx" },
  { iso: "EG", name: "مصر", dial: "+20", flag: "🇪🇬", placeholder: "1xxxxxxxxx" },
  { iso: "JO", name: "الأردن", dial: "+962", flag: "🇯🇴", placeholder: "7xxxxxxxx" },
  { iso: "US", name: "أمريكا / كندا", dial: "+1", flag: "🇺🇸", placeholder: "xxxxxxxxxx" },
  { iso: "MY", name: "ماليزيا", dial: "+60", flag: "🇲🇾", placeholder: "1xxxxxxxxx" },
  { iso: "GB", name: "بريطانيا", dial: "+44", flag: "🇬🇧", placeholder: "7xxxxxxxxx" },
  { iso: "DE", name: "ألمانيا", dial: "+49", flag: "🇩🇪", placeholder: "xxxxxxxxxx" },
  { iso: "NL", name: "هولندا", dial: "+31", flag: "🇳🇱", placeholder: "6xxxxxxxx" },
  { iso: "TR", name: "تركيا", dial: "+90", flag: "🇹🇷", placeholder: "5xxxxxxxxx" },
  { iso: "IN", name: "الهند", dial: "+91", flag: "🇮🇳", placeholder: "xxxxxxxxxx" },
  { iso: "PK", name: "باكستان", dial: "+92", flag: "🇵🇰", placeholder: "3xxxxxxxxx" },
  { iso: "ID", name: "إندونيسيا", dial: "+62", flag: "🇮🇩", placeholder: "8xxxxxxxxxx" },
  { iso: "CN", name: "الصين", dial: "+86", flag: "🇨🇳", placeholder: "1xxxxxxxxxx" },
] as const;

type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]["iso"];

const arabicDigitsToLatin = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const defaultRegionForCountry = (country: string) => (country === "YE" ? "عدن" : "غير محدد");

const authPasswordFor = async (phone: string, password: string) => {
  if (password.length >= 6) return password;

  const source = new TextEncoder().encode(`flamingopark:v1:${phone}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", source);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountryCode>("YE");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "عدن" });

  const selectedPhoneCountry = useMemo(
    () => PHONE_COUNTRIES.find((country) => country.iso === phoneCountry) || PHONE_COUNTRIES[0],
    [phoneCountry],
  );

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const buildPhone = () => {
    let digits = arabicDigitsToLatin(formData.phone).replace(/\D/g, "");

    if (!digits) throw new Error("أدخل رقم الهاتف.");

    const dialDigits = selectedPhoneCountry.dial.replace(/\D/g, "");

    // الحقل مخصص للرقم المحلي فقط. إذا لصق العميل رمز الدولة نحذفه حتى لا يتكرر.
    digits = digits.replace(/^00+/, "");
    if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 6) {
      digits = digits.slice(dialDigits.length);
    }

    // إزالة الصفر المحلي: 077... => 77... / 05... => 5...
    digits = digits.replace(/^0+/, "");

    const fullPhone = `${selectedPhoneCountry.dial}${digits}`;
    if (!/^\+[1-9]\d{7,14}$/.test(fullPhone)) {
      throw new Error("رقم الهاتف غير صحيح لهذه الدولة.");
    }

    return fullPhone;
  };

  const persistCustomer = (raw: CustomerRow) => {
    const country = raw.country || phoneCountry;
    const region = raw.region || defaultRegionForCountry(country);

    setCustomer({ id: raw.id, name: raw.name, phone: raw.phone, region });
    setRegion(region);
    setCustomerSession({
      id: raw.id,
      user_id: raw.user_id || undefined,
      name: raw.name,
      phone: raw.phone,
      region,
      country,
      avatar_url: raw.avatar_url || null,
    });

    return { ...raw, country, region };
  };

  const getOwnCustomer = async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("customers")
      .select("id,user_id,name,phone,country,region,avatar_url,created_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as CustomerRow | null;
  };

  const finalizeRegistration = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("customer-registration-finalize", { body });
    if (error) throw error;
    if (!data?.customer) throw new Error(data?.error || "تعذر إنشاء ملف العميل");
    return data.customer as CustomerRow;
  };

  const signInCompatible = async (phone: string, rawPassword: string) => {
    const authPassword = await authPasswordFor(phone, rawPassword);
    const candidates = Array.from(new Set([authPassword, rawPassword]));
    let lastError: unknown = null;

    for (const candidate of candidates) {
      const result = await supabase.auth.signInWithPassword({ phone, password: candidate });
      if (!result.error && result.data.user) return result.data;
      lastError = result.error;
    }

    throw lastError || new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
  };

  const migrateLegacyCustomer = async (phone: string, rawPassword: string) => {
    const { data, error } = await supabase.functions.invoke("legacy-customer-migrate", {
      body: { phone, password: rawPassword },
    });

    if (error || !data?.ok) return null;

    const login = await signInCompatible(phone, rawPassword).catch(() => null);
    if (!login?.user) return null;
    return getOwnCustomer(login.user.id);
  };

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session?.user) return;

      try {
        const customer = await getOwnCustomer(session.user.id);
        if (!active || !customer) return;
        persistCustomer(customer);
        navigate("/home", { replace: true });
      } catch {
        // نبقي صفحة الدخول مفتوحة إذا كانت الجلسة ناقصة.
      }
    };

    void restore();
    return () => { active = false; };
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const name = formData.name.trim();
    const password = formData.password;
    const selectedRegion = formData.region.trim();

    if (!formData.phone.trim()) {
      toast({ title: "رقم الهاتف مطلوب", description: "أدخل رقم الهاتف المحلي بدون رمز الدولة.", variant: "destructive" });
      return;
    }

    if (!password) {
      toast({ title: "كلمة المرور مطلوبة", description: "أدخل كلمة المرور.", variant: "destructive" });
      return;
    }

    if (mode === "register" && (!name || !selectedRegion)) {
      toast({ title: "البيانات غير مكتملة", description: "أدخل الاسم والمنطقة.", variant: "destructive" });
      return;
    }

    let phone = "";
    try {
      phone = buildPhone();
    } catch (error: any) {
      toast({ title: "رقم الهاتف غير صحيح", description: error?.message || "تحقق من الرقم.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // لا نلغي جلسات الهاتف الآخر عند تبديل الحساب على هذا الجهاز.
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

      if (mode === "register") {
        const authPassword = await authPasswordFor(phone, password);
        const country = phoneCountry;
        const region = selectedRegion || defaultRegionForCountry(country);

        const { data, error } = await supabase.auth.signUp({
          phone,
          password: authPassword,
          options: {
            data: {
              name,
              full_name: name,
              contact_phone: phone,
              customer_signup: "flamingo_customer",
              region,
              country,
            },
          },
        });

        if (error) throw error;
        if (!data.user) throw new Error("تعذر إنشاء الحساب.");

        let user = data.user;

        // التسجيل المطلوب بدون OTP: إذا لم ترجع جلسة نحاول الدخول مباشرة بنفس كلمة المرور.
        if (!data.session) {
          const directLogin = await supabase.auth.signInWithPassword({ phone, password: authPassword });
          if (directLogin.error || !directLogin.data.user) {
            throw new Error("إعداد تسجيل الهاتف في Supabase يطلب تأكيد الرقم. يجب إبقاء Phone confirmation غير مفعّل للتسجيل بدون OTP.");
          }
          user = directLogin.data.user;
        }

        let customer = await getOwnCustomer(user.id);
        if (!customer) {
          customer = await finalizeRegistration({ name, phone, region, country, channel: "none" });
        }

        persistCustomer(customer);
        toast({ title: "تم إنشاء الحساب", description: `أهلاً ${customer.name}` });
        navigate("/home", { replace: true });
        return;
      }

      const loginData = await signInCompatible(phone, password).catch(() => null);

      if (!loginData?.user) {
        const migrated = await migrateLegacyCustomer(phone, password);
        if (migrated) {
          persistCustomer(migrated);
          toast({ title: "تم تسجيل الدخول", description: `أهلاً ${migrated.name}` });
          navigate("/home", { replace: true });
          return;
        }

        throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة");
      }

      let customer = await getOwnCustomer(loginData.user.id);
      if (!customer) {
        const country = phoneCountry;
        customer = await finalizeRegistration({
          name: "عميل فلامنجو",
          phone,
          region: defaultRegionForCountry(country),
          country,
          channel: "none",
          legacyPassword: password,
        });
      }

      persistCustomer(customer);
      toast({ title: "مرحباً بعودتك", description: `أهلاً ${customer.name}` });
      navigate("/home", { replace: true });
    } catch (error: any) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

      const message = String(error?.message || "تعذر المتابعة.");
      const lower = message.toLowerCase();
      let friendly = message;

      if (lower.includes("already registered") || lower.includes("user already") || lower.includes("already exists")) {
        friendly = "رقم الهاتف مسجل مسبقاً. اختر تسجيل الدخول واستخدم نفس الرقم وكلمة المرور.";
      } else if (lower.includes("database error saving new user") || lower.includes("existing customer requires password migration")) {
        friendly = "هذا الرقم موجود كحساب سابق. اختر تسجيل الدخول وسيتم ربط الحساب القديم تلقائياً.";
      } else if (lower.includes("invalid login credentials")) {
        friendly = "رقم الهاتف أو كلمة المرور غير صحيحة.";
      }

      toast({ title: "تعذر المتابعة", description: friendly, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsGuestLoading(true);
    try {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
      clearCustomerSession();
      setCustomer({ id: "guest", name: "ضيف", phone: "", region: "عدن" });
      setRegion("عدن");
      navigate("/home");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading) return;
    setMode(nextMode);
    setShowPassword(false);
    if (nextMode === "register" && phoneCountry === "YE" && !formData.region) updateField("region", "عدن");
  };

  return (
    <main className="min-h-[100svh] bg-background" dir="rtl">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        <div className="flex justify-center">
          <button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center">
            <img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2.5">
          <span className="h-px w-5 bg-[#E0B7B4]" />
          <span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span>
          <span className="h-px w-5 bg-[#E0B7B4]" />
        </div>

        <section className="mt-8 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="text-center">
            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">
              {mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
            </h1>
            <p className="mx-auto mt-2 max-w-[350px] text-[10px] leading-5 text-[#958883] sm:text-[11px] sm:leading-6">
              {mode === "login"
                ? "اختر الدولة، اكتب رقمك المحلي وكلمة المرور."
                : "اختر رمز الدولة ثم اكتب رقم الهاتف بدون رمز الدولة. لا يوجد رمز OTP في التسجيل."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1">
            <button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>
              تسجيل الدخول
            </button>
            <button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />
                  <input id="auth-name" value={formData.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" />
                </div>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label htmlFor="auth-region" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المدينة / المنطقة</label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />
                  <input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} autoComplete="address-level2" placeholder="مثال: عدن، الرياض" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الدولة ورقم الهاتف</label>
              <div className="grid grid-cols-[150px_1fr] gap-2" dir="ltr">
                <select
                  aria-label="الدولة"
                  value={phoneCountry}
                  onChange={(event) => {
                    const next = event.target.value as PhoneCountryCode;
                    setPhoneCountry(next);
                    setFormData((previous) => ({
                      ...previous,
                      phone: "",
                      region: next === "YE" && !previous.region
                        ? "عدن"
                        : next !== "YE" && previous.region === "عدن"
                          ? ""
                          : previous.region,
                    }));
                  }}
                  className="h-[50px] rounded-[12px] border border-[#E8DEDA] bg-white px-2 text-[11px] text-[#443936] outline-none focus:border-[#D7AAA7]"
                  dir="rtl"
                >
                  {PHONE_COUNTRIES.map((country) => (
                    <option key={country.iso} value={country.iso}>{country.flag} {country.name} {country.dial}</option>
                  ))}
                </select>

                <div className="relative">
                  <Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />
                  <input
                    id="auth-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={formData.phone}
                    onChange={(event) => updateField("phone", arabicDigitsToLatin(event.target.value).replace(/\D/g, "").slice(0, 15))}
                    placeholder={selectedPhoneCountry.placeholder}
                    dir="ltr"
                    className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]"
                  />
                </div>
              </div>
              <p className="mt-1.5 px-1 text-[8px] leading-4 text-[#A19590]">
                رمز الدولة {selectedPhoneCountry.dial} يضاف تلقائياً. اكتب الرقم المحلي فقط، ويمكن كتابة الصفر الأول أو بدونه.
              </p>
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={formData.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  placeholder="كلمة المرور"
                  dir="ltr"
                  className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]"
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#A99D98]">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="mt-2 flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white disabled:opacity-60">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>

          <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8DEDA] bg-white text-[10px] font-medium text-[#746761] disabled:opacity-60">
            {isGuestLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            الدخول كضيف
          </button>
        </section>
      </div>
    </main>
  );
};

export default CustomerAuthPage;
