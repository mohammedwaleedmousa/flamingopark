import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Check, CheckCircle2, ChevronDown, ImagePlus, Loader2, LogIn, MessageSquareText, Send, SlidersHorizontal, Star, User, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { User as SupaUser } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { uploadOptimizedImage } from "@/lib/prepareImageUpload";
import { useStore } from "@/store/useStore";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { optimizeImage, handleImageError } from "@/lib/imageUrl";

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

interface ProductReview {
  id: string;
  customer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  images?: string[] | null;
  country?: string;
}

type ReviewSort = "newest" | "highest" | "lowest" | "images";

const MAX_IMAGES = 5;

const SORT_OPTIONS: Array<{ value: ReviewSort; label: string }> = [
  { value: "newest", label: "الأحدث" },
  { value: "highest", label: "الأعلى تقييماً" },
  { value: "lowest", label: "الأقل تقييماً" },
  { value: "images", label: "مع صور" },
];

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { customer } = useStore();
  const queryClient = useQueryClient();

  const [authUser, setAuthUser] = useState<SupaUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const [sort, setSort] = useState<ReviewSort>("newest");
  const [sortOpen, setSortOpen] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const [comment, setComment] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const canReview = Boolean(customer) || Boolean(authUser);

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        if (error) {
          setAuthUser(null);
          return;
        }

        setAuthUser(data.user ?? null);
      } catch (error) {
        console.error("Error checking review auth:", error);

        if (mounted) {
          setAuthUser(null);
        }
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setAuthUser(session?.user ?? null);
      setAuthChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     REVIEWS
  ========================================================= */

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["product-reviews", productId],

    queryFn: async () => {
      const { data, error } = await supabase.from("product_reviews").select("id,customer_name,rating,comment,created_at,images,country").eq("product_id", productId).eq("is_approved", true).order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []) as ProductReview[];
    },

    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    if (!canReview) {
      toast({
        title: "يجب تسجيل الدخول أولاً",
        description: "سجل دخولك قبل إضافة صور للتقييم.",
        variant: "destructive",
      });

      return;
    }

    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      toast({
        title: "الحد الأقصى 5 صور",
        variant: "destructive",
      });

      return;
    }

    const selectedFiles = Array.from(files).slice(0, remaining);

    setUploading(true);

    const uploaded: string[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith("image/")) continue;

      try {
        const url = await uploadOptimizedImage(file, `reviews/${productId}`, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1200,
        });

        uploaded.push(url);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "تعذر رفع الصورة";

        toast({
          title: "تعذر رفع إحدى الصور",
          description: message,
          variant: "destructive",
        });
      }
    }

    setImages((current) => [...current, ...uploaded].slice(0, MAX_IMAGES));

    setUploading(false);
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!canReview) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      if (rating === 0) {
        throw new Error("اختر تقييمك أولاً");
      }

      const cleanComment = comment.trim();

      const authorName = customer?.name || authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || customer?.phone || "عميل فلامنجو";

      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        customer_name: authorName,
        rating,
        comment: cleanComment || null,
        is_approved: false,
        images,
        country: "YE",
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast({
        title: "شكراً لتقييمك 🤍",
        description: "تم استلام تقييمك وسيظهر بعد مراجعته.",
      });

      setRating(0);
      setHoverRating(0);
      setComment("");
      setImages([]);
      setShowForm(false);

      queryClient.invalidateQueries({
        queryKey: ["product-reviews", productId],
      });
    },

    onError: (error: Error) => {
      toast({
        title: "تعذر إرسال التقييم",
        description: error.message || "يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    },
  });

  /* =========================================================
     STATS
  ========================================================= */

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;

    return reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length;
  }, [reviews]);

  const ratingCounts = useMemo(() => {
    return [5, 4, 3, 2, 1].map((value) => {
      const count = reviews.filter((review) => review.rating === value).length;
      const percentage = reviews.length ? (count / reviews.length) * 100 : 0;

      return {
        rating: value,
        count,
        percentage,
      };
    });
  }, [reviews]);

  const allCustomerImages = useMemo(() => {
    return reviews.flatMap((review) => review.images || []).slice(0, 16);
  }, [reviews]);

  /* =========================================================
     SORT
  ========================================================= */

  const sortedReviews = useMemo(() => {
    const list = [...reviews];

    if (sort === "highest") {
      return list.sort((a, b) => b.rating - a.rating);
    }

    if (sort === "lowest") {
      return list.sort((a, b) => a.rating - b.rating);
    }

    if (sort === "images") {
      return list.sort((a, b) => {
        const bHasImages = Number(Boolean(b.images?.length));
        const aHasImages = Number(Boolean(a.images?.length));

        if (bHasImages !== aHasImages) {
          return bHasImages - aHasImages;
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reviews, sort]);

  const displayedReviews = showAll ? sortedReviews : sortedReviews.slice(0, 4);

  const currentSortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label || "الأحدث";

  const handleSortChange = (value: ReviewSort) => {
    setSort(value);
    setSortOpen(false);
    setShowAll(false);
  };

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat("ar-YE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "";
    }
  };

  const getInitial = (name: string) => {
    return name?.trim()?.charAt(0) || "ع";
  };

  const getRatingText = (value: number) => {
    if (value === 5) return "ممتاز";
    if (value === 4) return "جيد جداً";
    if (value === 3) return "جيد";
    if (value === 2) return "مقبول";
    if (value === 1) return "غير مرضٍ";

    return "اختر تقييمك";
  };

  return (
    <section className="w-full" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" />
            <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">REVIEWS</span>
          </div>

          <h2 className="mt-1.5 text-[14px] font-semibold text-[#403633] md:text-[17px]">تقييمات العملاء</h2>

          <p className="mt-1 max-w-[220px] truncate text-[7px] text-[#9B8D88] md:max-w-[460px] md:text-[8px]">{productName}</p>
        </div>

        <button type="button" onClick={() => setShowForm((current) => !current)} className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[8px] font-semibold transition-colors ${showForm ? "border border-[#E2D5D1] bg-white text-[#846F69]" : "bg-[#D4777D] text-white active:bg-[#C96B72]"}`}>
          {showForm ? (
            <>
              <X className="h-3 w-3" strokeWidth={1.6} />
              إلغاء
            </>
          ) : (
            <>
              <Star className="h-3 w-3" strokeWidth={1.5} />
              اكتب تقييمك
            </>
          )}
        </button>
      </div>

      {/* =====================================================
          FORM
      ===================================================== */}

      {showForm && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-[#E9DEDA] bg-[#FFFDFC]">
          {authChecking ? (
            <div className="flex min-h-[110px] items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-[#C96F79]" />
            </div>
          ) : !canReview ? (
            /* =================================================
                LOGIN
            ================================================= */

            <div className="p-4 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FAECE9]">
                <User className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
              </span>

              <p className="mt-3 text-[10px] font-semibold text-[#493D39]">سجل دخولك لإضافة تقييم</p>

              <p className="mx-auto mt-1 max-w-[280px] text-[7px] leading-5 text-[#9B8D88]">شارك تجربتك مع المنتج وساعد العملاء الآخرين في اختيارهم.</p>

              <Link to="/auth" className="mx-auto mt-3 flex h-[39px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#D4777D] text-[8px] font-semibold text-white md:w-fit md:px-6">
                <LogIn className="h-3.5 w-3.5" strokeWidth={1.6} />
                تسجيل الدخول
              </Link>
            </div>
          ) : (
            /* =================================================
                REVIEW FORM
            ================================================= */

            <div className="p-3.5 md:p-4">
              {/* RATING */}

              <div className="flex items-center justify-between gap-3 border-b border-[#EFE6E2] pb-4">
                <div>
                  <p className="text-[9px] font-semibold text-[#4B3E3A]">تقييمك للمنتج</p>
                  <p className={`mt-1 text-[7px] ${rating > 0 ? "font-medium text-[#A95B61]" : "text-[#A0938E]"}`}>{getRatingText(rating)}</p>
                </div>

                <div className="flex items-center gap-0.5" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || rating);

                    return (
                      <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} aria-label={`${star} نجوم`} className="p-0.5 active:scale-90">
                        <Star className={`h-[23px] w-[23px] transition-colors md:h-[26px] md:w-[26px] ${active ? "fill-[#DCA653] text-[#DCA653]" : "text-[#DDD4D0]"}`} strokeWidth={1.3} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* COMMENT */}

              <div className="pt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[8px] font-semibold text-[#554844]">رأيك في المنتج</label>
                  <span className="text-[6px] text-[#A99B96]">{comment.length}/600</span>
                </div>

                <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 600))} rows={3} placeholder="كيف كانت الجودة، المقاس أو تجربتك مع المنتج؟" className="w-full resize-none rounded-[11px] border border-[#E7DCD8] bg-white px-3 py-3 text-[9px] leading-6 text-[#4C403C] outline-none placeholder:text-[#B0A29D] focus:border-[#D9AEAA]" />
              </div>

              {/* IMAGES */}

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 stroke-[1.5] text-[#C66C72]" />
                    <span className="text-[8px] font-semibold text-[#554844]">صور المنتج</span>
                    <span className="text-[6px] text-[#A99B96]">اختياري</span>
                  </div>

                  <span className="text-[6px] text-[#A99B96]">{images.length}/{MAX_IMAGES}</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((src, index) => (
                    <div key={`${src}-${index}`} className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[9px] border border-[#E7DCD8] bg-[#F7F4F2]">
                      <img src={src} alt="" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />

                      <button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} aria-label="حذف الصورة" className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}

                  {images.length < MAX_IMAGES && (
                    <label className={`flex h-[68px] w-[68px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[9px] border border-dashed border-[#DCC8C3] bg-[#FFFBFA] text-[#A76A6D] active:bg-[#FFF6F4] ${uploading ? "pointer-events-none opacity-60" : ""}`}>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ImagePlus className="h-4 w-4" strokeWidth={1.4} />
                          <span className="mt-1 text-[6px] font-semibold">إضافة</span>
                        </>
                      )}

                      <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={uploading} className="hidden" onChange={(event) => { const files = event.target.files; event.currentTarget.value = ""; void handleFiles(files); }} />
                    </label>
                  )}
                </div>

                <p className="mt-1.5 text-[6px] text-[#A99B96]">حتى 5 صور، ويتم ضغط الصور تلقائياً قبل الرفع.</p>
              </div>

              {/* SUBMIT */}

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-[#EFE6E2] pt-3">
                <p className="max-w-[215px] text-[6px] leading-4 text-[#A39792]">سيظهر تقييمك بعد مراجعته لضمان جودة ومصداقية التقييمات.</p>

                <button type="button" onClick={() => submitReview.mutate()} disabled={rating === 0 || uploading || submitReview.isPending} className="flex h-[37px] shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[#D4777D] px-4 text-[8px] font-semibold text-white active:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-40">
                  {submitReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3 w-3" strokeWidth={1.7} />}

                  {submitReview.isPending ? "جارٍ الإرسال" : "إرسال التقييم"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-[118px] animate-pulse rounded-[12px] bg-[#F7F3F1]" />
          <div className="h-[82px] animate-pulse rounded-[12px] bg-[#F7F3F1]" />
        </div>
      ) : reviews.length === 0 ? (
        /* ===================================================
            EMPTY
        =================================================== */

        <div className="mt-4 flex min-h-[155px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E5D9D5] bg-[#FFFCFB] px-5 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9]">
            <Star className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
          </span>

          <p className="mt-3 text-[10px] font-semibold text-[#493D39]">لا توجد تقييمات بعد</p>

          <p className="mt-1 max-w-[280px] text-[7px] leading-5 text-[#9B8D88]">كن أول من يشارك تجربته مع هذا المنتج.</p>

          {!showForm && (
            <button type="button" onClick={() => setShowForm(true)} className="mt-3 h-[35px] rounded-[9px] border border-[#D9AEAA] bg-white px-4 text-[8px] font-semibold text-[#A95B61]">
              اكتب أول تقييم
            </button>
          )}
        </div>
      ) : (
        <>
          {/* =================================================
              SUMMARY
          ================================================= */}

          <div className="mt-4 grid grid-cols-[92px_1fr] gap-3 border-y border-[#EEE4E0] py-4 md:grid-cols-[125px_1fr] md:gap-6">
            {/* AVERAGE */}

            <div className="flex flex-col items-center justify-center border-l border-[#EEE4E0] pl-3 md:pl-5">
              <div className="flex items-end gap-1">
                <span className="text-[30px] font-semibold leading-none text-[#403633] md:text-[37px]">{averageRating.toFixed(1)}</span>
                <span className="mb-0.5 text-[7px] text-[#9F918C]">/ 5</span>
              </div>

              <div className="mt-2 flex items-center gap-[1px]" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-3 w-3 ${star <= Math.round(averageRating) ? "fill-[#DCA653] text-[#DCA653]" : "text-[#DDD4D0]"}`} strokeWidth={1.1} />
                ))}
              </div>

              <p className="mt-1.5 text-[6px] text-[#9C8E89]">{reviews.length} {reviews.length === 1 ? "تقييم" : "تقييمات"}</p>
            </div>

            {/* DISTRIBUTION */}

            <div className="flex flex-col justify-center gap-[6px]">
              {ratingCounts.map(({ rating: value, count, percentage }) => (
                <div key={value} className="grid grid-cols-[16px_1fr_18px] items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    <span className="text-[7px] font-medium text-[#756762]">{value}</span>
                    <Star className="h-2 w-2 fill-[#DCA653] text-[#DCA653]" strokeWidth={1} />
                  </div>

                  <div className="h-[4px] overflow-hidden rounded-full bg-[#EEE9E6]">
                    <div className="h-full rounded-full bg-[#D4777D] transition-[width] duration-300" style={{ width: `${percentage}%` }} />
                  </div>

                  <span className="text-left text-[6px] text-[#A29590]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* =================================================
              CUSTOMER IMAGES
          ================================================= */}

          {allCustomerImages.length > 0 && (
            <div className="mt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5 stroke-[1.5] text-[#C66C72]" />
                  <span className="text-[9px] font-semibold text-[#453A36]">صور العملاء</span>
                </div>

                <span className="text-[6px] text-[#A49792]">{allCustomerImages.length} صورة</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {allCustomerImages.map((src, index) => (
                  <button key={`${src}-${index}`} type="button" onClick={() => setZoomImg(src)} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[9px] border border-[#EAE0DC] bg-[#F5F3F1] md:h-[86px] md:w-[86px]">
                    <img src={optimizeImage(src, 300, 82)} alt="صورة من تقييم عميل" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =================================================
              REVIEWS HEADER
          ================================================= */}

          <div className="relative mt-5 flex items-center justify-between border-y border-[#EEE4E0] py-2.5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-3.5 w-3.5 stroke-[1.5] text-[#C66C72]" />
              <span className="text-[9px] font-semibold text-[#453A36]">آراء العملاء</span>
            </div>

            {/* CUSTOM SORT */}

            <div className="relative">
              <button type="button" onClick={() => setSortOpen((current) => !current)} aria-expanded={sortOpen} className={`flex h-[32px] min-w-[94px] items-center justify-between gap-2 rounded-[9px] border bg-white px-2.5 text-[7px] font-medium text-[#665853] ${sortOpen ? "border-[#D9AEAA]" : "border-[#E5DAD6]"}`}>
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3 stroke-[1.5] text-[#A76A6D]" />
                  {currentSortLabel}
                </span>

                <ChevronDown className={`h-3 w-3 stroke-[1.5] text-[#9C8D88] transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>

              {sortOpen && (
                <>
                  <button type="button" aria-label="إغلاق قائمة الفرز" onClick={() => setSortOpen(false)} className="fixed inset-0 z-[60] cursor-default" />

                  <div className="absolute left-0 top-[38px] z-[70] w-[158px] overflow-hidden rounded-[12px] border border-[#E6DCD8] bg-white p-1.5 shadow-[0_10px_28px_rgba(50,35,30,0.10)]">
                    {SORT_OPTIONS.map((option) => {
                      const active = sort === option.value;

                      return (
                        <button key={option.value} type="button" onClick={() => handleSortChange(option.value)} className={`flex h-[38px] w-full items-center justify-between rounded-[8px] px-2.5 text-right text-[8px] ${active ? "bg-[#FFF4F2] font-semibold text-[#A95B61]" : "text-[#625450] active:bg-[#FAF7F5]"}`}>
                          <span>{option.label}</span>

                          {active && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D4777D]">
                              <Check className="h-2.5 w-2.5 stroke-[2] text-white" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* =================================================
              REVIEWS
          ================================================= */}

          <div>
            {displayedReviews.map((review, index) => (
              <article key={review.id} className={`py-4 ${index !== displayedReviews.length - 1 ? "border-b border-[#F0E8E5]" : ""}`}>
                {/* USER */}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAECE9] text-[9px] font-semibold text-[#A95B61]">{getInitial(review.customer_name)}</span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="max-w-[140px] truncate text-[9px] font-semibold text-[#443834] md:max-w-[260px] md:text-[10px]">{review.customer_name}</p>

                        <span className="flex items-center gap-1 text-[6px] font-medium text-[#5F8365]">
                          <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.8} />
                          منشور
                        </span>
                      </div>

                      <p className="mt-1 text-[6px] text-[#A0938E]">{formatDate(review.created_at)}</p>
                    </div>
                  </div>

                  {/* REVIEW STARS */}

                  <div className="flex shrink-0 items-center gap-[1px]" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-2.5 w-2.5 ${star <= review.rating ? "fill-[#DCA653] text-[#DCA653]" : "text-[#DDD4D0]"}`} strokeWidth={1.1} />
                    ))}
                  </div>
                </div>

                {/* COMMENT */}

                {review.comment && <p className="mt-3 pr-[42px] text-[8px] leading-6 text-[#685A55] md:text-[9px] md:leading-7">{review.comment}</p>}

                {/* IMAGES */}

                {review.images?.length ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pr-[42px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {review.images.map((src, imageIndex) => (
                      <button key={`${src}-${imageIndex}`} type="button" onClick={() => setZoomImg(src)} className="h-[62px] w-[62px] shrink-0 overflow-hidden rounded-[8px] border border-[#EAE0DC] bg-[#F5F3F1] md:h-[76px] md:w-[76px]">
                        <img src={optimizeImage(src, 260, 82)} alt="صورة من العميل" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {/* =================================================
              SHOW MORE
          ================================================= */}

          {sortedReviews.length > 4 && (
            <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-1 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E5DAD6] bg-white text-[8px] font-semibold text-[#A95B61] active:bg-[#FFF8F6]">
              {showAll ? "عرض أقل" : `عرض كل التقييمات (${sortedReviews.length})`}

              <ChevronDown className={`h-3 w-3 stroke-[1.6] transition-transform ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}

      {/* =====================================================
          IMAGE PREVIEW
      ===================================================== */}

      <Dialog open={Boolean(zoomImg)} onOpenChange={(open) => { if (!open) setZoomImg(null); }}>
        <DialogContent className="max-w-[calc(100vw-20px)] overflow-hidden border-0 bg-[#151515] p-1.5 sm:max-w-3xl">
          {zoomImg && <img src={zoomImg} alt="صورة تقييم العميل" loading="eager" decoding="async" onError={handleImageError} className="max-h-[82vh] w-full rounded-[7px] object-contain" />}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ProductReviews;