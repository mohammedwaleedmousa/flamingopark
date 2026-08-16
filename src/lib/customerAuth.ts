import { AuthApiError, FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { customerPasswordRequirements, isValidCustomerPassword } from "@/lib/customerPassword";
import { normalizeInternationalPhone } from "@/lib/internationalPhone";
import { loadCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeYemenPhone } from "@/lib/yemenPhone";

type RegistrationInput = {
  name: string;
  phone: string;
  password: string;
  region: string;
  country: string;
};

type NormalizedRegistration = {
  name: string;
  phone: string;
  password: string;
  region: string;
  country: string;
};

const INVALID_CREDENTIALS = "بيانات الدخول غير صحيحة.";

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

  const phone = normalizeInternationalPhone(identifier.trim());
  if (!phone) throw new Error("أدخل رقم الهاتف بصيغة دولية صحيحة مثل +967 أو +966 أو +1.");

  const { data, error } = await supabase.auth.signInWithPassword({ phone, password });
  if (!error && data.user) return finishSignedInCustomer();

  if (!(error instanceof AuthApiError) || error.code !== "invalid_credentials") throw new Error(INVALID_CREDENTIALS);

  // Legacy bridge is intentionally Yemen-only. New global accounts never use it.
  await invokeLegacyMigration(phone, password);
  const retry = await supabase.auth.signInWithPassword({ phone, password });
  if (retry.error || !retry.data.user) throw new Error(INVALID_CREDENTIALS);
  return finishSignedInCustomer();
};

const validateRegistration = (input: RegistrationInput): NormalizedRegistration => {
  const name = input.name.trim().replace(/\s+/g, " ");
  const region = input.region.trim().replace(/\s+/g, " ");
  const country = input.country.trim().toUpperCase();
  const phone = normalizeInternationalPhone(input.phone);

  if (name.length < 2 || name.length > 100) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (!phone) throw new Error("أدخل رقم الهاتف بصيغة دولية صحيحة مثل +967 أو +966 أو +1.");
  if (!/^[A-Z]{2}$/.test(country)) throw new Error("اختر الدولة.");
  if (region.length < 2 || region.length > 100) throw new Error("أدخل المدينة أو المنطقة.");
  if (!isValidCustomerPassword(input.password)) throw new Error(customerPasswordRequirements);

  return { name, phone, password: input.password, region, country };
};

const registrationErrorMessage = (error: AuthApiError) => {
  if (error.code === "user_already_exists" || error.code === "phone_exists") return "رقم الهاتف مستخدم بالفعل. سجّل الدخول بدل إنشاء حساب جديد.";
  if (error.code === "phone_provider_disabled") return "تسجيل الحساب برقم الهاتف غير مفعّل في Supabase. فعّل Phone provider وأبقِ تأكيد الهاتف متوقفًا.";
  if (error.code === "weak_password") return customerPasswordRequirements;
  if (error.code === "signup_disabled") return "إنشاء الحسابات متوقف مؤقتًا.";
  return "تعذر إنشاء الحساب. تأكد من البيانات وحاول مرة أخرى.";
};

export const registerCustomer = async (input: RegistrationInput): Promise<CustomerSession> => {
  const registration = validateRegistration(input);

  const { data, error } = await supabase.auth.signUp({
    phone: registration.phone,
    password: registration.password,
    options: {
      data: {
        full_name: registration.name,
        contact_phone: registration.phone,
        region: registration.region,
        country: registration.country,
        verification_channel: "none",
        contact_verification: "unverified",
      },
    },
  });

  if (error) {
    if (error instanceof AuthApiError) throw new Error(registrationErrorMessage(error));
    throw new Error("تعذر إنشاء الحساب الآن. حاول مرة أخرى.");
  }

  if (!data.user || !data.session) {
    await supabase.auth.signOut();
    throw new Error("تأكيد الهاتف ما زال مفعّلًا في إعدادات Supabase. عطّله من مزود Phone ثم حاول مرة أخرى.");
  }

  const { error: finalizeError } = await supabase.functions.invoke("customer-registration-finalize", {
    body: {
      name: registration.name,
      phone: registration.phone,
      region: registration.region,
      country: registration.country,
      channel: "none",
    },
  });

  if (finalizeError) {
    const message = await readFunctionError(finalizeError, "تعذر إكمال إنشاء الحساب.");
    await supabase.auth.signOut();
    throw new Error(message);
  }

  return finishSignedInCustomer();
};
