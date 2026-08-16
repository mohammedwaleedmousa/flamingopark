import { AuthApiError, FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { customerPasswordRequirements, isValidCustomerPassword } from "@/lib/customerPassword";
import { loadCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeYemenPhone } from "@/lib/yemenPhone";

type RegistrationInput = {
  name: string;
  phone: string;
  password: string;
  region: string;
};

export type PendingCustomerRegistration = {
  name: string;
  phone: string;
  region: string;
};

const INVALID_CREDENTIALS = "رقم الهاتف أو كلمة المرور غير صحيحة.";

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
  const { error } = await supabase.functions.invoke("customer-auth-bootstrap", {
    body: { mode: "migrate", phone, password },
  });
  if (!error) return;
  throw new Error(await readFunctionError(error, "تعذر ترحيل الحساب القديم. حاول مرة أخرى."));
};

const signIn = async (phone: string, password: string): Promise<CustomerSession> => {
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (error) throw error;
  if (!data.user) throw new Error(INVALID_CREDENTIALS);

  const customer = await loadCustomerSession();
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("الحساب غير مرتبط بملف عميل. تواصل مع الدعم.");
  }
  return customer;
};

const validateCredentials = (rawPhone: string, password: string) => {
  const phone = normalizeYemenPhone(rawPhone);
  if (!phone) throw new Error("أدخل رقم جوال يمني صحيح يبدأ بالرقم 7.");
  if (!isValidCustomerPassword(password)) throw new Error(customerPasswordRequirements);
  return { phone, password };
};

const validateRegistration = (input: RegistrationInput) => {
  const name = input.name.trim().replace(/\s+/g, " ");
  const region = input.region.trim();
  const credentials = validateCredentials(input.phone, input.password);

  if (name.length < 2 || name.length > 100) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (region.length < 2 || region.length > 80) throw new Error("اختر المحافظة.");

  return { name, region, ...credentials };
};

export const loginCustomer = async (rawPhone: string, password: string): Promise<CustomerSession> => {
  const credentials = validateCredentials(rawPhone, password);

  try {
    return await signIn(credentials.phone, credentials.password);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== "invalid_credentials") {
      if (error instanceof AuthApiError) throw new Error(INVALID_CREDENTIALS);
      throw error;
    }
  }

  // One-time bridge for the four legacy bcrypt customer accounts. This path is
  // not used for new registrations and cannot create a brand-new customer row.
  await invokeLegacyMigration(credentials.phone, credentials.password);

  try {
    return await signIn(credentials.phone, credentials.password);
  } catch (error) {
    if (error instanceof AuthApiError) throw new Error(INVALID_CREDENTIALS);
    throw error;
  }
};

export const registerCustomer = async (input: RegistrationInput): Promise<PendingCustomerRegistration> => {
  const registration = validateRegistration(input);

  const { data, error } = await supabase.auth.signUp({
    phone: registration.phone,
    password: registration.password,
    options: {
      channel: "sms",
      data: {
        full_name: registration.name,
        region: registration.region,
        country: "YE",
      },
    },
  });

  if (error) {
    if (error instanceof AuthApiError && (error.code === "user_already_exists" || error.code === "phone_exists")) {
      throw new Error("هذا الرقم مرتبط بحساب. جرّب تسجيل الدخول.");
    }
    throw new Error("تعذر إرسال رمز التحقق. تأكد من الرقم وحاول مرة أخرى.");
  }

  // A production phone signup must not return a session until the SMS OTP has
  // been verified. Failing closed here prevents an accidental autoconfirm setup.
  if (data.session) {
    await supabase.auth.signOut();
    throw new Error("تأكيد الهاتف غير مفعّل في إعدادات المصادقة. أوقف التسجيل حتى يتم تفعيله.");
  }

  if (!data.user) throw new Error("تعذر بدء إنشاء الحساب. حاول مرة أخرى.");

  return {
    name: registration.name,
    phone: registration.phone,
    region: registration.region,
  };
};

export const verifyCustomerRegistration = async (registration: PendingCustomerRegistration, rawToken: string): Promise<CustomerSession> => {
  const token = rawToken.replace(/\D/g, "");
  if (!/^\d{6}$/.test(token)) throw new Error("أدخل رمز التحقق المكوّن من 6 أرقام.");

  const { data, error } = await supabase.auth.verifyOtp({
    phone: registration.phone,
    token,
    type: "sms",
  });

  if (error || !data.user || !data.session) {
    throw new Error("رمز التحقق غير صحيح أو انتهت صلاحيته.");
  }

  const { error: finalizeError } = await supabase.functions.invoke("customer-registration-finalize", {
    body: {
      name: registration.name,
      region: registration.region,
    },
  });

  if (finalizeError) {
    const message = await readFunctionError(finalizeError, "تعذر إكمال إنشاء الحساب.");
    await supabase.auth.signOut();
    throw new Error(message);
  }

  const customer = await loadCustomerSession();
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("تم تأكيد الهاتف لكن تعذر تحميل حساب العميل.");
  }

  return customer;
};

export const resendCustomerRegistrationOtp = async (registration: PendingCustomerRegistration) => {
  const { error } = await supabase.auth.resend({
    type: "sms",
    phone: registration.phone,
  });

  if (error) throw new Error("تعذر إعادة إرسال الرمز الآن. حاول بعد قليل.");
};
