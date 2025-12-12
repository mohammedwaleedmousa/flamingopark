import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, Mail, Loader2, UserPlus, LogIn } from 'lucide-react';
import Logo from '@/components/Logo';

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="backdrop-blur-sm bg-card/80 rounded-2xl shadow-2xl shadow-primary/10 p-8 space-y-8 border border-primary/40">
          {/* Logo */}
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>
          <p className="text-muted-foreground text-sm text-center">لوحة التحكم</p>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-heading text-sm transition-all ${
                !isSignUp 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-heading text-sm transition-all ${
                isSignUp 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
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
            className="font-heading text-lg text-foreground text-center"
          >
            {isSignUp ? 'إنشاء حساب أدمن جديد' : 'تسجيل دخول الأدمن'}
          </motion.h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-body text-muted-foreground">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@ermgold.com"
                  className="bg-background/50 border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary pr-10 rounded-xl h-12 transition-all"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-body text-muted-foreground">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-background/50 border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary pr-10 rounded-xl h-12 transition-all"
                />
              </div>
            </div>

            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="block text-sm font-body text-muted-foreground">
                  تأكيد كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    className="bg-background/50 border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary pr-10 rounded-xl h-12 transition-all"
                  />
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 font-heading tracking-wider rounded-xl text-base shadow-lg shadow-primary/20"
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
          <p className="text-center text-muted-foreground text-xs font-body">
            {isSignUp 
              ? 'بعد إنشاء الحساب ستتمكن من الوصول للوحة التحكم' 
              : 'أدخل بيانات حسابك للوصول للوحة التحكم'}
          </p>
        </div>

        {/* Back to Store */}
        <div className="text-center mt-6">
          <a 
            href="/home" 
            className="text-muted-foreground hover:text-primary text-sm font-body transition-colors"
          >
            العودة للمتجر
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
