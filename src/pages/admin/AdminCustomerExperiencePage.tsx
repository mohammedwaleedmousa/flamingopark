import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LayoutGrid, Loader2, MonitorSmartphone, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CUSTOMER_EXPERIENCE_SETTING_KEY, customerPageOptions, defaultCustomerExperienceSettings, homeSectionOptions, parseCustomerExperienceSettings, type CustomerExperienceSettings } from "@/lib/customerExperience";

const AdminCustomerExperiencePage = () => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CustomerExperienceSettings | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-customer-experience"],
    queryFn: async () => {
      const { data: row, error } = await supabase.from("site_settings").select("value").eq("key", CUSTOMER_EXPERIENCE_SETTING_KEY).maybeSingle();
      if (error) throw error;
      return parseCustomerExperienceSettings(row?.value);
    },
  });

  const settings = draft || data || defaultCustomerExperienceSettings;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert({ key: CUSTOMER_EXPERIENCE_SETTING_KEY, value: settings as any }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-customer-experience"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-experience"] }),
      ]);
      setDraft(null);
      toast({ title: "تم الحفظ", description: "تم تحديث تجربة العميل والصفحة الرئيسية." });
    },
    onError: (error: any) => toast({ title: "تعذر الحفظ", description: error?.message || "حدث خطأ.", variant: "destructive" }),
  });

  const togglePage = (id: string, enabled: boolean) => setDraft((current) => ({ ...(current || settings), pages: { ...(current || settings).pages, [id]: enabled } }));
  const toggleSection = (id: string, enabled: boolean) => setDraft((current) => ({ ...(current || settings), homeSections: { ...(current || settings).homeSections, [id]: enabled } }));

  if (isLoading) return <div className="flex min-h-[360px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#675CBA]" /></div>;

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="واجهة المتجر" title="تجربة العميل" description="تحكم في الصفحات والأقسام التي يمكن للعميل رؤيتها" actions={[{ label: saveMutation.isPending ? "جاري الحفظ..." : "حفظ التغييرات", icon: Save, onClick: () => saveMutation.mutate(), variant: "primary" }]} />

      <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#F1EFFF] text-[#675CBA]"><MonitorSmartphone className="h-4 w-4" /></span><div><h2 className="text-[13px] font-semibold text-[#414953]">صفحات العميل</h2><p className="mt-1 text-[8px] text-[#9299A3]">تعطيل الصفحة يمنع الوصول إليها من الواجهة.</p></div></div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {customerPageOptions.map((page) => {
            const enabled = settings.pages[page.id] !== false;
            return <div key={page.id} className="flex items-center justify-between rounded-[11px] border border-[#E8EBEF] bg-[#FAFBFC] px-3 py-3"><div className="min-w-0"><p className="text-[10px] font-semibold text-[#4A525C]">{page.label}</p><p className="mt-1 truncate text-[7px] text-[#9AA1AA]" dir="ltr">{page.path}</p></div><div className="flex items-center gap-2"><span className={enabled ? "text-[#5A8A68]" : "text-[#A1A7AE]"}>{enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</span><Switch checked={enabled} onCheckedChange={(checked) => togglePage(page.id, checked)} /></div></div>;
          })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#FFF1F4] text-[#B86168]"><LayoutGrid className="h-4 w-4" /></span><div><h2 className="text-[13px] font-semibold text-[#414953]">أقسام الصفحة الرئيسية</h2><p className="mt-1 text-[8px] text-[#9299A3]">هذه القائمة تطابق الأقسام التي تعرضها الصفحة الرئيسية فعليًا.</p></div></div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {homeSectionOptions.map((section) => {
            const enabled = settings.homeSections[section.id] !== false;
            return <div key={section.id} className="flex items-center justify-between rounded-[11px] border border-[#E8EBEF] bg-[#FAFBFC] px-3 py-3"><span className="text-[9.5px] font-semibold text-[#505863]">{section.label}</span><Switch checked={enabled} onCheckedChange={(checked) => toggleSection(section.id, checked)} /></div>;
          })}
        </div>
      </section>

      <div className="flex justify-end"><Button type="button" disabled={saveMutation.isPending || !draft} onClick={() => saveMutation.mutate()} className="gap-2"><Save className="h-4 w-4" />حفظ التغييرات</Button></div>
    </div>
  );
};

export default AdminCustomerExperiencePage;
