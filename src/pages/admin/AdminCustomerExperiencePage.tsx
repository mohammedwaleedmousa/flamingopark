import { useEffect, useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CUSTOMER_EXPERIENCE_SETTING_KEY, customerPageOptions, defaultCustomerExperienceSettings, homeSectionOptions, parseCustomerExperienceSettings, type CustomerExperienceSettings } from "@/lib/customerExperience";

const AdminCustomerExperiencePage = () => {
  const [settings, setSettings] = useState<CustomerExperienceSettings>(defaultCustomerExperienceSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void (async () => { const { data, error } = await supabase.from("site_settings").select("value").eq("key", CUSTOMER_EXPERIENCE_SETTING_KEY).maybeSingle(); if (!error) setSettings(parseCustomerExperienceSettings(data?.value)); setLoading(false); })(); }, []);
  const save = async () => { setSaving(true); const { error } = await supabase.from("site_settings").upsert({ key: CUSTOMER_EXPERIENCE_SETTING_KEY, value: settings as any }, { onConflict: "key" }); setSaving(false); if (error) toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" }); else toast({ title: "تم حفظ تجربة العميل" }); };
  const togglePage = (id: string, value: boolean) => setSettings((s) => ({ ...s, pages: { ...s.pages, [id]: value } }));
  const toggleSection = (id: string, value: boolean) => setSettings((s) => ({ ...s, homeSections: { ...s.homeSections, [id]: value } }));
  if (loading) return <div className="py-20 text-center text-sm text-muted-foreground">جاري التحميل...</div>;
  return <div className="space-y-4" dir="rtl"><AdminPageHeader category="واجهة المتجر" title="تجربة العميل" description="تحكم مركزي في إظهار صفحات العميل وأقسام الصفحة الرئيسية" actions={[{ label: "حفظ التغييرات", icon: Save, onClick: save, variant: "primary" }]} /><section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#675CBA]" /><h2 className="text-sm font-semibold">صفحات العميل</h2></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{customerPageOptions.map((page) => <div key={page.id} className="flex items-center justify-between rounded-[10px] border border-[#EDF0F3] p-3"><div><p className="text-xs font-semibold">{page.label}</p><p dir="ltr" className="mt-1 text-left text-[9px] text-muted-foreground">{page.path}</p></div><Switch checked={settings.pages[page.id] !== false} onCheckedChange={(v) => togglePage(page.id, v)} /></div>)}</div></section><section className="rounded-[14px] border border-[#E5E9EF] bg-white p-4"><h2 className="mb-4 text-sm font-semibold">أقسام الصفحة الرئيسية</h2><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{homeSectionOptions.map((section) => <div key={section.id} className="flex items-center justify-between rounded-[10px] border border-[#EDF0F3] p-3"><span className="text-xs font-semibold">{section.label}</span><Switch checked={settings.homeSections[section.id] !== false} onCheckedChange={(v) => toggleSection(section.id, v)} /></div>)}</div></section><div className="flex justify-end"><Button disabled={saving} onClick={save}>{saving ? "جارٍ الحفظ..." : "حفظ"}</Button></div></div>;
};

export default AdminCustomerExperiencePage;
