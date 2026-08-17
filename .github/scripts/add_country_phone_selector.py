from pathlib import Path

p = Path('src/pages/CustomerAuthPage.tsx')
text = p.read_text(encoding='utf-8')

anchor = 'const REGIONS = ["عدن", "صنعاء", "تعز", "حضرموت", "إب", "الحديدة", "لحج", "أبين", "شبوة", "مأرب", "ذمار", "البيضاء", "الضالع", "صعدة", "عمران", "ريمة", "المحويت", "الجوف"];\n'
insert = '''const REGIONS = ["عدن", "صنعاء", "تعز", "حضرموت", "إب", "الحديدة", "لحج", "أبين", "شبوة", "مأرب", "ذمار", "البيضاء", "الضالع", "صعدة", "عمران", "ريمة", "المحويت", "الجوف"];

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
'''
if anchor not in text:
    raise RuntimeError('REGIONS anchor not found')
text = text.replace(anchor, insert, 1)

old_state = '  const [formData, setFormData] = useState({ name: "", phone: "+967", password: "", region: "عدن" });\n'
new_state = '''  const [phoneCountry, setPhoneCountry] = useState("YE");
  const [formData, setFormData] = useState({ name: "", phone: "", password: "", region: "عدن" });
  const selectedPhoneCountry = PHONE_COUNTRIES.find((country) => country.iso === phoneCountry) || PHONE_COUNTRIES[0];
'''
if old_state not in text:
    raise RuntimeError('form state not found')
text = text.replace(old_state, new_state, 1)

old_phone = '    let phone = "";\n    try { phone = normalizePhone(formData.phone); } catch (error: any) {'
new_phone = '''    let phone = "";
    try {
      const rawPhone = formData.phone.trim();
      const composedPhone = rawPhone.startsWith("+") || rawPhone.startsWith("00") || phoneCountry === "OTHER" ? rawPhone : `${selectedPhoneCountry.dial}${arabicDigitsToLatin(rawPhone).replace(/\\D/g, "").replace(/^0+/, "")}`;
      phone = normalizePhone(composedPhone);
    } catch (error: any) {'''
if old_phone not in text:
    raise RuntimeError('phone normalize block not found')
text = text.replace(old_phone, new_phone, 1)

text = text.replace('country: countryFromPhone(phone)', 'country: phoneCountry === "OTHER" ? countryFromPhone(phone) : phoneCountry')
text = text.replace('const country = countryFromPhone(phone);', 'const country = phoneCountry === "OTHER" ? countryFromPhone(phone) : phoneCountry;')

old_ui = '''            <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">رقم الهاتف</label><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+9677xxxxxxxx" dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div>'''
new_ui = '''            <div><label htmlFor="auth-phone" className="mb-1.5 block px-1 text-[9px] font-medium text-[#746761]">الدولة ورقم الهاتف</label><div className="grid grid-cols-[145px_1fr] gap-2" dir="ltr"><select aria-label="الدولة" value={phoneCountry} onChange={(event) => { const next = event.target.value; setPhoneCountry(next); setFormData((previous) => ({ ...previous, region: next === "YE" && !previous.region ? "عدن" : next !== "YE" && previous.region === "عدن" ? "" : previous.region })); }} className="h-[50px] rounded-[12px] border border-[#E8DEDA] bg-white px-2 text-[11px] text-[#443936] outline-none focus:border-[#D7AAA7]" dir="rtl">{PHONE_COUNTRIES.map((country) => <option key={country.iso} value={country.iso}>{country.flag} {country.name}{country.dial ? ` ${country.dial}` : ""}</option>)}</select><div className="relative"><Phone className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A99D98]" strokeWidth={1.5} /><input id="auth-phone" type="tel" inputMode="tel" autoComplete="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder={phoneCountry === "OTHER" ? "+رمز الدولة والرقم" : phoneCountry === "YE" ? "77xxxxxxx" : "رقم الهاتف"} dir="ltr" className="h-[50px] w-full rounded-[12px] border border-[#E8DEDA] bg-white pr-11 pl-4 text-left text-[12px] text-[#443936] outline-none focus:border-[#D7AAA7]" /></div></div><p className="mt-1.5 px-1 text-[8px] leading-4 text-[#A19590]">اليمن محددة افتراضيًا. غيّر الدولة فقط إذا كان رقمك من خارج اليمن.</p></div>'''
if old_ui not in text:
    raise RuntimeError('phone UI block not found')
text = text.replace(old_ui, new_ui, 1)

p.write_text(text, encoding='utf-8')
print('country selector patch applied')
