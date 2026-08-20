import { supabase } from "@/integrations/supabase/client";

type PhoneCredentials = {
  phone: string;
  password: string;
  [key: string]: unknown;
};

const authPasswordFor = async (phone: string, password: string) => {
  if (password.length >= 6) return password;

  const source = new TextEncoder().encode(`flamingopark:v1:${phone}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", source);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const auth = supabase.auth as any;

if (!auth.__flamingoPhonePasswordCompat) {
  const originalSignInWithPassword = supabase.auth.signInWithPassword.bind(supabase.auth);
  let lastAttempt: { key: string; at: number; result: unknown } | null = null;

  auth.signInWithPassword = async (credentials: PhoneCredentials | Record<string, unknown>) => {
    if (
      credentials &&
      typeof (credentials as PhoneCredentials).phone === "string" &&
      typeof (credentials as PhoneCredentials).password === "string"
    ) {
      const phone = (credentials as PhoneCredentials).phone;
      const rawPassword = (credentials as PhoneCredentials).password;
      const password = await authPasswordFor(phone, rawPassword);
      const normalizedCredentials = { ...credentials, password };
      const key = `${phone}:${password}`;

      if (lastAttempt?.key === key && Date.now() - lastAttempt.at < 1500) {
        return lastAttempt.result;
      }

      const result = await originalSignInWithPassword(normalizedCredentials as any);
      lastAttempt = { key, at: Date.now(), result };
      return result;
    }

    return originalSignInWithPassword(credentials as any);
  };

  auth.__flamingoPhonePasswordCompat = true;
}
