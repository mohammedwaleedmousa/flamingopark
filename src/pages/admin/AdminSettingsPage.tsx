import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, X, FileText } from "lucide-react";

const AdminSettingsPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [storeInfo, setStoreInfo] = useState({
    name: "ERMGOLD",
    email: "info@ermgold.com",
    phone_sa: "",
    phone_ye: "",
  });

  const [whatsapp, setWhatsapp] = useState({
    sa: "",
    ye: "",
  });

  const [bankAccounts, setBankAccounts] = useState({
    sa: [{ bank: "", account: "", name: "ERMGOLD" }],
    ye: [{ bank: "", account: "", name: "ERMGOLD" }],
  });

  const [certPdfUrl, setCertPdfUrl] = useState("");
  const [certImages, setCertImages] = useState<string[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await supabase.from("site_settings").select("*");

      if (data) {
        data.forEach((setting) => {
          // Handle both string JSON and direct JSON values
          let value = setting.value;
          if (typeof value === "string") {
            try {
              value = JSON.parse(value);
            } catch (e) {
              // Keep as string if not valid JSON
            }
          }

          switch (setting.key) {
            case "store_info":
              if (value && typeof value === "object") setStoreInfo(value as any);
              break;
            case "whatsapp_sa":
              setWhatsapp((prev) => ({ ...prev, sa: typeof value === "string" ? value : "" }));
              break;
            case "whatsapp_ye":
              setWhatsapp((prev) => ({ ...prev, ye: typeof value === "string" ? value : "" }));
              break;
            case "bank_accounts_sa":
              if (Array.isArray(value) && value.length > 0) {
                setBankAccounts((prev) => ({ ...prev, sa: value as any }));
              }
              break;
            case "bank_accounts_ye":
              if (Array.isArray(value) && value.length > 0) {
                setBankAccounts((prev) => ({ ...prev, ye: value as any }));
              }
              break;
            case "certification_pdf_url":
              setCertPdfUrl(typeof value === "string" ? value : "");
              break;
          }
        });
      }

      // Fetch certification images
      const { data: images } = await supabase
        .from("certification_images")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (images) {
        setCertImages(images.map((img) => img.image_url));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase.from("site_settings").upsert({ key, value }, { onConflict: "key" });

    if (error) throw error;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting("store_info", storeInfo),
        updateSetting("whatsapp_sa", whatsapp.sa),
        updateSetting("whatsapp_ye", whatsapp.ye),
        updateSetting("bank_accounts_sa", bankAccounts.sa),
        updateSetting("bank_accounts_ye", bankAccounts.ye),
        updateSetting("certification_pdf_url", certPdfUrl),
      ]);

      toast({ title: "تم", description: "تم حفظ الإعدادات بنجاح" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const sanitizeStorageFileName = (name: string) => name.replace(/[^\w.\-]+/g, "_");

  const clearCertPdf = async () => {
    try {
      setCertPdfUrl("");
      await updateSetting("certification_pdf_url", "");
      toast({ title: "تم", description: "تم حذف ملف PDF" });
    } catch (error: any) {
      toast({ title: "خطأ", description: error?.message || "فشل حذف ملف PDF", variant: "destructive" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "image") => {
    const file = e.target.files?.[0];

    // Allow re-uploading the same file
    e.target.value = "";

    if (!file) return;

    const isPdf = type === "pdf";

    if (isPdf && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "خطأ", description: "الرجاء اختيار ملف PDF فقط", variant: "destructive" });
      return;
    }

    if (!isPdf && !file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "الرجاء اختيار صورة فقط", variant: "destructive" });
      return;
    }

    const folder = isPdf ? "certifications" : "certifications/images";
    const fileName = `${folder}/${Date.now()}-${sanitizeStorageFileName(file.name)}`;

    try {
      const { error: uploadError } = await supabase.storage.from("uploads").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || (isPdf ? "application/pdf" : undefined),
      });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("uploads").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      if (isPdf) {
        setCertPdfUrl(publicUrl);
        await updateSetting("certification_pdf_url", publicUrl);
        toast({ title: "تم", description: "تم رفع ملف PDF بنجاح" });
        return;
      }

      // نحتاج شهادة واحدة فقط: استبدال أي صور موجودة
      const { error: deleteError } = await supabase
        .from("certification_images")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase.from("certification_images").insert({
        image_url: publicUrl,
        sort_order: 0,
        is_active: true,
      });

      if (insertError) throw insertError;

      setCertImages([publicUrl]);
      toast({ title: "تم", description: "تم تحديث صورة التوثيق" });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error?.message || "فشل في رفع الملف",
        variant: "destructive",
      });
    }
  };

  const removeCertImage = async () => {
    const imageUrl = certImages[0];
    if (!imageUrl) return;

    const { error } = await supabase.from("certification_images").delete().eq("image_url", imageUrl);

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }

    setCertImages([]);
    toast({ title: "تم", description: "تم حذف صورة التوثيق" });
  };

  const addBankAccount = (country: "sa" | "ye") => {
    setBankAccounts((prev) => ({
      ...prev,
      [country]: [...prev[country], { bank: "", account: "", name: "ERMGOLD" }],
    }));
  };

  const updateBankAccount = (country: "sa" | "ye", index: number, field: string, value: string) => {
    setBankAccounts((prev) => ({
      ...prev,
      [country]: prev[country].map((acc, i) => (i === index ? { ...acc, [field]: value } : acc)),
    }));
  };

  const removeBankAccount = (country: "sa" | "ye", index: number) => {
    setBankAccounts((prev) => ({
      ...prev,
      [country]: prev[country].filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-foreground">الإعدادات</h1>
        <Button onClick={handleSave} disabled={isSaving} className="btn-gold">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التغييرات"}
        </Button>
      </div>

      {/* Store Info */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <h2 className="font-heading text-lg text-foreground">معلومات المتجر</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">اسم المتجر</label>
            <Input value={storeInfo.name} onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">البريد الإلكتروني</label>
            <Input
              value={storeInfo.email}
              onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <h2 className="font-heading text-lg text-foreground">أرقام واتساب</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-2">🇸🇦 السعودية</label>
            <Input
              value={whatsapp.sa}
              onChange={(e) => setWhatsapp({ ...whatsapp, sa: e.target.value })}
              placeholder="+966123456789"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-2">🇾🇪 اليمن</label>
            <Input
              value={whatsapp.ye}
              onChange={(e) => setWhatsapp({ ...whatsapp, ye: e.target.value })}
              placeholder="+967123456789"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Bank Accounts SA */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">🇸🇦 الحسابات البنكية - السعودية</h2>
          <Button variant="outline" size="sm" onClick={() => addBankAccount("sa")}>
            إضافة حساب
          </Button>
        </div>
        {bankAccounts.sa.map((acc, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">البنك</label>
              <Input
                value={acc.bank}
                onChange={(e) => updateBankAccount("sa", index, "bank", e.target.value)}
                placeholder="الراجحي"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">رقم الحساب</label>
              <Input
                value={acc.account}
                onChange={(e) => updateBankAccount("sa", index, "account", e.target.value)}
                placeholder="SA..."
                dir="ltr"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeBankAccount("sa", index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Bank Accounts YE */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-foreground">🇾🇪 الحسابات البنكية - اليمن</h2>
          <Button variant="outline" size="sm" onClick={() => addBankAccount("ye")}>
            إضافة حساب
          </Button>
        </div>
        {bankAccounts.ye.map((acc, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">البنك</label>
              <Input
                value={acc.bank}
                onChange={(e) => updateBankAccount("ye", index, "bank", e.target.value)}
                placeholder="بنك اليمن"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">رقم الحساب</label>
              <Input
                value={acc.account}
                onChange={(e) => updateBankAccount("ye", index, "account", e.target.value)}
                placeholder="YE..."
                dir="ltr"
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeBankAccount("ye", index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div className="bg-card border border-border rounded p-6 space-y-4">
        <h2 className="font-heading text-lg text-foreground">التوثيق والشهادات</h2>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">ملف PDF للتوثيق</label>
          {certPdfUrl ? (
            <div className="flex items-center gap-4 p-4 bg-muted rounded">
              <FileText className="w-8 h-8 text-gold" />
              <span className="flex-1 text-sm truncate">{certPdfUrl}</span>
              <Button variant="ghost" size="icon" onClick={() => setCertPdfUrl("")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="block w-full p-8 border-2 border-dashed border-border rounded text-center cursor-pointer hover:border-gold">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">اختر ملف PDF</span>
              <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, "pdf")} className="hidden" />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">صورة التوثيق</label>
          <div className="flex flex-wrap gap-4">
            {certImages[0] ? (
              <div className="relative w-32 h-32">
                <img src={certImages[0]} alt="صورة التوثيق" className="w-full h-full object-cover rounded" />
                <button
                  onClick={removeCertImage}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  type="button"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="w-32 h-32 border-2 border-dashed border-border rounded flex items-center justify-center cursor-pointer hover:border-gold">
                <Upload className="w-6 h-6 text-muted-foreground" />
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "image")} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
