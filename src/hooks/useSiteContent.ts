import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type SiteContentMap = Record<string, string>;

export const useSiteContent = (prefix?: string) => {
  return useQuery({
    queryKey: ["site-content-public", prefix || "all"],
    queryFn: async () => {
      let query = supabase.from("site_content").select("key, content, content_ar");
      if (prefix) {
        query = query.like("key", `${prefix}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).reduce((acc, row) => {
        const value = (row.content_ar || row.content || "").trim();
        acc[row.key] = value;
        return acc;
      }, {} as SiteContentMap);
    },
  });
};

export const getSiteText = (map: SiteContentMap | undefined, key: string, fallback: string) => {
  return map?.[key] || fallback;
};

export const formatSiteText = (template: string, vars: Record<string, string | number>) => {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
};
