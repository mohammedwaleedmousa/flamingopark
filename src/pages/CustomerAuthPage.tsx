import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore, detectCountryFromPhone } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* University-style Card */}
        <div className="border border-primary/20 bg-card shadow-lg">
          {/* Header Bar */}
          <div className="bg-secondary py-4 px-6 border-b border-primary/30">
            <h1 className="text-xl font-heading text-primary text-center tracking-wide">
              تسجيل الدخول
            </h1>
          </div>

          {/* Form Body */}
          <div className="p-6 md:p-8 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground/80 text-right">
                  الاسم الكامل
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسمك"
                  className="bg-background border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 h-12"
                  dir="rtl"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground/80 text-right">
                  رقم الهاتف
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966 أو +967"
                  className="bg-background border border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 h-12"
                  dir="ltr"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full btn-gold h-12 font-heading tracking-wider mt-4"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'دخول'
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-secondary/50 py-3 px-6 border-t border-primary/10">
            <p className="text-xs text-muted-foreground text-center">
              سيتم إنشاء حساب جديد تلقائياً
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
