import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, LayoutTemplate, Save, Store } from "lucide-react";
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
        .upsert({ key: CUSTOMER_EXPERIENCE_SETTING_KEY, value: settings as Json }, { onConflict: "key" });
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
        actions={[{ label: "حفظ التغييرات", icon: Save, onClick: handleSave, disabled: isSaving }]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="size-5 text-primary" /> صفحات العميل</CardTitle>
          <CardDescription>عطّل أي صفحة لإخفائها من الوصول المباشر حتى تعيد تفعيلها.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {customerPageOptions.map((page) => {
            const enabled = settings.pages[page.id];
            return (
              <div key={page.id} className="flex items-center justify-between gap-3 border border-border p-4">
                <div>
                  <p className="font-medium">{page.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">{page.path}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={(checked) => updatePage(page.id, checked)} aria-label={`إظهار صفحة ${page.label}`} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LayoutTemplate className="size-5 text-primary" /> أقسام الرئيسية</CardTitle>
          <CardDescription>تحكّم بترتيب المحتوى المنشور على الصفحة الرئيسية عبر إظهار أو إخفاء كل قسم.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {homeSectionOptions.map((section) => {
            const enabled = settings.homeSections[section.id];
            return (
              <div key={section.id} className="flex items-center justify-between gap-3 border border-border p-4">
                <div className="flex items-center gap-2">
                  {enabled ? <Eye className="size-4 text-primary" /> : <EyeOff className="size-4 text-muted-foreground" />}
                  <p className="font-medium">{section.label}</p>
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