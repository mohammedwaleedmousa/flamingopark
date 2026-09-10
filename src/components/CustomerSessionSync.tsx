import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearCustomerSession, setCustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";

const POST_AUTH_REDIRECT_KEY = "flamingo-post-auth-redirect";

const safePostAuthPath = (value: string | null) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

const CustomerSessionSync = () => {
  const setCustomer = useStore((state) => state.setCustomer);
  const setRegion = useStore((state) => state.setRegion);

  useEffect(() => {
    let active = true;

    const clearLocalCustomer = () => {
      if (!active) return;
      clearCustomerSession();
      setCustomer(null);
    };

    const hydrateCustomer = async (userId: string) => {
      const { data, error } = await (supabase as any).from("customers").select("id,user_id,name,phone,country,region,avatar_url").eq("user_id", userId).maybeSingle();
      if (!active) return false;
      if (error || !data) return false;

      const region = data.region || "عدن";
      const country = data.country || "YE";
      setCustomer({ id: data.id, name: data.name, phone: data.phone, region });
      setRegion(region);
      setCustomerSession({ id: data.id, user_id: data.user_id || userId, name: data.name, phone: data.phone, region, country, avatar_url: data.avatar_url || null });
      return true;
    };

    const continuePendingCheckout = async (userId: string) => {
      const target = safePostAuthPath(window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY));
      if (!target) return;

      for (let attempt = 0; attempt < 12 && active; attempt += 1) {
        const hydrated = await hydrateCustomer(userId);
        if (hydrated) {
          window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
          window.location.replace(target);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    };

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session?.user) {
        clearLocalCustomer();
        return;
      }

      const hydrated = await hydrateCustomer(data.session.user.id);
      if (!hydrated && active) clearLocalCustomer();
      if (active) void continuePendingCheckout(data.session.user.id);
    };

    void restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        clearLocalCustomer();
        return;
      }
      const userId = session.user.id;
      window.setTimeout(() => {
        if (!active) return;
        void hydrateCustomer(userId);
        void continuePendingCheckout(userId);
      }, 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [setCustomer, setRegion]);

  return null;
};

export default CustomerSessionSync;
