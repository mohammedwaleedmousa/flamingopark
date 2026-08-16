import { AuthApiError, FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { customerPasswordRequirements, isValidCustomerPassword } from "@/lib/customerPassword";
import { normalizeInternationalPhone } from "@/lib/internationalPhone";
import { loadCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeYemenPhone } from "@/lib/yemenPhone";

export type VerificationChannel = "sms" | "whatsapp" | "email";

type RegistrationInput = {
  name: string;
  phone: string;
  email?: string;
  password: string;
  region: string;
  country: string;
  channel: VerificationChannel;
};

export type PendingCustomerRegistration = {
  name: string;
  phone: string;
  email: string;
  password: string;
  region: string;
  country: string;
  channel: VerificationChannel;
};

const INVALID_CREDENTIALS = "بيانات الدخول غير صحيحة.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const readFunctionError = async (error: unknown, fallback: string) => {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.clone().json() as { error?: string };
      if (payload?.error) return payload.error;
    } catch { /* Use the safe fallback below. */ }
  }
  return fallback;
};

const invokeLegacyMigration = async (phone: string, password: string) => {
  const legacyPhone = normalizeYemenPhone(phone);
  if (!legacyPhone) throw new Error(INVALID_CREDENTIALS);

  const { error } = await supabase.functions.invoke("customer-auth-bootstrap", {
    body: { mode: "migrate", phone: legacyPhone, password },
  });
  if (!error) return;
  throw new Error(await readFunctionError(error, "تعذر ترحيل الحساب القديم. حاول مرة أخرى."));
};

const finishSignedInCustomer = async (): Promise<CustomerSession> => {
  const customer = await loadCustomerSession();
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("الحساب غير مرتبط بملف عميل. تواصل مع الدعم.");
  }
  return customer;
};

export const loginCustomer = async (identifier: string, password: string): Promise<CustomerSession> => {
  if (!isValidCustomerPassword(password)) throw new Error(customerPasswordRequirements);

  const trimmed = identifier.trim();
  const email = EMAIL_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null;
  const phone = email ? null : normalizeInternationalPhone(trimmed);
  if (!email && !phone) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا أو رقم هاتف دوليًا يبدأ بعلامة +.");

  const credentials = email ? { email, password } : { phone: phone!, password };
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (!error && data.user) return finishSignedInCustomer();

  if (email || !(error instanceof AuthApiError) || error.code !== "invalid_credentials") {
    throw new Error(INVALID_CREDENTIALS);
  }

  // Legacy bridge is intentionally Yemen-only. New global accounts never use it.
  await invokeLegacyMigration(phone!, password);
  const retry = await supabase.auth.signInWithPassword({ phone: phone!, password });
  if (retry.error || !retry.data.user) throw new Error(INVALID_CREDENTIALS);
  return finishSignedInCustomer();
};

const validateRegistration = (input: RegistrationInput): PendingCustomerRegistration => {
  const name = input.name.trim().replace(/\s+/g, " ");
  const region = input.region.trim().replace(/\s+/g, " ");
  const country = input.country.trim().toUpperCase();
  const phone = normalizeInternationalPhone(input.phone);
  const email = (input.email || "").trim().toLowerCase();

  if (name.length < 2 || name.length > 100) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (!phone) throw new Error("أدخل رقم الهاتف بصيغة دولية صحيحة مثل +967 أو +966 أو +1.");
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("اختر الدولة.");
  if (region.length < 2 || region.length > 100) throw new Error("أدخل المدينة أو المنطقة.");
  if (!isValidCustomerPassword(input.password)) throw new Error(customerPasswordRequirements);
  if (input.channel === "email" && !EMAIL_PATTERN.test(email)) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا لاستلام رمز التحقق.");
  if (email && !EMAIL_PATTERN.test(email)) throw new Error("البريد الإلكتروني غير صحيح.");

  return { name, phone, email, password: input.password, region, country, channel: input.channel };
};

export const registerCustomer = async (input: RegistrationInput): Promise<PendingCustomerRegistration> => {
  const registration = validateRegistration(input);
  const metadata = {
    full_name: registration.name,
    contact_phone: registration.phone,
    contact_email: registration.email || null,
    region: registration.region,
    country: registration.country,
    verification_channel: registration.channel,
  };

  const request = registration.channel === "email"
    ? supabase.auth.signInWithOtp({ email: registration.email, options: { shouldCreateUser: true, data: metadata } })
    : supabase.auth.signInWithOtp({ phone: registration.phone, options: { shouldCreateUser: true, channel: registration.channel, data: metadata } });

  const { error } = await request;
  if (error) throw new Error("تعذر إرسال رمز التحقق. تأكد من البيانات أو جرّب وسيلة أخرى.");
  return registration;
};

export const verifyCustomerRegistration = async (registration: PendingCustomerRegistration, rawToken: string): Promise<CustomerSession> => {
  const token = rawToken.replace(/\D/g, "");
  if (!/^\d{6,10}$/.test(token)) throw new Error("أدخل رمز التحقق بشكل صحيح.");

  const verification = registration.channel === "email"
    ? await supabase.auth.verifyOtp({ email: registration.email, token, type: "email" })
    : await supabase.auth.verifyOtp({ phone: registration.phone, token, type: "sms" });

  if (verification.error || !verification.data.user || !verification.data.session) {
    throw new Error("رمز التحقق غير صحيح أو انتهت صلاحيته.");
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: registration.password,
    data: {
      full_name: registration.name,
      contact_phone: registration.phone,
      contact_email: registration.email || null,
      region: registration.region,
      country: registration.country,
      verification_channel: registration.channel,
    },
  });
  if (passwordError) {
    await supabase.auth.signOut();
    throw new Error("تم التحقق لكن تعذر حفظ كلمة المرور. حاول مرة أخرى.");
  }

  const { error: finalizeError } = await supabase.functions.invoke("customer-registration-finalize", {
    body: {
      name: registration.name,
      phone: registration.phone,
      email: registration.email || null,
      region: registration.region,
      country: registration.country,
      channel: registration.channel,
    },
  });

  if (finalizeError) {
    const message = await readFunctionError(finalizeError, "تعذر إكمال إنشاء الحساب.");
    await supabase.auth.signOut();
    throw new Error(message);
  }

  return finishSignedInCustomer();
};

export const resendCustomerRegistrationOtp = async (registration: PendingCustomerRegistration) => {
  const request = registration.channel === "email"
    ? supabase.auth.resend({ type: "email", email: registration.email })
    : supabase.auth.signInWithOtp({ phone: registration.phone, options: { shouldCreateUser: true, channel: registration.channel } });

  const { error } = await request;
  if (error) throw new Error("تعذر إعادة إرسال الرمز الآن. حاول بعد قليل أو اختر وسيلة أخرى.");
};
