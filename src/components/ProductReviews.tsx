import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, CheckCircle2, ChevronDown, ImagePlus, Loader2, LogIn, MessageSquareText, Send, SlidersHorizontal, Star, User, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { User as SupaUser } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { uploadOptimizedImage } from '@/lib/prepareImageUpload';
import { useStore } from '@/store/useStore';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { optimizeImage, handleImageError } from '@/lib/imageUrl';

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

type ReviewSort = 'newest' | 'highest' | 'lowest' | 'images';

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { customer } = useStore();
  const queryClient = useQueryClient();

  const [authUser, setAuthUser] = useState<SupaUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [sort, setSort] = useState<ReviewSort>('newest');

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);

  const MAX_IMAGES = 5;
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
        console.error('Error checking review auth:', error);

        if (mounted) setAuthUser(null);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
     FETCH REVIEWS
  ========================================================= */

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_reviews').select('id,customer_name,rating,comment,created_at,images,country').eq('product_id', productId).eq('is_approved', true).order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as ProductReview[];
    },
    staleTime: 1000 * 60 * 3,
  });

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;

    if (!canReview) {
      toast({
        title: 'يجب تسجيل الدخول أولاً',
        description: 'سجل دخولك قبل إضافة صور للتقييم.',
        variant: 'destructive',
      });

      return;
    }

    const remaining = MAX_IMAGES - images.length;

    if (remaining <= 0) {
      toast({
        title: 'الحد الأقصى 5 صور',
        variant: 'destructive',
      });

      return;
    }

    const selectedFiles = Array.from(files).slice(0, remaining);

    setUploading(true);

    const uploaded: string[] = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) continue;

      try {
        const url = await uploadOptimizedImage(file, `reviews/${productId}`, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1200,
        });

        uploaded.push(url);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'تعذر رفع الصورة';

        toast({
          title: 'تعذر رفع إحدى الصور',
          description: message,
          variant: 'destructive',
        });
      }
    }

    setImages((current) => [...current, ...uploaded].slice(0, MAX_IMAGES));
    setUploading(false);
  };

  /* =========================================================
     SUBMIT REVIEW
  ========================================================= */

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!canReview) throw new Error('يجب تسجيل الدخول أولاً');
      if (rating === 0) throw new Error('اختر تقييمك أولاً');

      const cleanComment = comment.trim();

      const authorName = customer?.name || authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || customer?.phone || 'عميل فلامنجو';

      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        customer_name: authorName,
        rating,
        comment: cleanComment || null,
        is_approved: false,
        images,
        country: 'YE',
      });

      if (error) throw error;
    },

    onSuccess: () => {
      toast({
        title: 'شكراً لتقييمك 🤍',
        description: 'تم استلام تقييمك وسيظهر بعد مراجعته.',
      });

      setRating(0);
      setHoverRating(0);
      setComment('');
      setImages([]);
      setShowForm(false);

      queryClient.invalidateQueries({
        queryKey: ['product-reviews', productId],
      });
    },

    onError: (error: Error) => {
      toast({
        title: 'تعذر إرسال التقييم',
        description: error.message || 'يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
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

  const sortedReviews = useMemo(() => {
    const list = [...reviews];

    if (sort === 'highest') {
      return list.sort((a, b) => b.rating - a.rating);
    }

    if (sort === 'lowest') {
      return list.sort((a, b) => a.rating - b.rating);
    }

    if (sort === 'images') {
      return list.sort((a, b) => Number(Boolean(b.images?.length)) - Number(Boolean(a.images?.length)));
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [reviews, sort]);

  const displayedReviews = showAll ? sortedReviews : sortedReviews.slice(0, 4);

  /* =========================================================
     HELPERS
  ========================================================= */

  const formatDate = (date: string) => {
    try {
      return new Intl.DateTimeFormat('ar-YE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return '';
    }
  };

  const getInitial = (name: string) => {
    return name?.trim()?.charAt(0) || 'ع';
  };

  const getRatingText = (value: number) => {
    if (value === 5) return 'ممتاز';
    if (value === 4) return 'جيد جداً';
    if (value === 3) return 'جيد';
    if (value === 2) return 'مقبول';
    if (value === 1) return 'غير مرضٍ';

    return 'اختر تقييمك';
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <section className="w-full" dir="rtl">
      {/* ================= HEADER ================= */}

      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 shrink-0 rounded-full bg-[#E8547C]" />
            <h2 className="text-[15px] font-bold text-[#2D2528] md:text-[19px]">تقييمات العملاء</h2>
          </div>

          <p className="mt-1.5 max-w-[280px] truncate pr-3 text-[9px] leading-5 text-[#9A858D] md:max-w-[500px] md:text-[10px]">{productName}</p>
        </div>

        <button onClick={() => setShowForm((current) => !current)} className={`shrink-0 rounded-[6px] px-3 py-2 text-[9px] font-bold transition active:scale-[0.98] md:px-4 md:text-[10px] ${showForm ? 'border border-[#E9CCD5] bg-white text-[#B93461]' : 'bg-[#E8547C] text-white'}`}>
          {showForm ? 'إلغاء' : 'اكتب تقييمك'}
        </button>
      </div>

      {/* ================= FORM ================= */}

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mb-5 rounded-[10px] border border-[#F0D9E1] bg-[#FFFAFB] p-3.5 md:p-5">
              {authChecking ? (
                <div className="flex min-h-[90px] items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-[#E8547C]" />
                </div>
              ) : !canReview ? (
                <div className="text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0F4]">
                    <User className="h-5 w-5 text-[#E8547C]" strokeWidth={1.5} />
                  </div>

                  <p className="mt-3 text-[11px] font-bold text-[#3B3034]">سجل دخولك لإضافة تقييم</p>
                  <p className="mx-auto mt-1 max-w-[280px] text-[8px] leading-5 text-[#9B878E]">شارك تجربتك مع المنتج وساعد العملاء الآخرين في اتخاذ قرارهم.</p>

                  <Link to="/auth" className="mx-auto mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#E8547C] text-[9px] font-bold text-white md:w-fit md:px-6">
                    <LogIn className="h-3.5 w-3.5" strokeWidth={1.8} />
                    تسجيل الدخول
                  </Link>
                </div>
              ) : (
                <>
                  {/* STAR INPUT */}

                  <div className="mb-4 flex items-center justify-between rounded-[8px] border border-[#F1E2E7] bg-white px-3 py-3">
                    <div>
                      <p className="text-[10px] font-bold text-[#45373C]">تقييمك للمنتج</p>
                      <p className="mt-0.5 text-[8px] text-[#A18D94]">{getRatingText(rating)}</p>
                    </div>

                    <div className="flex gap-0.5" dir="ltr">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = star <= (hoverRating || rating);

                        return (
                          <button key={star} type="button" onClick={() => setRating(star)} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} className="p-0.5 transition active:scale-90">
                            <Star className={`h-[23px] w-[23px] transition md:h-[26px] md:w-[26px] ${active ? 'fill-[#F0AA2C] text-[#F0AA2C]' : 'text-[#DCCFD4]'}`} strokeWidth={1.4} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* COMMENT */}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[9px] font-semibold text-[#55464C]">اكتب رأيك</label>
                      <span className="text-[7px] text-[#B09DA4]">{comment.length}/600</span>
                    </div>

                    <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 600))} rows={3} placeholder="كيف كانت الجودة، المقاس أو تجربتك مع المنتج؟" className="w-full resize-none rounded-[7px] border border-[#EADCE1] bg-white px-3 py-3 text-[10px] leading-6 text-[#3A3034] outline-none transition placeholder:text-[#B5A2A9] focus:border-[#E8547C] focus:ring-2 focus:ring-[#E8547C]/10" />
                  </div>

                  {/* UPLOAD */}

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-[#E8547C]" strokeWidth={1.6} />
                        <span className="text-[9px] font-semibold text-[#55464C]">أضف صوراً</span>
                        <span className="text-[7px] text-[#A8959C]">اختياري</span>
                      </div>

                      <span className="text-[7px] text-[#A8959C]">{images.length}/{MAX_IMAGES}</span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {images.map((src, index) => (
                        <div key={`${src}-${index}`} className="group relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[7px] border border-[#EEDDE3] bg-[#FFF1F5]">
                          <img src={src} alt="" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />

                          <button type="button" onClick={() => setImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {images.length < MAX_IMAGES && (
                        <label className="flex h-[68px] w-[68px] shrink-0 cursor-pointer flex-col items-center justify-center rounded-[7px] border border-dashed border-[#E4BDC9] bg-[#FFF8FA] text-[#C86885] transition active:bg-[#FFF0F4]">
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ImagePlus className="h-4 w-4" strokeWidth={1.5} />
                              <span className="mt-1 text-[7px] font-semibold">إضافة</span>
                            </>
                          )}

                          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={uploading} className="hidden" onChange={(event) => { handleFiles(event.target.files); event.currentTarget.value = ''; }} />
                        </label>
                      )}
                    </div>

                    <p className="mt-1.5 text-[7px] text-[#A8959C]">حتى 5 صور، وسيتم ضغطها تلقائياً قبل الرفع.</p>
                  </div>

                  {/* SUBMIT */}

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F2E5E9] pt-3">
                    <p className="max-w-[210px] text-[7px] leading-4 text-[#A18D94]">سيظهر تقييمك بعد مراجعته لضمان جودة التقييمات.</p>

                    <button onClick={() => submitReview.mutate()} disabled={rating === 0 || uploading || submitReview.isPending} className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] bg-[#E8547C] px-4 text-[9px] font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
                      {submitReview.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={1.7} />}
                      {submitReview.isPending ? 'جارٍ الإرسال' : 'إرسال التقييم'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= LOADING ================= */}

      {isLoading ? (
        <div className="space-y-3">
          <div className="h-[125px] animate-pulse rounded-[10px] bg-[#FFF2F6]" />
          <div className="h-[95px] animate-pulse rounded-[10px] bg-[#FAF5F7]" />
        </div>
      ) : reviews.length === 0 ? (
        /* ================= EMPTY ================= */

        <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#EED6DE] bg-[#FFFBFC] px-5 text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#FFF0F4]">
            <Star className="h-5 w-5 text-[#E8547C]" strokeWidth={1.5} />
          </div>

          <p className="text-[11px] font-bold text-[#3A2E32]">لا توجد تقييمات بعد</p>
          <p className="mt-1.5 max-w-[280px] text-[8px] leading-5 text-[#9D8990]">كن أول من يشارك تجربته مع هذا المنتج.</p>

          {!showForm && (
            <button onClick={() => setShowForm(true)} className="mt-4 rounded-[6px] bg-[#E8547C] px-5 py-2.5 text-[9px] font-bold text-white transition active:scale-[0.98]">اكتب أول تقييم</button>
          )}
        </div>
      ) : (
        <>
          {/* ================= SUMMARY ================= */}

          <div className="grid grid-cols-[100px_1fr] gap-4 rounded-[10px] border border-[#F0E0E5] bg-[#FFFBFC] p-3.5 md:grid-cols-[150px_1fr] md:gap-7 md:p-5">
            <div className="flex flex-col items-center justify-center border-l border-[#F0E0E5] pl-3 md:pl-6">
              <div className="flex items-end gap-1">
                <span className="text-[34px] font-bold leading-none text-[#2D2528] md:text-[42px]">{averageRating.toFixed(1)}</span>
                <span className="mb-1 text-[9px] text-[#A18F95]">/5</span>
              </div>

              <div className="mt-2 flex gap-[1px]" dir="ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className={`h-3.5 w-3.5 ${star <= Math.round(averageRating) ? 'fill-[#F0AA2C] text-[#F0AA2C]' : 'text-[#DDD0D5]'}`} strokeWidth={1.2} />
                ))}
              </div>

              <p className="mt-1.5 text-[7px] text-[#9C8990]">{reviews.length} {reviews.length === 1 ? 'تقييم' : 'تقييمات'}</p>
            </div>

            <div className="flex flex-col justify-center gap-1.5">
              {ratingCounts.map(({ rating: value, count, percentage }) => (
                <div key={value} className="grid grid-cols-[14px_1fr_18px] items-center gap-2">
                  <span className="text-[8px] font-semibold text-[#725F66]">{value}</span>

                  <div className="h-[5px] overflow-hidden rounded-full bg-[#F1E7EA]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.45 }} className="h-full rounded-full bg-[#E8547C]" />
                  </div>

                  <span className="text-left text-[7px] text-[#A18F95]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ================= CUSTOMER IMAGES ================= */}

          {allCustomerImages.length > 0 && (
            <div className="mt-5">
              <div className="mb-2.5 flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-[#E8547C]" strokeWidth={1.6} />
                <span className="text-[10px] font-bold text-[#3D3236]">صور العملاء</span>
                <span className="text-[8px] text-[#A18F95]">{allCustomerImages.length}</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {allCustomerImages.map((src, index) => (
                  <button key={`${src}-${index}`} type="button" onClick={() => setZoomImg(src)} className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[7px] bg-[#FFF1F5] md:h-[88px] md:w-[88px]">
                    <img src={optimizeImage(src, 300, 82)} alt="صورة من تقييم عميل" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ================= LIST HEADER ================= */}

          <div className="mt-5 flex items-center justify-between border-y border-[#F2E5E9] py-2.5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-3.5 w-3.5 text-[#E8547C]" strokeWidth={1.6} />
              <span className="text-[10px] font-bold text-[#3D3236]">آراء العملاء</span>
            </div>

            <div className="relative">
              <select value={sort} onChange={(event) => setSort(event.target.value as ReviewSort)} className="h-8 appearance-none rounded-[6px] border border-[#EBDCE1] bg-white pr-8 pl-7 text-[8px] font-semibold text-[#65555B] outline-none focus:border-[#E8547C]">
                <option value="newest">الأحدث</option>
                <option value="highest">الأعلى تقييماً</option>
                <option value="lowest">الأقل تقييماً</option>
                <option value="images">مع صور</option>
              </select>

              <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A18F95]" />
              <ChevronDown className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#A18F95]" />
            </div>
          </div>

          {/* ================= REVIEWS ================= */}

          <div className="divide-y divide-[#F2E5E9]">
            {displayedReviews.map((review, index) => (
              <motion.article key={review.id} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.1) }} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F4] text-[11px] font-bold text-[#C23C66]">{getInitial(review.customer_name)}</div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="max-w-[140px] truncate text-[10px] font-bold text-[#362B2F] md:max-w-[250px] md:text-[11px]">{review.customer_name}</p>

                        <span className="flex items-center gap-1 rounded-full bg-[#F2F8F4] px-1.5 py-[2px] text-[6px] font-semibold text-[#4D8060]">
                          <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2.2} />
                          منشور
                        </span>
                      </div>

                      <p className="mt-0.5 text-[7px] text-[#A18F95]">{formatDate(review.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex gap-[1px]" dir="ltr">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-3 w-3 ${star <= review.rating ? 'fill-[#F0AA2C] text-[#F0AA2C]' : 'text-[#DDD0D5]'}`} strokeWidth={1.2} />
                    ))}
                  </div>
                </div>

                {review.comment && <p className="mt-3 pr-[46px] text-[9px] leading-6 text-[#625359] md:text-[10px] md:leading-7">{review.comment}</p>}

                {review.images?.length ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pr-[46px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {review.images.map((src, imageIndex) => (
                      <button key={`${src}-${imageIndex}`} type="button" onClick={() => setZoomImg(src)} className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-[7px] border border-[#F0DFE4] bg-[#FFF1F5] md:h-[78px] md:w-[78px]">
                        <img src={optimizeImage(src, 260, 82)} alt="صورة من العميل" loading="lazy" decoding="async" onError={handleImageError} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </motion.article>
            ))}
          </div>

          {/* ================= SHOW MORE ================= */}

          {sortedReviews.length > 4 && (
            <button onClick={() => setShowAll((current) => !current)} className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 border-t border-[#F2E5E9] text-[9px] font-bold text-[#B93461] transition active:bg-[#FFF8FA]">
              {showAll ? 'عرض أقل' : `عرض كل التقييمات (${sortedReviews.length})`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} strokeWidth={1.7} />
            </button>
          )}
        </>
      )}

      {/* ================= IMAGE PREVIEW ================= */}

      <Dialog open={Boolean(zoomImg)} onOpenChange={(open) => { if (!open) setZoomImg(null); }}>
        <DialogContent className="max-w-[calc(100vw-20px)] border-0 bg-black/95 p-2 sm:max-w-3xl">
          {zoomImg && (
            <img src={zoomImg} alt="صورة تقييم العميل" loading="eager" decoding="async" onError={handleImageError} className="max-h-[82vh] w-full rounded-[6px] object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ProductReviews;