import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, CalendarClock, CheckCircle2, CircleOff, Copy, Eye, FileText, Image as ImageIcon, Layers3, Loader2, Megaphone, MonitorSmartphone, Pencil, Plus, Search, ShoppingBag, Smartphone, Sparkles, Trash2, Upload, WandSparkles, X, type LucideIcon } from "lucide-react";

type CampaignPageType = "campaign" | "service";
type CampaignFilter = "all" | "live" | "scheduled" | "expired" | "draft" | "service";
type SortMode = "priority" | "newest" | "oldest" | "products_high";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  title_ar: string;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  badge_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  page_type: CampaignPageType;
  product_ids: string[];
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

interface Product {
  id: string;
  name: string | null;
  name_ar: string;
  images: string[] | null;
  price: number | null;
  brand: string | null;
  in_stock: boolean | null;
}

interface CampaignForm {
  slug: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  image_url: string;
  mobile_image_url: string;
  badge_text: string;
  cta_label: string;
  cta_url: string;
  page_type: CampaignPageType;
  product_ids: string[];
  is_active: boolean;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  seo_title: string;
  seo_description: string;
}

const emptyForm = (): CampaignForm => ({
  slug: "",
  title: "",
  title_ar: "",
  description: "",
  description_ar: "",
  image_url: "",
  mobile_image_url: "",
  badge_text: "",
  cta_label: "تسوق الآن",
  cta_url: "",
  page_type: "campaign",
  product_ids: [],
  is_active: true,
  sort_order: "0",
  starts_at: "",
  ends_at: "",
  seo_title: "",
  seo_description: "",
});

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const toLocalInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const toIsoOrNull = (value: string) => value ? new Date(value).toISOString() : null;

const AdminCampaignsPage = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CampaignFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm());
  const [slugTouched, setSlugTouched] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Campaign | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const { data: campaigns = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-campaign-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("campaign_pages").select("id,slug,title,title_ar,description,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,page_type,product_ids,is_active,sort_order,starts_at,ends_at,seo_title,seo_description,created_at,updated_at").order("sort_order", { ascending: true }).order("updated_at", { ascending: false });
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        product_ids: Array.isArray(row.product_ids) ? row.product_ids : [],
        sort_order: Number(row.sort_order || 0),
      })) as Campaign[];
    },
    staleTime: 20_000,
  });

  const selectedIdsKey = useMemo(() => form.product_ids.join(","), [form.product_ids]);

  const { data: selectedProducts = [] } = useQuery({
    queryKey: ["campaign-selected-products", selectedIdsKey],
    enabled: dialogOpen && form.product_ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,name_ar,images,price,brand,in_stock").in("id", form.product_ids);
      if (error) throw error;

      const map = new Map((data || []).map((product: any) => [product.id, product]));
      return form.product_ids.map((id) => map.get(id)).filter(Boolean) as Product[];
    },
    staleTime: 30_000,
  });

  const productSearchQuery = useQuery({
    queryKey: ["campaign-product-search", debouncedProductSearch],
    enabled: dialogOpen,
    queryFn: async () => {
      let query = supabase.from("products").select("id,name,name_ar,images,price,brand,in_stock").eq("is_active", true).order("created_at", { ascending: false }).limit(40);

      if (debouncedProductSearch) {
        const safe = debouncedProductSearch.replace(/[%_,()]/g, " ").trim();
        query = query.or(`name.ilike.%${safe}%,name_ar.ilike.%${safe}%,brand.ilike.%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Product[];
    },
    staleTime: 20_000,
  });

  const now = Date.now();

  const campaignStatus = (campaign: Campaign) => {
    if (!campaign.is_active) return "draft" as const;

    const start = campaign.starts_at ? new Date(campaign.starts_at).getTime() : null;
    const end = campaign.ends_at ? new Date(campaign.ends_at).getTime() : null;

    if (start && start > now) return "scheduled" as const;
    if (end && end < now) return "expired" as const;
    return "live" as const;
  };

  const stats = useMemo(() => {
    const live = campaigns.filter((campaign) => campaignStatus(campaign) === "live").length;
    const scheduled = campaigns.filter((campaign) => campaignStatus(campaign) === "scheduled").length;
    const draft = campaigns.filter((campaign) => campaignStatus(campaign) === "draft").length;
    const totalProducts = campaigns.reduce((sum, campaign) => sum + campaign.product_ids.length, 0);

    return { total: campaigns.length, live, scheduled, draft, totalProducts };
  }, [campaigns, now]);

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = campaigns.filter((campaign) => {
      const status = campaignStatus(campaign);
      const searchable = `${campaign.title_ar} ${campaign.title} ${campaign.slug} ${campaign.description_ar || ""} ${campaign.badge_text || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);

      let matchesFilter = true;
      if (filter === "service") matchesFilter = campaign.page_type === "service";
      else if (filter !== "all") matchesFilter = status === filter;

      return matchesSearch && matchesFilter;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortMode === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      if (sortMode === "products_high") return b.product_ids.length - a.product_ids.length;
      return a.sort_order - b.sort_order;
    });
  }, [campaigns, search, filter, sortMode, now]);

  const openNew = () => {
    setEditing(null);
    setSlugTouched(false);
    setForm({ ...emptyForm(), sort_order: String(campaigns.length) });
    setProductSearch("");
    setDialogOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
    setEditing(campaign);
    setSlugTouched(true);
    setForm({
      slug: campaign.slug,
      title: campaign.title,
      title_ar: campaign.title_ar,
      description: campaign.description || "",
      description_ar: campaign.description_ar || "",
      image_url: campaign.image_url || "",
      mobile_image_url: campaign.mobile_image_url || "",
      badge_text: campaign.badge_text || "",
      cta_label: campaign.cta_label || "",
      cta_url: campaign.cta_url || "",
      page_type: campaign.page_type,
      product_ids: campaign.product_ids || [],
      is_active: campaign.is_active,
      sort_order: String(campaign.sort_order),
      starts_at: toLocalInput(campaign.starts_at),
      ends_at: toLocalInput(campaign.ends_at),
      seo_title: campaign.seo_title || "",
      seo_description: campaign.seo_description || "",
    });
    setProductSearch("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending || uploadingDesktop || uploadingMobile) return;
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setProductSearch("");
  };

  const validate = () => {
    const titleAr = form.title_ar.trim();
    const slug = (form.slug || slugify(titleAr)).trim();

    if (!titleAr) return "العنوان العربي مطلوب.";
    if (!slug) return "الرابط المختصر مطلوب.";
    if (slug.length < 2) return "الرابط المختصر قصير جدًا.";
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) return "تاريخ نهاية الحملة يجب أن يكون بعد تاريخ البداية.";
    if (form.page_type === "campaign" && !form.image_url) return "صورة الحملة الرئيسية مطلوبة.";
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validationError = validate();
      if (validationError) throw new Error(validationError);

      const payload = {
        slug: (form.slug || slugify(form.title_ar)).trim(),
        title: form.title.trim() || form.title_ar.trim(),
        title_ar: form.title_ar.trim(),
        description: form.description.trim() || null,
        description_ar: form.description_ar.trim() || null,
        image_url: form.image_url || null,
        mobile_image_url: form.mobile_image_url || null,
        badge_text: form.badge_text.trim() || null,
        cta_label: form.cta_label.trim() || null,
        cta_url: form.cta_url.trim() || null,
        page_type: form.page_type,
        product_ids: form.product_ids,
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
        starts_at: toIsoOrNull(form.starts_at),
        ends_at: toIsoOrNull(form.ends_at),
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
      };

      if (editing) {
        const { error } = await (supabase as any).from("campaign_pages").update(payload).eq("id", editing.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("campaign_pages").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-campaign-pages"] });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setSlugTouched(false);
      setProductSearch("");
      toast({ title: editing ? "تم تحديث الحملة" : "تم إنشاء الحملة" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حفظ الحملة", description: translateError(error?.message), variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ campaign, checked }: { campaign: Campaign; checked: boolean }) => {
      const { error } = await (supabase as any).from("campaign_pages").update({ is_active: checked }).eq("id", campaign.id);
      if (error) throw error;
    },
    onMutate: async ({ campaign, checked }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-campaign-pages"] });
      const previous = queryClient.getQueryData<Campaign[]>(["admin-campaign-pages"]);
      queryClient.setQueryData<Campaign[]>(["admin-campaign-pages"], (current = []) => current.map((row) => row.id === campaign.id ? { ...row, is_active: checked } : row));
      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-campaign-pages"], context.previous);
      toast({ title: "تعذر تحديث حالة الحملة", description: error?.message || "حدث خطأ.", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-campaign-pages"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const { error } = await (supabase as any).from("campaign_pages").delete().eq("id", campaign.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-campaign-pages"] });
      toast({ title: "تم حذف الحملة" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر حذف الحملة", description: error?.message || "حدث خطأ.", variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (campaign: Campaign) => {
      const suffix = Date.now().toString().slice(-5);
      const payload = {
        slug: `${campaign.slug}-copy-${suffix}`,
        title: `${campaign.title} Copy`,
        title_ar: `${campaign.title_ar} - نسخة`,
        description: campaign.description,
        description_ar: campaign.description_ar,
        image_url: campaign.image_url,
        mobile_image_url: campaign.mobile_image_url,
        badge_text: campaign.badge_text,
        cta_label: campaign.cta_label,
        cta_url: campaign.cta_url,
        page_type: campaign.page_type,
        product_ids: campaign.product_ids,
        is_active: false,
        sort_order: campaigns.length,
        starts_at: null,
        ends_at: null,
        seo_title: campaign.seo_title,
        seo_description: campaign.seo_description,
      };

      const { error } = await (supabase as any).from("campaign_pages").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDuplicateTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-campaign-pages"] });
      toast({ title: "تم إنشاء نسخة غير منشورة من الحملة" });
    },
    onError: (error: any) => {
      toast({ title: "تعذر نسخ الحملة", description: error?.message || "حدث خطأ.", variant: "destructive" });
    },
  });

  const uploadImage = async (file: File, target: "desktop" | "mobile") => {
    if (target === "desktop") setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const imageUrl = await uploadOptimizedImage(file, "campaigns", { maxSizeMB: 2, maxWidthOrHeight: target === "desktop" ? 2400 : 1400 });
      setForm((current) => ({ ...current, [target === "desktop" ? "image_url" : "mobile_image_url"]: imageUrl }));
      toast({ title: target === "desktop" ? "تم رفع صورة الحملة" : "تم رفع صورة الهاتف" });
    } catch (error: any) {
      toast({ title: "فشل رفع الصورة", description: error?.message || "حدث خطأ أثناء الرفع.", variant: "destructive" });
    } finally {
      if (target === "desktop") setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setForm((current) => ({
      ...current,
      product_ids: current.product_ids.includes(productId) ? current.product_ids.filter((id) => id !== productId) : [...current.product_ids, productId],
    }));
  };

  const removeProduct = (productId: string) => {
    setForm((current) => ({ ...current, product_ids: current.product_ids.filter((id) => id !== productId) }));
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.product_ids.length) return current;

      const ids = [...current.product_ids];
      [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
      return { ...current, product_ids: ids };
    });
  };

  const generateMarketingCopy = () => {
    if (!form.title_ar.trim()) {
      toast({ title: "اكتب عنوان الحملة أولًا", variant: "destructive" });
      return;
    }

    setForm((current) => ({
      ...current,
      badge_text: current.badge_text || "اختيارات فلامنجو",
      cta_label: current.cta_label || "تسوق الآن",
      seo_title: current.seo_title || `${current.title_ar} | فلامنجو بارك`,
      seo_description: current.seo_description || current.description_ar.slice(0, 150) || `اكتشف ${current.title_ar} من فلامنجو بارك وتسوق مجموعة مختارة بعناية.`,
    }));
  };

  const copySlug = async (campaign: Campaign) => {
    try {
      await navigator.clipboard.writeText(campaign.slug);
      toast({ title: "تم نسخ Slug الحملة" });
    } catch {
      toast({ title: "تعذر النسخ", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل مركز الحملات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التسويق" title="مركز الحملات" description="إنشاء وجدولة وإدارة صفحات الحملات التسويقية وربطها بالمنتجات" actions={[{ label: "حملة جديدة", icon: Plus, onClick: openNew, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي الحملات" value={stats.total.toLocaleString("en-US")} helper={`${stats.totalProducts.toLocaleString("ar-EG")} ارتباط بالمنتجات`} icon={Megaphone} tone="indigo" />
        <StatCard title="مباشرة الآن" value={stats.live.toLocaleString("en-US")} helper="ظاهرة حسب جدول النشر" icon={CheckCircle2} tone="green" />
        <StatCard title="مجدولة" value={stats.scheduled.toLocaleString("en-US")} helper="ستبدأ تلقائيًا لاحقًا" icon={CalendarClock} tone="blue" />
        <StatCard title="مسودات" value={stats.draft.toLocaleString("en-US")} helper="غير منشورة حاليًا" icon={FileText} tone="amber" />
      </section>

      <section className="rounded-[12px] border border-[#E2DEF3] bg-[#F8F7FF] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <Sparkles className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#675CBA]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#665D98]">الحملات أصبحت قابلة للجدولة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#827AA8]">يمكن تشغيل الحملة فورًا أو تحديد بداية ونهاية. خارج الفترة المحددة لن تظهر الحملة للعامة حتى لو كانت مفعلة.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex flex-col gap-[8px] border-b border-[#EDF0F3] p-[11px] xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بعنوان الحملة، الرابط أو الوصف..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={filter} onValueChange={(value) => setFilter(value as CampaignFilter)}>
            <SelectTrigger className="h-[40px] w-full rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0 xl:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحملات</SelectItem>
              <SelectItem value="live">مباشرة الآن</SelectItem>
              <SelectItem value="scheduled">مجدولة</SelectItem>
              <SelectItem value="expired">منتهية</SelectItem>
              <SelectItem value="draft">مسودات</SelectItem>
              <SelectItem value="service">صفحات الخدمات</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] w-full rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0 xl:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">حسب الأولوية</SelectItem>
              <SelectItem value="newest">آخر تعديل</SelectItem>
              <SelectItem value="oldest">الأقدم</SelectItem>
              <SelectItem value="products_high">الأكثر منتجات</SelectItem>
            </SelectContent>
          </Select>

          {(search || filter !== "all" || sortMode !== "priority") && <button type="button" onClick={() => { setSearch(""); setFilter("all"); setSortMode("priority"); }} className="flex h-[40px] items-center justify-center gap-[5px] rounded-[9px] border border-[#E3E7EC] bg-white px-[11px] text-[10px] font-semibold text-[#727A84]"><X className="h-[10px] w-[10px]" />مسح</button>}
        </div>

        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[9px]">
          <p className="text-[10.5px] font-semibold text-[#59616B]">{filteredCampaigns.length.toLocaleString("ar-EG")} حملة ظاهرة</p>
          {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
        </div>

        {filteredCampaigns.length === 0 ? (
          <PanelEmpty onCreate={openNew} />
        ) : (
          <div className="grid gap-[10px] p-[10px] md:grid-cols-2 xl:grid-cols-3">
            {filteredCampaigns.map((campaign) => {
              const status = campaignStatus(campaign);

              return (
                <article key={campaign.id} className="group overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                  <div className="relative aspect-[16/9] overflow-hidden bg-[#F2F4F6]">
                    {campaign.image_url ? <img src={campaign.image_url} alt={campaign.title_ar} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]" /> : <div className="flex h-full items-center justify-center text-[#A1A8B0]"><ImageIcon className="h-[24px] w-[24px]" /></div>}

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-[8px]">
                      <CampaignStatus status={status} />
                      <span className="rounded-[7px] border border-white/70 bg-white/90 px-[7px] py-[4px] text-[9px] font-semibold text-[#66707A]">{campaign.page_type === "service" ? "خدمة" : "حملة"}</span>
                    </div>

                    {campaign.badge_text && <span className="absolute bottom-[8px] right-[8px] rounded-[7px] bg-white/92 px-[8px] py-[5px] text-[9px] font-semibold text-[#535B65]">{campaign.badge_text}</span>}
                  </div>

                  <div className="p-[11px]">
                    <div className="flex items-start justify-between gap-[8px]">
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-[12px] font-semibold text-[#3F4751]">{campaign.title_ar}</h2>
                        <button type="button" onClick={() => void copySlug(campaign)} className="mt-[4px] flex max-w-full items-center gap-[4px] text-[9.5px] text-[#969DA7] hover:text-[#675CBA]"><span dir="ltr" className="truncate">/{campaign.slug}</span><Copy className="h-[8px] w-[8px] shrink-0" /></button>
                      </div>

                      <Switch checked={campaign.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ campaign, checked })} />
                    </div>

                    <p className="mt-[9px] line-clamp-2 min-h-[34px] text-[10px] leading-5 text-[#858D97]">{campaign.description_ar || "لا يوجد وصف مختصر لهذه الحملة."}</p>

                    <div className="mt-[10px] grid grid-cols-3 gap-[5px]">
                      <MiniStat label="المنتجات" value={campaign.product_ids.length.toLocaleString("ar-EG")} />
                      <MiniStat label="الأولوية" value={String(campaign.sort_order)} />
                      <MiniStat label="الهاتف" value={campaign.mobile_image_url ? "مخصص" : "نفس الصورة"} />
                    </div>

                    {(campaign.starts_at || campaign.ends_at) && (
                      <div className="mt-[8px] rounded-[8px] bg-[#F8FAFC] px-[8px] py-[7px]">
                        <div className="flex items-center gap-[5px] text-[9.5px] text-[#7C858F]"><CalendarClock className="h-[9px] w-[9px]" /><span>{campaign.starts_at ? formatDateTime(campaign.starts_at) : "فوري"} → {campaign.ends_at ? formatDateTime(campaign.ends_at) : "بدون نهاية"}</span></div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-[1fr_1fr_38px_38px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                    <button type="button" onClick={() => openEdit(campaign)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                    <button type="button" onClick={() => setDuplicateTarget(campaign)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white text-[10px] font-semibold text-[#5679A4]"><Copy className="h-[10px] w-[10px]" />نسخ</button>
                    <button type="button" onClick={() => openEdit(campaign)} className="flex h-[35px] w-[38px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#68717B]" title="معاينة داخل المحرر"><Eye className="h-[11px] w-[11px]" /></button>
                    <button type="button" onClick={() => setDeleteTarget(campaign)} className="flex h-[35px] w-[38px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]" title="حذف"><Trash2 className="h-[11px] w-[11px]" /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="flex h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-[1120px] flex-col overflow-hidden rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0 sm:h-[94dvh] sm:max-h-[94dvh] sm:w-[calc(100vw-32px)]">
          <DialogHeader className="shrink-0 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex flex-col gap-[10px] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-[10px]">
                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{editing ? <Pencil className="h-[15px] w-[15px]" /> : <Megaphone className="h-[15px] w-[15px]" />}</div>
                <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editing ? "تعديل الحملة" : "إنشاء حملة جديدة"}</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">المحتوى، الصور، الجدولة، المنتجات وتحسين الظهور في صفحة واحدة.</DialogDescription></div>
              </div>

              <Button type="button" variant="outline" onClick={generateMarketingCopy} className="h-[36px] rounded-[9px] border-[#E2DEF3] bg-white px-3 text-[10px] font-semibold text-[#675CBA] shadow-none"><WandSparkles className="ml-[5px] h-[11px] w-[11px]" />إكمال النصوص المقترحة</Button>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-[10px] [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
              <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-[10px]">
                  <FormSection title="هوية الحملة" icon={Megaphone}>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                      <Field label="العنوان العربي" required><Input value={form.title_ar} onChange={(event) => { const value = event.target.value; setForm((current) => ({ ...current, title_ar: value, slug: slugTouched ? current.slug : slugify(value) })); }} placeholder="مثال: صيف فلامنجو" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                      <Field label="العنوان الإنجليزي"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Flamingo Summer" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                    </div>

                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-[1fr_190px]">
                      <Field label="الرابط المختصر" required><Input value={form.slug} onChange={(event) => { setSlugTouched(true); setForm((current) => ({ ...current, slug: slugify(event.target.value) })); }} placeholder="summer-collection" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] font-mono text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                      <Field label="نوع الصفحة"><Select value={form.page_type} onValueChange={(value) => setForm((current) => ({ ...current, page_type: value as CampaignPageType }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="campaign">حملة تسويقية</SelectItem><SelectItem value="service">خدمة فلامنجو</SelectItem></SelectContent></Select></Field>
                    </div>

                    <Field label="الوصف العربي"><Textarea rows={4} value={form.description_ar} onChange={(event) => setForm((current) => ({ ...current, description_ar: event.target.value }))} placeholder="وصف تسويقي قصير وواضح..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                    <Field label="الوصف الإنجليزي"><Textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="English campaign description..." dir="ltr" className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>

                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3">
                      <Field label="شارة صغيرة"><Input value={form.badge_text} onChange={(event) => setForm((current) => ({ ...current, badge_text: event.target.value }))} placeholder="وصل حديثًا" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                      <Field label="نص الزر"><Input value={form.cta_label} onChange={(event) => setForm((current) => ({ ...current, cta_label: event.target.value }))} placeholder="تسوق الآن" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                      <Field label="رابط الزر"><Input value={form.cta_url} onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))} placeholder="/products" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field>
                    </div>
                  </FormSection>

                  <FormSection title="صور الحملة" icon={MonitorSmartphone}>
                    <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2">
                      <ImageUploader title="صورة Desktop" helper="يفضل 16:9 أو 3:1 حسب تصميم الصفحة" value={form.image_url} uploading={uploadingDesktop} onUpload={(file) => void uploadImage(file, "desktop")} onRemove={() => setForm((current) => ({ ...current, image_url: "" }))} icon={ImageIcon} />
                      <ImageUploader title="صورة الهاتف" helper="يفضل 4:5 أو 9:12 لمظهر أفضل بالموبايل" value={form.mobile_image_url} uploading={uploadingMobile} onUpload={(file) => void uploadImage(file, "mobile")} onRemove={() => setForm((current) => ({ ...current, mobile_image_url: "" }))} icon={Smartphone} />
                    </div>
                  </FormSection>

                  <FormSection title="جدولة النشر" icon={CalendarClock}>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                      <Field label="تبدأ في"><Input type="datetime-local" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field>
                      <Field label="تنتهي في"><Input type="datetime-local" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field>
                    </div>

                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2">
                      <Field label="الأولوية"><Input type="number" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
                      <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]"><div><p className="text-[11px] font-semibold text-[#555D67]">الحملة مفعلة</p><p className="mt-[3px] text-[10px] text-[#9BA2AC]">{form.is_active ? "يمكن نشرها حسب الجدول" : "ستبقى مسودة وغير ظاهرة"}</p></div><Switch checked={form.is_active} onCheckedChange={(is_active) => setForm((current) => ({ ...current, is_active }))} /></div>
                    </div>
                  </FormSection>

                  <FormSection title="تحسين الظهور SEO" icon={Sparkles}>
                    <Field label="عنوان SEO"><Input value={form.seo_title} onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))} placeholder={`${form.title_ar || "عنوان الحملة"} | فلامنجو بارك`} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /><p className="mt-[4px] text-[9.5px] text-[#9AA2AC]">{form.seo_title.length}/60</p></Field>
                    <Field label="وصف SEO"><Textarea rows={3} value={form.seo_description} onChange={(event) => setForm((current) => ({ ...current, seo_description: event.target.value }))} placeholder="وصف مختصر يظهر في نتائج البحث والمشاركة..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /><p className="mt-[4px] text-[9.5px] text-[#9AA2AC]">{form.seo_description.length}/160</p></Field>
                  </FormSection>

                  <FormSection title={`منتجات الحملة (${form.product_ids.length})`} icon={ShoppingBag}>
                    {form.product_ids.length > 0 && (
                      <div className="space-y-[5px]">
                        {selectedProducts.map((product, index) => (
                          <div key={product.id} className="flex items-center gap-[8px] rounded-[9px] border border-[#E6E9EE] bg-[#FAFBFC] p-[7px]">
                            <div className="flex h-[42px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-white">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBag className="h-[11px] w-[11px] text-[#A0A6AF]" />}</div>
                            <div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{product.name_ar}</p><p className="mt-[2px] text-[9.5px] text-[#9AA2AC]">{product.brand || "بدون ماركة"}{product.in_stock === false ? " · غير متوفر" : ""}</p></div>
                            <div className="flex items-center gap-[3px]"><button type="button" disabled={index === 0} onClick={() => moveProduct(index, -1)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#E3E7EC] bg-white text-[#707883] disabled:opacity-30"><ArrowUp className="h-[9px] w-[9px]" /></button><button type="button" disabled={index === selectedProducts.length - 1} onClick={() => moveProduct(index, 1)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#E3E7EC] bg-white text-[#707883] disabled:opacity-30"><ArrowDown className="h-[9px] w-[9px]" /></button><button type="button" onClick={() => removeProduct(product.id)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[9px] w-[9px]" /></button></div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" />
                      <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الماركة..." className="h-[38px] rounded-[8px] border-[#E2E6EB] bg-[#F8FAFC] pr-[33px] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                      {productSearchQuery.isFetching && <Loader2 className="absolute left-[11px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 animate-spin text-[#675CBA]" />}
                    </div>

                    <div className="grid max-h-[300px] grid-cols-1 gap-[5px] overflow-y-auto rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[5px] sm:grid-cols-2">
                      {(productSearchQuery.data || []).map((product) => {
                        const selected = form.product_ids.includes(product.id);

                        return <button type="button" key={product.id} onClick={() => toggleProduct(product.id)} className={cn("flex items-center gap-[7px] rounded-[8px] border p-[6px] text-right transition-colors", selected ? "border-[#CBC5E7] bg-[#F5F3FF]" : "border-transparent bg-white hover:border-[#E1E5EA]")}><div className="flex h-[38px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F3F5F7]">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBag className="h-[10px] w-[10px] text-[#A0A6AF]" />}</div><div className="min-w-0 flex-1"><p className={cn("truncate text-[10px] font-semibold", selected ? "text-[#675CBA]" : "text-[#555D67]")}>{product.name_ar}</p><p className="mt-[2px] truncate text-[9px] text-[#9AA2AC]">{product.brand || "بدون ماركة"}</p></div>{selected && <CheckCircle2 className="h-[12px] w-[12px] shrink-0 text-[#675CBA]" />}</button>;
                      })}
                    </div>
                  </FormSection>
                </div>

                <aside className="space-y-[10px] xl:sticky xl:top-0 xl:self-start">
                  <PreviewCard form={form} />
                  <CampaignReadiness form={form} />
                </aside>
              </div>
            </div>

            <div className="z-20 flex shrink-0 items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-4 py-3 sm:px-5">
              <Button type="button" variant="outline" disabled={saveMutation.isPending || uploadingDesktop || uploadingMobile} onClick={closeDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending || uploadingDesktop || uploadingMobile} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Megaphone className="ml-[5px] h-[12px] w-[12px]" />}{editing ? "حفظ التعديلات" : "إنشاء الحملة"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف الحملة</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف "{deleteTarget?.title_ar || ""}" نهائيًا. إذا كنت تريد إيقافها مؤقتًا، عطّلها بدل الحذف.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(duplicateTarget)} onOpenChange={(next) => { if (!next) setDuplicateTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#EDF4FF] text-[#5680CF]"><Copy className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">نسخ الحملة</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم إنشاء نسخة من "{duplicateTarget?.title_ar || ""}" بجميع الصور والمنتجات، وستكون غير منشورة حتى تعدّلها وتفعلها.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={duplicateMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={duplicateMutation.isPending} onClick={(event) => { event.preventDefault(); if (duplicateTarget) duplicateMutation.mutate(duplicateTarget); }} className="h-[38px] rounded-[9px] bg-[#5680CF] px-4 text-[10.5px] font-semibold text-white hover:bg-[#496EAF]">{duplicateMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}إنشاء نسخة</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CampaignStatus = ({ status }: { status: "live" | "scheduled" | "expired" | "draft" }) => {
  const config = {
    live: { label: "مباشرة", className: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]", icon: CheckCircle2 },
    scheduled: { label: "مجدولة", className: "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]", icon: CalendarClock },
    expired: { label: "منتهية", className: "border-[#E3E6EA] bg-[#F5F6F8] text-[#818994]", icon: CircleOff },
    draft: { label: "مسودة", className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]", icon: FileText },
  }[status];

  const Icon = config.icon;
  return <span className={cn("inline-flex h-[25px] items-center gap-[4px] rounded-[7px] border px-[7px] text-[9px] font-semibold", config.className)}><Icon className="h-[9px] w-[9px]" />{config.label}</span>;
};

const PreviewCard = ({ form }: { form: CampaignForm }) => {
  const previewImage = form.mobile_image_url || form.image_url;

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
      <div className="flex items-center gap-[7px] border-b border-[#EDF0F3] px-[11px] py-[9px]"><Eye className="h-[11px] w-[11px] text-[#675CBA]" /><h3 className="text-[10.5px] font-semibold text-[#4A525C]">معاينة الهاتف</h3></div>
      <div className="p-[10px]">
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-[18px] border-[5px] border-[#22272E] bg-white shadow-[0_8px_26px_rgba(31,41,55,0.10)]">
          <div className="relative aspect-[4/5] bg-[#F2F4F6]">
            {previewImage ? <img src={previewImage} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#A1A8B0]"><ImageIcon className="h-[24px] w-[24px]" /></div>}
            <div className="absolute inset-x-0 bottom-0 bg-black/30 p-[12px] text-white">
              {form.badge_text && <span className="mb-[6px] inline-block rounded-[5px] bg-white/90 px-[6px] py-[3px] text-[8px] font-semibold text-[#343A44]">{form.badge_text}</span>}
              <h4 className="text-[13px] font-semibold">{form.title_ar || "عنوان الحملة"}</h4>
              <p className="mt-[4px] line-clamp-2 text-[9px] leading-4 text-white/90">{form.description_ar || "سيظهر وصف الحملة هنا."}</p>
              {form.cta_label && <span className="mt-[8px] inline-flex h-[28px] items-center rounded-[7px] bg-white px-[9px] text-[9px] font-semibold text-[#343A44]">{form.cta_label}</span>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const CampaignReadiness = ({ form }: { form: CampaignForm }) => {
  const items = [
    { label: "عنوان عربي", done: Boolean(form.title_ar.trim()) },
    { label: "صورة رئيسية", done: Boolean(form.image_url) },
    { label: "رابط مختصر", done: Boolean(form.slug.trim()) },
    { label: "وصف تسويقي", done: Boolean(form.description_ar.trim()) },
    { label: "زر دعوة CTA", done: Boolean(form.cta_label.trim()) },
    { label: "SEO", done: Boolean(form.seo_title.trim() && form.seo_description.trim()) },
    { label: "منتجات مرتبطة", done: form.product_ids.length > 0 },
    { label: "صورة هاتف", done: Boolean(form.mobile_image_url) },
  ];

  const complete = items.filter((item) => item.done).length;
  const percent = Math.round((complete / items.length) * 100);

  return (
    <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]">
      <div className="flex items-center justify-between"><div className="flex items-center gap-[7px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Layers3 className="h-[11px] w-[11px]" /></div><h3 className="text-[10.5px] font-semibold text-[#4A525C]">جاهزية الحملة</h3></div><span className="text-[11px] font-semibold text-[#675CBA]">{percent}%</span></div>
      <div className="mt-[9px] h-[5px] overflow-hidden rounded-full bg-[#EEF0F3]"><div className="h-full rounded-full bg-[#675CBA] transition-all" style={{ width: `${percent}%` }} /></div>
      <div className="mt-[9px] grid grid-cols-2 gap-[5px]">{items.map((item) => <div key={item.label} className={cn("flex items-center gap-[5px] rounded-[7px] px-[7px] py-[6px] text-[9px] font-medium", item.done ? "bg-[#EFF8F2] text-[#568468]" : "bg-[#F7F8FA] text-[#9299A3]")}>{item.done ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}{item.label}</div>)}</div>
    </section>
  );
};

const ImageUploader = ({ title, helper, value, uploading, onUpload, onRemove, icon: Icon }: { title: string; helper: string; value: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void; icon: LucideIcon }) => {
  return (
    <div className="overflow-hidden rounded-[11px] border border-[#E5E9EF] bg-[#FAFBFC]">
      <div className="relative aspect-[16/10] bg-[#F1F3F5]">
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-[#A0A6AF]"><Icon className="h-[20px] w-[20px]" /><p className="mt-[6px] text-[9.5px]">لا توجد صورة</p></div>}
        {value && <button type="button" onClick={onRemove} className="absolute left-[7px] top-[7px] flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white/95 text-[#C15F56] shadow-sm"><Trash2 className="h-[10px] w-[10px]" /></button>}
      </div>
      <div className="p-[9px]">
        <p className="text-[10.5px] font-semibold text-[#59616B]">{title}</p>
        <p className="mt-[3px] text-[9px] leading-4 text-[#9AA2AC]">{helper}</p>
        <label className={cn("mt-[8px] flex h-[34px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]", uploading && "pointer-events-none opacity-60")}>{uploading ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Upload className="h-[10px] w-[10px]" />}{value ? "استبدال الصورة" : "رفع صورة"}<input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUpload(file); }} /></label>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "amber" }) => {
  const style = {
    indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" },
    green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" },
    blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" },
    amber: { icon: "bg-[#FFF7E8] text-[#A9782F]", line: "bg-[#C49446]" },
  }[tone];

  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const MiniStat = ({ label, value }: { label: string; value: string }) => {
  return <div className="rounded-[8px] bg-[#F8FAFC] p-[7px]"><p className="text-[8.5px] text-[#A0A6AF]">{label}</p><p className="mt-[3px] truncate text-[10px] font-semibold text-[#59616B]">{value}</p></div>;
};

const PanelEmpty = ({ onCreate }: { onCreate: () => void }) => {
  return <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[50px] w-[50px] items-center justify-center rounded-[14px] bg-[#F1EFFF] text-[#675CBA]"><Megaphone className="h-[20px] w-[20px]" /></div><h3 className="mt-3 text-[12px] font-semibold text-[#535B65]">لا توجد حملات</h3><p className="mt-[5px] max-w-[360px] text-[10px] leading-5 text-[#9BA2AC]">أنشئ أول حملة تسويقية واربطها بالمنتجات والصور وجدول النشر.</p><Button type="button" onClick={onCreate} className="mt-3 h-[36px] rounded-[9px] bg-[#675CBA] px-4 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]"><Plus className="ml-[5px] h-[10px] w-[10px]" />حملة جديدة</Button></div>;
};

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const translateError = (message?: string) => {
  const value = String(message || "");
  if (value.includes("duplicate key") || value.includes("campaign_pages_slug_key")) return "يوجد بالفعل حملة بنفس الرابط المختصر.";
  if (value.includes("campaign_pages_schedule_check")) return "تاريخ نهاية الحملة يجب أن يكون بعد تاريخ البداية.";
  return value || "حدث خطأ غير متوقع.";
};

export default AdminCampaignsPage;