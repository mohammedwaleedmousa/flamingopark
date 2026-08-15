import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedImage } from "@/lib/prepareImageUpload";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, GripVertical, Image as ImageIcon, LayoutTemplate, Link2, Loader2, Move, Pencil, Plus, Search, Trash2, Upload, X, ZoomIn, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string | null;
  subtitle_ar: string | null;
  image_url: string;
  cta_text: string | null;
  cta_text_ar: string | null;
  cta_link: string | null;
  countries: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
  image_zoom: number | null;
  image_position_x: number | null;
  image_position_y: number | null;
  page_slug: string | null;
  page_title_ar: string | null;
  page_content_ar: string | null;
  page_content?: string | null;
  created_at?: string;
}

type BannerForm = {
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  image_url: string;
  cta_text: string;
  cta_text_ar: string;
  cta_link: string;
  countries: string[];
  is_active: boolean;
  sort_order: number;
  image_zoom: number;
  image_position_x: number;
  image_position_y: number;
  page_slug: string;
  page_title_ar: string;
  page_content_ar: string;
};

type StatusFilter = "all" | "active" | "inactive";

const SINGLE_COUNTRY = "GLOBAL";

const emptyForm = (sortOrder = 0): BannerForm => ({
  title: "",
  title_ar: "",
  subtitle: "",
  subtitle_ar: "",
  image_url: "",
  cta_text: "",
  cta_text_ar: "",
  cta_link: "/products",
  countries: [SINGLE_COUNTRY],
  is_active: true,
  sort_order: sortOrder,
  image_zoom: 1,
  image_position_x: 50,
  image_position_y: 50,
  page_slug: "",
  page_title_ar: "",
  page_content_ar: "",
});

const normalizePageSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const AdminBannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [movingBannerId, setMovingBannerId] = useState<string | null>(null);
  const [togglingBannerId, setTogglingBannerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formData, setFormData] = useState<BannerForm>(emptyForm());

  useEffect(() => {
    void fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setIsLoading(true);

    const { data, error } = await supabase.from("banners").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: true });

    if (error) {
      toast({ title: "خطأ", description: "فشل في تحميل البانرات", variant: "destructive" });
    } else {
      setBanners((data || []) as Banner[]);
    }

    setIsLoading(false);
  };

  const stats = useMemo(() => {
    const active = banners.filter((banner) => banner.is_active).length;
    const withPage = banners.filter((banner) => Boolean(banner.page_slug)).length;

    return {
      total: banners.length,
      active,
      inactive: banners.length - active,
      withPage,
    };
  }, [banners]);

  const filteredBanners = useMemo(() => {
    const query = search.trim().toLowerCase();

    return banners.filter((banner) => {
      const matchesSearch =
        !query ||
        banner.title_ar.toLowerCase().includes(query) ||
        banner.title.toLowerCase().includes(query) ||
        String(banner.subtitle_ar || "").toLowerCase().includes(query) ||
        String(banner.page_slug || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Boolean(banner.is_active)) ||
        (statusFilter === "inactive" && !banner.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [banners, search, statusFilter]);

  const resetForm = () => {
    setFormData(emptyForm(banners.length));
    setEditingBanner(null);
  };

  const closeDialog = () => {
    if (isSaving || isUploading) return;
    setIsDialogOpen(false);
    resetForm();
  };

  const openDialog = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || "",
        title_ar: banner.title_ar || "",
        subtitle: banner.subtitle || "",
        subtitle_ar: banner.subtitle_ar || "",
        image_url: banner.image_url || "",
        cta_text: banner.cta_text || "",
        cta_text_ar: banner.cta_text_ar || "",
        cta_link: banner.cta_link || "/products",
        countries: banner.countries || [SINGLE_COUNTRY],
        is_active: banner.is_active ?? true,
        sort_order: banner.sort_order ?? 0,
        image_zoom: Number(banner.image_zoom ?? 1),
        image_position_x: Number(banner.image_position_x ?? 50),
        image_position_y: Number(banner.image_position_y ?? 50),
        page_slug: banner.page_slug || "",
        page_title_ar: banner.page_title_ar || "",
        page_content_ar: banner.page_content_ar || "",
      });
    } else {
      resetForm();
    }

    setIsDialogOpen(true);
  };

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) {
      toast({ title: "ملف غير صالح", description: "يرجى اختيار صورة صحيحة.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "الصورة كبيرة", description: "الحد الأقصى للصورة 10MB.", variant: "destructive" });
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadOptimizedImage(file, "banners", { maxSizeMB: 0.8, maxWidthOrHeight: 1600 });

      setFormData((current) => ({
        ...current,
        image_url: imageUrl,
        image_zoom: 1,
        image_position_x: 50,
        image_position_y: 50,
      }));

      toast({ title: "تم رفع الصورة", description: "تم تحسين الصورة وحفظها بنجاح." });
    } catch (error: any) {
      console.error("Banner upload error:", error);
      toast({ title: "فشل رفع الصورة", description: error?.message || "حدث خطأ أثناء رفع الصورة.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleSubmit = async () => {
    const titleAr = formData.title_ar.trim();
    const imageUrl = formData.image_url.trim();
    const pageSlug = normalizePageSlug(formData.page_slug);

    if (!titleAr || !imageUrl) {
      toast({ title: "الحقول المطلوبة ناقصة", description: "أدخل العنوان العربي وصورة البانر.", variant: "destructive" });
      return;
    }

    if (pageSlug) {
      let duplicateQuery = supabase.from("banners").select("id").eq("page_slug", pageSlug).limit(1);

      if (editingBanner) duplicateQuery = duplicateQuery.neq("id", editingBanner.id);

      const { data: duplicate, error: duplicateError } = await duplicateQuery;

      if (duplicateError) {
        toast({ title: "تعذر التحقق من الرابط", description: duplicateError.message, variant: "destructive" });
        return;
      }

      if ((duplicate || []).length > 0) {
        toast({ title: "رابط الصفحة مستخدم", description: "اختر رابطًا مختلفًا لصفحة البانر.", variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);

    try {
      const payload = {
        title: formData.title.trim() || titleAr,
        title_ar: titleAr,
        subtitle: formData.subtitle.trim() || null,
        subtitle_ar: formData.subtitle_ar.trim() || null,
        image_url: imageUrl,
        cta_text: formData.cta_text.trim() || null,
        cta_text_ar: formData.cta_text_ar.trim() || null,
        cta_link: formData.cta_link.trim() || null,
        countries: formData.countries,
        is_active: formData.is_active,
        sort_order: Number(formData.sort_order || 0),
        image_zoom: Number(formData.image_zoom || 1),
        image_position_x: Number(formData.image_position_x ?? 50),
        image_position_y: Number(formData.image_position_y ?? 50),
        page_slug: pageSlug || null,
        page_title_ar: formData.page_title_ar.trim() || null,
        page_content_ar: formData.page_content_ar.trim() || null,
      };

      if (editingBanner) {
        const { error } = await supabase.from("banners").update(payload).eq("id", editingBanner.id);
        if (error) throw error;

        toast({ title: "تم تحديث البانر", description: "تم حفظ جميع التعديلات." });
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;

        toast({ title: "تم إضافة البانر", description: "أصبح البانر جاهزًا داخل إدارة الواجهة." });
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchBanners();
    } catch (error: any) {
      toast({ title: "تعذر حفظ البانر", description: error?.message || "حدث خطأ أثناء الحفظ.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBanner = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    setDeleteTarget(null);

    const { error } = await supabase.from("banners").delete().eq("id", target.id);

    if (error) {
      toast({ title: "تعذر حذف البانر", description: error.message || "فشل حذف البانر.", variant: "destructive" });
      return;
    }

    setBanners((current) => current.filter((banner) => banner.id !== target.id));
    toast({ title: "تم حذف البانر" });
  };

  const toggleActive = async (banner: Banner, active: boolean) => {
    setTogglingBannerId(banner.id);

    setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, is_active: active } : item));

    const { error } = await supabase.from("banners").update({ is_active: active }).eq("id", banner.id);

    if (error) {
      setBanners((current) => current.map((item) => item.id === banner.id ? { ...item, is_active: banner.is_active } : item));
      toast({ title: "تعذر تحديث الحالة", description: error.message, variant: "destructive" });
    }

    setTogglingBannerId(null);
  };

  const moveBanner = async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    const previous = [...banners];
    const reordered = [...banners];
    const currentBanner = reordered[index];
    const targetBanner = reordered[newIndex];

    reordered[index] = targetBanner;
    reordered[newIndex] = currentBanner;

    const normalized = reordered.map((banner, itemIndex) => ({
      ...banner,
      sort_order: itemIndex,
    }));

    setBanners(normalized);
    setMovingBannerId(currentBanner.id);

    try {
      const updates = normalized.map((banner) => supabase.from("banners").update({ sort_order: banner.sort_order }).eq("id", banner.id));
      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);

      if (failed?.error) throw failed.error;

      toast({ title: "تم تحديث الترتيب" });
    } catch (error: any) {
      setBanners(previous);
      toast({ title: "تعذر تحديث الترتيب", description: error?.message || "حدث خطأ أثناء ترتيب البانرات.", variant: "destructive" });
    } finally {
      setMovingBannerId(null);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="واجهة المتجر" title="إدارة البانرات" description={`${stats.total.toLocaleString("ar-EG")} بانر داخل واجهة Flamingo Park`} actions={[{ label: "إضافة بانر", icon: Plus, onClick: () => openDialog(), variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <BannerStatCard title="إجمالي البانرات" value={stats.total} helper="جميع البانرات المسجلة" icon={LayoutTemplate} tone="indigo" />
        <BannerStatCard title="البانرات النشطة" value={stats.active} helper="ظاهرة حاليًا للعملاء" icon={CheckCircle2} tone="green" />
        <BannerStatCard title="بانرات معطلة" value={stats.inactive} helper="مخفية عن واجهة المتجر" icon={ImageIcon} tone="coral" />
        <BannerStatCard title="صفحات خاصة" value={stats.withPage} helper="مرتبطة بصفحات مخصصة" icon={Link2} tone="blue" />
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[8px] text-[#9BA2AC]">ابحث بالعنوان أو رابط الصفحة الخاصة</p>
          </div>

          {(search || statusFilter !== "all") && (
            <button type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[8px] text-[8px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_180px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث عن بانر..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="h-[40px] rounded-[9px] border border-[#E3E7EC] bg-[#F8FAFC] px-[10px] text-[9px] text-[#5C6470] outline-none">
            <option value="all">كل الحالات</option>
            <option value="active">نشطة</option>
            <option value="inactive">معطلة</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">قائمة البانرات</h2>
            <p className="mt-[3px] text-[8px] text-[#9CA3AC]">{filteredBanners.length.toLocaleString("ar-EG")} بانر ظاهر في القائمة</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[250px] items-center justify-center">
            <Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" />
          </div>
        ) : filteredBanners.length === 0 ? (
          <EmptyBanners />
        ) : (
          <div className="divide-y divide-[#F0F2F5]">
            {filteredBanners.map((banner) => {
              const originalIndex = banners.findIndex((item) => item.id === banner.id);
              const isMoving = movingBannerId === banner.id;

              return (
                <article key={banner.id} className="group grid grid-cols-1 gap-[10px] p-[10px] transition-colors hover:bg-[#FCFDFE] md:grid-cols-[52px_180px_minmax(0,1fr)_170px] md:items-center">
                  <div className="hidden flex-col items-center justify-center gap-[2px] md:flex">
                    <button type="button" disabled={originalIndex <= 0 || Boolean(movingBannerId)} onClick={() => void moveBanner(originalIndex, "up")} className="flex h-[25px] w-[30px] items-center justify-center rounded-[7px] text-[#8D949E] transition-colors hover:bg-[#F1F3F6] disabled:opacity-30">
                      <ChevronUp className="h-[11px] w-[11px]" />
                    </button>

                    <div className="flex items-center gap-[3px] text-[7px] font-semibold text-[#9BA2AC]">
                      {isMoving ? <Loader2 className="h-[9px] w-[9px] animate-spin" /> : <GripVertical className="h-[9px] w-[9px]" />}
                      {originalIndex + 1}
                    </div>

                    <button type="button" disabled={originalIndex >= banners.length - 1 || Boolean(movingBannerId)} onClick={() => void moveBanner(originalIndex, "down")} className="flex h-[25px] w-[30px] items-center justify-center rounded-[7px] text-[#8D949E] transition-colors hover:bg-[#F1F3F6] disabled:opacity-30">
                      <ChevronDown className="h-[11px] w-[11px]" />
                    </button>
                  </div>

                  <button type="button" onClick={() => openDialog(banner)} className="relative h-[105px] overflow-hidden rounded-[10px] border border-[#E5E9EF] bg-[#F4F6F8] text-right">
                    <img src={banner.image_url} loading="lazy" alt={banner.title_ar} className="h-full w-full object-cover" style={{ transform: `scale(${Number(banner.image_zoom ?? 1)})`, objectPosition: `${Number(banner.image_position_x ?? 50)}% ${Number(banner.image_position_y ?? 50)}%` }} />
                    {!banner.is_active && <div className="absolute inset-0 flex items-center justify-center bg-[#20242D]/45"><span className="rounded-[7px] bg-white px-[8px] py-[4px] text-[7px] font-semibold text-[#6D747E]">معطل</span></div>}
                  </button>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[6px]">
                      <h3 className="max-w-[360px] truncate text-[11px] font-semibold text-[#3F4751]">{banner.title_ar}</h3>

                      <span className={cn("inline-flex h-[23px] items-center rounded-[7px] border px-[7px] text-[6.5px] font-semibold", banner.is_active ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#E2E6EA] bg-[#F5F6F8] text-[#818994]")}>{banner.is_active ? "نشط" : "معطل"}</span>

                      {banner.page_slug && <span className="inline-flex h-[23px] items-center gap-[4px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[7px] text-[6.5px] font-semibold text-[#5679A4]"><Link2 className="h-[8px] w-[8px]" />صفحة خاصة</span>}
                    </div>

                    <p className="mt-[5px] max-w-[640px] truncate text-[8px] text-[#858D97]">{banner.subtitle_ar || "لا يوجد عنوان فرعي"}</p>

                    <div className="mt-[8px] flex flex-wrap items-center gap-x-[12px] gap-y-[5px] text-[7px] text-[#9BA2AC]">
                      <span>الترتيب #{originalIndex + 1}</span>

                      {banner.cta_text_ar && <span>الزر: {banner.cta_text_ar}</span>}

                      {banner.cta_link && <span dir="ltr">{banner.cta_link}</span>}

                      {banner.page_slug && <span dir="ltr">/banner/{banner.page_slug}</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-[8px] md:justify-end">
                    <div className="flex items-center gap-[7px]">
                      <span className="text-[7px] font-semibold text-[#858D97]">الظهور</span>
                      <Switch checked={banner.is_active ?? true} disabled={togglingBannerId === banner.id} onCheckedChange={(checked) => void toggleActive(banner, checked)} />
                    </div>

                    <div className="flex items-center gap-[4px]">
                      {banner.page_slug && (
                        <button type="button" title="فتح الصفحة" onClick={() => window.open(`/banner/${banner.page_slug}`, "_blank", "noopener,noreferrer")} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#707884] hover:bg-[#F7F8FA]">
                          <ExternalLink className="h-[11px] w-[11px]" />
                        </button>
                      )}

                      <button type="button" title="تعديل" onClick={() => openDialog(banner)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#675CBA] hover:bg-[#F5F3FF]">
                        <Pencil className="h-[11px] w-[11px]" />
                      </button>

                      <button type="button" title="حذف" onClick={() => setDeleteTarget(banner)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]">
                        <Trash2 className="h-[11px] w-[11px]" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[850px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingBanner ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingBanner ? "تعديل البانر" : "إضافة بانر جديد"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[8px] text-[#9299A3]">إدارة النص والصورة والرابط وطريقة ظهور البانر داخل المتجر.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-[10px] p-[10px] lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-[10px]">
              <FormSection title="محتوى البانر" icon={LayoutTemplate}>
                <Field label="العنوان بالعربي" required>
                  <Input value={formData.title_ar} onChange={(event) => setFormData((current) => ({ ...current, title_ar: event.target.value }))} placeholder="عنوان البانر" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <Field label="العنوان الفرعي">
                  <Input value={formData.subtitle_ar} onChange={(event) => setFormData((current) => ({ ...current, subtitle_ar: event.target.value }))} placeholder="وصف مختصر للبانر" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="نص الزر">
                    <Input value={formData.cta_text_ar} onChange={(event) => setFormData((current) => ({ ...current, cta_text_ar: event.target.value }))} placeholder="تسوق الآن" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <Field label="رابط الزر">
                    <Input value={formData.cta_link} onChange={(event) => setFormData((current) => ({ ...current, cta_link: event.target.value }))} placeholder="/products" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>
                </div>
              </FormSection>

              <FormSection title="الصفحة الخاصة" icon={Link2}>
                <Field label="رابط الصفحة">
                  <div className="relative">
                    <span dir="ltr" className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[6.5px] text-[#A0A6AF]">/banner/</span>
                    <Input value={formData.page_slug} onChange={(event) => setFormData((current) => ({ ...current, page_slug: normalizePageSlug(event.target.value) }))} placeholder="summer-sale" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pl-[62px] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </div>
                </Field>

                <Field label="عنوان الصفحة">
                  <Input value={formData.page_title_ar} onChange={(event) => setFormData((current) => ({ ...current, page_title_ar: event.target.value }))} placeholder="عنوان صفحة البانر" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <Field label="محتوى الصفحة">
                  <Textarea value={formData.page_content_ar} onChange={(event) => setFormData((current) => ({ ...current, page_content_ar: event.target.value }))} rows={6} placeholder="اكتب محتوى الصفحة هنا. كل سطر يظهر كفقرة." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] leading-5 shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>
              </FormSection>

              <FormSection title="إعدادات الظهور" icon={CheckCircle2}>
                <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                  <Field label="ترتيب العرض">
                    <Input type="number" min={0} value={formData.sort_order} onChange={(event) => setFormData((current) => ({ ...current, sort_order: Number.parseInt(event.target.value, 10) || 0 }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[9px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                  </Field>

                  <div className="flex min-h-[63px] items-center justify-between rounded-[10px] border border-[#E5E9EF] bg-[#F8FAFC] px-[10px]">
                    <div>
                      <p className="text-[8.5px] font-semibold text-[#555D67]">حالة البانر</p>
                      <p className="mt-[2px] text-[6.5px] text-[#9BA2AC]">{formData.is_active ? "ظاهر للعملاء" : "مخفي عن المتجر"}</p>
                    </div>

                    <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_active: checked }))} />
                  </div>
                </div>
              </FormSection>
            </div>

            <div className="lg:sticky lg:top-[84px] lg:self-start">
              <FormSection title="صورة البانر" icon={ImageIcon}>
                {formData.image_url ? (
                  <div className="space-y-[8px]">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[11px] border border-[#E3E7EC] bg-[#F4F6F8]">
                      <img src={formData.image_url} alt="" loading="lazy" className="h-full w-full object-cover" style={{ transform: `scale(${formData.image_zoom})`, objectPosition: `${formData.image_position_x}% ${formData.image_position_y}%` }} />

                      <button type="button" onClick={() => setFormData((current) => ({ ...current, image_url: "" }))} className="absolute left-[7px] top-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-[8px] bg-white/95 text-[#C15F56] shadow-sm">
                        <Trash2 className="h-[10px] w-[10px]" />
                      </button>
                    </div>

                    <label className="flex h-[34px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#E2E6EB] bg-white text-[7.5px] font-semibold text-[#6F7781] hover:bg-[#F8FAFC]">
                      {isUploading ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Upload className="h-[10px] w-[10px]" />}
                      تغيير الصورة
                      <input type="file" accept="image/*,.heic,.heif" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                    </label>

                    <div className="space-y-[10px] rounded-[10px] border border-[#E8EBEF] bg-[#FAFBFC] p-[9px]">
                      <ImageControl icon={ZoomIn} label={`التكبير ${formData.image_zoom.toFixed(1)}x`}>
                        <Slider value={[formData.image_zoom]} onValueChange={([value]) => setFormData((current) => ({ ...current, image_zoom: value }))} min={1} max={2} step={0.1} />
                      </ImageControl>

                      <ImageControl icon={Move} label={`الموضع الأفقي ${formData.image_position_x}%`}>
                        <Slider value={[formData.image_position_x]} onValueChange={([value]) => setFormData((current) => ({ ...current, image_position_x: value }))} min={0} max={100} step={1} />
                      </ImageControl>

                      <ImageControl icon={Move} label={`الموضع العمودي ${formData.image_position_y}%`}>
                        <Slider value={[formData.image_position_y]} onValueChange={([value]) => setFormData((current) => ({ ...current, image_position_y: value }))} min={0} max={100} step={1} />
                      </ImageControl>

                      <button type="button" onClick={() => setFormData((current) => ({ ...current, image_zoom: 1, image_position_x: 50, image_position_y: 50 }))} className="h-[30px] rounded-[8px] border border-[#E2E6EB] bg-white px-[8px] text-[7px] font-semibold text-[#727A84] hover:bg-[#F7F8FA]">
                        إعادة تعيين الصورة
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={cn("flex aspect-[16/9] cursor-pointer flex-col items-center justify-center rounded-[11px] border border-dashed border-[#D9DEE5] bg-[#FAFBFC] transition-colors hover:border-[#BFB8DE] hover:bg-[#F9F8FF]", isUploading && "pointer-events-none opacity-60")}>
                    {isUploading ? (
                      <>
                        <Loader2 className="h-[20px] w-[20px] animate-spin text-[#675CBA]" />
                        <span className="mt-2 text-[7px] text-[#858D97]">جاري رفع الصورة...</span>
                      </>
                    ) : (
                      <>
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                          <Upload className="h-[15px] w-[15px]" />
                        </div>
                        <span className="mt-[8px] text-[8px] font-semibold text-[#606873]">رفع صورة البانر</span>
                        <span className="mt-[3px] text-[6px] text-[#A0A6AF]">JPG · PNG · WEBP · HEIC</span>
                      </>
                    )}

                    <input type="file" accept="image/*,.heic,.heif" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                  </label>
                )}
              </FormSection>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
            <Button type="button" variant="outline" disabled={isSaving || isUploading} onClick={closeDialog} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[8px] font-semibold text-[#707883] shadow-none">إلغاء</Button>

            <Button type="button" disabled={isSaving || isUploading} onClick={() => void handleSubmit()} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[8px] font-semibold text-white shadow-none hover:bg-[#594FAB]">
              {isSaving ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : editingBanner ? <Pencil className="ml-[5px] h-[11px] w-[11px]" /> : <Plus className="ml-[5px] h-[11px] w-[11px]" />}
              {editingBanner ? "حفظ التعديلات" : "إضافة البانر"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[420px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" />
            </div>

            <AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف البانر</AlertDialogTitle>
            <AlertDialogDescription className="text-[9px] leading-6 text-[#858D97]">سيتم حذف بانر "{deleteTarget?.title_ar || ""}" نهائيًا من واجهة المتجر.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); void deleteBanner(); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]">حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const BannerStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "coral" | "blue" }) => {
  const styles = {
    indigo: ["bg-[#F1EFFF] text-[#675CBA]", "bg-[#675CBA]"],
    green: ["bg-[#EAF7EE] text-[#629067]", "bg-[#629067]"],
    coral: ["bg-[#FFF0ED] text-[#D06A5E]", "bg-[#D06A5E]"],
    blue: ["bg-[#EDF4FF] text-[#5680CF]", "bg-[#5680CF]"],
  }[tone];

  return (
    <article className="relative min-h-[116px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]">
      <span className={cn("absolute inset-x-0 top-0 h-[3px]", styles[1])} />
      <div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", styles[0])}><Icon className="h-[14px] w-[14px]" /></div>
      <p className="mt-[12px] text-[8.5px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] text-[20px] font-semibold leading-none text-[#303741]">{value.toLocaleString("en-US")}</p>
      <p className="mt-[6px] text-[7px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) => (
  <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]">
    <div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]">
      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div>
      <h3 className="text-[9.5px] font-semibold text-[#4A525C]">{title}</h3>
    </div>
    <div className="space-y-[9px]">{children}</div>
  </section>
);

const Field = ({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div>
    <p className="mb-[6px] text-[8px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</p>
    {children}
  </div>
);

const ImageControl = ({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) => (
  <div>
    <div className="mb-[6px] flex items-center gap-[5px]">
      <Icon className="h-[10px] w-[10px] text-[#8C949E]" />
      <span className="text-[7px] font-medium text-[#737B86]">{label}</span>
    </div>
    {children}
  </div>
);

const EmptyBanners = () => (
  <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
    <div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><ImageIcon className="h-[18px] w-[18px]" /></div>
    <h3 className="mt-3 text-[10px] font-semibold text-[#535B65]">لا توجد بانرات</h3>
    <p className="mt-[4px] text-[7px] text-[#9BA2AC]">أضف أول بانر ليظهر في واجهة المتجر.</p>
  </div>
);

export default AdminBannersPage;