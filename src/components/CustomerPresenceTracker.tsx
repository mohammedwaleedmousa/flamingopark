import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 45_000;

const pingPresence = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  await (supabase as any).rpc("customer_presence_ping");
};

/**
 * Keeps last_seen_at fresh for authenticated storefront customers.
 * Admins treat a customer as online when the heartbeat is newer than 2 minutes.
 */
const CustomerPresenceTracker = () => {
  useEffect(() => {
    void pingPresence();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void pingPresence();
    }, HEARTBEAT_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") void pingPresence();
    };

    window.addEventListener("focus", pingPresence);
    document.addEventListener("visibilitychange", handleVisibility);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        window.setTimeout(() => void pingPresence(), 0);
      }
    });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", pingPresence);
      document.removeEventListener("visibilitychange", handleVisibility);
      authListener.subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default CustomerPresenceTracker;
