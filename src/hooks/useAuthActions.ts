import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { clearCustomerSession } from "@/lib/customerSession";
import { useStore } from "@/store/useStore";

interface LogoutOptions { redirectTo?: string; successTitle?: string; onSuccess?: () => void }

export const useAuthActions = () => {
  const navigate = useNavigate();
  const setCustomer = useStore((state) => state.setCustomer);

  const logout = async (options: LogoutOptions = {}) => {
    const { redirectTo, successTitle = "تم تسجيل الخروج", onSuccess } = options;
    try {
      await supabase.auth.signOut();
      clearCustomerSession();
      setCustomer(null);
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
