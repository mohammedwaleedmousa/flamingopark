import { useQuery } from "@tanstack/react-query";
import { Truck, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const fallbackMessages = [
  { icon: Truck, text: "شحن مجاني للطلبات فوق 300 ر.س" },
  { icon: Shield, text: "دفع آمن • إرجاع خلال 14 يوم" },
  { icon: Sparkles, text: "خصومات حصرية على المجموعة الجديدة" },
];

const AnnouncementBar = () => {
  const { data } = useQuery({
    queryKey: ["announcement_bar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "announcement_bar")
        .maybeSingle();
      const v = data?.value as any;
      if (typeof v === "string" && v.trim()) return v;
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const messages = data
    ? [{ icon: Sparkles, text: data }]
    : fallbackMessages;

  // duplicate for seamless RTL marquee
  const items = [...messages, ...messages, ...messages];

  return (
    <div className="w-full bg-foreground text-background overflow-hidden" dir="rtl">
      <div className="relative">
        <div className="flex whitespace-nowrap animate-marquee-rtl py-2">
          {items.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2 px-8 text-[11px] tracking-[0.25em] uppercase"
            >
              <m.icon className="w-3.5 h-3.5 opacity-80" />
              {m.text}
              <span className="opacity-30 mx-2">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBar;