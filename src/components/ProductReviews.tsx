import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Loader2, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
}

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { customer, country } = useStore();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  // Fetch approved reviews for this product
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductReview[];
    },
  });

  // Submit review mutation
  const submitReview = useMutation({
    mutationFn: async () => {
      if (!customer || !country) throw new Error('يجب تسجيل الدخول أولاً');
      if (rating === 0) throw new Error('يرجى اختيار التقييم');
      
      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        customer_name: customer.name,
        rating,
        comment: comment.trim() || null,
        country,
        is_approved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تم إرسال التقييم',
        description: 'شكراً لك! سيتم مراجعة تقييمك قريباً',
      });
      setRating(0);
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'خطأ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;
  
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    rating: r,
    count: reviews.filter(rev => rev.rating === r).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100
      : 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-16 pt-12 border-t border-border"
    >
      <div className="text-center mb-10">
        <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
          تقييمات <span className="text-gold">{productName}</span>
        </h2>
        <div className="w-24 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Rating Summary */}
        <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
          <div className="flex items-center gap-6 mb-6">
            <div className="text-center">
              <span className="block font-heading text-5xl text-gold">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex items-center justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(averageRating)
                        ? 'fill-gold text-gold'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground mt-1 block">
                ({reviews.length} تقييم)
              </span>
            </div>
            
            <div className="flex-1 space-y-2">
              {ratingCounts.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-muted-foreground">{rating}</span>
                  <Star className="w-3 h-3 fill-gold text-gold" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-gold rounded-full"
                    />
                  </div>
                  <span className="w-8 text-muted-foreground text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add Review Form */}
          {customer ? (
            <div className="pt-6 border-t border-border/50">
              <h3 className="font-heading text-lg text-foreground mb-4">
                أضف تقييمك
              </h3>
              
              {/* Star Rating Input */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">تقييمك:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-gold text-gold'
                            : 'text-muted-foreground hover:text-gold/50'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment Input */}
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="شاركنا رأيك في هذا المنتج... (اختياري)"
                className="mb-4 min-h-[80px] resize-none"
                dir="rtl"
              />

              <Button
                onClick={() => submitReview.mutate()}
                disabled={rating === 0 || submitReview.isPending}
                className="btn-gold gap-2"
              >
                {submitReview.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                إرسال التقييم
              </Button>
            </div>
          ) : (
            <div className="pt-6 border-t border-border/50 text-center">
              <p className="text-muted-foreground text-sm">
                يجب تسجيل الدخول لإضافة تقييم
              </p>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
          ) : reviews.length > 0 ? (
            reviews.slice(0, 5).map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-background border border-border/50 rounded-xl p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-heading text-sm text-foreground truncate">
                        {review.customer_name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(review.created_at).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= review.rating
                              ? 'fill-gold text-gold'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>لا توجد تقييمات لهذا المنتج بعد</p>
              <p className="text-sm mt-1">كن أول من يقيّم هذا المنتج!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProductReviews;
