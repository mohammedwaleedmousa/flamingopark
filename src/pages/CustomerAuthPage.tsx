import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Eye, EyeOff, Loader2, LockKeyhole, MapPin, Phone, Search, UserRound, X } from "lucide-react";

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

const REGIONS = ["عدن", "صنعاء", "تعز", "حضرموت", "إب", "الحديدة", "لحج", "أبين", "شبوة", "مأرب", "ذمار", "البيضاء", "الضالع", "صعدة", "عمران", "ريمة", "المحويت", "الجوف"];

const arabicDigitsToLatin = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeYemenPhone = (value: string) => {
  let digits = arabicDigitsToLatin(value).replace(/\D/g, "");
  if (digits.startsWith("00967")) digits = digits.slice(5);
  else if (digits.startsWith("967")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^7\d{8}$/.test(digits)) throw new Error("أدخل رقم جوال يمني صحيح مثل 77xxxxxxx");
  return `+967${digits}`;
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
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "" });

  const filteredRegions = useMemo(() => {
    const value = regionSearch.trim();
    return value ? REGIONS.filter((region) => region.includes(value)) : REGIONS;
  }, [regionSearch]);

  useEffect(() => {
    if (!regionOpen) return;
    const scrollY = window.scrollY;
    const previous = { position: document.body.style.position, top: document.body.style.top, width: document.body.style.width, overflow: document.body.style.overflow };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      document.body.style.overflow = previous.overflow;
      window.scrollTo({ top: scrollY, behavior: "auto" });
    };
  }, [regionOpen]);

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
        // Keep the auth page open when a profile needs recovery.
      }
    };
    void restore();
    return () => { active = false; };
  }, [navigate]);

  const updateField = (field: keyof typeof formData, value: string) => setFormData((previous) => ({ ...previous, [field]: value }));

  const migrateLegacyCustomer = async (phone: string, rawPassword: string, authPassword: string) => {
    const { data: legacy, error: legacyError } = await (supabase as any).rpc("customer_login", { _phone: phone, _password: rawPassword });
    if (legacyError || !legacy?.length) return null;

    const legacyCustomer = legacy[0] as CustomerRow;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { name: legacyCustomer.name, region: legacyCustomer.region || "عدن", country: "YE" } } });
    if (signUpError) throw signUpError;
    if (!signUpData.session || !signUpData.user) throw new Error("تعذر بدء جلسة الحساب. حاول تسجيل الدخول مرة أخرى.");

    return finalizeRegistration({ name: legacyCustomer.name, phone, region: legacyCustomer.region || "عدن", country: "YE", channel: "none", legacyPassword: rawPassword });
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
    try { phone = normalizeYemenPhone(formData.phone); } catch (error: any) {
      toast({ title: "رقم الهاتف غير صحيح", description: error?.message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const authPassword = await authPasswordFor(phone, password);

      if (mode === "register") {
        await supabase.auth.signOut();
        const { data, error } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { name, region: selectedRegion, country: "YE" } } });
        if (error) throw error;
        if (!data.session || !data.user) throw new Error("تعذر بدء جلسة الحساب. حاول تسجيل الدخول مرة أخرى.");

        const customerData = await finalizeRegistration({ name, phone, region: selectedRegion, country: "YE", channel: "none" });
        persistCustomer(customerData);
        toast({ title: "تم إنشاء الحساب", description: `أهلاً ${customerData.name}` });
        navigate("/home", { replace: true });
        return;
      }

      await supabase.auth.signOut();
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ phone, password: authPassword });

      if (!loginError && loginData.user) {
        let customerData = await getOwnCustomer(loginData.user.id);
        if (!customerData && claimExisting) customerData = await finalizeRegistration({ name: "عميل فلامنجو", phone, region: "عدن", country: "YE", channel: "none", legacyPassword: password });
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
      toast({ title: "تعذر المتابعة", description: message.includes("already registered") ? "رقم الهاتف مستخدم مسبقاً. استخدم تسجيل الدخول." : message, variant: "destructive" });
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
    } finally { setIsGuestLoading(false); }
  };

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading) return;
    setMode(nextMode);
    setShowPassword(false);
    setRegionOpen(false);
    setRegionSearch("");
  };

  return (
    <main className="min-h-[100svh] bg-background" dir="rtl">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        <div className="flex justify-center"><button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center"><img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" /></button></div>
        <div className="mt-2 flex items-center justify-center gap-2.5"><span className="h-px w-5 bg-[#E0B7B4]" /><span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span><span className="h-px w-5 bg-[#E0B7B4]" /></div>

        <section className="mt-8 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          <div className="text-center"><h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">{mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</h1><p className="mx-auto mt-2 max-w-[320px] text-[10px] leading-5 text-[#958883] sm:text-[11px] sm:leading-6">{mode === "login" ? "سجّل دخولك برقم هاتفك لمتابعة الطلبات والمفضلة." : "أنشئ حسابك برقم هاتف يمني وكلمة المرور التي تختارها."}</p></div>

          <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1"><button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>تسجيل الدخول</button><button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>حساب جديد</button></div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {mode === "register" && <div><label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label><div className="relative"><UserRound className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-name" value={formData.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>}

            {mode === "register" && <div><label className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المحافظة</label><button type="button" onClick={() => setRegionOpen(true)} className="relative flex h-[50px] w-full items-center rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-11 text-right"><MapPin className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><span className={`flex-1 text-[12px] ${formData.region ? "text-[#443936]" : "text-[#B8ADA8]"}`}>{formData.region || "اختر المحافظة"}</span><ChevronDown className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /></button></div>}

            <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="77xxxxxxx" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>

            <div><label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label><div className="relative"><LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="كلمة المرور" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-[#A99D98]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>

            {mode === "login" && <button type="button" onClick={() => setClaimExisting((value) => !value)} className="flex w-full items-center gap-2.5 px-1 py-1 text-right"><span className={`flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border ${claimExisting ? "border-[#D4777D] bg-[#D4777D]" : "border-[#D8CECA] bg-white"}`}>{claimExisting && <Check className="h-2.5 w-2.5 text-white" />}</span><span className="text-[9px] leading-5 text-[#978984]">ربط الحساب القديم تلقائياً عند أول دخول</span></button>}

            <button type="submit" disabled={isLoading} className="mt-2 flex h-[50px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#D4777D] text-[11px] font-semibold text-white disabled:opacity-60">{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</button>
          </form>

          <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-[12px] border border-[#E8DEDA] bg-white text-[10px] font-medium text-[#746761] disabled:opacity-60">{isGuestLoading && <Loader2 className="h-4 w-4 animate-spin" />}الدخول كضيف</button>
        </section>
      </div>

      {regionOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 p-3 sm:items-center"><button type="button" aria-label="إغلاق" onClick={() => setRegionOpen(false)} className="absolute inset-0" /><div className="relative z-10 w-full max-w-[430px] overflow-hidden rounded-[20px] bg-white shadow-xl"><div className="flex items-center justify-between border-b border-[#EEE4E0] px-4 py-4"><div><h2 className="text-[14px] font-semibold text-[#443936]">اختر المحافظة</h2><p className="mt-1 text-[8px] text-[#9F928D]">حدد المحافظة التابعة لعنوانك.</p></div><button type="button" onClick={() => setRegionOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F3F1]"><X className="h-4 w-4" /></button></div><div className="p-3"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /><input value={regionSearch} onChange={(event) => setRegionSearch(event.target.value)} placeholder="ابحث عن المحافظة" className="h-10 w-full rounded-[10px] border border-[#E8DEDA] pr-10 pl-3 text-[10px] outline-none" /></div><div className="mt-3 max-h-[52svh] overflow-y-auto">{filteredRegions.map((region) => <button key={region} type="button" onClick={() => { updateField("region", region); setRegionOpen(false); setRegionSearch(""); }} className="flex h-11 w-full items-center justify-between border-b border-[#F4EFEC] px-2 text-[10px] text-[#514540]"><span>{region}</span>{formData.region === region && <Check className="h-4 w-4 text-[#D4777D]" />}</button>)}</div></div></div></div>}
    </main>
  );
};

export default CustomerAuthPage;
