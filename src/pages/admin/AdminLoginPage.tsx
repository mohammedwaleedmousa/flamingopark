import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2, UserPlus, LogIn } from 'lucide-react';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user has admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (roleData) {
          navigate('/admin');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'خطأ',
        description: 'يرجى ملء جميع الحقول',
        variant: 'destructive',
      });
      return;
    }

    if (isSignUp && formData.password !== formData.confirmPassword) {
      toast({
        title: 'خطأ',
        description: 'كلمتا المرور غير متطابقتين',
        variant: 'destructive',
      });
      return;
    }

    if (isSignUp && formData.password.length < 6) {
      toast({
        title: 'خطأ',
        description: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up new admin
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Add admin role
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({
              user_id: data.user.id,
              role: 'admin',
            });

          if (roleError) {
            console.error('Role assignment error:', roleError);
          }

          toast({
            title: 'تم إنشاء الحساب',
            description: 'تم إنشاء حساب الأدمن بنجاح، يمكنك تسجيل الدخول الآن',
          });

          setIsSignUp(false);
          setFormData({ ...formData, confirmPassword: '' });
        }
      } else {
        // Sign in
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        // Check if user has admin role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roleData) {
          await supabase.auth.signOut();
          throw new Error('ليس لديك صلاحيات الأدمن');
        }

        toast({
          title: 'مرحباً',
          description: 'تم تسجيل الدخول بنجاح',
        });

        navigate('/admin');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      let errorMessage = 'حدث خطأ أثناء العملية';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary flex flex-col items-center justify-center p-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--gold)) 1px, transparent 1px)`,
        backgroundSize: '30px 30px'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="logo-ermgold text-4xl mb-2"
          >
            ERMGOLD
          </motion.h1>
          <p className="text-gold/60 text-sm font-body">لوحة التحكم</p>
        </div>

        <motion.div 
          layout
          className="bg-charcoal/50 backdrop-blur-sm border border-gold/20 p-8 rounded-2xl shadow-[0_20px_60px_-20px_hsl(var(--gold)/0.2)]"
        >
          {/* Tabs */}
          <div className="flex mb-8 bg-secondary/50 rounded-xl p-1">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-heading text-sm transition-all ${
                !isSignUp 
                  ? 'bg-gold text-secondary' 
                  : 'text-gold/60 hover:text-gold'
              }`}
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-heading text-sm transition-all ${
                isSignUp 
                  ? 'bg-gold text-secondary' 
                  : 'text-gold/60 hover:text-gold'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              إنشاء حساب
            </button>
          </div>

          <motion.h2 
            key={isSignUp ? 'signup' : 'login'}
            initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-heading text-xl text-gold text-center mb-6"
          >
            {isSignUp ? 'إنشاء حساب أدمن جديد' : 'تسجيل دخول الأدمن'}
          </motion.h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-body text-gold/70 mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@ermgold.com"
                  className="bg-secondary/50 border-gold/30 text-gold-light pr-10 placeholder:text-gold/30 focus:border-gold rounded-xl h-12"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-body text-gold/70 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-secondary/50 border-gold/30 text-gold-light pr-10 placeholder:text-gold/30 focus:border-gold rounded-xl h-12"
                />
              </div>
            </div>

            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-body text-gold/70 mb-2">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold/50" />
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="bg-secondary/50 border-gold/30 text-gold-light pr-10 placeholder:text-gold/30 focus:border-gold rounded-xl h-12"
                  />
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full btn-gold py-6 font-heading tracking-wider rounded-xl text-base"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5 ml-2" />
                  إنشاء الحساب
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 ml-2" />
                  دخول
                </>
              )}
            </Button>
          </form>

          {/* Info Text */}
          <p className="text-center text-gold/40 text-xs font-body mt-6">
            {isSignUp 
              ? 'بعد إنشاء الحساب ستتمكن من الوصول للوحة التحكم' 
              : 'أدخل بيانات حسابك للوصول للوحة التحكم'}
          </p>
        </motion.div>

        {/* Back to Store */}
        <div className="text-center mt-6">
          <a 
            href="/home" 
            className="text-gold/50 hover:text-gold text-sm font-body transition-colors"
          >
            العودة للمتجر
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
