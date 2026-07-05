import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LogoutOptions {
  redirectTo?: string;
  successTitle?: string;
  onSuccess?: () => void;
}

export const useAuthActions = () => {
  const navigate = useNavigate();

  const logout = async (options: LogoutOptions = {}) => {
    const {
      redirectTo,
      successTitle = "تم تسجيل الخروج",
      onSuccess,
    } = options;

    try {
      await supabase.auth.signOut();
      onSuccess?.();
      toast({ title: successTitle });
      if (redirectTo) navigate(redirectTo);
      return true;
    } catch (error) {
      toast({ title: "تعذر تسجيل الخروج", variant: "destructive" });
      return false;
    }
  };

  return { logout };
};
