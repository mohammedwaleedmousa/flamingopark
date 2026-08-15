import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Check, CheckCircle2, CircleOff, Eye, Image as ImageIcon, Loader2, MessageSquareText, Package, Pencil, Plus, Search, ShieldCheck, Star, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  customer_name: string;
  product_id: string;
  comment: string | null;
  rating: number;
  country: string;
  is_approved: boolean | null;
  created_at: string;
  updated_at?: string;
  images?: string[] | null;
}

interface ProductRow {
  id: string;
  name: string;
  name_ar: string | null;
  images: string[] | null;
  is_active: boolean;
}

type ReviewForm = {
  product_id: string;
  customer_name: string;
  comment: string;
  rating: number;
  country: string;
  is_approved: boolean;
};

type StatusFilter = "all" | "approved" | "pending";
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1";
type SortMode = "newest" | "oldest" | "highest" | "lowest";

const SINGLE_COUNTRY = "YE";

const emptyForm = (): ReviewForm => ({
  product_id: "",
  customer_name: "",
  comment: "",
  rating: 5,
  country: SINGLE_COUNTRY,
  is_approved: false,
});

const AdminReviewsPage = () => {
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [imagePreview, setImagePreview] = useState<{ images: string[]; index: number } | null>(null);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("pending");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const [formData, setFormData] = useState<ReviewForm>(emptyForm());
  const [productSearch, setProductSearch] = useState("");

  /* =========================================================
     REVIEWS
  ========================================================= */

  const { data: reviews = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_reviews").select("id,customer_name,product_id,comment,rating,country,is_approved,created_at,updated_at,images").order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as Review[];
    },
    staleTime: 20_000,
  });

  /* =========================================================
     PRODUCTS USED BY REVIEWS
  ========================================================= */

  const reviewProductIds = useMemo(() => Array.from(new Set(reviews.map((review) => review.product_id).filter(Boolean))), [reviews]);

  const { data: reviewProducts = [] } = useQuery({
    queryKey: ["admin-review-products", reviewProductIds],
    enabled: reviewProductIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,name_ar,images,is_active").in("id", reviewProductIds);

      if (error) throw error;

      return (data || []) as ProductRow[];
    },
    staleTime: 60_000,
  });

  const productMap = useMemo(() => new Map(reviewProducts.map((product) => [product.id, product])), [reviewProducts]);

  /* =========================================================
     PRODUCT PICKER
     Remote search keeps this page light even with a large catalog.
  ========================================================= */

  const { data: productOptions = [], isFetching: productSearchLoading } = useQuery({
    queryKey: ["admin-review-product-picker", productSearch],
    enabled: isDialogOpen,
    queryFn: async () => {
      const query = productSearch.trim();

      let request = supabase.from("products").select("id,name,name_ar,images,is_active").eq("is_active", true).order("created_at", { ascending: false }).limit(30);

      if (query) {
        const safeQuery = query.replace(/[%_,()]/g, " ").trim();
        request = request.or(`name.ilike.%${safeQuery}%,name_ar.ilike.%${safeQuery}%`);
      }

      const { data, error } = await request;

      if (error) throw error;

      return (data || []) as ProductRow[];
    },
    staleTime: 15_000,
  });

  const selectedFormProduct = useMemo(() => {
    if (!formData.product_id) return null;
    return productOptions.find((product) => product.id === formData.product_id) || productMap.get(formData.product_id) || null;
  }, [formData.product_id, productOptions, productMap]);

  /* =========================================================
     STATS / FILTERS
  ========================================================= */

  const stats = useMemo(() => {
    const approved = reviews.filter((review) => review.is_approved === true).length;
    const pending = reviews.length - approved;
    const withImages = reviews.filter((review) => Boolean(review.images?.length)).length;
    const average = reviews.length > 0 ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length : 0;

    return {
      total: reviews.length,
      approved,
      pending,
      withImages,
      average,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    const rows = reviews.filter((review) => {
      const product = productMap.get(review.product_id);
      const text = `${review.customer_name} ${review.comment || ""} ${product?.name || ""} ${product?.name_ar || ""}`.toLowerCase();

      const matchesSearch = !query || text.includes(query);

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "approved" && review.is_approved === true) ||
        (filterStatus === "pending" && review.is_approved !== true);

      const matchesRating = ratingFilter === "all" || review.rating === Number(ratingFilter);

      return matchesSearch && matchesStatus && matchesRating;
    });

    return [...rows].sort((a, b) => {
      if (sortMode === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortMode === "highest") return b.rating - a.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortMode === "lowest") return a.rating - b.rating || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reviews, productMap, search, filterStatus, ratingFilter, sortMode]);

  const hasFilters = Boolean(search.trim()) || filterStatus !== "pending" || ratingFilter !== "all" || sortMode !== "newest";

  /* =========================================================
     FORM
  ========================================================= */

  const resetForm = () => {
    setFormData(emptyForm());
    setProductSearch("");
    setEditingReview(null);
    setIsDialogOpen(false);
  };

  const openCreate = () => {
    setEditingReview(null);
    setProductSearch("");
    setFormData(emptyForm());
    setIsDialogOpen(true);
  };

  const handleEdit = (review: Review) => {
    const product = productMap.get(review.product_id);

    setEditingReview(review);
    setProductSearch(product?.name_ar || product?.name || "");
    setFormData({
      product_id: review.product_id,
      customer_name: review.customer_name,
      comment: review.comment || "",
      rating: Math.max(1, Math.min(5, Number(review.rating || 5))),
      country: review.country || SINGLE_COUNTRY,
      is_approved: review.is_approved ?? false,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (saveMutation.isPending) return;
    resetForm();
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const saveMutation = useMutation({
    mutationFn: async (data: ReviewForm & { id?: string }) => {
      const customerName = data.customer_name.trim();
      const comment = data.comment.trim();
      const rating = Number(data.rating);

      if (!data.product_id) throw new Error("اختر المنتج أولًا.");
      if (!customerName) throw new Error("اسم العميل مطلوب.");
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("التقييم يجب أن يكون من 1 إلى 5 نجوم.");

      const payload = {
        product_id: data.product_id,
        customer_name: customerName,
        comment: comment || null,
        rating,
        country: SINGLE_COUNTRY,
        is_approved: data.is_approved,
      };

      if (data.id) {
        const { error } = await supabase.from("product_reviews").update(payload).eq("id", data.id);

        if (error) throw error;

        return;
      }

      const { error } = await supabase.from("product_reviews").insert({
        ...payload,
        images: [],
      });

      if (error) throw error;
    },

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["product-reviews"] }),
      ]);

      toast({
        title: editingReview ? "تم تحديث التقييم" : "تم إضافة التقييم",
        description: formData.is_approved ? "التقييم معتمد وسيظهر للعميل." : "التقييم محفوظ بانتظار الاعتماد.",
      });

      resetForm();
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حفظ التقييم",
        description: error?.message || "حدث خطأ أثناء الحفظ.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    saveMutation.mutate({
      ...formData,
      id: editingReview?.id,
    });
  };

  /* =========================================================
     APPROVAL
  ========================================================= */

  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase.from("product_reviews").update({ is_approved }).eq("id", id);

      if (error) throw error;

      return { id, is_approved };
    },

    onMutate: async ({ id, is_approved }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-reviews"] });

      const previous = queryClient.getQueryData<Review[]>(["admin-reviews"]);

      queryClient.setQueryData<Review[]>(["admin-reviews"], (current = []) => current.map((review) => review.id === id ? { ...review, is_approved } : review));

      return { previous };
    },

    onSuccess: async (_data, variables) => {
      toast({
        title: variables.is_approved ? "تم اعتماد التقييم" : "تم إلغاء اعتماد التقييم",
      });
    },

    onError: (error: any, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(["admin-reviews"], context.previous);

      toast({
        title: "تعذر تحديث حالة التقييم",
        description: error?.message || "حدث خطأ أثناء التحديث.",
        variant: "destructive",
      });
    },

    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["product-reviews"] }),
      ]);
    },
  });

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteMutation = useMutation({
    mutationFn: async (review: Review) => {
      const { error } = await supabase.from("product_reviews").delete().eq("id", review.id);

      if (error) throw error;
    },

    onSuccess: async () => {
      setDeleteTarget(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["product-reviews"] }),
      ]);

      toast({ title: "تم حذف التقييم" });
    },

    onError: (error: any) => {
      toast({
        title: "تعذر حذف التقييم",
        description: error?.message || "حدث خطأ أثناء الحذف.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     RENDER
  ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[430px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-[14px] border border-[#E5E9EF] bg-white">
            <Loader2 className="h-[18px] w-[18px] animate-spin text-[#675CBA]" />
          </div>
          <p className="mt-3 text-[10px] font-medium text-[#969DA7]">جاري تحميل التقييمات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <AdminPageHeader category="المحتوى والثقة" title="التقييمات" description="مراجعة تقييمات العملاء واعتماد المحتوى الذي يظهر في صفحات المنتجات" actions={[{ label: "إضافة تقييم", icon: Plus, onClick: openCreate, variant: "primary" }]} />

      <section className="grid grid-cols-2 gap-[9px] lg:grid-cols-4">
        <ReviewStatCard title="إجمالي التقييمات" value={stats.total.toLocaleString("en-US")} helper={`${stats.withImages} تقييم يحتوي صورًا`} icon={MessageSquareText} tone="indigo" />
        <ReviewStatCard title="بانتظار المراجعة" value={stats.pending.toLocaleString("en-US")} helper="تحتاج قرار اعتماد أو رفض" icon={CircleOff} tone="coral" />
        <ReviewStatCard title="التقييمات المعتمدة" value={stats.approved.toLocaleString("en-US")} helper="ظاهرة للعملاء في المتجر" icon={CheckCircle2} tone="green" />
        <ReviewStatCard title="متوسط التقييم" value={`${stats.average.toFixed(1)} / 5`} helper="محسوب من جميع التقييمات" icon={Star} tone="blue" />
      </section>

      {stats.pending > 0 && (
        <section className="rounded-[12px] border border-[#EEDFC4] bg-[#FFF9EF] px-[12px] py-[10px]">
          <div className="flex items-start gap-[8px]">
            <ShieldCheck className="mt-[1px] h-[13px] w-[13px] shrink-0 text-[#B17C37]" />
            <div>
              <p className="text-[10px] font-semibold text-[#9A7139]">لديك {stats.pending.toLocaleString("ar-EG")} تقييم بانتظار المراجعة</p>
              <p className="mt-[3px] text-[9px] leading-5 text-[#8A7659]">التقييمات الجديدة لا تظهر للعميل حتى تعتمدها. راجع النص والصور والنجوم قبل النشر.</p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDF0F3] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#444B55]">البحث والتصفية</h2>
            <p className="mt-[3px] text-[9px] text-[#9BA2AC]">ابحث بالعميل أو المنتج أو محتوى التقييم</p>
          </div>

          {hasFilters && (
            <button type="button" onClick={() => { setSearch(""); setFilterStatus("pending"); setRatingFilter("all"); setSortMode("newest"); }} className="flex h-[30px] items-center gap-[5px] rounded-[8px] px-[9px] text-[9px] font-semibold text-[#7E8690] hover:bg-[#F7F8FA]">
              <X className="h-[10px] w-[10px]" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-[7px] p-[11px] lg:grid-cols-[minmax(0,1fr)_170px_155px_185px]">
          <div className="relative">
            <Search className="pointer-events-none absolute right-[12px] top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[#969EA8]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="اسم العميل، المنتج أو نص التقييم..." className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] pr-[35px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
          </div>

          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">بانتظار المراجعة</SelectItem>
              <SelectItem value="approved">معتمدة</SelectItem>
              <SelectItem value="all">كل الحالات</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={(value) => setRatingFilter(value as RatingFilter)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل النجوم</SelectItem>
              <SelectItem value="5">5 نجوم</SelectItem>
              <SelectItem value="4">4 نجوم</SelectItem>
              <SelectItem value="3">3 نجوم</SelectItem>
              <SelectItem value="2">نجمتان</SelectItem>
              <SelectItem value="1">نجمة واحدة</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="h-[40px] rounded-[9px] border-[#E3E7EC] bg-[#F8FAFC] text-[10px] shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">الأحدث أولًا</SelectItem>
              <SelectItem value="oldest">الأقدم أولًا</SelectItem>
              <SelectItem value="highest">الأعلى تقييمًا</SelectItem>
              <SelectItem value="lowest">الأقل تقييمًا</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="hidden overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white md:block">
        <div className="flex items-center justify-between border-b border-[#EAEDF1] px-[13px] py-[10px]">
          <div>
            <h2 className="text-[11px] font-semibold text-[#454C56]">قائمة التقييمات</h2>
            <p className="mt-[3px] text-[9px] text-[#9CA3AC]">{filteredReviews.length.toLocaleString("ar-EG")} تقييم ظاهر</p>
          </div>

          {isFetching && (
            <span className="flex items-center gap-[5px] text-[9px] text-[#969DA7]">
              <Loader2 className="h-[10px] w-[10px] animate-spin" />
              تحديث...
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px]">
            <thead>
              <tr className="h-[42px] border-b border-[#EAEDF1] bg-[#FAFBFC] text-[10px] font-semibold text-[#858D97]">
                <th className="px-[12px] text-right">العميل</th>
                <th className="px-[12px] text-right">المنتج</th>
                <th className="px-[12px] text-right">التقييم</th>
                <th className="px-[12px] text-right">النجوم</th>
                <th className="px-[12px] text-right">الصور</th>
                <th className="px-[12px] text-right">التاريخ</th>
                <th className="px-[12px] text-right">الحالة</th>
                <th className="w-[145px] px-[12px] text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <ReviewsEmpty />
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const product = productMap.get(review.product_id);
                  const images = review.images?.filter(Boolean) || [];

                  return (
                    <tr key={review.id} className="h-[76px] border-b border-[#F0F2F5] transition-colors last:border-b-0 hover:bg-[#FCFDFE]">
                      <td className="px-[12px]">
                        <div className="flex items-center gap-[8px]">
                          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#F1EFFF] text-[#675CBA]">
                            <UserRound className="h-[13px] w-[13px]" />
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[170px] truncate text-[10.5px] font-semibold text-[#414953]">{review.customer_name}</p>
                            <p className="mt-[3px] text-[8px] text-[#9AA2AC]">عميل المتجر</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <div className="flex min-w-[190px] items-center gap-[8px]">
                          <ProductImage product={product} />

                          <div className="min-w-0">
                            <p className="max-w-[190px] truncate text-[10px] font-semibold text-[#555D67]">{product?.name_ar || product?.name || "منتج غير متاح"}</p>
                            {!product?.is_active && product && <p className="mt-[2px] text-[8px] text-[#B16A61]">المنتج معطل</p>}
                          </div>
                        </div>
                      </td>

                      <td className="px-[12px]">
                        <p className="max-w-[280px] truncate text-[9.5px] leading-5 text-[#69717B]">{review.comment || "بدون تعليق نصي"}</p>
                      </td>

                      <td className="px-[12px]">
                        <RatingStars rating={review.rating} />
                      </td>

                      <td className="px-[12px]">
                        {images.length > 0 ? (
                          <button type="button" onClick={() => setImagePreview({ images, index: 0 })} className="inline-flex h-[27px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[8px] text-[9px] font-semibold text-[#5679A4]">
                            <ImageIcon className="h-[9px] w-[9px]" />
                            {images.length} صور
                          </button>
                        ) : (
                          <span className="text-[9px] text-[#A0A6AF]">—</span>
                        )}
                      </td>

                      <td className="px-[12px]">
                        <span className="text-[9.5px] text-[#7E8690]">{formatDate(review.created_at)}</span>
                      </td>

                      <td className="px-[12px]">
                        <ReviewStatus approved={Boolean(review.is_approved)} />
                      </td>

                      <td className="px-[12px]">
                        <div className="flex items-center justify-center gap-[4px]">
                          <button type="button" title={review.is_approved ? "إلغاء الاعتماد" : "اعتماد التقييم"} onClick={() => toggleApprovalMutation.mutate({ id: review.id, is_approved: !review.is_approved })} className={cn("flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border bg-white", review.is_approved ? "border-[#EEDFC4] text-[#A9782F] hover:bg-[#FFF9EF]" : "border-[#D8E8DD] text-[#568468] hover:bg-[#EFF8F2]")}>
                            {review.is_approved ? <X className="h-[11px] w-[11px]" /> : <Check className="h-[11px] w-[11px]" />}
                          </button>

                          <button type="button" title="تعديل التقييم" onClick={() => handleEdit(review)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#E3E7EC] bg-white text-[#675CBA] hover:bg-[#F5F3FF]">
                            <Pencil className="h-[11px] w-[11px]" />
                          </button>

                          <button type="button" title="حذف التقييم" onClick={() => setDeleteTarget(review)} className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56] hover:bg-[#FFF3F1]">
                            <Trash2 className="h-[11px] w-[11px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-[8px] md:hidden">
        {filteredReviews.length === 0 ? (
          <ReviewsEmpty />
        ) : (
          filteredReviews.map((review) => {
            const product = productMap.get(review.product_id);
            const images = review.images?.filter(Boolean) || [];

            return (
              <article key={review.id} className="overflow-hidden rounded-[14px] border border-[#E5E9EF] bg-white">
                <div className="p-[11px]">
                  <div className="flex items-start justify-between gap-[8px]">
                    <div className="flex min-w-0 gap-[8px]">
                      <ProductImage product={product} mobile />

                      <div className="min-w-0">
                        <h3 className="truncate text-[11px] font-semibold text-[#3B424C]">{product?.name_ar || product?.name || "منتج غير متاح"}</h3>
                        <p className="mt-[3px] truncate text-[9px] text-[#9299A3]">{review.customer_name}</p>
                      </div>
                    </div>

                    <ReviewStatus approved={Boolean(review.is_approved)} />
                  </div>

                  <div className="mt-[9px] flex items-center justify-between gap-[8px]">
                    <RatingStars rating={review.rating} />
                    <span className="text-[9px] text-[#9AA2AC]">{formatDate(review.created_at)}</span>
                  </div>

                  <p className="mt-[9px] line-clamp-3 text-[10px] leading-6 text-[#68717B]">{review.comment || "بدون تعليق نصي"}</p>

                  {images.length > 0 && (
                    <button type="button" onClick={() => setImagePreview({ images, index: 0 })} className="mt-[8px] inline-flex h-[28px] items-center gap-[5px] rounded-[7px] border border-[#DCE7F4] bg-[#F1F6FC] px-[8px] text-[9px] font-semibold text-[#5679A4]">
                      <ImageIcon className="h-[10px] w-[10px]" />
                      عرض {images.length} صور
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_1fr_42px] gap-[5px] border-t border-[#EDF0F3] bg-[#FAFBFC] p-[7px]">
                  <button type="button" onClick={() => toggleApprovalMutation.mutate({ id: review.id, is_approved: !review.is_approved })} className={cn("flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border bg-white text-[9px] font-semibold", review.is_approved ? "border-[#EEDFC4] text-[#A9782F]" : "border-[#D8E8DD] text-[#568468]")}>{review.is_approved ? <X className="h-[10px] w-[10px]" /> : <Check className="h-[10px] w-[10px]" />}{review.is_approved ? "إلغاء الاعتماد" : "اعتماد"}</button>
                  <button type="button" onClick={() => handleEdit(review)} className="flex h-[35px] items-center justify-center gap-[5px] rounded-[8px] border border-[#E2DEF3] bg-white text-[9px] font-semibold text-[#675CBA]"><Pencil className="h-[10px] w-[10px]" />تعديل</button>
                  <button type="button" onClick={() => setDeleteTarget(review)} className="flex h-[35px] w-[42px] items-center justify-center rounded-[8px] border border-[#F0D7D4] bg-white text-[#C15F56]"><Trash2 className="h-[11px] w-[11px]" /></button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {/* =====================================================
          EDITOR
      ===================================================== */}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setIsDialogOpen(true); }}>
        <DialogContent dir="rtl" className="max-h-[92vh] max-w-[720px] overflow-y-auto rounded-[18px] border-[#E4E8ED] bg-[#F7F8FA] p-0">
          <DialogHeader className="sticky top-0 z-20 border-b border-[#E6E9EE] bg-white px-5 py-4">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[11px] bg-[#F1EFFF] text-[#675CBA]">
                {editingReview ? <Pencil className="h-[15px] w-[15px]" /> : <Plus className="h-[15px] w-[15px]" />}
              </div>

              <div>
                <DialogTitle className="text-right text-[14px] font-semibold text-[#343B45]">{editingReview ? "تعديل التقييم" : "إضافة تقييم جديد"}</DialogTitle>
                <DialogDescription className="mt-[3px] text-right text-[9px] text-[#9299A3]">اختر المنتج وأدخل تقييم العميل ثم حدد ما إذا كان سيظهر مباشرة في المتجر.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-[10px] p-[10px]">
              <FormSection title="المنتج" icon={Package}>
                <Field label="بحث عن المنتج" required>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-[11px] top-1/2 h-[12px] w-[12px] -translate-y-1/2 text-[#9AA1AB]" />
                    <Input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="اكتب اسم المنتج..." className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] pr-[34px] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                    {productSearchLoading && <Loader2 className="absolute left-[11px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 animate-spin text-[#675CBA]" />}
                  </div>
                </Field>

                <div className="max-h-[210px] space-y-[5px] overflow-y-auto rounded-[10px] border border-[#E7EAEF] bg-[#FAFBFC] p-[6px]">
                  {selectedFormProduct && !productOptions.some((product) => product.id === selectedFormProduct.id) && (
                    <ProductOption product={selectedFormProduct} selected onSelect={() => setFormData((current) => ({ ...current, product_id: selectedFormProduct.id }))} />
                  )}

                  {productOptions.map((product) => (
                    <ProductOption key={product.id} product={product} selected={formData.product_id === product.id} onSelect={() => setFormData((current) => ({ ...current, product_id: product.id }))} />
                  ))}

                  {!productSearchLoading && productOptions.length === 0 && <p className="py-8 text-center text-[9px] text-[#9BA2AC]">لا توجد منتجات مطابقة.</p>}
                </div>
              </FormSection>

              <FormSection title="بيانات التقييم" icon={MessageSquareText}>
                <Field label="اسم العميل" required>
                  <Input value={formData.customer_name} onChange={(event) => setFormData((current) => ({ ...current, customer_name: event.target.value }))} placeholder="اسم العميل" className="h-[40px] rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <Field label="التعليق">
                  <Textarea rows={6} value={formData.comment} onChange={(event) => setFormData((current) => ({ ...current, comment: event.target.value }))} placeholder="اكتب تجربة العميل مع المنتج..." className="resize-none rounded-[9px] border-[#E2E6EB] bg-[#F8FAFC] text-[10px] leading-6 shadow-none focus-visible:bg-white focus-visible:ring-0" />
                </Field>

                <Field label="عدد النجوم" required>
                  <div className="grid grid-cols-5 gap-[6px]" dir="ltr">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button key={rating} type="button" onClick={() => setFormData((current) => ({ ...current, rating }))} className={cn("flex h-[42px] items-center justify-center rounded-[9px] border transition-colors", rating <= formData.rating ? "border-[#E9D59C] bg-[#FFF8E8] text-[#C79632]" : "border-[#E3E7EC] bg-white text-[#C3C8CE] hover:bg-[#FAFBFC]")}>
                        <Star className={cn("h-[15px] w-[15px]", rating <= formData.rating && "fill-current")} />
                      </button>
                    ))}
                  </div>

                  <p className="mt-[5px] text-[9px] text-[#9299A3]">{ratingLabel(formData.rating)}</p>
                </Field>
              </FormSection>

              <FormSection title="المراجعة والنشر" icon={ShieldCheck}>
                <div className="flex min-h-[68px] items-center justify-between rounded-[10px] border border-[#E6E9EE] bg-[#FAFBFC] px-[11px]">
                  <div>
                    <p className="text-[10px] font-semibold text-[#555D67]">اعتماد التقييم</p>
                    <p className="mt-[3px] text-[9px] text-[#9BA2AC]">{formData.is_approved ? "سيظهر التقييم للعميل في صفحة المنتج" : "سيبقى التقييم في قائمة المراجعة"}</p>
                  </div>

                  <Switch checked={formData.is_approved} onCheckedChange={(checked) => setFormData((current) => ({ ...current, is_approved: checked }))} />
                </div>
              </FormSection>

              {editingReview?.images?.length ? (
                <FormSection title="صور العميل" icon={ImageIcon}>
                  <div className="grid grid-cols-4 gap-[6px] sm:grid-cols-5">
                    {editingReview.images.filter(Boolean).map((image, index) => (
                      <button key={`${image}-${index}`} type="button" onClick={() => setImagePreview({ images: editingReview.images!.filter(Boolean), index })} className="aspect-square overflow-hidden rounded-[9px] border border-[#E5E9EF] bg-[#F5F6F8]">
                        <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <p className="text-[9px] leading-5 text-[#9BA2AC]">صور العميل محفوظة كما هي. هذه الصفحة لا تحذف الصور من التقييم أثناء تعديل النص أو حالة الاعتماد.</p>
                </FormSection>
              ) : null}
            </div>

            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-[7px] border-t border-[#E5E9EF] bg-white px-5 py-3">
              <Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={closeDialog} className="h-[36px] rounded-[9px] border-[#E1E5EA] bg-white px-4 text-[9px] font-semibold text-[#707883] shadow-none">إلغاء</Button>
              <Button type="submit" disabled={saveMutation.isPending || !formData.product_id} className="h-[36px] rounded-[9px] bg-[#675CBA] px-5 text-[9px] font-semibold text-white shadow-none hover:bg-[#594FAB]">{saveMutation.isPending ? <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" /> : editingReview ? <Pencil className="ml-[5px] h-[11px] w-[11px]" /> : <Plus className="ml-[5px] h-[11px] w-[11px]" />}{editingReview ? "حفظ التعديلات" : "إضافة التقييم"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          IMAGE PREVIEW
      ===================================================== */}

      <Dialog open={Boolean(imagePreview)} onOpenChange={(open) => { if (!open) setImagePreview(null); }}>
        <DialogContent dir="rtl" className="max-w-[720px] overflow-hidden rounded-[16px] border-[#E4E8ED] bg-white p-0">
          <DialogHeader className="border-b border-[#E8EBEF] px-4 py-3">
            <DialogTitle className="text-right text-[12px] font-semibold text-[#444B55]">صور التقييم</DialogTitle>
          </DialogHeader>

          {imagePreview && (
            <div className="p-[10px]">
              <div className="aspect-[4/3] overflow-hidden rounded-[11px] bg-[#F5F6F8]">
                <img src={imagePreview.images[imagePreview.index]} alt="" className="h-full w-full object-contain" />
              </div>

              {imagePreview.images.length > 1 && (
                <div className="mt-[7px] flex gap-[6px] overflow-x-auto pb-[2px]">
                  {imagePreview.images.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" onClick={() => setImagePreview((current) => current ? { ...current, index } : current)} className={cn("h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[8px] border bg-[#F5F6F8]", index === imagePreview.index ? "border-[#675CBA]" : "border-[#E4E8ED]")}>
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =====================================================
          DELETE
      ===================================================== */}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl" className="max-w-[430px] rounded-[15px] border-[#E4E8ED] bg-white p-5">
          <AlertDialogHeader>
            <div className="mb-2 flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#FFF0F0] text-[#C76161]">
              <Trash2 className="h-[16px] w-[16px]" />
            </div>

            <AlertDialogTitle className="text-[14px] font-semibold text-[#343A44]">حذف التقييم</AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] leading-6 text-[#858D97]">سيتم حذف تقييم "{deleteTarget?.customer_name || ""}" نهائيًا. إذا كان معتمدًا فسيتوقف ظهوره في صفحة المنتج فور تحديث البيانات.</AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 gap-2">
            <AlertDialogCancel className="h-[38px] rounded-[9px] border-[#E2E6EB] bg-white px-4 text-[9px] font-semibold text-[#6B737E]">إلغاء</AlertDialogCancel>
            <AlertDialogAction disabled={deleteMutation.isPending} onClick={(event) => { event.preventDefault(); if (deleteTarget) deleteMutation.mutate(deleteTarget); }} className="h-[38px] rounded-[9px] bg-[#C76161] px-4 text-[9px] font-semibold text-white hover:bg-[#B65555]">{deleteMutation.isPending && <Loader2 className="ml-[5px] h-[11px] w-[11px] animate-spin" />}حذف نهائي</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ar-YE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return "—";
  }
};

const ratingLabel = (rating: number) => {
  if (rating === 5) return "ممتاز";
  if (rating === 4) return "جيد جدًا";
  if (rating === 3) return "جيد";
  if (rating === 2) return "مقبول";
  return "غير مرضٍ";
};

const ReviewStatCard = ({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: LucideIcon; tone: "indigo" | "green" | "blue" | "coral" }) => {
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
      <p className="mt-[12px] text-[10px] text-[#8D949E]">{title}</p>
      <p className="mt-[4px] truncate text-[19px] font-semibold leading-none text-[#303741]">{value}</p>
      <p className="mt-[6px] text-[9px] text-[#A0A6AF]">{helper}</p>
    </article>
  );
};

const ReviewStatus = ({ approved }: { approved: boolean }) => {
  return <span className={cn("inline-flex h-[25px] items-center gap-[5px] rounded-[7px] border px-[8px] text-[9px] font-semibold", approved ? "border-[#D8E8DD] bg-[#EFF8F2] text-[#568468]" : "border-[#EEDFC4] bg-[#FFF7E8] text-[#A9782F]")}><span className={cn("h-[5px] w-[5px] rounded-full", approved ? "bg-[#629067]" : "bg-[#C49446]")} />{approved ? "معتمد" : "معلق"}</span>;
};

const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-[2px]" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={cn("h-[11px] w-[11px]", star <= rating ? "fill-[#D4A443] text-[#D4A443]" : "text-[#D9DDE2]")} />)}
    </div>
  );
};

const ProductImage = ({ product, mobile = false }: { product?: ProductRow; mobile?: boolean }) => {
  const image = product?.images?.find(Boolean) || "";
  const size = mobile ? "h-[52px] w-[46px] rounded-[9px]" : "h-[42px] w-[38px] rounded-[8px]";

  return <div className={cn("flex shrink-0 items-center justify-center overflow-hidden border border-[#E7EAEF] bg-[#F5F6F8]", size)}>{image ? <img src={image} alt={product?.name_ar || product?.name || ""} loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-[12px] w-[12px] text-[#A0A6AF]" />}</div>;
};

const ProductOption = ({ product, selected, onSelect }: { product: ProductRow; selected: boolean; onSelect: () => void }) => {
  return (
    <button type="button" onClick={onSelect} className={cn("flex w-full items-center gap-[8px] rounded-[9px] border p-[7px] text-right transition-colors", selected ? "border-[#CDC7EB] bg-[#F8F6FF]" : "border-[#E6E9EE] bg-white hover:bg-[#F8FAFC]")}>
      <ProductImage product={product} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[9.5px] font-semibold text-[#555D67]">{product.name_ar || product.name}</p>
        <p className="mt-[2px] truncate text-[8px] text-[#9BA2AC]">{product.name}</p>
      </div>

      {selected && <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-[#675CBA] text-white"><Check className="h-[10px] w-[10px]" /></span>}
    </button>
  );
};

const FormSection = ({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) => {
  return <section className="rounded-[14px] border border-[#E5E9EF] bg-white p-[12px]"><div className="mb-[10px] flex items-center gap-[7px] border-b border-[#F0F2F5] pb-[8px]"><div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#F1EFFF] text-[#675CBA]"><Icon className="h-[11px] w-[11px]" /></div><h3 className="text-[10px] font-semibold text-[#4A525C]">{title}</h3></div><div className="space-y-[9px]">{children}</div></section>;
};

const Field = ({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) => {
  return <div><Label className="mb-[6px] block text-[9px] font-semibold text-[#727A84]">{label}{required && <span className="mr-[3px] text-[#C76161]">*</span>}</Label>{children}</div>;
};

const ReviewsEmpty = () => {
  return <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[14px] bg-white px-6 text-center"><div className="flex h-[45px] w-[45px] items-center justify-center rounded-[13px] bg-[#F0F2F5] text-[#8C949E]"><MessageSquareText className="h-[18px] w-[18px]" /></div><h3 className="mt-3 text-[11px] font-semibold text-[#535B65]">لا توجد تقييمات</h3><p className="mt-[4px] text-[9px] text-[#9BA2AC]">غيّر البحث أو الفلاتر، أو أضف تقييمًا جديدًا.</p></div>;
};

export default AdminReviewsPage;