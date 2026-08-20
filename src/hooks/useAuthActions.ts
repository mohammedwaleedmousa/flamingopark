import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { clearCustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";
import { useFavorites } from "@/hooks/useFavorites";

interface LogoutOptions { redirectTo?: string; successTitle?: string; onSuccess?: () => void }

export const useAuthActions = () => {
  const navigate = useNavigate();
  const setCustomer = useStore((state) => state.setCustomer);
  const clearFavorites = useFavorites((state) => state.clearFavorites);

  const logout = async (options: LogoutOptions = {}) => {
    const { redirectTo, successTitle = "تم تسجيل الخروج", onSuccess } = options;
    try {
      // تسجيل الخروج من هذا الجهاز فقط حتى تبقى جلسات الأجهزة الأخرى فعالة.
      await supabase.auth.signOut({ scope: "local" });
      clearCustomerSession();
      clearFavorites();
      setCustomer(null);
      localStorage.removeItem("customer");
      localStorage.removeItem("customer_phone");
      onSuccess?.();
      toast({ title: successTitle });
      if (redirectTo) navigate(redirectTo);
      return true;
    } catch {
      toast({ title: "تعذر تسجيل الخروج", variant: "destructive" });
      return false;
    }
  };

  return { logout };
};
