import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore, detectCountryFromPhone } from '@/store/useStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Phone, Loader2 } from 'lucide-react';

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

    // Detect country from phone number
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
      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', formData.phone)
        .maybeSingle();

      let customer;
      
      if (existingCustomer) {
        customer = existingCustomer;
      } else {
        // Create new customer
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

      // Set customer and country in store
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
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-marble" />
      </div>

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gold/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="logo-ermgold text-4xl md:text-5xl mb-2">ERMGOLD</h1>
          <div className="flex items-center justify-center gap-2 text-gold/60">
            <div className="w-8 h-px bg-gold/40" />
            <span className="text-xs tracking-[0.3em] uppercase">Luxury</span>
            <div className="w-8 h-px bg-gold/40" />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-secondary/80 backdrop-blur-sm border border-gold/20 p-8 rounded">
          <h2 className="font-heading text-xl text-gold text-center mb-6">
            تسجيل الدخول
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-body text-gold/70 mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسمك"
                  className="bg-secondary/50 border-gold/30 text-gold-light pr-10 placeholder:text-gold/30 focus:border-gold"
                  dir="rtl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-body text-gold/70 mb-2">
                رقم الهاتف
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966 أو +967"
                  className="bg-secondary/50 border-gold/30 text-gold-light pr-10 placeholder:text-gold/30 focus:border-gold"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-gold/50 mt-2 font-body">
                سيتم تحديد البلد تلقائياً من رقم الهاتف
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold py-6 font-heading tracking-wider"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'دخول'
              )}
            </Button>
          </form>
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="w-12 h-px bg-gold/30" />
          <div className="w-2 h-2 rotate-45 border border-gold/50" />
          <div className="w-12 h-px bg-gold/30" />
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
