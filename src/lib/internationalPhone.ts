const toLatinDigits = (value: string) => value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const normalizeInternationalPhone = (raw: string) => {
  const value = toLatinDigits(raw.trim()).replace(/[\s().-]/g, "");
  const normalized = value.startsWith("00") ? `+${value.slice(2)}` : value;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
};

export const isInternationalPhone = (raw: string) => Boolean(normalizeInternationalPhone(raw));
