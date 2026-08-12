import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, ChevronDown, CircleHelp, Clock3, LogIn, MessageCircleQuestion, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/store/useStore';
import { useSiteContent, getSiteText } from '@/hooks/useSiteContent';
import { toast } from '@/hooks/use-toast';

interface Question {
  id: string;
  content: string;
  content_ar: string;
  answer?: string | null;
  answer_ar?: string | null;
  author: string;
  helpful_count: number;
  created_at: string;
}

export const ProductQA = ({ productId }: { productId: string }) => {
  const { data: content } = useSiteContent('product_qa_');
  const { customer } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAskForm, setShowAskForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabaseAuthed, setSupabaseAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  /*
    مهم:
    جدول product_questions عندك يسمح INSERT للمستخدم المصادق
    عليه عبر Supabase Auth، لذلك لا نعتمد customer وحده هنا.
  */
  const canAskQuestion = supabaseAuthed;

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          if (mounted) setSupabaseAuthed(false);
          return;
        }

        if (mounted) setSupabaseAuthed(Boolean(data.user));
      } catch (error) {
        console.error('Error checking auth:', error);

        if (mounted) setSupabaseAuthed(false);
      } finally {
        if (mounted) setAuthChecking(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSupabaseAuthed(Boolean(session?.user));
      setAuthChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const { data: questions = [], refetch, isLoading } = useQuery({
    queryKey: ['product-questions', productId],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_questions').select('id,content,content_ar,answer,answer_ar,author,helpful_count,created_at').eq('product_id', productId).order('helpful_count', { ascending: false }).order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading questions:', error);
        throw error;
      }

      return (data || []) as Question[];
    },
    staleTime: 1000 * 60 * 3,
  });

  const answeredCount = useMemo(() => {
    return questions.filter((question) => Boolean(question.answer_ar || question.answer)).length;
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return questions;

    return questions.filter((question) => {
      const questionText = `${question.content_ar || ''} ${question.content || ''}`.toLowerCase();
      const answerText = `${question.answer_ar || ''} ${question.answer || ''}`.toLowerCase();

      return questionText.includes(query) || answerText.includes(query);
    });
  }, [questions, searchQuery]);

  const displayedQuestions = showAll ? filteredQuestions : filteredQuestions.slice(0, 4);

  const handleAskQuestion = useCallback(async () => {
    if (authChecking) return;

    if (!canAskQuestion) {
      toast({
        title: getSiteText(content, 'qa_login_required', 'يجب تسجيل الدخول أولاً'),
        description: getSiteText(content, 'qa_login_description', 'سجل دخولك حتى تتمكن من طرح سؤال عن المنتج'),
        variant: 'destructive',
      });

      return;
    }

    const trimmedQuestion = newQuestion.trim();

    if (trimmedQuestion.length < 5) {
      toast({
        title: getSiteText(content, 'qa_error_empty', 'اكتب سؤالك بشكل أوضح'),
        description: 'يجب أن يحتوي السؤال على 5 أحرف على الأقل.',
        variant: 'destructive',
      });

      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('product_questions').insert({
        product_id: productId,
        content: trimmedQuestion,
        content_ar: trimmedQuestion,
        author: customer?.name || customer?.phone || 'عميل فلامنجو',
        helpful_count: 0,
      });

      if (error) throw error;

      toast({
        title: getSiteText(content, 'qa_success', 'تم إرسال سؤالك بنجاح'),
        description: 'سنقوم بالرد عليه في أقرب وقت.',
      });

      setNewQuestion('');
      setShowAskForm(false);

      await refetch();
    } catch (error: any) {
      console.error('Error asking question:', error);

      const isPermissionError = error?.code === '42501' || String(error?.message || '').toLowerCase().includes('row-level security');

      toast({
        title: isPermissionError ? 'يجب تسجيل الدخول أولاً' : getSiteText(content, 'qa_error', 'تعذر إرسال السؤال'),
        description: isPermissionError ? 'سجل دخولك ثم حاول إرسال السؤال مرة أخرى.' : getSiteText(content, 'qa_error_desc', 'يرجى المحاولة مرة أخرى لاحقاً'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [authChecking, canAskQuestion, content, customer, newQuestion, productId, refetch]);

  const formatDate = (date?: string) => {
    if (!date) return '';

    try {
      return new Intl.DateTimeFormat('ar-YE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(date));
    } catch {
      return '';
    }
  };

  return (
    <section className="w-full" dir="rtl">
      {/* ================================
          HEADER
      ================================= */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 shrink-0 rounded-full bg-[#E8547C]" />

            <h2 className="text-[15px] font-bold text-[#2D2528] md:text-[19px]">
              {getSiteText(content, 'qa_heading', 'الأسئلة والأجوبة')}
            </h2>
          </div>

          <p className="mt-1.5 pr-3 text-[9px] leading-5 text-[#9A858D] md:text-[10px]">
            {getSiteText(content, 'qa_subtitle', 'اسأل عن المقاس، الخامة أو أي تفاصيل قبل الطلب')}
          </p>
        </div>

        <button onClick={() => setShowAskForm((current) => !current)} className={`shrink-0 rounded-[6px] px-3 py-2 text-[9px] font-bold transition active:scale-[0.98] md:px-4 md:text-[10px] ${showAskForm ? 'border border-[#E9CCD5] bg-white text-[#B93461]' : 'bg-[#E8547C] text-white'}`}>
          {showAskForm ? 'إلغاء' : 'اسأل عن المنتج'}
        </button>
      </div>

      {/* ================================
          STATS
      ================================= */}
      {questions.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[#FFF1F5] px-2.5 py-2">
            <MessageCircleQuestion className="h-3.5 w-3.5 text-[#E8547C]" strokeWidth={1.6} />

            <span className="text-[8px] font-semibold text-[#96566C]">
              {questions.length} {questions.length === 1 ? 'سؤال' : 'أسئلة'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[#F2F8F4] px-2.5 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#4E8B62]" strokeWidth={1.6} />

            <span className="text-[8px] font-semibold text-[#587463]">
              {answeredCount} تمت الإجابة
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[#FAF7F8] px-2.5 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#AC7789]" strokeWidth={1.6} />

            <span className="text-[8px] font-semibold text-[#786169]">
              ردود موثوقة
            </span>
          </div>
        </div>
      )}

      {/* ================================
          ASK FORM
      ================================= */}
      <AnimatePresence initial={false}>
        {showAskForm && (
          <motion.div initial={{ opacity: 0, height: 0, y: -5 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -5 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="overflow-hidden">
            <div className="mb-5 rounded-[10px] border border-[#F0D9E1] bg-[#FFFAFB] p-3.5 md:p-5">
              {/* AUTH CHECKING */}
              {authChecking ? (
                <div className="flex min-h-[80px] items-center justify-center">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#F4CAD6] border-t-[#E8547C]" />
                </div>
              ) : !canAskQuestion ? (
                /* LOGIN REQUIRED */
                <div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F4]">
                      <AlertCircle className="h-[17px] w-[17px] text-[#D94D73]" strokeWidth={1.7} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-[#443338]">
                        {getSiteText(content, 'qa_auth_required', 'تسجيل الدخول مطلوب')}
                      </p>

                      <p className="mt-1 text-[9px] leading-5 text-[#987E87]">
                        {getSiteText(content, 'qa_auth_message', 'سجل دخولك حتى تتمكن من طرح سؤال عن هذا المنتج.')}
                      </p>
                    </div>
                  </div>

                  <Link to="/auth" className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#E8547C] text-[9px] font-bold text-white transition active:scale-[0.99] md:w-auto md:px-5">
                    <LogIn className="h-3.5 w-3.5" strokeWidth={1.8} />

                    {getSiteText(content, 'qa_go_to_login', 'تسجيل الدخول')}
                  </Link>
                </div>
              ) : (
                /* QUESTION FORM */
                <>
                  <div className="mb-3 flex items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF0F4]">
                      <CircleHelp className="h-[17px] w-[17px] text-[#E8547C]" strokeWidth={1.6} />
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-[#382B30]">
                        {getSiteText(content, 'qa_ask_question', 'ما الذي تريد معرفته؟')}
                      </p>

                      <p className="mt-0.5 text-[8px] leading-5 text-[#9E8991]">
                        حاول أن تجعل سؤالك واضحاً حتى نتمكن من مساعدتك بشكل أفضل.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <textarea value={newQuestion} onChange={(event) => setNewQuestion(event.target.value.slice(0, 350))} placeholder={getSiteText(content, 'qa_placeholder', 'مثال: هل المقاس يطابق المقاسات المعتادة؟')} rows={3} disabled={loading} className="w-full resize-none rounded-[7px] border border-[#EADCE1] bg-white px-3 py-3 pb-7 text-[10px] leading-6 text-[#3A3034] outline-none transition placeholder:text-[#B5A2A9] focus:border-[#E8547C] focus:ring-2 focus:ring-[#E8547C]/10 disabled:opacity-60" />

                    <span className="pointer-events-none absolute bottom-2 left-2.5 text-[7px] text-[#B5A2A9]">
                      {newQuestion.length}/350
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="max-w-[220px] text-[7px] leading-4 text-[#A18D94]">
                      لا تكتب رقم الهاتف أو أي معلومات شخصية داخل السؤال.
                    </p>

                    <button onClick={handleAskQuestion} disabled={loading || newQuestion.trim().length < 5} className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[6px] bg-[#E8547C] px-4 text-[9px] font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40">
                      {loading ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Send className="h-3 w-3" strokeWidth={1.8} />
                      )}

                      {loading ? 'جارٍ الإرسال' : getSiteText(content, 'qa_send', 'إرسال السؤال')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================
          LOADING
      ================================= */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[74px] animate-pulse rounded-[8px] bg-[#FAF5F7]" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        /* ================================
            EMPTY
        ================================= */
        <div className="flex min-h-[175px] flex-col items-center justify-center rounded-[10px] border border-dashed border-[#EED6DE] bg-[#FFFBFC] px-5 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0F4]">
            <MessageCircleQuestion className="h-[18px] w-[18px] text-[#E8547C]" strokeWidth={1.5} />
          </div>

          <p className="text-[11px] font-bold text-[#3A2E32]">
            {getSiteText(content, 'qa_empty', 'لا توجد أسئلة حتى الآن')}
          </p>

          <p className="mt-1.5 max-w-[280px] text-[8px] leading-5 text-[#9D8990]">
            لديك استفسار عن المنتج؟ اسأل وسنساعدك قبل إتمام طلبك.
          </p>

          {!showAskForm && (
            <button onClick={() => setShowAskForm(true)} className="mt-4 rounded-[6px] border border-[#E8547C] bg-white px-4 py-2 text-[9px] font-bold text-[#C23C66] transition active:bg-[#FFF1F5]">
              اسأل أول سؤال
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ================================
              SEARCH
          ================================= */}
          {questions.length >= 4 && (
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#AE9AA1]" strokeWidth={1.5} />

              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث في الأسئلة..." className="h-9 w-full rounded-[6px] border border-[#EEE1E5] bg-[#FCFAFB] pr-9 pl-3 text-[9px] text-[#45383D] outline-none transition placeholder:text-[#B7A7AD] focus:border-[#E8547C] focus:bg-white" />
            </div>
          )}

          {/* ================================
              RESULT COUNT
          ================================= */}
          {searchQuery.trim() && (
            <p className="mb-2 text-[8px] text-[#9C8990]">
              {filteredQuestions.length > 0 ? `${filteredQuestions.length} نتيجة` : 'لا توجد نتائج'}
            </p>
          )}

          {/* ================================
              QUESTIONS LIST
          ================================= */}
          {filteredQuestions.length === 0 ? (
            <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
              <Search className="h-5 w-5 text-[#C8B8BE]" strokeWidth={1.5} />

              <p className="mt-2 text-[9px] font-semibold text-[#78666D]">
                لم نجد سؤالاً مطابقاً
              </p>

              <button onClick={() => { setSearchQuery(''); setShowAskForm(true); }} className="mt-2 text-[8px] font-bold text-[#E8547C]">
                امسح البحث واسأل سؤالك
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#F1E4E8]">
              {displayedQuestions.map((question) => {
                const expanded = expandedId === question.id;
                const questionText = question.content_ar || question.content;
                const answerText = question.answer_ar || question.answer;
                const answered = Boolean(answerText);

                return (
                  <motion.article key={question.id} layout="position" className="overflow-hidden">
                    <button onClick={() => setExpandedId(expanded ? null : question.id)} className="group flex w-full items-start gap-3 py-4 text-right">
                      {/* Q ICON */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-[#FFF0F4] text-[10px] font-black text-[#D8426E]">
                        س
                      </div>

                      {/* QUESTION CONTENT */}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[10px] font-semibold leading-5 text-[#392E32] transition group-hover:text-[#B93461] md:text-[11px] md:leading-6">
                          {questionText}
                        </p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="max-w-[120px] truncate text-[7px] text-[#9C8990]">
                            {getSiteText(content, 'qa_by', 'بواسطة')} {question.author}
                          </span>

                          {question.created_at && (
                            <>
                              <span className="h-[3px] w-[3px] rounded-full bg-[#D5C6CB]" />

                              <span className="flex items-center gap-1 text-[7px] text-[#AD9CA2]">
                                <Clock3 className="h-2.5 w-2.5" />
                                {formatDate(question.created_at)}
                              </span>
                            </>
                          )}

                          {answered ? (
                            <span className="flex items-center gap-1 rounded-full bg-[#F1F8F3] px-1.5 py-[2px] text-[6px] font-semibold text-[#4C805E]">
                              <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />
                              تمت الإجابة
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#FFF7EA] px-1.5 py-[2px] text-[6px] font-semibold text-[#A47B43]">
                              بانتظار الرد
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-[#A48F96] transition-transform duration-200 ${expanded ? 'rotate-180 text-[#E8547C]' : ''}`} strokeWidth={1.6} />
                    </button>

                    {/* ================================
                        ANSWER
                    ================================= */}
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="overflow-hidden">
                          <div className="mr-10 pb-4">
                            {answered ? (
                              <div className="rounded-[8px] border border-[#F0DAE2] bg-[#FFF9FB] p-3">
                                <div className="mb-2 flex items-center gap-1.5">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8547C]">
                                    <Sparkles className="h-3 w-3 text-white" strokeWidth={1.8} />
                                  </div>

                                  <span className="text-[9px] font-bold text-[#B93461]">
                                    Flamingo Park
                                  </span>

                                  <span className="flex items-center gap-1 rounded-full bg-[#FFF0F4] px-1.5 py-[2px] text-[6px] font-semibold text-[#CB4B71]">
                                    <ShieldCheck className="h-2.5 w-2.5" strokeWidth={1.8} />
                                    رد المتجر
                                  </span>
                                </div>

                                <p className="text-[9px] leading-6 text-[#66565C] md:text-[10px] md:leading-7">
                                  {answerText}
                                </p>

                                {question.helpful_count > 0 && (
                                  <p className="mt-2 border-t border-[#F3E5E9] pt-2 text-[7px] text-[#AA989E]">
                                    وجد {question.helpful_count} من العملاء هذه الإجابة مفيدة
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-[7px] bg-[#FAF8F9] px-3 py-2.5">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E7A155]" />

                                <p className="text-[8px] font-medium text-[#94796F]">
                                  {getSiteText(content, 'qa_no_answer', 'بانتظار رد فريق فلامنجو')}
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
              })}
            </div>
          )}

          {/* ================================
              SHOW ALL
          ================================= */}
          {filteredQuestions.length > 4 && (
            <button onClick={() => setShowAll((current) => !current)} className="mt-1 flex h-10 w-full items-center justify-center gap-1.5 border-t border-[#F1E4E8] text-[9px] font-bold text-[#B93461] transition active:bg-[#FFF8FA]">
              {showAll ? 'عرض أقل' : `عرض كل الأسئلة (${filteredQuestions.length})`}

              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} strokeWidth={1.7} />
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default ProductQA;