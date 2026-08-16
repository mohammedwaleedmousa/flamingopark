import { AuthApiError, FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { customerPasswordRequirements, isValidCustomerPassword } from "@/lib/customerPassword";
import { loadCustomerSession, type CustomerSession } from "@/lib/customerSession";
import { normalizeYemenPhone } from "@/lib/yemenPhone";

type BootstrapMode = "register" | "migrate";

type RegistrationInput = {
  name: string;
  phone: string;
  password: string;
  region: string;
};

const INVALID_CREDENTIALS = "رقم الهاتف أو كلمة المرور غير صحيحة.";

const invokeBootstrap = async (mode: BootstrapMode, input: RegistrationInput) => {
  const { data, error } = await supabase.functions.invoke("customer-auth-bootstrap", {
    body: {
      mode,
      name: mode === "register" ? input.name : undefined,
      phone: input.phone,
      password: input.password,
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

  // One-time bridge for existing bcrypt customer accounts. The server verifies
  // the legacy hash before creating a confirmed Supabase phone identity.
  await invokeBootstrap("migrate", { ...credentials, name: "", region: "" });

  try {
    return await signIn(credentials.phone, credentials.password);
  } catch (error) {
    if (error instanceof AuthApiError) throw new Error(INVALID_CREDENTIALS);
    throw error;
  }
};

export const registerCustomer = async (input: RegistrationInput): Promise<CustomerSession> => {
  const name = input.name.trim().replace(/\s+/g, " ");
  const region = input.region.trim();
  const credentials = validateCredentials(input.phone, input.password);

  if (name.length < 2 || name.length > 100) throw new Error("أدخل الاسم الكامل بشكل صحيح.");
  if (region.length < 2 || region.length > 80) throw new Error("اختر المحافظة.");

  await invokeBootstrap("register", { name, region, ...credentials });

  try {
    return await signIn(credentials.phone, credentials.password);
  } catch (error) {
    if (error instanceof AuthApiError) throw new Error("تم إنشاء الحساب لكن تعذر تسجيل الدخول. حاول مرة أخرى.");
    throw error;
  }
};
