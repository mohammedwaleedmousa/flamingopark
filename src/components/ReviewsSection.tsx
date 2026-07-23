import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';
import { Button } from '@/components/ui/button';

interface Review {
  id: string;
  customer_name: string;
  message: string;
  message_ar: string | null;
  rating: number;
  country: string;
}

const ReviewsSection = () => {
  const { data: content } = useSiteContent('reviews_section_');

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      return data as Review[];
    },
  });

  // Fetch total reviews count
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['reviews-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true);
      if (error) throw error;

      return count || 0;
    },
  });

  if (reviews.length === 0) return null;

  return (
    <section className="section-beige">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl text-gold mb-4">
            آراء عملائنا
          </h2>
          <div className="w-20 h-px bg-gold mx-auto mb-4" />
          <p className="text-muted-foreground font-body">
            {totalCount} تقييم من عملائنا الكرام
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-background p-6 rounded-lg shadow-card border border-border/50"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'text-gold fill-gold' : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <p className="text-foreground/80 font-body mb-4 leading-relaxed">
                "{review.message_ar || review.message}"
              </p>
              <p className="font-heading text-sm text-gold">{review.customer_name}</p>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-10 space-y-4"
        >
          <Link to="/reviews">
            <Button variant="outline" className="gap-2 border-gold text-gold hover:bg-gold hover:text-secondary">
              عرض جميع التقييمات
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div>
            <p className="text-muted-foreground mb-3">
              {getSiteText(content, 'share_experience', 'شارك تجربتك معنا')}
            </p>
            <Link to="/reviews">
              <Button 
                variant="default"
                className="gap-2 bg-gold hover:bg-gold/90 text-secondary"
              >
                <MessageSquare className="w-4 h-4" />
                {getSiteText(content, 'write_review', 'اكتب تقييماً')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ReviewsSection;
