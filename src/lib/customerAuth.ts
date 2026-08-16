import { AuthApiError, FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { loadCustomerSession, type CustomerSession } from "@/lib/customerSession";
import {
  isValidNumericPin,
  isWeakRegistrationPin,
  normalizeNumericPin,
  normalizeYemenPhone,
} from "@/lib/yemenPhone";

type BootstrapMode = "register" | "migrate";

type RegistrationInput = {
  name: string;
  phone: string;
  pin: string;
  region: string;
};

const INVALID_CREDENTIALS = "رقم الهاتف أو الرمز السري غير صحيح.";

const invokeBootstrap = async (mode: BootstrapMode, input: RegistrationInput) => {
  const { data, error } = await supabase.functions.invoke("customer-auth-bootstrap", {
    body: {
      mode,
      name: mode === "register" ? input.name : undefined,
      phone: input.phone,
      pin: input.pin,
      region: mode === "register" ? input.region : undefined,
    },
  });

  if (!error) return data;

  if (error instanceof FunctionsHttpError) {
    let payload: { error?: string } | null = null;
    try {
      payload = await error.context.clone().json() as { error?: string };
    } catch { /* Fall through to a generic network-safe message. */ }
    if (payload?.error) throw new Error(payload.error);
  }

  throw new Error("تعذر الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.");
};

const signIn = async (phone: string, pin: string): Promise<CustomerSession> => {
  const { data, error } = await supabase.auth.signInWithPassword({ phone, password: pin });
  if (error) throw error;
  if (!data.user) throw new Error(INVALID_CREDENTIALS);

  const customer = await loadCustomerSession();
  if (!customer) {
    await supabase.auth.signOut();
    throw new Error("الحساب غير مرتبط بملف عميل. تواصل مع الدعم.");
  }
  return customer;
};

const validateCredentials = (rawPhone: string, rawPin: string) => {
  const phone = normalizeYemenPhone(rawPhone);
  const pin = normalizeNumericPin(rawPin);
  if (!phone) throw new Error("أدخل رقم جوال يمني صحيح يبدأ بالرقم 7.");
  if (!isValidNumericPin(pin)) throw new Error("الرمز السري يجب أن يتكون من 6 إلى 12 رقماً.");
  return { phone, pin };
};

export const loginCustomer = async (rawPhone: string, rawPin: string): Promise<CustomerSession> => {
  const credentials = validateCredentials(rawPhone, rawPin);

  try {
    return await signIn(credentials.phone, credentials.pin);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.code !== "invalid_credentials") {
      if (error instanceof AuthApiError) throw new Error(INVALID_CREDENTIALS);
      throw error;
    }
  }

  // One-time bridge for existing bcrypt customer accounts. The server verifies
  // the legacy hash before creating a confirmed Supabase phone identity.
  await invokeBootstrap("migrate", { ...credentials, name: "", region: "" });

  try {
    return await signIn(credentials.phone, credentials.pin);
  } catch (error) {
    if (error instanceof AuthApiError) throw new Error(INVALID_CREDENTIALS);
    throw error;
  }
};

export const registerCustomer = async (input: RegistrationInput): Promise<CustomerSession> => {
  const name = input.name.trim().replace(/\s+/g, " ");
  const region = input.region.trim();
  const credentials = validateCredentials(input.phone, input.pin);

  if (name.length < 2 || name.length > 100) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (region.length < 2 || region.length > 80) throw new Error("اختر المحافظة.");
  if (isWeakRegistrationPin(credentials.pin, credentials.phone)) {
    throw new Error("اختر رمزاً سرياً أصعب ولا تستخدم أرقاماً متكررة أو متسلسلة أو جزءاً من رقم هاتفك.");
  }

  await invokeBootstrap("register", { name, region, ...credentials });

  try {
    return await signIn(credentials.phone, credentials.pin);
  } catch (error) {
    if (error instanceof AuthApiError) throw new Error("تم إنشاء الحساب لكن تعذر تسجيل الدخول. حاول مرة أخرى.");
    throw error;
  }
};
