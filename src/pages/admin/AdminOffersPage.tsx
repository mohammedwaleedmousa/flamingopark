import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, CircleOff, Copy, Gift, Image as ImageIcon, Loader2, Pencil, Percent, Plus, Search, Settings, ShoppingBag, Smartphone, Tag, TicketSlash, Trash2, Upload, X, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedImage } from "@/lib/prepareImageUpload";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type OfferType = "general" | "seasonal" | "flash" | "clearance";
type OfferStatus = "live" | "scheduled" | "expired" | "draft";
type OfferStatusFilter = "all" | OfferStatus;
type OfferTypeFilter = "all" | OfferType;
type OfferSort = "priority" | "newest" | "discount_high" | "products_high";
type PageView = "offers" | "settings";

interface Offer {
  id: string;
  title: string;
  title_ar: string;
  subtitle: string | null;
  subtitle_ar: string | null;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
  mobile_image_url: string | null;
  badge_text: string | null;
  cta_label: string | null;
  cta_url: string | null;
  discount_code: string | null;
  discount_percentage: number;
  offer_type: OfferType;
  apply_to_all: boolean;
  start_date: string | null;
  end_date: string | null;
  countries: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

interface OffersSettings {
  id: string;
  page_title: string;
  page_subtitle: string;
  countdown_end_date: string | null;
  promo_banner_text: string;
  show_countdown: boolean;
  show_promo_banner: boolean;
  countries: string[];
  updated_at: string;
}

interface Product {
  id: string;
  name_ar: string;
  images: string[] | null;
  price: number;
  discount: number | null;
  brand: string | null;
  in_stock: boolean | null;
}

interface OfferForm {
  title: string;
  title_ar: string;
  subtitle: string;
  subtitle_ar: string;
  description: string;
  description_ar: string;
  image_url: string;
  mobile_image_url: string;
  badge_text: string;
  cta_label: string;
  cta_url: string;
  discount_code: string;
  discount_percentage: string;
  offer_type: OfferType;
  start_date: string;
  end_date: string;
  countries: string[];
  is_active: boolean;
  is_featured: boolean;
  sort_order: string;
  product_ids: string[];
  apply_to_all: boolean;
}

const GLOBAL = "GLOBAL";

const createEmptyForm = (): OfferForm => ({
  title: "",
  title_ar: "",
  subtitle: "",
  subtitle_ar: "",
  description: "",
  description_ar: "",
  image_url: "",
  mobile_image_url: "",
  badge_text: "",
  cta_label: "تسوق الآن",
  cta_url: "/seasonal-offers",
  discount_code: "",
  discount_percentage: "0",
  offer_type: "seasonal",
  start_date: "",
  end_date: "",
  countries: [GLOBAL],
  is_active: true,
  is_featured: false,
  sort_order: "0",
  product_ids: [],
  apply_to_all: false,
});

const toLocalInput = (value: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const toIsoOrNull = (value: string) => value ? new Date(value).toISOString() : null;

const AdminOffersPage = () => {
  const queryClient = useQueryClient();

  const [view, setView] = useState<PageView>("offers");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<OfferTypeFilter>("all");
  const [sortMode, setSortMode] = useState<OfferSort>("priority");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState<OfferForm>(createEmptyForm());

  const [productSearch, setProductSearch] = useState("");
  const [debouncedProductSearch, setDebouncedProductSearch] = useState("");

  const [uploadingDesktop, setUploadingDesktop] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [duplicateTarget, setDuplicateTarget] = useState<Offer | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedProductSearch(productSearch.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [productSearch]);

  const { data: offers = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("offers").select("id,title,title_ar,subtitle,subtitle_ar,description,description_ar,image_url,mobile_image_url,badge_text,cta_label,cta_url,discount_code,discount_percentage,offer_type,apply_to_all,start_date,end_date,countries,is_active,is_featured,sort_order,product_ids,created_at,updated_at").order("sort_order", { ascending: true }).order("updated_at", { ascending: false });
      if (error) throw error;

      return (data || []).map((row: any) => ({
        ...row,
        discount_percentage: Number(row.discount_percentage || 0),
        sort_order: Number(row.sort_order || 0),
        product_ids: Array.isArray(row.product_ids) ? row.product_ids : [],
        countries: Array.isArray(row.countries) ? row.countries : [GLOBAL],
        apply_to_all: Boolean(row.apply_to_all),
      })) as Offer[];
    },
    staleTime: 20_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-offers-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("offers_settings").select("id,page_title,page_subtitle,countdown_end_date,promo_banner_text,show_countdown,show_promo_banner,countries,updated_at").limit(1).maybeSingle();
      if (error) throw error;
      return data as OffersSettings | null;
    },
    staleTime: 60_000,
  });

  const [settingsDraft, setSettingsDraft] = useState<OffersSettings | null>(null);

  useEffect(() => {
    if (settings) setSettingsDraft(settings);
  }, [settings]);

  const selectedIdsKey = useMemo(() => form.product_ids.join(","), [form.product_ids]);

  const { data: selectedProducts = [] } = useQuery({
    queryKey: ["offer-selected-products", selectedIdsKey],
    enabled: dialogOpen && form.product_ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name_ar,images,price,discount,brand,in_stock").in("id", form.product_ids);
      if (error) throw error;

      const map = new Map((data || []).map((product: any) => [product.id, product]));
      return form.product_ids.map((id) => map.get(id)).filter(Boolean) as Product[];
    },
    staleTime: 30_000,
  });

  const productSearchQuery = useQuery({
    queryKey: ["offer-product-search", debouncedProductSearch],
    enabled: dialogOpen && !form.apply_to_all,
    queryFn: async () => {
      let query = supabase.from("products").select("id,name_ar,images,price,discount,brand,in_stock").eq("is_active", true).order("created_at", { ascending: false }).limit(40);

      if (debouncedProductSearch) {
        const safe = debouncedProductSearch.replace(/[%_,()]/g, " ").trim();
        query = query.or(`name_ar.ilike.%${safe}%,brand.ilike.%${safe}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Product[];
    },
    staleTime: 20_000,
  });

  const getStatus = (offer: Offer): OfferStatus => {
    if (!offer.is_active) return "draft";

    const now = Date.now();
    if (offer.start_date && new Date(offer.start_date).getTime() > now) return "scheduled";
    if (offer.end_date && new Date(offer.end_date).getTime() < now) return "expired";
    return "live";
  };

  const stats = useMemo(() => {
    const live = offers.filter((offer) => getStatus(offer) === "live").length;
    const scheduled = offers.filter((offer) => getStatus(offer) === "scheduled").length;
    const featured = offers.filter((offer) => offer.is_featured).length;
    const highestDiscount = offers.reduce((max, offer) => Math.max(max, offer.discount_percentage), 0);

    return { total: offers.length, live, scheduled, featured, highestDiscount };
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = offers.filter((offer) => {
      const searchable = `${offer.title_ar} ${offer.title} ${offer.subtitle_ar || ""} ${offer.discount_code || ""} ${offer.description_ar || ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === "all" || getStatus(offer) === statusFilter;
      const matchesType = typeFilter === "all" || offer.offer_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sortMode === "discount_high") return b.discount_percentage - a.discount_percentage;
      if (sortMode === "products_high") return (b.apply_to_all ? Number.MAX_SAFE_INTEGER : b.product_ids.length) - (a.apply_to_all ? Number.MAX_SAFE_INTEGER : a.product_ids.length);
      return a.sort_order - b.sort_order;
    });
  }, [offers, search, statusFilter, typeFilter, sortMode]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || typeFilter !== "all" || sortMode !== "priority";

  const openNew = () => {
    setEditingOffer(null);
    setForm({ ...createEmptyForm(), sort_order: String(offers.length) });
    setProductSearch("");
    setDialogOpen(true);
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setForm({
      title: offer.title || "",
      title_ar: offer.title_ar || "",
      subtitle: offer.subtitle || "",
      subtitle_ar: offer.subtitle_ar || "",
      description: offer.description || "",
      description_ar: offer.description_ar || "",
      image_url: offer.image_url || "",
      mobile_image_url: offer.mobile_image_url || "",
      badge_text: offer.badge_text || "",
      cta_label: offer.cta_label || "",
      cta_url: offer.cta_url || "",
      discount_code: offer.discount_code || "",
      discount_percentage: String(offer.discount_percentage || 0),
      offer_type: offer.offer_type || "seasonal",
      start_date: toLocalInput(offer.start_date),
      end_date: toLocalInput(offer.end_date),
      countries: offer.countries || [GLOBAL],
      is_active: offer.is_active,
      is_featured: offer.is_featured,
      sort_order: String(offer.sort_order),
      product_ids: offer.product_ids || [],
      apply_to_all: Boolean(offer.apply_to_all || offer.product_ids.length === 0),
    });
    setProductSearch("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending || uploadingDesktop || uploadingMobile) return;
    setDialogOpen(false);
    setEditingOffer(null);
    setForm(createEmptyForm());
    setProductSearch("");
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const discount = Number(form.discount_percentage);

      if (!form.title_ar.trim()) throw new Error("العنوان العربي مطلوب.");
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error("نسبة الخصم يجب أن تكون بين 0 و100.");
      if (form.start_date && form.end_date && new Date(form.end_date) <= new Date(form.start_date)) throw new Error("تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية.");
      if (!form.apply_to_all && form.product_ids.length === 0) throw new Error("اختر منتجات العرض أو فعّل تطبيق العرض على جميع المنتجات.");

      const payload = {
        title: form.title.trim() || form.title_ar.trim(),
        title_ar: form.title_ar.trim(),
        subtitle: form.subtitle.trim() || null,
        subtitle_ar: form.subtitle_ar.trim() || null,
        description: form.description.trim() || null,
        description_ar: form.description_ar.trim() || null,
        image_url: form.image_url || null,
        mobile_image_url: form.mobile_image_url || null,
        badge_text: form.badge_text.trim() || null,
        cta_label: form.cta_label.trim() || null,
        cta_url: form.cta_url.trim() || null,
        discount_code: form.discount_code.trim().toUpperCase() || null,
        discount_percentage: discount,
        offer_type: form.offer_type,
        apply_to_all: form.apply_to_all,
        start_date: toIsoOrNull(form.start_date),
        end_date: toIsoOrNull(form.end_date),
        countries: [GLOBAL],
        is_active: form.is_active,
        is_featured: form.is_featured,
        sort_order: Number(form.sort_order || 0),
        product_ids: form.apply_to_all ? [] : form.product_ids,
      };

      if (editingOffer) {
        const { error } = await (supabase as any).from("offers").update(payload).eq("id", editingOffer.id);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any).from("offers").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingOffer);
      setDialogOpen(false);
      setEditingOffer(null);
      setForm(createEmptyForm());
      setProductSearch("");
      await queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast({ title: wasEditing ? "تم تحديث العرض" : "تم إنشاء العرض" });
    },
    onError: (error: any) => toast({ title: "تعذر حفظ العرض", description: translateError(error?.message), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ offer, checked }: { offer: Offer; checked: boolean }) => {
      const { error } = await supabase.from("offers").update({ is_active: checked }).eq("id", offer.id);
      if (error) throw error;
    },
    onMutate: async ({ offer, checked }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-offers"] });
      const previous = queryClient.getQueryData<Offer[]>(["admin-offers"]);
      queryClient.setQueryData<Offer[]>(["admin-offers"], (current = []) => current.map((row) => row.id === offer.id ? { ...row, is_active: checked } : row));
      return { previous };
    },
    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-offers"], context.previous);
      toast({ title: "تعذر تحديث حالة العرض", description: error?.message || "حدث خطأ.", variant: "destructive" });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-offers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (offer: Offer) => {
      const { error } = await supabase.from("offers").delete().eq("id", offer.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast({ title: "تم حذف العرض" });
    },
    onError: (error: any) => toast({ title: "تعذر حذف العرض", description: error?.message || "حدث خطأ.", variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (offer: Offer) => {
      const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = offer;
      const { error } = await (supabase as any).from("offers").insert({ ...rest, title_ar: `${offer.title_ar} - نسخة`, title: `${offer.title || offer.title_ar} Copy`, is_active: false, start_date: null, end_date: null, sort_order: offers.length });
      if (error) throw error;
    },
    onSuccess: async () => {
      setDuplicateTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      toast({ title: "تم إنشاء نسخة غير مفعلة من العرض" });
    },
    onError: (error: any) => toast({ title: "تعذر نسخ العرض", description: error?.message || "حدث خطأ.", variant: "destructive" }),
  });

  const settingsMutation = useMutation({
    mutationFn: async () => {
      if (!settingsDraft) throw new Error("إعدادات صفحة العروض غير متاحة.");

      const { error } = await (supabase as any).from("offers_settings").update({
        page_title: settingsDraft.page_title.trim(),
        page_subtitle: settingsDraft.page_subtitle.trim(),
        countdown_end_date: settingsDraft.countdown_end_date,
        promo_banner_text: settingsDraft.promo_banner_text.trim(),
        show_countdown: settingsDraft.show_countdown,
        show_promo_banner: settingsDraft.show_promo_banner,
        countries: [GLOBAL],
      }).eq("id", settingsDraft.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-offers-settings"] });
      toast({ title: "تم حفظ إعدادات صفحة العروض" });
    },
    onError: (error: any) => toast({ title: "تعذر حفظ الإعدادات", description: error?.message || "حدث خطأ.", variant: "destructive" }),
  });

  const uploadImage = async (file: File, target: "desktop" | "mobile") => {
    if (target === "desktop") setUploadingDesktop(true);
    else setUploadingMobile(true);

    try {
      const imageUrl = await uploadOptimizedImage(file, "offers", { maxSizeMB: 0.9, maxWidthOrHeight: target === "desktop" ? 2000 : 1400 });
      setForm((current) => ({ ...current, [target === "desktop" ? "image_url" : "mobile_image_url"]: imageUrl }));
      toast({ title: "تم رفع الصورة" });
    } catch (error: any) {
      toast({ title: "تعذر رفع الصورة", description: error?.message || "حدث خطأ.", variant: "destructive" });
    } finally {
      if (target === "desktop") setUploadingDesktop(false);
      else setUploadingMobile(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setForm((current) => ({ ...current, product_ids: current.product_ids.includes(productId) ? current.product_ids.filter((id) => id !== productId) : [...current.product_ids, productId] }));
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.product_ids.length) return current;

      const productIds = [...current.product_ids];
      [productIds[index], productIds[targetIndex]] = [productIds[targetIndex], productIds[index]];
      return { ...current, product_ids: productIds };
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortMode("priority");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>
          <p className="mt-3 text-[11px] font-medium text-[#8D949E]">جاري تحميل العروض...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="التسويق" title="العروض" description="إدارة العروض والخصومات وجدولة ظهورها وربطها بالمنتجات" actions={[{ label: "عرض جديد", icon: Plus, onClick: openNew, variant: "primary" }, { label: "الكوبونات", icon: TicketSlash, href: "/admin/coupons", variant: "outline" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <StatCard title="إجمالي العروض" value={stats.total.toLocaleString("en-US")} helper={`${stats.featured.toLocaleString("ar-EG")} عرض مميز`} icon={Gift} tone="indigo" />
        <StatCard title="مباشرة الآن" value={stats.live.toLocaleString("en-US")} helper="ظاهرة للعميل حاليًا" icon={CheckCircle2} tone="green" />
        <StatCard title="مجدولة" value={stats.scheduled.toLocaleString("en-US")} helper="ستبدأ تلقائيًا" icon={CalendarClock} tone="blue" />
        <StatCard title="أعلى خصم" value={`${stats.highestDiscount}%`} helper="أعلى نسبة في العروض" icon={Percent} tone="coral" />
      </section>

      <section className="rounded-[12px] border border-[#E2DEF3] bg-[#F8F7FF] px-[12px] py-[10px]">
        <div className="flex items-start gap-[8px]">
          <Tag className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#675CBA]" />
          <div>
            <p className="text-[10.5px] font-semibold text-[#665D98]">مركز العروض مرتبط بالجدولة</p>
            <p className="mt-[3px] text-[10px] leading-5 text-[#827AA8]">العرض المفعّل يظهر فقط داخل الفترة المحددة له. ويمكنك إبقاؤه بدون تاريخ بداية أو نهاية إذا أردته مستمرًا.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="grid grid-cols-2 gap-[4px] border-b border-[#E5E9EF] bg-[#FAFBFC] p-[5px]">
          <button type="button" onClick={() => setView("offers")} className={cn("flex h-[40px] items-center justify-center gap-[6px] rounded-[9px] text-[10.5px] font-semibold transition-colors", view === "offers" ? "bg-white text-[#675CBA] shadow-[0_1px_4px_rgba(31,41,55,0.08)]" : "text-[#7E8690] hover:bg-white/60")}><Gift className="h-[11px] w-[11px]" />العروض ({offers.length})</button>
          <button type="button" onClick={() => setView("settings")} className={cn("flex h-[40px] items-center justify-center gap-[6px] rounded-[9px] text-[10.5px] font-semibold transition-colors", view === "settings" ? "bg-white text-[#675CBA] shadow-[0_1px_4px_rgba(31,41,55,0.08)]" : "text-[#7E8690] hover:bg-white/60")}><Settings className="h-[11px] w-[11px]" />إعدادات صفحة العروض</button>
        </div>

        {view === "offers" ? (
          <>
            <div className="border-b border-[#EDF0F3] px-[13px] py-[10px]">
              <div className="flex items-center justify-between gap-[10px]">
                <div><h2 className="text-[11.5px] font-semibold text-[#444B55]">قائمة العروض</h2><p className="mt-[3px] text-[10px] text-[#9BA2AC]">تحكم في النشر والخصم والمنتجات من مكان واحد</p></div>
                {hasFilters && <button type="button" onClick={clearFilters} className="flex h-[32px] items-center gap-[5px] rounded-[8px] px-[9px] text-[10px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]"><X className="h-[10px] w-[10px]" />مسح الفلاتر</button>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-[7px] border-b border-[#EDF0F3] p-[11px] xl:grid-cols-[minmax(0,1fr)_160px_160px_170px]">
              <div className="relative">
                <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عنوان العرض، كود الخصم أو الوصف..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
              </div>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OfferStatusFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الحالات</SelectItem><SelectItem value="live">مباشرة</SelectItem><SelectItem value="scheduled">مجدولة</SelectItem><SelectItem value="expired">منتهية</SelectItem><SelectItem value="draft">مسودة</SelectItem></SelectContent></Select>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as OfferTypeFilter)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">كل الأنواع</SelectItem><SelectItem value="general">عام</SelectItem><SelectItem value="seasonal">موسمي</SelectItem><SelectItem value="flash">فلاش</SelectItem><SelectItem value="clearance">تصفية</SelectItem></SelectContent></Select>
              <Select value={sortMode} onValueChange={(value) => setSortMode(value as OfferSort)}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="priority">حسب الأولوية</SelectItem><SelectItem value="newest">آخر تعديل</SelectItem><SelectItem value="discount_high">أعلى خصم</SelectItem><SelectItem value="products_high">الأكثر منتجات</SelectItem></SelectContent></Select>
            </div>

            <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[9px]">
              <p className="text-[10.5px] font-semibold text-[#59616B]">{filteredOffers.length.toLocaleString("ar-EG")} عرض ظاهر من أصل {offers.length.toLocaleString("ar-EG")}</p>
              {isFetching && <Loader2 className="h-[12px] w-[12px] animate-spin text-[#8E959F]" />}
            </div>

            {filteredOffers.length === 0 ? (
              <PanelEmpty onCreate={openNew} />
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1220px]">
                    <thead>
                      <tr className="h-[44px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10.5px] font-semibold text-[#858D97]">
                        <th className="px-[12px] text-right">العرض</th>
                        <th className="px-[12px] text-right">النوع</th>
                        <th className="px-[12px] text-right">الخصم</th>
                        <th className="px-[12px] text-right">المنتجات</th>
                        <th className="px-[12px] text-right">الفترة</th>
                        <th className="px-[12px] text-right">الحالة</th>
                        <th className="w-[150px] px-[12px] text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOffers.map((offer) => (
                        <tr key={offer.id} className="h-[82px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                          <td className="px-[12px]">
                            <div className="flex min-w-[260px] items-center gap-[9px]">
                              <div className="flex h-[52px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] bg-[#F2F4F6]">{offer.image_url ? <img src={offer.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="h-[14px] w-[14px] text-[#A0A6AF]" />}</div>
                              <div className="min-w-0"><div className="flex items-center gap-[5px]"><p className="max-w-[250px] truncate text-[11px] font-semibold text-[#444C56]">{offer.title_ar}</p>{offer.is_featured && <span className="rounded-[6px] bg-[#FFF7E8] px-[6px] py-[2px] text-[9px] font-semibold text-[#A9782F]">مميز</span>}</div><p className="mt-[4px] max-w-[280px] truncate text-[9.5px] text-[#969DA7]">{offer.subtitle_ar || offer.description_ar || "بدون وصف مختصر"}</p>{offer.discount_code && <p dir="ltr" className="mt-[3px] w-fit rounded-[5px] bg-[#F1EFFF] px-[5px] py-[2px] font-mono text-[9px] font-semibold text-[#675CBA]">{offer.discount_code}</p>}</div>
                            </div>
                          </td>
                          <td className="px-[12px]"><TypeBadge type={offer.offer_type} /></td>
                          <td className="px-[12px]"><p className="text-[12px] font-semibold text-[#C15F56]">{offer.discount_percentage}%</p></td>
                          <td className="px-[12px]"><p className="text-[10.5px] font-semibold text-[#59616B]">{offer.apply_to_all ? "جميع المنتجات" : `${offer.product_ids.length.toLocaleString("ar-EG")} منتج`}</p></td>
                          <td className="px-[12px]"><p className="text-[10px] text-[#68717B]">{formatSchedule(offer.start_date, offer.end_date)}</p></td>
                          <td className="px-[12px]"><div className="flex items-center gap-[8px]"><Switch checked={offer.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ offer, checked })} /><StatusBadge status={getStatus(offer)} /></div></td>
                          <td className="px-[12px]"><div className="flex items-center justify-center gap-[4px]"><button type="button" onClick={() => openEdit(offer)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#E2DEF3] bg-white text-[#675CBA] hover:bg-[#F5F3FF]" title="تعديل"><Pencil className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => setDuplicateTarget(offer)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#DCE7F4] bg-white text-[#5680CF] hover:bg-[#F1F6FC]" title="نسخ"><Copy className="h-[11px] w-[11px]" /></button><button type="button" onClick={() => setDeleteTarget(offer)} className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]" title="حذف"><Trash2 className="h-[11px] w-[11px]" /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-[8px] p-[8px] md:hidden">
                  {filteredOffers.map((offer) => (
                    <article key={offer.id} className="overflow-hidden rounded-[13px] border border-[#E5E9EF] bg-white">
                      <div className="flex gap-[9px] p-[10px]">
                        <div className="flex h-[76px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#F2F4F6]">{offer.image_url ? <img src={offer.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon className="h-[16px] w-[16px] text-[#A0A6AF]" />}</div>
                        <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-[7px]"><div className="min-w-0"><h3 className="truncate text-[11.5px] font-semibold text-[#3B424C]">{offer.title_ar}</h3><div className="mt-[5px] flex flex-wrap gap-[4px]"><StatusBadge status={getStatus(offer)} /><TypeBadge type={offer.offer_type} />{offer.is_featured && <span className="inline-flex h-[25px] items-center rounded-[7px] border border-[#EEDFC4] bg-[#FFF7E8] px-[7px] text-[9.5px] font-semibold text-[#A9782F]">مميز</span>}</div></div><Switch checked={offer.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ offer, checked })} /></div><p className="mt-[7px] text-[10px] text-[#858D97]">خصم <span className="font-semibold text-[#C15F56]">{offer.discount_percentage}%</span> · {offer.apply_to_all ? "كل المنتجات" : `${offer.product_ids.length} منتج`}</p><p className="mt-[4px] truncate text-[9.5px] text-[#9AA2AC]">{formatSchedule(offer.start_date, offer.end_date)}</p></div>
                      </div>
                      <div className="grid grid-cols-3 gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]"><button type="button" onClick={() => openEdit(offer)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button><button type="button" onClick={() => setDuplicateTarget(offer)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#DCE7F4] bg-white text-[10px] font-semibold text-[#5680CF]"><Copy className="h-[10px] w-[10px]" />نسخ</button><button type="button" onClick={() => setDeleteTarget(offer)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#F0D7D4] bg-white text-[10px] font-semibold text-[#C15F56]"><Trash2 className="h-[10px] w-[10px]" />حذف</button></div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <SettingsPanel settings={settingsDraft} setSettings={setSettingsDraft} saving={settingsMutation.isPending} onSave={() => settingsMutation.mutate()} />
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(next) => { if (!next) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent dir="rtl" className="flex h-[calc(100dvh-16px)] max-h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-[1080px] flex-col overflow-hidden rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0 sm:h-[94dvh] sm:max-h-[94dvh] sm:w-[calc(100vw-32px)]">
          <DialogHeader className="shrink-0 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">{editingOffer ? <Pencil className="h-[15px] w-[15px]" /> : <Gift className="h-[15px] w-[15px]" />}</div>
              <div><DialogTitle className="text-right text-[15px] font-semibold text-[#343B45]">{editingOffer ? "تعديل العرض" : "إضافة عرض جديد"}</DialogTitle><DialogDescription className="mt-[3px] text-right text-[10px] text-[#9299A3]">أنشئ العرض والخصم والجدولة والمنتجات والصور من نافذة واحدة.</DialogDescription></div>
            </div>
          </DialogHeader>

          <form onSubmit={(event: FormEvent) => { event.preventDefault(); saveMutation.mutate(); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-[10px] [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
              <div className="grid grid-cols-1 gap-[10px] xl:grid-cols-[minmax(0,1fr)_330px]">
                <div className="space-y-[10px]">
                  <FormSection title="بيانات العرض" icon={Tag}>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><Field label="العنوان العربي" required><Input value={form.title_ar} onChange={(event) => setForm((current) => ({ ...current, title_ar: event.target.value }))} placeholder="مثال: عرض نهاية الأسبوع" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field><Field label="العنوان الإنجليزي"><Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Weekend Offer" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field></div>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><Field label="العنوان الفرعي العربي"><Input value={form.subtitle_ar} onChange={(event) => setForm((current) => ({ ...current, subtitle_ar: event.target.value }))} placeholder="لفترة محدودة فقط" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field><Field label="العنوان الفرعي الإنجليزي"><Input value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field></div>
                    <Field label="الوصف العربي"><Textarea rows={3} value={form.description_ar} onChange={(event) => setForm((current) => ({ ...current, description_ar: event.target.value }))} placeholder="وصف واضح ومختصر للعرض..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" /></Field>
                  </FormSection>

                  <FormSection title="الخصم وواجهة العرض" icon={Percent}>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3"><Field label="نوع العرض"><Select value={form.offer_type} onValueChange={(value) => setForm((current) => ({ ...current, offer_type: value as OfferType }))}><SelectTrigger className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus:ring-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="general">عام</SelectItem><SelectItem value="seasonal">موسمي</SelectItem><SelectItem value="flash">فلاش</SelectItem><SelectItem value="clearance">تصفية</SelectItem></SelectContent></Select></Field><Field label="نسبة الخصم"><Input type="number" min={0} max={100} step={1} value={form.discount_percentage} onChange={(event) => setForm((current) => ({ ...current, discount_percentage: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field><Field label="كود الخصم"><Input value={form.discount_code} onChange={(event) => setForm((current) => ({ ...current, discount_code: event.target.value.toUpperCase() }))} placeholder="SALE20" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] font-mono text-[10.5px] shadow-none focus-visible:ring-0" /></Field></div>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3"><Field label="شارة صغيرة"><Input value={form.badge_text} onChange={(event) => setForm((current) => ({ ...current, badge_text: event.target.value }))} placeholder="لفترة محدودة" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field><Field label="نص الزر"><Input value={form.cta_label} onChange={(event) => setForm((current) => ({ ...current, cta_label: event.target.value }))} placeholder="تسوق الآن" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field><Field label="رابط الزر"><Input value={form.cta_url} onChange={(event) => setForm((current) => ({ ...current, cta_url: event.target.value }))} placeholder="/seasonal-offers" dir="ltr" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field></div>
                  </FormSection>

                  <FormSection title="صور العرض" icon={ImageIcon}>
                    <div className="grid grid-cols-1 gap-[8px] md:grid-cols-2"><ImageUploader title="صورة Desktop" helper="الصورة الرئيسية للعرض" value={form.image_url} uploading={uploadingDesktop} onUpload={(file) => void uploadImage(file, "desktop")} onRemove={() => setForm((current) => ({ ...current, image_url: "" }))} /><ImageUploader title="صورة الهاتف" helper="صورة مخصصة للموبايل" value={form.mobile_image_url} uploading={uploadingMobile} onUpload={(file) => void uploadImage(file, "mobile")} onRemove={() => setForm((current) => ({ ...current, mobile_image_url: "" }))} mobile /></div>
                  </FormSection>

                  <FormSection title="الجدولة والنشر" icon={CalendarClock}>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><Field label="يبدأ في"><Input type="datetime-local" value={form.start_date} onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field><Field label="ينتهي في"><Input type="datetime-local" value={form.end_date} onChange={(event) => setForm((current) => ({ ...current, end_date: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field></div>
                    <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3"><Field label="الأولوية"><Input type="number" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field><ToggleBox label="نشط" helper={form.is_active ? "يمكن أن يظهر للعميل" : "مسودة غير ظاهرة"} checked={form.is_active} onChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} /><ToggleBox label="مميز" helper={form.is_featured ? "عرض ذو أولوية بصرية" : "عرض عادي"} checked={form.is_featured} onChange={(checked) => setForm((current) => ({ ...current, is_featured: checked }))} /></div>
                  </FormSection>

                  <FormSection title={`المنتجات المشمولة (${form.apply_to_all ? "الكل" : form.product_ids.length})`} icon={ShoppingBag}>
                    <ToggleBox label="تطبيق على جميع المنتجات" helper="لن تحتاج لاختيار المنتجات يدويًا" checked={form.apply_to_all} onChange={(checked) => setForm((current) => ({ ...current, apply_to_all: checked }))} />

                    {!form.apply_to_all && (
                      <>
                        {selectedProducts.length > 0 && <div className="space-y-[5px]">{selectedProducts.map((product, index) => <div key={product.id} className="flex items-center gap-[8px] rounded-[9px] border border-[#E6E9EE] bg-[#FAFBFC] p-[7px]"><div className="flex h-[42px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-white">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBag className="h-[11px] w-[11px] text-[#A0A6AF]" />}</div><div className="min-w-0 flex-1"><p className="truncate text-[10.5px] font-semibold text-[#555D67]">{product.name_ar}</p><p className="mt-[2px] text-[9.5px] text-[#9AA2AC]">{product.brand || "بدون ماركة"} · {Number(product.price || 0).toLocaleString("en-US")}</p></div><div className="flex gap-[3px]"><button type="button" disabled={index === 0} onClick={() => moveProduct(index, -1)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#E3E7EC] bg-white text-[10px] font-semibold text-[#707883] disabled:opacity-30">↑</button><button type="button" disabled={index === selectedProducts.length - 1} onClick={() => moveProduct(index, 1)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#E3E7EC] bg-white text-[10px] font-semibold text-[#707883] disabled:opacity-30">↓</button><button type="button" onClick={() => toggleProduct(product.id)} className="flex h-[29px] w-[29px] items-center justify-center rounded-[7px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[9px] w-[9px]" /></button></div></div>)}</div>}

                        <div className="relative"><Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#969EA8]" /><Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="ابحث باسم المنتج أو الماركة..." className="h-[38px] rounded-[8px] border-[#E2E6EB] bg-[#F8FAFC] pr-[33px] text-[10.5px] shadow-none focus-visible:bg-white focus-visible:ring-0" />{productSearchQuery.isFetching && <Loader2 className="absolute left-[11px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 animate-spin text-[#675CBA]" />}</div>

                        <div className="grid max-h-[300px] grid-cols-1 gap-[5px] overflow-y-auto rounded-[10px] border border-[#E5E9EF] bg-[#FAFBFC] p-[5px] sm:grid-cols-2">{(productSearchQuery.data || []).map((product) => { const selected = form.product_ids.includes(product.id); return <button type="button" key={product.id} onClick={() => toggleProduct(product.id)} className={cn("flex items-center gap-[7px] rounded-[8px] border p-[6px] text-right transition-colors", selected ? "border-[#CBC5E7] bg-[#F5F3FF]" : "border-transparent bg-white hover:border-[#E1E5EA]")}><Checkbox checked={selected} className="pointer-events-none" /><div className="flex h-[38px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F3F5F7]">{product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ShoppingBag className="h-[10px] w-[10px] text-[#A0A6AF]" />}</div><div className="min-w-0 flex-1"><p className={cn("truncate text-[10px] font-semibold", selected ? "text-[#675CBA]" : "text-[#555D67]")}>{product.name_ar}</p><p className="mt-[2px] truncate text-[9px] text-[#9AA2AC]">{product.brand || "بدون ماركة"}</p></div>{selected && <CheckCircle2 className="h-[12px] w-[12px] shrink-0 text-[#675CBA]" />}</button>; })}</div>
                      </>
                    )}
                  </FormSection>
                </div>

                <aside className="space-y-[10px] xl:sticky xl:top-0 xl:self-start"><PreviewCard form={form} /><ReadinessCard form={form} /></aside>
              </div>
            </div>

            <div className="z-20 flex shrink-0 items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-4 py-3 sm:px-5"><Button type="button" variant="outline" disabled={saveMutation.isPending || uploadingDesktop || uploadingMobile} onClick={closeDialog} className="h-[38px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[10.5px] font-semibold text-[#707883] shadow-none">إلغاء</Button><Button type="submit" disabled={saveMutation.isPending || uploadingDesktop || uploadingMobile} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[12px] w-[12px] animate-spin" /> : <Gift className="ml-[5px] h-[12px] w-[12px]" />}{editingOffer ? "حفظ التعديلات" : "إنشاء العرض"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(next) => { if (!next) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5"><AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]"><Trash2 className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">حذف العرض</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم حذف "{deleteTarget?.title_ar || ""}" نهائيًا. إذا كان العرض مؤقتًا يمكنك تعطيله بدل الحذف.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={deleteMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[10.5px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(duplicateTarget)} onOpenChange={(next) => { if (!next) setDuplicateTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5"><AlertDialogHeader><div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#EDF4FF] text-[#5680CF]"><Copy className="h-[16px] w-[16px]" /></div><AlertDialogTitle className="text-[15px] font-semibold text-[#343A44]">نسخ العرض</AlertDialogTitle><AlertDialogDescription className="text-[10.5px] leading-6 text-[#858D97]">سيتم إنشاء نسخة بجميع إعدادات العرض والمنتجات، وستكون غير مفعلة حتى تقوم بمراجعتها.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="mt-2 gap-2"><AlertDialogCancel disabled={duplicateMutation.isPending} className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[10.5px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel><AlertDialogAction disabled={duplicateMutation.isPending} onClick={(event) => { event.preventDefault(); if (duplicateTarget) duplicateMutation.mutate(duplicateTarget); }} className="h-[38px] rounded-[9px] bg-[#5680CF] px-4 text-[10.5px] font-semibold text-white hover:bg-[#496EAF]">{duplicateMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}إنشاء نسخة</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const SettingsPanel = ({ settings, setSettings, saving, onSave }: { settings: OffersSettings | null; setSettings: (settings: OffersSettings) => void; saving: boolean; onSave: () => void }) => {
  if (!settings) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" /></div>;

  return (
    <div className="grid grid-cols-1 gap-[10px] p-[10px] xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="space-y-[10px]">
        <FormSection title="محتوى صفحة العروض" icon={Settings}>
          <Field label="عنوان الصفحة"><Input value={settings.page_title} onChange={(event) => setSettings({ ...settings, page_title: event.target.value })} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
          <Field label="وصف الصفحة"><Textarea rows={3} value={settings.page_subtitle} onChange={(event) => setSettings({ ...settings, page_subtitle: event.target.value })} className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] leading-6 shadow-none focus-visible:ring-0" /></Field>
          <Field label="نص شريط الترويج"><Input value={settings.promo_banner_text} onChange={(event) => setSettings({ ...settings, promo_banner_text: event.target.value })} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[11px] shadow-none focus-visible:ring-0" /></Field>
          <Field label="نهاية العد التنازلي الرئيسي"><Input type="datetime-local" value={settings.countdown_end_date ? settings.countdown_end_date.slice(0, 16) : ""} onChange={(event) => setSettings({ ...settings, countdown_end_date: event.target.value ? new Date(event.target.value).toISOString() : null })} className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10.5px] shadow-none focus-visible:ring-0" /></Field>
        </FormSection>

        <FormSection title="خيارات الظهور" icon={Gift}>
          <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-2"><ToggleBox label="إظهار العد التنازلي" helper="يظهر في صفحة العروض" checked={settings.show_countdown} onChange={(checked) => setSettings({ ...settings, show_countdown: checked })} /><ToggleBox label="إظهار شريط الترويج" helper="يظهر أعلى محتوى العروض" checked={settings.show_promo_banner} onChange={(checked) => setSettings({ ...settings, show_promo_banner: checked })} /></div>
        </FormSection>

        <div className="flex justify-end"><Button type="button" disabled={saving} onClick={onSave} className="h-[38px] rounded-[9px] bg-[#675CBA] px-5 text-[10.5px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saving && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حفظ الإعدادات</Button></div>
      </div>

      <aside className="xl:sticky xl:top-0 xl:self-start"><div className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="flex h-[32px] w-[32px] items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]"><Gift className="h-[13px] w-[13px]" /></div><p className="mt-[11px] text-[10px] text-[#9AA2AC]">معاينة مختصرة</p><h3 className="mt-[4px] text-[15px] font-semibold text-[#3F4751]">{settings.page_title || "صفحة العروض"}</h3><p className="mt-[6px] text-[10px] leading-5 text-[#858D97]">{settings.page_subtitle || "سيظهر وصف الصفحة هنا."}</p>{settings.show_promo_banner && settings.promo_banner_text && <div className="mt-[10px] rounded-[9px] bg-[#F8F7FF] p-[8px] text-[10px] font-medium text-[#675CBA]">{settings.promo_banner_text}</div>}</div></aside>
    </div>
  );
};

const StatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
  const style = { indigo: { icon: "bg-[#F1EFFF] text-[#675CBA]", line: "bg-[#675CBA]" }, green: { icon: "bg-[#EAF7EE] text-[#629067]", line: "bg-[#629067]" }, blue: { icon: "bg-[#EDF4FF] text-[#5680CF]", line: "bg-[#5680CF]" }, coral: { icon: "bg-[#FFF0ED] text-[#D06A5E]", line: "bg-[#D06A5E]" } }[tone];
  return <article className="relative min-h-[118px] overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white p-[13px]"><span className={cn("absolute inset-x-0 top-0 h-[3px]", style.line)} /><div className={cn("flex h-[32px] w-[32px] items-center justify-center rounded-[10px]", style.icon)}><Icon className="h-[14px] w-[14px]" /></div><p className="mt-[12px] text-[10.5px] text-[#8D949E]">{title}</p><p className="mt-[4px] truncate text-[18px] font-semibold leading-none text-[#303741]">{value}</p><p className="mt-[6px] truncate text-[10px] text-[#A0A6AF]">{helper}</p></article>;
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[11px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => <div><Label className="mb-[6px] block text-[10.5px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
const ToggleBox = ({ label, helper, checked, onChange }: { label: string; helper: string; checked: boolean; onChange: (checked: boolean) => void }) => <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]"><div><p className="text-[10.5px] font-semibold text-[#555D67]">{label}</p><p className="mt-[3px] text-[9.5px] text-[#9BA2AC]">{helper}</p></div><Switch checked={checked} onCheckedChange={onChange} /></div>;

const StatusBadge = ({ status }: { status: OfferStatus }) => {
  const config = { live: { label: "مباشر", className: "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]", icon: CheckCircle2 }, scheduled: { label: "مجدول", className: "border-[#DCE7F4] bg-[#F1F6FC] text-[#5679A4]", icon: CalendarClock }, expired: { label: "منتهي", className: "border-[#F0D7D4] bg-[#FFF3F1] text-[#C15F56]", icon: CircleOff }, draft: { label: "مسودة", className: "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]", icon: CircleOff } }[status];
  const Icon = config.icon;
  return <span className={cn("inline-flex h-[26px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9.5px] font-semibold", config.className)}><Icon className="h-[9px] w-[9px]" />{config.label}</span>;
};

const TypeBadge = ({ type }: { type: OfferType }) => {
  const label = type === "flash" ? "فلاش" : type === "clearance" ? "تصفية" : type === "general" ? "عام" : "موسمي";
  return <span className="inline-flex h-[26px] items-center rounded-[7px] border border-[#E3E7EC] bg-[#F8FAFC] px-[8px] text-[9.5px] font-semibold text-[#68717B]">{label}</span>;
};

const ImageUploader = ({ title, helper, value, uploading, onUpload, onRemove, mobile = false }: { title: string; helper: string; value: string; uploading: boolean; onUpload: (file: File) => void; onRemove: () => void; mobile?: boolean }) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onUpload(file); };
  return <div className="overflow-hidden rounded-[11px] border border-[#E5E9EF] bg-[#FAFBFC]"><div className={cn("relative bg-[#F1F3F5]", mobile ? "aspect-[4/5]" : "aspect-[16/10]")}>{value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-[#A0A6AF]">{mobile ? <Smartphone className="h-[20px] w-[20px]" /> : <ImageIcon className="h-[20px] w-[20px]" />}<p className="mt-[6px] text-[9.5px]">لا توجد صورة</p></div>}{value && <button type="button" onClick={onRemove} className="absolute left-[7px] top-[7px] flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white/95 text-[#C15F56] shadow-sm"><Trash2 className="h-[10px] w-[10px]" /></button>}</div><div className="p-[9px]"><p className="text-[10.5px] font-semibold text-[#59616B]">{title}</p><p className="mt-[3px] text-[9px] text-[#9AA2AC]">{helper}</p><label className={cn("mt-[8px] flex h-[34px] cursor-pointer items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[10px] font-semibold text-[#675CBA]", uploading && "pointer-events-none opacity-60")}>{uploading ? <Loader2 className="h-[10px] w-[10px] animate-spin" /> : <Upload className="h-[10px] w-[10px]" />}{value ? "استبدال الصورة" : "رفع صورة"}<input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleChange} /></label></div></div>;
};

const PreviewCard = ({ form }: { form: OfferForm }) => {
  const image = form.mobile_image_url || form.image_url;
  return <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white"><div className="flex items-center gap-[7px] border-b border-[#EDF0F3] px-[11px] py-[9px]"><Smartphone className="h-[11px] w-[11px] text-[#675CBA]" /><h3 className="text-[10.5px] font-semibold text-[#4A525C]">معاينة الهاتف</h3></div><div className="p-[10px]"><div className="mx-auto max-w-[270px] overflow-hidden rounded-[18px] border-[5px] border-[#22272E] bg-white"><div className="relative aspect-[4/5] bg-[#F2F4F6]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[#A1A8B0]"><ImageIcon className="h-[24px] w-[24px]" /></div>}<div className="absolute inset-x-0 bottom-0 bg-black/40 p-[12px] text-white">{form.badge_text && <span className="mb-[5px] inline-block rounded-[5px] bg-white px-[6px] py-[3px] text-[8px] font-semibold text-[#343A44]">{form.badge_text}</span>}<h4 className="text-[13px] font-semibold">{form.title_ar || "عنوان العرض"}</h4>{Number(form.discount_percentage) > 0 && <p className="mt-[4px] text-[15px] font-semibold">خصم {form.discount_percentage}%</p>}{form.cta_label && <span className="mt-[8px] inline-flex h-[28px] items-center rounded-[7px] bg-white px-[9px] text-[9px] font-semibold text-[#343A44]">{form.cta_label}</span>}</div></div></div></div></section>;
};

const ReadinessCard = ({ form }: { form: OfferForm }) => {
  const checks = [{ label: "عنوان", done: Boolean(form.title_ar.trim()) }, { label: "نسبة الخصم", done: Number(form.discount_percentage) > 0 }, { label: "صورة", done: Boolean(form.image_url) }, { label: "المنتجات", done: form.apply_to_all || form.product_ids.length > 0 }, { label: "زر CTA", done: Boolean(form.cta_label.trim()) }, { label: "الجدولة", done: Boolean(form.start_date || form.end_date) }];
  const complete = checks.filter((item) => item.done).length;
  const percent = Math.round((complete / checks.length) * 100);
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[11px]"><div className="flex items-center justify-between"><h3 className="text-[10.5px] font-semibold text-[#4A525C]">جاهزية العرض</h3><span className="text-[11px] font-semibold text-[#675CBA]">{percent}%</span></div><div className="mt-[9px] h-[5px] overflow-hidden rounded-full bg-[#EEF0F3]"><div className="h-full rounded-full bg-[#675CBA] transition-all" style={{ width: `${percent}%` }} /></div><div className="mt-[9px] grid grid-cols-2 gap-[5px]">{checks.map((item) => <div key={item.label} className={cn("flex items-center gap-[5px] rounded-[7px] px-[7px] py-[6px] text-[9.5px] font-medium", item.done ? "bg-[#EFF8F2] text-[#568468]" : "bg-[#F7F8FA] text-[#9299A3]")}>{item.done ? <CheckCircle2 className="h-[9px] w-[9px]" /> : <CircleOff className="h-[9px] w-[9px]" />}{item.label}</div>)}</div></section>;
};

const PanelEmpty = ({ onCreate }: { onCreate: () => void }) => <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center"><div className="flex h-[50px] w-[50px] items-center justify-center rounded-[14px] bg-[#F1EFFF] text-[#675CBA]"><Gift className="h-[20px] w-[20px]" /></div><h3 className="mt-3 text-[12px] font-semibold text-[#535B65]">لا توجد عروض</h3><p className="mt-[5px] max-w-[360px] text-[10px] leading-5 text-[#9BA2AC]">أنشئ أول عرض وحدد نسبة الخصم والمنتجات وفترة ظهوره.</p><Button type="button" onClick={onCreate} className="mt-3 h-[36px] rounded-[9px] bg-[#675CBA] px-4 text-[10px] font-semibold text-white shadow-none hover:bg-[#594FAB]"><Plus className="ml-[5px] h-[10px] w-[10px]" />عرض جديد</Button></div>;

const formatSchedule = (start: string | null, end: string | null) => {
  if (!start && !end) return "بدون فترة محددة";
  const startText = start ? formatDate(start) : "فوري";
  const endText = end ? formatDate(end) : "مستمر";
  return `${startText} ← ${endText}`;
};

const formatDate = (value: string) => {
  try { return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); } catch { return "—"; }
};

const translateError = (message?: string) => {
  const value = String(message || "");
  if (value.includes("offers_discount_percentage_check")) return "نسبة الخصم يجب أن تكون بين 0 و100.";
  if (value.includes("offers_schedule_check")) return "تاريخ نهاية العرض يجب أن يكون بعد تاريخ البداية.";
  return value || "حدث خطأ غير متوقع.";
};

export default AdminOffersPage;