import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { clearCustomerSession, setCustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";

const PRESENCE_HEARTBEAT_MS = 45_000;

const CustomerSessionSync = () => {
  const setCustomer = useStore((state) => state.setCustomer);
  const setRegion = useStore((state) => state.setRegion);

  useEffect(() => {
    let active = true;
    let heartbeat: number | null = null;

    const pingPresence = async () => {
      if (!active || document.visibilityState === "hidden") return;
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return;
      await (supabase as any).rpc("customer_presence_ping");
    };

    const startPresence = () => {
      void pingPresence();
      if (heartbeat !== null) window.clearInterval(heartbeat);
      heartbeat = window.setInterval(() => void pingPresence(), PRESENCE_HEARTBEAT_MS);
    };

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
      startPresence();
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

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void pingPresence();
    };

    void restoreSession();
    window.addEventListener("focus", pingPresence);
    document.addEventListener("visibilitychange", handleVisibility);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        if (heartbeat !== null) window.clearInterval(heartbeat);
        heartbeat = null;
        clearLocalCustomer();
        return;
      }
      const userId = session.user.id;
      window.setTimeout(() => { if (active) void hydrateCustomer(userId); }, 0);
    });

    return () => {
      active = false;
      if (heartbeat !== null) window.clearInterval(heartbeat);
      window.removeEventListener("focus", pingPresence);
      document.removeEventListener("visibilitychange", handleVisibility);
      authListener.subscription.unsubscribe();
    };
  }, [setCustomer, setRegion]);

  return null;
};

export default CustomerSessionSync;
