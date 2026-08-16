export type CustomerSession = {
  id: string;
  user_id?: string;
  name: string;
  phone: string;
  region?: string;
  country?: string;
  avatar_url?: string | null;
};

export const getCustomerSession = (): CustomerSession | null => {
  try {
    const raw = localStorage.getItem("customer");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || parsed.id === "guest") return null;
    return parsed as CustomerSession;
  } catch {
    return null;
  }
};

export const setCustomerSession = (customer: CustomerSession) => {
  localStorage.setItem("customer", JSON.stringify(customer));
  if (customer.phone) localStorage.setItem("customer_phone", customer.phone);
};

export const clearCustomerSession = () => {
  localStorage.removeItem("customer");
  localStorage.removeItem("customer_phone");
};
