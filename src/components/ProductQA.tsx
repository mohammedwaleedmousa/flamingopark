import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, ThumbsUp, Send, AlertCircle, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  content: string;
  content_ar: string;
  answer?: string;
  answer_ar?: string;
  author: string;
  helpful_count: number;
  created_at: string;
}

interface ProductQA {
  productId: string;
  questions: Question[];
}

export const ProductQA = ({ productId }: { productId: string }) => {
  const { data: content } = useSiteContent('product_qa_');
  const { customer } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [myHelpful, setMyHelpful] = useState<Set<string>>(new Set());
  const [supabaseAuthed, setSupabaseAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // يعتمد تسجيل الدخول برقم الهاتف (جلسة العميل) أو جلسة Supabase.
  const isAuthenticated = Boolean(customer) || supabaseAuthed;

  // Check Supabase authentication state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSupabaseAuthed(!!session?.user);
      } catch (error) {
        console.error('Error checking auth:', error);
        setSupabaseAuthed(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSupabaseAuthed(!!session?.user);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const { data: questions = [], refetch } = useQuery({
    queryKey: ['product-questions', productId],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('product_questions')
          .select('*')
          .eq('product_id', productId)
          .order('helpful_count', { ascending: false });
        return error ? [] : ((data || []) as Question[]);
      } catch {
        return [];
      }
    },
  });

  const handleAskQuestion = useCallback(async () => {
    // Check Supabase auth first
    if (!isAuthenticated) {
      toast({
        title: getSiteText(content, 'qa_login_required', 'يجب تسجيل الدخول أولاً'),
        description: getSiteText(content, 'qa_login_description', 'يرجى تسجيل الدخول لطرح سؤال'),
        variant: 'destructive',
      });
      return;
    }

    if (!newQuestion.trim()) {
      toast({
        title: getSiteText(content, 'qa_error_empty', 'الحقل مطلوب'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any).from('product_questions').insert({
        product_id: productId,
        content: newQuestion,
        content_ar: newQuestion,
        author: customer?.name || customer?.phone || 'عميل',
        helpful_count: 0,
      });

      if (error) throw error;
      
      toast({
        title: getSiteText(content, 'qa_success', 'تم إرسال سؤالك بنجاح'),
      });
      
      setNewQuestion('');
      refetch();
    } catch (error) {
      console.error('Error asking question:', error);
      toast({
        title: getSiteText(content, 'qa_error', 'حدث خطأ'),
        description: getSiteText(content, 'qa_error_desc', 'يرجى المحاولة مرة أخرى لاحقاً'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [newQuestion, productId, customer, refetch, content, isAuthenticated]);

  const handleHelpful = useCallback(async (questionId: string) => {
    if (myHelpful.has(questionId)) return;
    
    try {
      const current = questions.find(q => q.id === questionId);
      if (!current) return;

      const { error } = await (supabase as any)
        .from('product_questions')
        .update({ helpful_count: (current.helpful_count || 0) + 1 })
        .eq('id', questionId);

      if (error) throw error;
      
      setMyHelpful(prev => new Set([...prev, questionId]));
      refetch();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  }, [myHelpful, questions, refetch]);

  return (
    <section className="border-t border-border pt-12">
      <div className="mb-8">
        <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground">مساعدة قبل الشراء</p>
        <h2 className="font-heading text-2xl md:text-3xl">الأسئلة والأجوبة</h2>
      </div>
      <div className="space-y-6">
      {/* Ask Question Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-border bg-card p-5 md:p-6"
      >
        <h3 className="mb-4 font-heading text-lg">
          {getSiteText(content, 'qa_ask_question', 'اسأل سؤالك')}
        </h3>

        {!isAuthenticated && !authChecking && (
          <div className="mb-4 flex items-start gap-3 border border-destructive/30 bg-destructive/10 p-4">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {getSiteText(content, 'qa_auth_required', 'تسجيل الدخول مطلوب')}
              </p>
              <p className="text-sm text-destructive/80 mt-1">
                {getSiteText(content, 'qa_auth_message', 'يجب أن تكون مسجلاً للدخول لطرح أسئلة')}
              </p>
              <Link to="/auth">
                <button className="mt-3 inline-flex items-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90">
                  <LogIn className="w-4 h-4" />
                  {getSiteText(content, 'qa_go_to_login', 'اذهب إلى تسجيل الدخول')}
                </button>
              </Link>
            </div>
          </div>
        )}

        <div className={`flex flex-col gap-3 sm:flex-row ${!isAuthenticated || authChecking ? 'pointer-events-none opacity-60' : ''}`}>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={getSiteText(content, 'qa_placeholder', 'ماذا تريد أن تعرف عن هذا المنتج؟')}
            disabled={!isAuthenticated || authChecking}
            className="min-h-24 flex-1 resize-none border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={handleAskQuestion}
            disabled={loading || !isAuthenticated || authChecking}
            className="btn-unified h-11 self-end gap-2 px-5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {getSiteText(content, 'qa_send', 'أرسل')}
          </button>
        </div>
      </motion.div>

      {/* Questions List */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{questions.length} {getSiteText(content, 'qa_title', 'سؤال')}</p>

        {questions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            {getSiteText(content, 'qa_empty', 'لا توجد أسئلة حالياً')}
          </p>
        ) : (
          questions.map((question) => (
            <motion.div
              key={question.id}
              layout
              className="overflow-hidden border border-border bg-card"
            >
              <button
                onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                className="flex w-full items-start justify-between px-5 py-4 text-right transition hover:bg-muted/40"
              >
                <div className="flex items-start gap-3 flex-1 text-left">
                  <MessageCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground break-words">
                      {question.content_ar}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getSiteText(content, 'qa_by', 'بواسطة')} {question.author}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground transition transform flex-shrink-0 ${
                    expandedId === question.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {expandedId === question.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 border-t border-border bg-muted/30 px-5 py-4"
                  >
                    {question.answer_ar ? (
                      <div>
                        <p className="text-sm font-medium text-primary mb-2">
                          {getSiteText(content, 'qa_answer', 'الإجابة')}
                        </p>
                        <p className="text-muted-foreground">
                          {question.answer_ar}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        {getSiteText(content, 'qa_no_answer', 'لم يتم الإجابة عليه بعد')}
                      </p>
                    )}

                    {/* Helpful Button */}
                    <button
                      onClick={() => handleHelpful(question.id)}
                      disabled={myHelpful.has(question.id)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition disabled:opacity-50"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {getSiteText(content, 'qa_helpful', 'مفيد')} ({question.helpful_count})
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
      </div>
    </section>
  );
};

export default ProductQA;
