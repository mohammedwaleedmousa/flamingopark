import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedImage } from "@/lib/prepareImageUpload";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle2, CircleOff, ExternalLink, Image as ImageIcon, LayoutTemplate, Loader2, Save, Store, Tag, Trash2, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandPickerRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  hero_image: string | null;
  is_active: boolean | null;
}

interface BrandPageRow {
  id: string;
  brand_id: string;
  title: string | null;
  description: string | null;
  hero_image: string | null;
  is_active: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type BrandPageForm = {
  title: string;
  description: string;
  hero_image: string;
  is_active: boolean;
};

const emptyForm = (): BrandPageForm => ({
  title: "",
  description: "",
  hero_image: "",
  is_active: true,
});

const AdminBrandPageEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [brandId, setBrandId] = useState(id || "");
  const [form, setForm] = useState<BrandPageForm>(emptyForm());
  const [uploading, setUploading] = useState(false);

  /* =========================================================
     BRANDS
  ========================================================= */

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands-picker"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name,slug,logo_url,hero_image,is_active").order("is_active", { ascending: false }).order("name", { ascending: true });

      if (error) throw error;

      return (data || []) as BrandPickerRow[];
    },
    staleTime: 60_000,
  });

  const selectedBrand = useMemo(() => brands.find((brand) => brand.id === brandId) || null, [brands, brandId]);

  /* =========================================================
     BRAND PAGE
  ========================================================= */

  const { data: brandPage = null, isLoading: pageLoading, isFetching: pageFetching } = useQuery({
    queryKey: ["brand-page", brandId],
    enabled: Boolean(brandId),
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_pages").select("id,brand_id,title,description,hero_image,is_active,created_at,updated_at").eq("brand_id", brandId).maybeSingle();

      if (error) throw error;

      return (data || null) as BrandPageRow | null;
    },
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!brandId || pageFetching) return;

    if (brandPage) {
      setForm({
        title: brandPage.title || "",
        description: brandPage.description || "",
        hero_image: brandPage.hero_image || "",
        is_active: brandPage.is_active ?? true,
      });

      return;
    }

    setForm(emptyForm());
  }, [brandId, brandPage, pageFetching]);

  useEffect(() => {
    if (id) setBrandId(id);
  }, [id]);

  /* =========================================================
     UPLOAD
  ========================================================= */

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      toast({ title: "ملف غير صالح", description: "اختر صورة صحيحة.", variant: "destructive" });
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة جدًا", description: "الحد الأقصى المسموح 12MB.", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const imageUrl = await uploadOptimizedImage(file, "brand-pages", { maxSizeMB: 0.8, maxWidthOrHeight: 1800 });

      setForm((current) => ({
        ...current,
        hero_image: imageUrl,
      }));

      toast({ title: "تم رفع الصورة", description: "تم تحسين الصورة وحفظها بنجاح." });
    } catch (error: any) {
      console.error("Brand page image upload error:", error);

      toast({
        title: "خطأ رفع الصورة",
        description: error?.message || "تعذر رفع الصورة.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) void uploadImage(file);

    event.target.value = "";
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const save = useMutation({
    mutationFn: async () => {
      if (!brandId) throw new Error("اختر الماركة.");

      const payload = {
        brand_id: brandId,
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        hero_image: form.hero_image || null,
        is_active: form.is_active,
      };

      const { data, error } = await supabase.from("brand_pages").upsert(payload, { onConflict: "brand_id" }).select("id,brand_id,title,description,hero_image,is_active,created_at,updated_at").single();

      if (error) throw error;

      return data as BrandPageRow;
    },

    onSuccess: async (savedPage) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["brand-page", brandId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-brand-pages"] }),
        queryClient.invalidateQueries({ queryKey: ["brand-page", selectedBrand?.slug] }),
        queryClient.invalidateQueries({ queryKey: ["brand-page-sections"] }),
      ]);

      queryClient.setQueryData(["brand-page", brandId], savedPage);

      toast({
        title: "تم حفظ صفحة الماركة",
        description: selectedBrand?.name ? `تم تحديث صفحة ${selectedBrand.name}.` : "تم حفظ الصفحة بنجاح.",
      });

      navigate("/admin/brand-pages");
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ الصفحة",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     DERIVED
  ========================================================= */

  const pageExists = Boolean(brandPage?.id);
  const hasHero = Boolean(form.hero_image);
  const hasPublicLink = Boolean(selectedBrand?.slug);
  const readyForStore = Boolean(brandId && hasHero && hasPublicLink && form.is_active);

  if (pageLoading && brandId) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>
          <p className="mt-3 text-[9px] font-medium text-[#969DA7]">جاري تحميل صفحة الماركة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="الماركات" title={pageExists ? "تعديل صفحة الماركة" : "إنشاء صفحة ماركة"} description="تخصيص محتوى وصورة صفحة الماركة التي يراها العميل داخل المتجر" actions={[{ label: "رجوع", icon: ArrowRight, onClick: () => navigate("/admin/brand-pages"), variant: "secondary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <EditorStatCard title="الماركة" value={selectedBrand?.name || "غير محددة"} helper={selectedBrand?.slug ? `/brands/${selectedBrand.slug}` : "اختر ماركة للبدء"} icon={Tag} tone="indigo" />
        <EditorStatCard title="حالة الصفحة" value={form.is_active ? "نشطة" : "معطلة"} helper={form.is_active ? "مسموح بعرضها للعملاء" : "مخفية عن المتجر"} icon={form.is_active ? CheckCircle2 : CircleOff} tone={form.is_active ? "green" : "coral"} />
        <EditorStatCard title="الصورة الرئيسية" value={hasHero ? "موجودة" : "غير موجودة"} helper={hasHero ? "جاهزة للعرض" : "أضف صورة رئيسية"} icon={ImageIcon} tone="blue" />
        <EditorStatCard title="جاهزية الصفحة" value={readyForStore ? "جاهزة" : "تحتاج إكمال"} helper={!hasPublicLink ? "الماركة بدون slug" : !hasHero ? "الصورة الرئيسية ناقصة" : !form.is_active ? "الصفحة معطلة" : "كل المتطلبات مكتملة"} icon={Store} tone={readyForStore ? "green" : "coral"} />
      </section>

      <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-[10px]">
          <FormSection title="اختيار الماركة" icon={Tag}>
            <Field label="الماركة" required>
              <Select value={brandId} onValueChange={setBrandId} disabled={brandsLoading || save.isPending}>
                <SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus:ring-0">
                  <SelectValue placeholder="اختر ماركة" />
                </SelectTrigger>

                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-[7px]">
                        <span>{brand.name}</span>
                        {!brand.is_active && <span className="text-[7px] text-[#C15F56]">معطلة</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedBrand && (
              <div className="flex items-center gap-[9px] rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] p-[9px]">
                <BrandLogo brand={selectedBrand} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-[#454D57]">{selectedBrand.name}</p>
                  <p dir="ltr" className="mt-[3px] truncate text-right text-[7px] text-[#9299A3]">{selectedBrand.slug ? `/brands/${selectedBrand.slug}` : "بدون رابط عام"}</p>
                </div>

                <span className={cn("inline-flex h-[24px] items-center rounded-[7px] border px-[7px] text-[6.5px] font-semibold", selectedBrand.is_active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]")}>{selectedBrand.is_active ? "ماركة نشطة" : "ماركة معطلة"}</span>
              </div>
            )}
          </FormSection>

          <FormSection title="محتوى الصفحة" icon={LayoutTemplate}>
            <Field label="عنوان الصفحة">
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="مثال: Gucci Collection" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
            </Field>

            <Field label="وصف الماركة">
              <Textarea rows={7} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="اكتب وصفًا أنيقًا ومختصرًا يظهر للعميل في صفحة الماركة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" />
            </Field>
          </FormSection>

          <FormSection title="الظهور في المتجر" icon={Store}>
            <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
              <div>
                <p className="text-[9px] font-semibold text-[#555D67]">حالة الصفحة</p>
                <p className="mt-[3px] text-[7px] text-[#9BA2AC]">{form.is_active ? "الصفحة مفعلة ويمكن عرضها للعملاء" : "الصفحة محفوظة ولكنها مخفية عن العملاء"}</p>
              </div>

              <Switch checked={form.is_active} onCheckedChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
            </div>

            {selectedBrand && !selectedBrand.slug && (
              <div className="rounded-[10px] border border-[#EEDFC4] bg-[#FFF9EF] p-[9px]">
                <p className="text-[8px] font-semibold text-[#9A7139]">الماركة لا تحتوي رابطًا عامًا</p>
                <p className="mt-[3px] text-[7px] leading-5 text-[#8A7659]">أضف slug للماركة من صفحة إدارة الماركات حتى يصبح بالإمكان فتح صفحتها للعميل.</p>
              </div>
            )}
          </FormSection>
        </div>

        <div className="space-y-[10px] xl:sticky xl:top-[84px] xl:self-start">
          <FormSection title="الصورة الرئيسية" icon={ImageIcon}>
            {form.hero_image ? (
              <div className="space-y-[7px]">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[11px] border border-[#E3E7EC] bg-[#F5F6F8]">
                  <img src={form.hero_image} alt={form.title || selectedBrand?.name || "Brand hero"} loading="lazy" className="h-full w-full object-cover" />

                  <button type="button" onClick={() => setForm((current) => ({ ...current, hero_image: "" }))} className="absolute left-[7px] top-[7px] flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white/95 text-[#C15F56] shadow-sm" title="حذف الصورة">
                    <Trash2 className="h-[10px] w-[10px]" />
                  </button>
                </div>

                <label className={cn("flex h-[35px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#E2E6EB] bg-white text-[8px] font-semibold text-[#6F7781] hover:bg-[#F8FAFC]", uploading && "pointer-events-none opacity-60")}>
                  {uploading ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Upload className="h-[10px] w-[10px]" />}
                  {uploading ? "جاري رفع الصورة..." : "تغيير الصورة"}
                  <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={handleImageInput} />
                </label>
              </div>
            ) : (
              <label className={cn("flex aspect-[16/10] cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed border-[#D9DEE5] bg-[#FAFBFC] transition-colors hover:border-[#BFB8DE] hover:bg-[#F9F8FF]", uploading && "pointer-events-none opacity-60")}>
                {uploading ? (
                  <>
                    <Loader2 className="h-[19px] w-[19px] animate-spin text-[#675CBA]" />
                    <span className="mt-[7px] text-[7px] text-[#858D97]">جاري رفع الصورة...</span>
                  </>
                ) : (
                  <>
                    <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                      <Upload className="h-[15px] w-[15px]" />
                    </div>
                    <span className="mt-[8px] text-[8px] font-semibold text-[#626A74]">رفع الصورة الرئيسية</span>
                    <span className="mt-[3px] text-[6px] text-[#A0A6AF]">JPG · PNG · WEBP · HEIC</span>
                  </>
                )}

                <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={uploading} onChange={handleImageInput} />
              </label>
            )}
          </FormSection>

          <FormSection title="معاينة الصفحة" icon={ExternalLink}>
            <div className="overflow-hidden rounded-[11px] border border-[#E5E9EF] bg-white">
              <div className="relative aspect-[16/10] bg-[#F4F6F8]">
                {form.hero_image ? (
                  <img src={form.hero_image} alt="" className="h-full w-full object-cover" />
                ) : selectedBrand?.hero_image ? (
                  <img src={selectedBrand.hero_image} alt="" className="h-full w-full object-cover opacity-60" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-[20px] w-[20px] text-[#A0A6AF]" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-black/50 p-[9px]">
                  <p className="truncate text-[9px] font-semibold text-white">{form.title || selectedBrand?.name || "عنوان الصفحة"}</p>
                  <p className="mt-[2px] line-clamp-2 text-[6px] leading-4 text-white/75">{form.description || "سيظهر وصف الماركة هنا."}</p>
                </div>
              </div>
            </div>

            <Button type="button" variant="outline" disabled={!selectedBrand?.slug} onClick={() => selectedBrand?.slug && window.open(`/brands/${selectedBrand.slug}`, "_blank", "noopener,noreferrer")} className="h-[35px] w-full rounded-[8px] border-[#E2E6EB] bg-white text-[8px] font-semibold text-[#6F7781] shadow-none">
              <ExternalLink className="ml-[5px] h-[10px] w-[10px]" />
              فتح الصفحة الحالية
            </Button>
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-[14px] border border-[#E5E9EF] bg-white px-[12px] py-[10px] shadow-[0_-8px_24px_rgba(31,41,55,0.04)]">
        <p className="hidden text-[7px] text-[#9299A3] sm:block">{pageExists ? "سيتم تحديث صفحة الماركة الحالية." : "سيتم إنشاء صفحة جديدة لهذه الماركة عند الحفظ."}</p>

        <div className="mr-auto flex items-center gap-[7px]">
          <Button type="button" variant="outline" disabled={save.isPending || uploading} onClick={() => navigate("/admin/brand-pages")} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[8px] font-semibold text-[#707883] shadow-none">إلغاء</Button>

          <Button type="button" disabled={save.isPending || uploading || !brandId} onClick={() => save.mutate()} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white shadow-none hover:bg-[#594FAB]">
            {save.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : <Save className="ml-[5px] h-[11px] w-[11px]" />}
            حفظ صفحة الماركة
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditorStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" },
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} />
      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div>
      <p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[15px] font-semibold text-[#303741]">{value}</p>
      <p className="mt-[5px] truncate text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const BrandLogo = ({ brand }: { brand: BrandPickerRow }) => {
  return (
    <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] border border-[#E7EAEF] bg-white p-[6px]">
      {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} loading="lazy" className="h-full w-full object-contain" /> : <Tag className="h-[13px] w-[13px] text-[#9AA1AB]" />}
    </div>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return (
    <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
      <div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]">
        <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div>
        <h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3>
      </div>
      <div className="space-y-[9px]">{children}</div>
    </section>
  );
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return (
    <div>
      <Label className="mb-[6px] block text-[8px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>
      {children}
    </div>
  );
};

export default AdminBrandPageEditor;