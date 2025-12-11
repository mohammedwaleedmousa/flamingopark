import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore, detectCountryFromPhone } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Phone, Loader2, Sparkles } from 'lucide-react';

const CustomerAuthPage = () => {
  const navigate = useNavigate();
  const { setCustomer, setCountry } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    const detectedCountry = detectCountryFromPhone(formData.phone);
    if (!detectedCountry) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال رقم هاتف سعودي أو يمني صحيح',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.phone)
        .maybeSingle();

      let customer;
      
      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert({
            name: formData.name,
            phone: formData.phone,
            country: detectedCountry,
          })
          .select()
          .single();

        if (error) throw error;
        customer = newCustomer;
      }

      setCustomer({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        country: customer.country as 'YE' | 'SA',
      });
      setCountry(customer.country as 'YE' | 'SA');

      toast({
        title: 'مرحباً بك',
        description: `أهلاً ${customer.name}`,
      });

      navigate('/home');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء التسجيل',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-beige-gradient" />
      
      {/* Gold corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/20" />

      {/* Floating gold particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Main Card */}
        <div className="bg-card border border-border/50 shadow-elegant rounded-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-secondary px-8 py-10 text-center relative overflow-hidden">
            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="logo-ermgold text-3xl md:text-4xl mb-3 relative z-10">ERMGOLD</h1>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-px bg-gradient-to-r from-transparent to-gold/50" />
                <Sparkles className="w-4 h-4 text-gold/60" />
                <div className="w-10 h-px bg-gradient-to-l from-transparent to-gold/50" />
              </div>
              <p className="text-gold/50 text-xs tracking-[0.4em] uppercase mt-3 font-heading">
                مجوهرات فاخرة
              </p>
            </motion.div>
          </div>

          {/* Form Section */}
          <div className="px-8 py-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="font-heading text-lg text-foreground text-center mb-2">
                مرحباً بك
              </h2>
              <p className="text-muted-foreground text-sm text-center mb-8 font-body">
                سجّل للوصول إلى مجموعتنا الحصرية
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-body text-foreground/80">
                    الاسم الكامل
                  </label>
                  <div className="relative group">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسمك الكامل"
                      className="bg-background border-border/60 text-foreground pr-11 placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20 h-12 rounded-sm transition-all"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-body text-foreground/80">
                    رقم الهاتف
                  </label>
                  <div className="relative group">
                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+966 أو +967"
                      className="bg-background border-border/60 text-foreground pr-11 placeholder:text-muted-foreground/50 focus:border-primary focus:ring-1 focus:ring-primary/20 h-12 rounded-sm transition-all"
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 font-body flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-primary/50 rounded-full" />
                    سيتم تحديد البلد تلقائياً من رقم الهاتف
                  </p>
                </div>

                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-gold h-12 font-heading tracking-widest text-sm uppercase rounded-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'تسجيل الدخول'
                    )}
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          </div>

          {/* Footer decoration */}
          <div className="px-8 pb-6">
            <div className="flex items-center justify-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="w-1.5 h-1.5 rotate-45 border border-primary/40" />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 flex items-center justify-center gap-6 text-muted-foreground"
        >
          <div className="flex items-center gap-2 text-xs font-body">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>آمن 100%</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2 text-xs font-body">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span>بياناتك محمية</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
