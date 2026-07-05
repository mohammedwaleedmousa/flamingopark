import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterSubscriptionProps {
  className?: string;
  variant?: 'full' | 'compact';
  title?: string;
  description?: string;
}

export const NewsletterSubscription = ({
  className = '',
  variant = 'full',
  title = 'اشترك في النشرة البريدية',
  description = 'احصل على أحدث العروض والمنتجات الجديدة مباشرة في بريدك الإلكتروني'
}: NewsletterSubscriptionProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'بريد إلكتروني غير صحيح',
        description: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Check if email already exists
      const { data: existing, error: checkError } = await supabase
        .from('newsletter_subscribers')
        .select('email')
        .eq('email', email.toLowerCase());

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        toast({
          title: 'مشترك بالفعل',
          description: 'هذا البريد الإلكتروني مشترك بالفعل في النشرة البريدية',
          variant: 'destructive',
        });
        return;
      }

      // Insert new subscriber
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase(),
          subscribed_at: new Date().toISOString(),
          country: 'YE', // Default country, can be updated
          is_active: true,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          toast({
            title: 'مشترك بالفعل',
            description: 'هذا البريد الإلكتروني مشترك بالفعل في النشرة البريدية',
            variant: 'destructive',
          });
        } else {
          throw insertError;
        }
        return;
      }

      // Success
      setSubmitted(true);
      setEmail('');
      toast({
        title: 'شكراً لك!',
        description: 'تم اشتراكك في النشرة البريدية بنجاح',
      });

      // Reset submitted state after 3 seconds
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: any) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'حدث خطأ',
        description: error.message || 'فشل الاشتراك في النشرة البريدية',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className={`bg-card border border-border rounded-lg p-4 ${className}`}
        dir="rtl"
      >
        <div className="flex items-center gap-3 mb-3">
          <Mail className="w-5 h-5 text-primary flex-shrink-0" />
          <h3 className="font-heading text-sm md:text-base text-foreground">{title}</h3>
        </div>
        <form onSubmit={handleSubscribe} className="flex gap-2">
          <Input
            type="email"
            placeholder="بريدك الإلكتروني"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || submitted}
            className="flex-1 text-sm"
          />
          <Button
            type="submit"
            disabled={loading || submitted}
            className="btn-gold gap-1 text-xs md:text-sm"
          >
            {submitted ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {submitted ? 'تم' : 'اشترك'}
          </Button>
        </form>
      </motion.div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      dir="rtl"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-gold/5 to-primary/10" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gold/10 blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-primary/10 blur-3xl -z-10" />

      {/* Content */}
      <div className="relative z-10 py-12 md:py-16 px-6 md:px-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white flex items-center justify-center shadow-lg">
                <Mail className="w-7 h-7" />
              </div>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl text-foreground mb-3">
              {title}
            </h2>
            <p className="text-muted-foreground font-body text-lg">
              {description}
            </p>
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            onSubmit={handleSubscribe}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Input
              type="email"
              placeholder="أدخل بريدك الإلكتروني..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || submitted}
              className="flex-1 h-12 px-4 rounded-lg text-base"
            />
            <Button
              type="submit"
              disabled={loading || submitted}
              className="btn-gold h-12 px-8 gap-2 whitespace-nowrap"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  تم الاشتراك
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  اشترك الآن
                </>
              )}
            </Button>
          </motion.form>

          {/* Info text */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm text-muted-foreground mt-4"
          >
            ✓ لا نرسل رسائل بريد غير مرغوبة • يمكنك الإلغاء في أي وقت
          </motion.p>
        </div>
      </div>
    </motion.section>
  );
};

export default NewsletterSubscription;
