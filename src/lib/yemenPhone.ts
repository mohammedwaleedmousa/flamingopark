const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹";
const LATIN_DIGITS = "01234567890123456789";

const toLatinDigits = (value: string) =>
  value.replace(/[٠-٩۰-۹]/g, (digit) => LATIN_DIGITS[ARABIC_DIGITS.indexOf(digit)] || "");

const stripPhoneFormatting = (value: string) => toLatinDigits(value.trim()).replace(/[\s().-]/g, "");

/** Normalize supported Yemeni mobile formats to E.164 (+9677XXXXXXXX). */
export const normalizeYemenPhone = (raw: string): string | null => {
  const value = stripPhoneFormatting(raw);
  if (!value || !/^\+?\d+$/.test(value)) return null;

  let local = value;
  if (value.startsWith("+967")) local = value.slice(4);
  else if (value.startsWith("00967")) local = value.slice(5);
  else if (value.startsWith("967")) local = value.slice(3);
  else if (/^07\d{8}$/.test(value)) local = value.slice(1);

  return /^7\d{8}$/.test(local) ? `+967${local}` : null;
};

/** Keep only the nine local digits used by the +967 UI field. */
export const toYemenLocalPhone = (raw: string): string => {
  let value = toLatinDigits(raw).replace(/\D/g, "");
  if (value.startsWith("00967")) value = value.slice(5);
  else if (value.startsWith("967")) value = value.slice(3);
  else if (value.startsWith("0")) value = value.slice(1);
  return value.slice(0, 9);
};
