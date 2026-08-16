import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, Eye, EyeOff, Loader2, LockKeyhole, MapPin, Phone, Search, UserRound, X } from "lucide-react";

import { useStore } from "@/store/useStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { loginCustomer, registerCustomer } from "@/lib/customerAuth";
import { clearCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { toYemenLocalPhone } from "@/lib/yemenPhone";

type AuthMode = "login" | "register";

const REGIONS = [
  "عدن",
  "صنعاء",
  "تعز",
  "حضرموت",
  "إب",
  "الحديدة",
  "لحج",
  "أبين",
  "شبوة",
  "مأرب",
  "ذمار",
  "البيضاء",
  "الضالع",
  "صعدة",
  "عمران",
  "ريمة",
  "المحويت",
  "الجوف",
];

const CustomerAuthPage = () => {
  const navigate = useNavigate();

  const { setCustomer, setRegion } = useStore();

  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [regionOpen, setRegionOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    region: "",
  });

  const filteredRegions = useMemo(() => {
    const value = regionSearch.trim();

    if (!value) return REGIONS;

    return REGIONS.filter((region) => region.includes(value));
  }, [regionSearch]);

  /* =========================================================
     REGION SHEET BODY LOCK
  ========================================================= */

  useEffect(() => {
    if (!regionOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;

    const previousPosition = body.style.position;
    const previousTop = body.style.top;
    const previousWidth = body.style.width;
    const previousOverflow = body.style.overflow;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previousPosition;
      body.style.top = previousTop;
      body.style.width = previousWidth;
      body.style.overflow = previousOverflow;

      window.scrollTo({
        top: scrollY,
        behavior: "auto",
      });
    };
  }, [regionOpen]);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const persistCustomer = (customerData: CustomerSession) => {
    setCustomer({
      id: customerData.id,
      userId: customerData.userId,
      name: customerData.name,
      phone: customerData.phone,
      region: customerData.region,
    });

    setRegion(customerData.region);
    return customerData;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const phone = `+967${formData.phone}`;
    const password = formData.password;
    const name = formData.name.trim();
    const selectedRegion = formData.region.trim();

    if (!formData.phone || !password || (mode === "register" && !name) || (mode === "register" && !selectedRegion)) {
      toast({
        title: "البيانات غير مكتملة",
        description: "يرجى تعبئة جميع الحقول المطلوبة.",
        variant: "destructive",
      });

      return;
    }

    setIsLoading(true);

    try {
      if (mode === "register") {
        const customerData = persistCustomer(await registerCustomer({ name, phone, password, region: selectedRegion }));

        toast({
          title: "تم إنشاء الحساب",
          description: `أهلاً ${customerData.name}`,
        });

        navigate("/home");

        return;
      }

      const customerData = persistCustomer(await loginCustomer(phone, password));

      toast({
        title: "مرحباً بعودتك",
        description: `أهلاً ${customerData.name}`,
      });

      navigate("/home");
    } catch (error: unknown) {
      toast({
        title: "تعذر المتابعة",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الدخول.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async () => {
    setIsGuestLoading(true);

    try {
      await supabase.auth.signOut();
      clearCustomerSession();
      setCustomer({
        id: "guest",
        name: "ضيف",
        phone: "",
        region: "عدن",
      });

      setRegion("عدن");

      toast({
        title: "مرحباً بك",
        description: "يمكنك الآن تصفح المتجر.",
      });

      navigate("/home");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    if (isLoading) return;

    setMode(nextMode);
    setShowPassword(false);
    setRegionOpen(false);
    setRegionSearch("");
  };

  const selectRegion = (region: string) => {
    updateField("region", region);
    setRegionOpen(false);
    setRegionSearch("");
  };

  return (
    <main className="min-h-[100svh] bg-background" dir="rtl">
      {/* =====================================================
          TOP
      ===================================================== */}

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col px-5 pb-7 pt-5 sm:px-7 md:justify-center md:py-10">
        {/* LOGO */}

        <div className="flex justify-center">
          <button type="button" onClick={() => navigate("/home")} aria-label="العودة إلى المتجر" className="flex h-[78px] w-[78px] items-center justify-center">
            <img src="/icons/flamingo.jpeg" alt="Flamingo Park" width={78} height={78} fetchPriority="high" className="h-[78px] w-[78px] object-contain" />
          </button>
        </div>

        {/* BRAND */}

        <div className="mt-2 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="h-px w-5 bg-[#E0B7B4]" />

            <span className="font-serif text-[8px] tracking-[0.26em] text-[#B86168]">FLAMINGO PARK</span>

            <span className="h-px w-5 bg-[#E0B7B4]" />
          </div>
        </div>

        {/* =====================================================
            AUTH CARD
        ===================================================== */}

        <section className="mt-8 rounded-[22px] border border-[#EEE4E0] bg-[#FFFDFC] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7">
          {/* TITLE */}

          <div className="text-center">
            <h1 className="text-[25px] font-semibold tracking-[-0.035em] text-[#382F2C] sm:text-[28px]">{mode === "login" ? "مرحباً بعودتك" : "إنشاء حساب جديد"}</h1>

            <p className="mx-auto mt-2 max-w-[320px] text-[10px] leading-5 text-[#958883] sm:text-[11px] sm:leading-6">{mode === "login" ? "سجّل برقم هاتفك اليمني وكلمة المرور لمتابعة طلباتك." : "أنشئ حساباً برقم هاتف يمني وكلمة مرور من اختيارك."}</p>
          </div>

          {/* =====================================================
              TABS
          ===================================================== */}

          <div className="mt-6 grid grid-cols-2 rounded-[13px] bg-[#F7F3F1] p-1">
            <button type="button" onClick={() => changeMode("login")} className={`h-[42px] rounded-[10px] text-[11px] font-medium transition-colors ${mode === "login" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>تسجيل الدخول</button>

            <button type="button" onClick={() => changeMode("register")} className={`h-[42px] rounded-[10px] text-[11px] font-medium transition-colors ${mode === "register" ? "bg-white text-[#443936] shadow-[0_1px_4px_rgba(49,39,35,0.06)]" : "text-[#9F928D]"}`}>حساب جديد</button>
          </div>

          {/* =====================================================
              FORM
          ===================================================== */}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {/* NAME */}

            {mode === "register" && (
              <div>
                <label htmlFor="auth-name" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الاسم الكامل</label>

                <div className="group relative">
                  <UserRound className="pointer-events-none absolute right-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#A99D98] transition-colors group-focus-within:text-[#B86168]" strokeWidth={1.5} />

                  <input id="auth-name" type="text" autoComplete="name" value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="أدخل اسمك الكامل" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none transition-colors placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" />
                </div>
              </div>
            )}

            {/* REGION */}

            {mode === "register" && (
              <div>
                <label className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المحافظة</label>

                <button type="button" onClick={() => setRegionOpen(true)} className="relative flex h-[50px] w-full items-center rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-11 text-right transition-colors hover:border-[#D9B9B5]">
                  <MapPin className="absolute right-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />

                  <span className={`flex-1 text-[12px] ${formData.region ? "text-[#443936]" : "text-[#B8ADA8]"}`}>{formData.region || "اختر المحافظة"}</span>

                  <ChevronDown className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* PHONE */}

            <div>
              <label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رقم الهاتف</label>

              <div className="group relative">
                <Phone className="pointer-events-none absolute right-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#A99D98] transition-colors group-focus-within:text-[#B86168]" strokeWidth={1.5} />

                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#746761]" dir="ltr">+967</span>

                <input id="auth-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={9} value={formData.phone} onChange={(event) => updateField("phone", toYemenLocalPhone(event.target.value))} placeholder="7XXXXXXXX" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-[68px] text-left text-[12px] tracking-[0.08em] text-[#443936] outline-none transition-colors placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" />
              </div>
            </div>

            {/* PASSWORD */}

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">كلمة المرور</label>

              <div className="group relative">
                <LockKeyhole className="pointer-events-none absolute right-4 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-[#A99D98] transition-colors group-focus-within:text-[#B86168]" strokeWidth={1.5} />

                <input id="auth-password" type={showPassword ? "text" : "password"} minLength={6} maxLength={72} autoComplete={mode === "login" ? "current-password" : "new-password"} value={formData.password} onChange={(event) => updateField("password", event.target.value)} placeholder="6 خانات على الأقل" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-12 text-left text-[12px] tracking-[0.12em] text-[#443936] outline-none transition-colors placeholder:tracking-normal placeholder:text-[#B8ADA8] focus:border-[#D7AAA7]" />

                <button type="button" onClick={() => setShowPassword((previous) => !previous)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[8px] text-[#A99D98] transition-colors hover:bg-[#FFF7F5] hover:text-[#B86168]">
                  {showPassword ? <EyeOff className="h-[15px] w-[15px]" strokeWidth={1.5} /> : <Eye className="h-[15px] w-[15px]" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* REGISTER NOTE */}

            {mode === "register" && (
              <div className="flex items-start gap-2.5 rounded-[10px] bg-[#FFF8F6] px-3 py-2.5">
                <span className="mt-[2px] flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full bg-[#F1DAD7]">
                  <Check className="h-2.5 w-2.5 text-[#A95B61]" strokeWidth={2} />
                </span>

                <p className="text-[8.5px] leading-5 text-[#8F817C]">تقبل أحرفاً أو أرقاماً أو رموزاً من 6 خانات فأكثر، ولا تُخزن كنص مكشوف. يُفضّل اختيار كلمة يصعب تخمينها.</p>
              </div>
            )}

            {/* SUBMIT */}

            <button type="submit" disabled={isLoading} className="mt-1 flex h-[50px] w-full items-center justify-center rounded-[12px] bg-[#D4777D] px-4 text-[11px] font-semibold text-white transition-colors hover:bg-[#C96F79] active:bg-[#B86168] disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} /> : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}
            </button>
          </form>

          {/* =====================================================
              CHANGE MODE
          ===================================================== */}

          <div className="mt-4 text-center">
            <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")} className="text-[9.5px] text-[#938681] transition-colors hover:text-[#A95B61]">
              {mode === "login" ? (
                <>
                  ليس لديك حساب؟
                  <span className="mr-1 font-semibold text-[#A95B61]">إنشاء حساب</span>
                </>
              ) : (
                <>
                  لديك حساب؟
                  <span className="mr-1 font-semibold text-[#A95B61]">تسجيل الدخول</span>
                </>
              )}
            </button>
          </div>

          {/* =====================================================
              GUEST
          ===================================================== */}

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-[#EDE5E1]" />
            <span className="text-[8px] text-[#B2A7A2]">أو</span>
            <span className="h-px flex-1 bg-[#EDE5E1]" />
          </div>

          <button type="button" onClick={handleGuest} disabled={isGuestLoading || isLoading} className="flex h-[46px] w-full items-center justify-center gap-2 rounded-[11px] border border-[#E6DDD9] bg-white text-[10px] font-medium text-[#655853] transition-colors hover:border-[#D9B5B2] hover:bg-[#FFF8F6] hover:text-[#A95B61] disabled:opacity-50">
            {isGuestLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                جاري الدخول...
              </>
            ) : (
              "متابعة التصفح كضيف"
            )}
          </button>
        </section>

        {/* =====================================================
            FOOT
        ===================================================== */}

        <div className="mt-auto pt-7 text-center md:mt-6">
          <p className="font-serif text-[7px] tracking-[0.25em] text-[#B1A49F]">FLAMINGO PARK · ADEN</p>

          <p className="mt-2 text-[8px] text-[#B7ABA6]">تسوق بأناقة، بسهولة.</p>
        </div>
      </div>

      {/* =====================================================
          REGION PICKER
      ===================================================== */}

      {regionOpen && (
        <div className="fixed inset-0 z-[150]" dir="rtl">
          <button type="button" onClick={() => setRegionOpen(false)} aria-label="إغلاق اختيار المحافظة" className="absolute inset-0 bg-black/25" />

          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[78svh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[22px] bg-[#FFFDFC] shadow-[0_-10px_40px_rgba(54,42,37,0.10)] sm:bottom-6 sm:rounded-[20px]">
            {/* HANDLE */}

            <div className="flex h-6 shrink-0 items-center justify-center sm:hidden">
              <span className="h-1 w-9 rounded-full bg-[#DDD3CE]" />
            </div>

            {/* HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-[#EEE5E1] px-4 pb-4 pt-2 sm:pt-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[#403633]">اختر المحافظة</h2>
                <p className="mt-1 text-[9px] text-[#9B8E89]">حدد موقعك لإكمال إنشاء الحساب</p>
              </div>

              <button type="button" onClick={() => setRegionOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E817B] transition-colors hover:bg-[#FFF6F4] hover:text-[#B86168]">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* SEARCH */}

            <div className="shrink-0 px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} />

                <input value={regionSearch} onChange={(event) => setRegionSearch(event.target.value)} placeholder="ابحث عن المحافظة..." autoFocus className="h-11 w-full rounded-[11px] border border-[#E7DEDA] bg-white pr-10 pl-4 text-[11px] text-[#443936] outline-none placeholder:text-[#B4A9A4] focus:border-[#D5AAA6]" />
              </div>
            </div>

            {/* REGIONS */}

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))]">
              {filteredRegions.length > 0 ? (
                <div className="overflow-hidden rounded-[13px] border border-[#ECE3DF] bg-white">
                  {filteredRegions.map((region, index) => {
                    const selected = formData.region === region;

                    return (
                      <button key={region} type="button" onClick={() => selectRegion(region)} className={`flex h-[47px] w-full items-center justify-between px-4 text-right transition-colors ${index !== filteredRegions.length - 1 ? "border-b border-[#F0E9E6]" : ""} ${selected ? "bg-[#FFF7F5]" : "bg-white hover:bg-[#FCF9F8]"}`}>
                        <span className={`text-[11px] font-medium ${selected ? "text-[#A95B61]" : "text-[#554945]"}`}>{region}</span>

                        {selected && <Check className="h-4 w-4 text-[#D4777D]" strokeWidth={1.8} />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <MapPin className="mx-auto h-5 w-5 text-[#B4A9A4]" strokeWidth={1.5} />

                  <p className="mt-3 text-[10px] text-[#938681]">لم نجد هذه المحافظة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CustomerAuthPage;
