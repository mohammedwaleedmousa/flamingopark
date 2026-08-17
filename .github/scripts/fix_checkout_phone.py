from pathlib import Path

p = Path('src/pages/CheckoutPage.tsx')
s = p.read_text(encoding='utf-8')

anchor = 'const orderItemsSchema = z.array(orderItemSchema).min(1).max(100);\n\n'
helper = r'''const arabicDigitsToLatin = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

const normalizeCheckoutPhone = (value: string) => {
  const latin = arabicDigitsToLatin(value).trim();
  let compact = latin.replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  if (!compact.startsWith("+")) {
    let digits = compact.replace(/\D/g, "");
    if (/^0?7\d{8}$/.test(digits)) {
      if (digits.startsWith("0")) digits = digits.slice(1);
      return `+967${digits}`;
    }
    if (/^9677\d{8}$/.test(digits)) return `+${digits}`;
    throw new Error("invalid_checkout_phone");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw new Error("invalid_checkout_phone");
  return compact;
};

const orderCountryFromPhone = (phone: string) => phone.startsWith("+967") ? "YE" : "GLOBAL";

'''
if helper not in s:
    assert anchor in s, 'schema anchor not found'
    s = s.replace(anchor, anchor + helper, 1)

old = '''  const createSecureOrder = async (items: unknown[]) => {
    const { data, error } = await (supabase as any).rpc("create_secure_order_v2", {
      p_customer_name: String(customer?.name || formData.name || "").trim(),
      p_customer_phone: String(customer?.phone || formData.phone || "").trim(),
      p_customer_address: formData.address.trim(),
      p_customer_notes: formData.notes.trim() || null,
      p_country: "YE",
'''
new = '''  const createSecureOrder = async (items: unknown[]) => {
    const normalizedCustomerPhone = normalizeCheckoutPhone(String(customer?.phone || formData.phone || "").trim());
    const orderCountry = orderCountryFromPhone(normalizedCustomerPhone);

    const { data, error } = await (supabase as any).rpc("create_secure_order_v2", {
      p_customer_name: String(customer?.name || formData.name || "").trim(),
      p_customer_phone: normalizedCustomerPhone,
      p_customer_address: formData.address.trim(),
      p_customer_notes: formData.notes.trim() || null,
      p_country: orderCountry,
'''
assert old in s, 'createSecureOrder anchor not found'
s = s.replace(old, new, 1)

old = '''    if (step === 0) {
      const name = String(customer?.name || formData.name || "").trim();
      const phone = String(customer?.phone || formData.phone || "").trim();

      if (isGuestLike && (!name || !phone)) {
        toast({
          title: "الاسم ورقم الهاتف مطلوبان",
          variant: "destructive",
        });

        return false;
      }
    }
'''
new = '''    if (step === 0) {
      const name = String(customer?.name || formData.name || "").trim();
      const phone = String(customer?.phone || formData.phone || "").trim();

      if (isGuestLike && (!name || !phone)) {
        toast({ title: "الاسم ورقم الهاتف مطلوبان", variant: "destructive" });
        return false;
      }

      try {
        normalizeCheckoutPhone(phone);
      } catch {
        toast({ title: "رقم الهاتف غير صحيح", description: "لرقم يمني أدخل 9 أرقام تبدأ بـ7، وللأرقام الدولية استخدم رمز الدولة مثل +966.", variant: "destructive" });
        return false;
      }
    }
'''
assert old in s, 'validate step anchor not found'
s = s.replace(old, new, 1)

old = '      const customerPhone = String(customer?.phone || formData.phone || "").trim();\n'
new = '      const customerPhone = normalizeCheckoutPhone(String(customer?.phone || formData.phone || "").trim());\n'
assert old in s, 'customerPhone anchor not found'
s = s.replace(old, new, 1)

old = '        country: "GLOBAL",\n'
new = '        country: orderCountryFromPhone(customerPhone),\n'
assert old in s, 'orderData country anchor not found'
s = s.replace(old, new, 1)

old = '''      const message = rawMessage.includes("invalid_yemen_phone")
        ? "أدخل رقم جوال يمني صحيح."
'''
new = '''      const message = rawMessage.includes("invalid_checkout_phone") || rawMessage.includes("invalid_yemen_phone")
        ? "أدخل رقم هاتف صحيح. لليمن استخدم 9 أرقام تبدأ بـ7، وللدول الأخرى استخدم رمز الدولة."
'''
assert old in s, 'error map anchor not found'
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('checkout phone normalization applied')
