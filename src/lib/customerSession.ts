import { supabase } from "@/integrations/supabase/client";

export type CustomerSession = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  region: string;
  country: string;
  avatar_url?: string | null;
  created_at?: string;
};

const CUSTOMER_CACHE_KEY = "customer";

export const getCachedCustomerSession = (): CustomerSession | null => {
  try {
    const raw = localStorage.getItem(CUSTOMER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CustomerSession>;
    if (!parsed.id || !parsed.userId || parsed.id === "guest") return null;
    return parsed as CustomerSession;
  } catch {
    return null;
  }
};

// Kept as a cache-only compatibility alias. Authorization must never rely on it.
export const getCustomerSession = getCachedCustomerSession;

export const setCustomerSession = (customer: CustomerSession) => {
  localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(customer));
  localStorage.removeItem("customer_phone");
};

export const clearCustomerSession = () => {
  localStorage.removeItem(CUSTOMER_CACHE_KEY);
  localStorage.removeItem("customer_phone");
};

export const loadCustomerSession = async (): Promise<CustomerSession | null> => {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    clearCustomerSession();
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("customers")
    .select("id,user_id,name,phone,country,region,avatar_url,created_at")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) {
    clearCustomerSession();
    return null;
  }

  const customer: CustomerSession = {
    id: profile.id,
    userId: authData.user.id,
    name: profile.name,
    phone: profile.phone,
    country: profile.country || "YE",
    region: profile.region || "عدن",
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
  };

  setCustomerSession(customer);
  return customer;
};
