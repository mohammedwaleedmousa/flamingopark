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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Luxury Frame */}
        <div className="relative p-8 md:p-10">
          {/* Corner decorations */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />

          <h1 className="text-2xl font-heading text-primary text-center mb-10">
            مرحباً بك
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="الاسم"
                className="bg-transparent border-2 border-primary/40 text-foreground placeholder:text-muted-foreground focus:border-primary h-14 text-center text-lg rounded-none"
                dir="rtl"
              />
            </div>

            <div>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="رقم الهاتف (+966 أو +967)"
                className="bg-transparent border-2 border-primary/40 text-foreground placeholder:text-muted-foreground focus:border-primary h-14 text-center text-lg rounded-none"
                dir="ltr"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold h-14 font-heading tracking-wider text-lg rounded-none mt-8"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'دخول'
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuthPage;
