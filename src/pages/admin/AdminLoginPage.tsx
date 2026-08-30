import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_BASE_PATH } from '@/lib/adminRoutes';
import { KeyRound, Lock, Mail, Loader2, LogIn, ShieldCheck } from 'lucide-react';
import Logo from '@/components/Logo';

type LoginStep = 'credentials' | 'enroll' | 'verify';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [factorId, setFactorId] = useState('');
  const [totpUri, setTotpUri] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [code, setCode] = useState('');

  const isCurrentUserAdmin = async () => {
    const { data, error } = await (supabase.rpc as any)('is_current_user_admin');
    if (error) throw error;
    return data === true;
  };

  const finishLogin = () => {
    toast({ title: 'مرحباً', description: 'تم تسجيل الدخول الآمن بنجاح' });
    navigate(ADMIN_BASE_PATH, { replace: true });
  };

  const startEnrollment = async () => {
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    for (const factor of factors.totp ?? []) {
      if (factor.status !== 'verified') {
        await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Flamingo Park Admin',
    });

    if (error) throw error;

    setFactorId(data.id);
    setTotpUri(data.totp.uri);
    setTotpSecret(data.totp.secret);
    setCode('');
    setStep('enroll');
  };

  const continueAdminLogin = async () => {
    const isAdmin = await isCurrentUserAdmin();

    if (!isAdmin) {
      await supabase.auth.signOut();
      throw new Error('بيانات الدخول غير صحيحة أو الحساب غير مخول');
    }

    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) throw aalError;

    if (aal.currentLevel === 'aal2') {
      finishLogin();
      return;
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;

    const verifiedFactor = (factors.totp ?? []).find((factor) => factor.status === 'verified');

    if (verifiedFactor) {
      setFactorId(verifiedFactor.id);
      setCode('');
      setStep('verify');
      return;
    }

    await startEnrollment();
  };

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !active) return;

      setIsLoading(true);
      try {
        await continueAdminLogin();
      } catch (error) {
        console.error('Admin session MFA check failed:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void checkSession();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) throw error;
      await continueAdminLogin();
    } catch (error: any) {
      console.error('Admin auth error:', error);
      const invalid = error?.message?.includes('Invalid login credentials');
      toast({
        title: 'تعذر تسجيل الدخول',
        description: invalid ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : (error?.message || 'حدث خطأ أثناء العملية'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);

    if (!factorId || cleanCode.length !== 6) {
      toast({ title: 'تحقق من الرمز', description: 'أدخل رمز Authenticator المكون من 6 أرقام', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: cleanCode,
      });
      if (verifyError) throw verifyError;

      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;
      if (aal.currentLevel !== 'aal2') throw new Error('لم يكتمل التحقق الثنائي');

      finishLogin();
    } catch (error: any) {
      console.error('Admin MFA verification failed:', error);
      toast({ title: 'الرمز غير صحيح', description: 'تحقق من الرمز الحالي في تطبيق Authenticator وحاول مجدداً', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelMfa = async () => {
    await supabase.auth.signOut();
    setStep('credentials');
    setFactorId('');
    setTotpUri('');
    setTotpSecret('');
    setCode('');
    setFormData((current) => ({ ...current, password: '' }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" dir="rtl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-2xl shadow-primary/10 p-8 space-y-7 border border-primary/40">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">لوحة التحكم</p>
            <h2 className="mt-2 font-heading text-lg text-foreground">
              {step === 'credentials' ? 'تسجيل دخول الأدمن' : step === 'enroll' ? 'تفعيل التحقق بخطوتين' : 'التحقق بخطوتين'}
            </h2>
          </div>

          {step === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm text-muted-foreground">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} autoComplete="username" className="bg-background/50 border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary pr-10 rounded-xl h-12" dir="ltr" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm text-muted-foreground">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="current-password" className="bg-background/50 border-0 ring-1 ring-border/50 focus:ring-2 focus:ring-primary pr-10 rounded-xl h-12" />
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 rounded-xl text-base">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 ml-2" />دخول</>}
              </Button>
            </form>
          )}

          {step === 'enroll' && (
            <form onSubmit={handleVerifyMfa} className="space-y-5">
              <div className="rounded-xl border border-[#E4E0F8] bg-[#F8F7FF] p-4 text-center">
                <ShieldCheck className="mx-auto h-7 w-7 text-[#675CBA]" />
                <p className="mt-2 text-sm font-semibold text-foreground">افتح تطبيق Authenticator وامسح الرمز</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">يمكنك استخدام Google Authenticator أو Microsoft Authenticator أو أي تطبيق TOTP.</p>
              </div>

              {totpUri && (
                <div className="mx-auto w-fit rounded-2xl bg-white p-4 ring-1 ring-border">
                  <QRCodeSVG value={totpUri} size={190} level="M" marginSize={1} />
                </div>
              )}

              {totpSecret && (
                <div className="rounded-xl bg-muted/40 p-3 text-center">
                  <p className="text-[11px] text-muted-foreground">إذا تعذر مسح QR أدخل هذا المفتاح يدويًا</p>
                  <p dir="ltr" className="mt-1 break-all font-mono text-xs font-semibold text-foreground">{totpSecret}</p>
                </div>
              )}

              <MfaCodeInput code={code} onChange={setCode} />
              <Button type="submit" disabled={isLoading} className="w-full py-6 rounded-xl">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تفعيل والتحقق'}
              </Button>
              <button type="button" onClick={cancelMfa} className="w-full text-xs text-muted-foreground hover:text-foreground">إلغاء وتسجيل الخروج</button>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyMfa} className="space-y-5">
              <div className="rounded-xl border border-[#E4E0F8] bg-[#F8F7FF] p-4 text-center">
                <KeyRound className="mx-auto h-7 w-7 text-[#675CBA]" />
                <p className="mt-2 text-sm font-semibold text-foreground">أدخل رمز Authenticator</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">بعد كلمة المرور نحتاج الرمز الحالي المكون من 6 أرقام قبل فتح لوحة الإدارة.</p>
              </div>
              <MfaCodeInput code={code} onChange={setCode} autoFocus />
              <Button type="submit" disabled={isLoading} className="w-full py-6 rounded-xl">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تحقق وادخل'}
              </Button>
              <button type="button" onClick={cancelMfa} className="w-full text-xs text-muted-foreground hover:text-foreground">تسجيل الخروج</button>
            </form>
          )}

          <p className="text-center text-muted-foreground text-xs">
            {step === 'credentials' ? 'أدخل بيانات حساب الإدارة للوصول الآمن' : 'لن تفتح صلاحيات الإدارة قبل اكتمال التحقق الثنائي'}
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/home" className="text-muted-foreground hover:text-primary text-sm transition-colors">العودة للمتجر</a>
        </div>
      </motion.div>
    </div>
  );
};

const MfaCodeInput = ({ code, onChange, autoFocus = false }: { code: string; onChange: (value: string) => void; autoFocus?: boolean }) => (
  <div className="space-y-2">
    <label className="block text-sm text-muted-foreground">رمز التحقق</label>
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      value={code}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="000000"
      maxLength={6}
      dir="ltr"
      className="h-14 rounded-xl text-center font-mono text-xl tracking-[0.35em] ring-1 ring-border/60 focus:ring-2 focus:ring-primary"
    />
  </div>
);

export default AdminLoginPage;
