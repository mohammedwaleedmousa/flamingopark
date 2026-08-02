import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CUSTOMER_EXPERIENCE_SETTING_KEY,
  defaultCustomerExperienceSettings,
  parseCustomerExperienceSettings,
} from "@/lib/customerExperience";

export const customerExperienceQueryKey = ["customer-experience"] as const;

export const useCustomerExperience = () =>
  useQuery({
    queryKey: customerExperienceQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", CUSTOMER_EXPERIENCE_SETTING_KEY)
        .maybeSingle();

      if (error) throw error;
      return parseCustomerExperienceSettings(data?.value);
    },
    placeholderData: defaultCustomerExperienceSettings,
  });