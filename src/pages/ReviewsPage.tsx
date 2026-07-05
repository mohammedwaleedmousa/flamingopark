import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Send, Loader2, MessageSquare } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

interface Review {
  id: string;
  customer_name: string;
  message: string;
  message_ar: string | null;
  rating: number;
  country: string;
  created_at: string;
}

const ReviewsPage = () => {
  const { country } = useStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Fetch all approved reviews
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['all-reviews', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .eq('country', country)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
    enabled: !!country,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['review-stats', country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('is_approved', true)
        .eq('country', country);
      if (error) throw error;
      
      const totalReviews = data.length;
      const avgRating = totalReviews > 0 
        ? (data.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
        : '0';
      
      // Calculate rating distribution
      const distribution = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: data.filter(r => r.rating === star).length,
        percentage: totalReviews > 0 ? (data.filter(r => r.rating === star).length / totalReviews) * 100 : 0
      }));

      return { totalReviews, avgRating, distribution };
    },
    enabled: !!country,
  });

  // Submit review mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('reviews')
        .insert({
          customer_name: name.trim(),
          message: message.trim(),
          message_ar: message.trim(),
          rating,
          country,
          is_approved: false // Requires admin approval
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'شكراً لك!',
        description: 'تم إرسال تقييمك وسيتم مراجعته قريباً',
      });
      setName('');
      setMessage('');
      setRating(5);
    },
    onError: () => {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال التقييم',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast({
        title: 'تنبيه',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      <main className="pt-20 pb-16">
        {/* Hero Section */}
        <section className="bg-secondary py-16">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-heading text-4xl md:text-5xl text-gold mb-4">
                تقييمات العملاء
              </h1>
              <p className="text-gold-light/70 font-body max-w-lg mx-auto">
                نفتخر بآراء عملائنا الكرام ونسعى دائماً لتقديم الأفضل
              </p>
            </motion.div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats & Add Review Form */}
            <div className="lg:col-span-1 space-y-6">
              {/* Stats Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="text-center mb-6">
                  <div className="font-heading text-5xl text-gold mb-2">
                    {stats?.avgRating || '0'}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(Number(stats?.avgRating || 0))
                            ? 'text-gold fill-gold'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    بناءً على {stats?.totalReviews || 0} تقييم
                  </p>
                </div>

                {/* Rating Distribution */}
                <div className="space-y-2">
                  {stats?.distribution.map(({ star, count, percentage }) => (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-8">{star} ★</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{count}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Add Review Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <h3 className="font-heading text-xl text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-gold" />
                  أضف تقييمك
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Rating Selector */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      التقييم
                    </label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredRating(star)}
                          onMouseLeave={() => setHoveredRating(0)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 transition-colors ${
                              star <= (hoveredRating || rating)
                                ? 'text-gold fill-gold'
                                : 'text-muted-foreground'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      الاسم
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="أدخل اسمك"
                      dir="rtl"
                      maxLength={50}
                    />
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      تقييمك
                    </label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="شاركنا تجربتك مع منتجاتنا..."
                      dir="rtl"
                      rows={4}
                      maxLength={500}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full btn-gold gap-2"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    إرسال التقييم
                  </Button>
                </form>
              </motion.div>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2">
              <h2 className="font-heading text-2xl text-foreground mb-6">
                جميع التقييمات ({reviews.length})
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 bg-muted/50 rounded-2xl">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
                  <p className="text-sm text-muted-foreground">كن أول من يقيّم!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border rounded-xl p-6 hover:border-gold/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-heading text-foreground">{review.customer_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-gold fill-gold' : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-foreground/80 font-body leading-relaxed">
                        "{review.message_ar || review.message}"
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ReviewsPage;
