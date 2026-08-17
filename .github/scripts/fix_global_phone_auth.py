from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if text.count(old) != 1:
        raise RuntimeError(f'Expected one match in {path}, got {text.count(old)}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Frontend: global phone normalization + backward-compatible password login.
p = Path('src/pages/CustomerAuthPage.tsx')
text = p.read_text(encoding='utf-8')
text = text.replace('const normalizeYemenPhone = (value: string) => {\n  let digits = arabicDigitsToLatin(value).replace(/\\D/g, "");\n  if (digits.startsWith("00967")) digits = digits.slice(5);\n  else if (digits.startsWith("967")) digits = digits.slice(3);\n  else if (digits.startsWith("0")) digits = digits.slice(1);\n  if (!/^7\\d{8}$/.test(digits)) throw new Error("أدخل رقم جوال يمني صحيح مثل 77xxxxxxx");\n  return `+967${digits}`;\n};', '''const normalizePhone = (value: string) => {
  const latin = arabicDigitsToLatin(value).trim();
  let compact = latin.replace(/[\\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\\D/g, "");
    if (/^0?7\\d{8}$/.test(digits)) {
      if (digits.startsWith("0")) digits = digits.slice(1);
      return `+967${digits}`;
    }
    throw new Error("أدخل رقم الهاتف مع رمز الدولة مثل +966 أو +1 أو +60");
  }
  if (!/^\\+[1-9]\\d{7,14}$/.test(compact)) throw new Error("أدخل رقم هاتف دولي صحيح مع رمز الدولة");
  return compact;
};

const countryFromPhone = (phone: string) => {
  if (phone.startsWith("+967")) return "YE";
  if (phone.startsWith("+966")) return "SA";
  if (phone.startsWith("+60")) return "MY";
  if (phone.startsWith("+1")) return "US";
  return "XX";
};''')
text = text.replace('try { phone = normalizeYemenPhone(formData.phone); } catch (error: any) {', 'try { phone = normalizePhone(formData.phone); } catch (error: any) {')
text = text.replace('const authPassword = await authPasswordFor(phone, password);', '''const authPassword = await authPasswordFor(phone, password);
      const signInCompatible = async () => {
        const candidates = Array.from(new Set([password, authPassword]));
        for (const candidate of candidates) {
          const result = await supabase.auth.signInWithPassword({ phone, password: candidate });
          if (!result.error && result.data.user) return result;
        }
        return null;
      };''', 1)
text = text.replace('const { data, error } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { name, region: selectedRegion, country: "YE" } } });', '''const existing = await signInCompatible();
        if (existing?.data.user) {
          let existingCustomer = await getOwnCustomer(existing.data.user.id);
          if (!existingCustomer) existingCustomer = await finalizeRegistration({ name, phone, region: selectedRegion, country: countryFromPhone(phone), channel: "none", legacyPassword: password });
          persistCustomer(existingCustomer);
          toast({ title: "الحساب موجود بالفعل", description: "تم تسجيل الدخول إلى حسابك الحالي بدلاً من إنشاء حساب مكرر." });
          navigate("/home", { replace: true });
          return;
        }
        await supabase.auth.signOut();
        const country = countryFromPhone(phone);
        const { data, error } = await supabase.auth.signUp({ phone, password: authPassword, options: { data: { name, region: selectedRegion, country } } });''')
text = text.replace('const customerData = await finalizeRegistration({ name, phone, region: selectedRegion, country: "YE", channel: "none" });', 'const customerData = await finalizeRegistration({ name, phone, region: selectedRegion, country: countryFromPhone(phone), channel: "none" });')
text = text.replace('const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ phone, password: authPassword });\n\n      if (!loginError && loginData.user) {', 'const compatibleLogin = await signInCompatible();\n      const loginData = compatibleLogin?.data;\n\n      if (loginData?.user) {')
text = text.replace('customerData = await finalizeRegistration({ name: "عميل فلامنجو", phone, region: "عدن", country: "YE", channel: "none", legacyPassword: password });', 'customerData = await finalizeRegistration({ name: "عميل فلامنجو", phone, region: "غير محدد", country: countryFromPhone(phone), channel: "none", legacyPassword: password });')
text = text.replace('أنشئ حسابك برقم هاتف يمني وكلمة المرور التي تختارها.', 'أنشئ حسابك برقم هاتفك الدولي وكلمة المرور التي تختارها.')
text = text.replace('{mode === "register" && <div><label className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المحافظة</label><button type="button" onClick={() => setRegionOpen(true)} className="relative flex h-[50px] w-full items-center rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-11 text-right"><MapPin className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><span className={`flex-1 text-[12px] ${formData.region ? "text-[#443936]" : "text-[#B8ADA8]"}`}>{formData.region || "اختر المحافظة"}</span><ChevronDown className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" /></button></div>}', '{mode === "register" && <div><label htmlFor="auth-region" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">المدينة / المنطقة</label><div className="relative"><MapPin className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-region" value={formData.region} onChange={(event) => updateField("region", event.target.value)} autoComplete="address-level2" placeholder="مثال: عدن، الرياض، كوالالمبور" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>}')
text = text.replace('placeholder="77xxxxxxx"', 'placeholder="+9665xxxxxxxx أو +1xxxxxxxxxx"')
p.write_text(text, encoding='utf-8')

# Legacy migration: accept any E.164 number, preserving Yemen local shorthand.
p = Path('supabase/functions/legacy-customer-migrate/index.ts')
text = p.read_text(encoding='utf-8')
old = '''const normalizePhone = (value: unknown) => {
  if (typeof value !== "string") return null;
  let digits = value.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/\\D/g, "");
  if (digits.startsWith("00967")) digits = digits.slice(5);
  else if (digits.startsWith("967")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^7\\d{8}$/.test(digits) ? `+967${digits}` : null;
};'''
new = '''const normalizePhone = (value: unknown) => {
  if (typeof value !== "string") return null;
  const latin = value.trim().replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  let compact = latin.replace(/[\\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\\D/g, "");
    if (/^0?7\\d{8}$/.test(digits)) { if (digits.startsWith("0")) digits = digits.slice(1); return `+967${digits}`; }
    return null;
  }
  return /^\\+[1-9]\\d{7,14}$/.test(compact) ? compact : null;
};'''
if old not in text:
    raise RuntimeError('legacy normalizePhone block not found')
p.write_text(text.replace(old, new, 1), encoding='utf-8')
print('global phone auth patch applied')