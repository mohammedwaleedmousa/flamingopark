import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearCustomerSession, setCustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";

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
      if (!active) return;
      if (error || !data) {
        clearLocalCustomer();
        return;
      }

      const region = data.region || "عدن";
      const country = data.country || "YE";
      setCustomer({ id: data.id, name: data.name, phone: data.phone, region });
      setRegion(region);
      setCustomerSession({ id: data.id, user_id: data.user_id || userId, name: data.name, phone: data.phone, region, country, avatar_url: data.avatar_url || null });
    };

    const restoreSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session?.user) {
        clearLocalCustomer();
        return;
      }
      await hydrateCustomer(data.session.user.id);
    };

    void restoreSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        clearLocalCustomer();
        return;
      }
      const userId = session.user.id;
      window.setTimeout(() => { if (active) void hydrateCustomer(userId); }, 0);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [setCustomer, setRegion]);

  return null;
};

export default CustomerSessionSync;
