import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff, LayoutTemplate, Save, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { toast } from "@/hooks/use-toast";
import { useCustomerExperience, customerExperienceQueryKey } from "@/hooks/useCustomerExperience";
import {
  CUSTOMER_EXPERIENCE_SETTING_KEY,
  CustomerExperienceSettings,
  customerPageOptions,
  homeSectionOptions,
} from "@/lib/customerExperience";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const AdminCustomerExperiencePage = () => {
  const queryClient = useQueryClient();
  const { data: savedSettings, isLoading } = useCustomerExperience();
  const [settings, setSettings] = useState<CustomerExperienceSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  const updatePage = (id: string, enabled: boolean) => {
    setSettings((current) => current && {
      ...current,
      pages: { ...current.pages, [id]: enabled },
    });
  };

  const updateHomeSection = (id: string, enabled: boolean) => {
    setSettings((current) => current && {
      ...current,
      homeSections: { ...current.homeSections, [id]: enabled },
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: CUSTOMER_EXPERIENCE_SETTING_KEY, value: settings as unknown as Json }, { onConflict: "key" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: customerExperienceQueryKey });
      toast({ title: "تم الحفظ", description: "تم تحديث ظهور واجهات العميل." });
    } catch (error) {
      toast({
        title: "تعذر الحفظ",
        description: error instanceof Error ? error.message : "تعذر تحديث إعدادات واجهة العميل.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="min-h-64 animate-pulse rounded-lg bg-muted" />;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6" dir="rtl">
      <AdminPageHeader
        category="واجهة العميل"
        title="التحكم بالمتجر"
        description="إدارة ظهور صفحات العميل وأقسام الصفحة الرئيسية. تبقى المنتجات والعروض والمحتوى قابلة للتحرير من أقسام الإدارة المتخصصة."
        actions={[{ label: "حفظ التغييرات", icon: Save, onClick: handleSave }]}
      />

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2"><Store className="size-5 text-primary" /> صفحات العميل</CardTitle>
          <CardDescription>تحكم في ظهور الصفحات العامة، ثم افتح المعاينة للتحقق من النتيجة كما يراها العميل.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-px bg-border p-0 sm:grid-cols-2 xl:grid-cols-3">
          {customerPageOptions.map((page) => {
            const enabled = settings.pages[page.id];
            return (
              <div key={page.id} className="flex min-h-32 flex-col justify-between gap-4 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{page.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{page.path}</p>
                  </div>
                  {enabled ? <Eye className="size-4 text-primary" /> : <EyeOff className="size-4 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between">
                  <Switch checked={enabled} onCheckedChange={(checked) => updatePage(page.id, checked)} aria-label={`إظهار صفحة ${page.label}`} />
                  <Button asChild size="sm" variant="ghost" className="h-8 gap-1 text-xs"><a href={page.path} target="_blank" rel="noreferrer">معاينة <ExternalLink className="size-3" /></a></Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2"><LayoutTemplate className="size-5 text-primary" /> أقسام الرئيسية</CardTitle>
          <CardDescription>تحكم في ظهور وحدات الصفحة الرئيسية. المحتوى التفصيلي لكل وحدة يُدار من البانرات والحملات والكتالوج.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-px bg-border p-0 sm:grid-cols-2 xl:grid-cols-3">
          {homeSectionOptions.map((section) => {
            const enabled = settings.homeSections[section.id];
            return (
              <div key={section.id} className="flex min-h-24 items-center justify-between gap-3 bg-card p-4">
                <div className="flex items-center gap-2">
                  {enabled ? <Eye className="size-4 text-primary" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  <div><p className="font-medium">{section.label}</p><p className="mt-1 text-xs text-muted-foreground">الصفحة الرئيسية</p></div>
                </div>
                <Switch checked={enabled} onCheckedChange={(checked) => updateHomeSection(section.id, checked)} aria-label={`إظهار قسم ${section.label}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="size-4" /> {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCustomerExperiencePage;