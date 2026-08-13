import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, ChevronDown, Clock3, LogIn, MessageCircleQuestion, Search, Send, ShieldCheck, X } from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/store/useStore";
import { getSiteText, useSiteContent } from "@/hooks/useSiteContent";
import { toast } from "@/hooks/use-toast";

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
  const { data: content } = useSiteContent("product_qa_");
  const { customer } = useStore();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAskForm, setShowAskForm] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supabaseAuthed, setSupabaseAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const canAskQuestion = supabaseAuthed;

  /* =========================================================
     AUTH
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          if (mounted) {
            setSupabaseAuthed(false);
          }

          return;
        }

        if (mounted) {
          setSupabaseAuthed(Boolean(data.user));
        }
      } catch (error) {
        console.error("Error checking auth:", error);

        if (mounted) {
          setSupabaseAuthed(false);
        }
      } finally {
        if (mounted) {
          setAuthChecking(false);
        }
      }
    };

    void checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setSupabaseAuthed(Boolean(session?.user));
      setAuthChecking(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* =========================================================
     QUESTIONS
  ========================================================= */

  const {
    data: questions = [],
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["product-questions", productId],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_questions").select("id,content,content_ar,answer,answer_ar,author,helpful_count,created_at").eq("product_id", productId).order("helpful_count", { ascending: false }).order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading questions:", error);
        throw error;
      }

      return (data || []) as Question[];
    },
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
  });

  /* =========================================================
     COUNTS
  ========================================================= */

  const answeredCount = useMemo(() => {
    return questions.filter((question) => Boolean(question.answer_ar || question.answer)).length;
  }, [questions]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredQuestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return questions;

    return questions.filter((question) => {
      const questionText = `${question.content_ar || ""} ${question.content || ""}`.toLowerCase();
      const answerText = `${question.answer_ar || ""} ${question.answer || ""}`.toLowerCase();

      return questionText.includes(query) || answerText.includes(query);
    });
  }, [questions, searchQuery]);

  const displayedQuestions = showAll ? filteredQuestions : filteredQuestions.slice(0, 4);

  /* =========================================================
     ASK QUESTION
  ========================================================= */

  const handleAskQuestion = useCallback(async () => {
    if (authChecking) return;

    if (!canAskQuestion) {
      toast({
        title: getSiteText(content, "qa_login_required", "يجب تسجيل الدخول أولاً"),
        description: getSiteText(content, "qa_login_description", "سجل دخولك حتى تتمكن من طرح سؤال عن المنتج"),
        variant: "destructive",
      });

      return;
    }

    const trimmedQuestion = newQuestion.trim();

    if (trimmedQuestion.length < 5) {
      toast({
        title: getSiteText(content, "qa_error_empty", "اكتب سؤالك بشكل أوضح"),
        description: "يجب أن يحتوي السؤال على 5 أحرف على الأقل.",
        variant: "destructive",
      });

      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("product_questions").insert({
        product_id: productId,
        content: trimmedQuestion,
        content_ar: trimmedQuestion,
        author: customer?.name || customer?.phone || "عميل فلامنجو",
        helpful_count: 0,
      });

      if (error) throw error;

      toast({
        title: getSiteText(content, "qa_success", "تم إرسال سؤالك بنجاح"),
        description: "سنقوم بالرد عليه في أقرب وقت.",
      });

      setNewQuestion("");
      setShowAskForm(false);

      await refetch();
    } catch (error: any) {
      console.error("Error asking question:", error);

      const isPermissionError = error?.code === "42501" || String(error?.message || "").toLowerCase().includes("row-level security");

      toast({
        title: isPermissionError ? "يجب تسجيل الدخول أولاً" : getSiteText(content, "qa_error", "تعذر إرسال السؤال"),
        description: isPermissionError ? "سجل دخولك ثم حاول إرسال السؤال مرة أخرى." : getSiteText(content, "qa_error_desc", "يرجى المحاولة مرة أخرى لاحقاً"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [authChecking, canAskQuestion, content, customer, newQuestion, productId, refetch]);

  /* =========================================================
     DATE
  ========================================================= */

  const formatDate = (date?: string) => {
    if (!date) return "";

    try {
      return new Intl.DateTimeFormat("ar-YE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "";
    }
  };

  return (
    <section className="w-full" dir="rtl">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 shrink-0 rounded-full bg-[#D4777D]" />

            <span className="font-serif text-[6px] tracking-[0.22em] text-[#B86168]">QUESTIONS</span>
          </div>

          <h2 className="mt-1.5 text-[14px] font-semibold text-[#403633] md:text-[17px]">{getSiteText(content, "qa_heading", "الأسئلة والأجوبة")}</h2>

          <p className="mt-1 text-[7px] leading-5 text-[#9A8C87] md:text-[8px]">{getSiteText(content, "qa_subtitle", "اسأل عن المقاس، الخامة أو أي تفاصيل قبل الطلب")}</p>
        </div>

        <button type="button" onClick={() => setShowAskForm((current) => !current)} className={`flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-[10px] px-3 text-[8px] font-semibold transition-colors ${showAskForm ? "border border-[#E2D4D0] bg-white text-[#8B706C]" : "bg-[#D4777D] text-white active:bg-[#C96B72]"}`}>
          {showAskForm ? (
            <>
              <X className="h-3 w-3" strokeWidth={1.7} />
              إلغاء
            </>
          ) : (
            <>
              <MessageCircleQuestion className="h-3 w-3" strokeWidth={1.6} />
              اسأل عن المنتج
            </>
          )}
        </button>
      </div>

      {/* =====================================================
          SIMPLE STATS
      ===================================================== */}

      {questions.length > 0 && (
        <div className="mt-4 flex items-center gap-4 border-y border-[#F0E8E5] py-2.5">
          <div className="flex items-center gap-1.5">
            <MessageCircleQuestion className="h-3.5 w-3.5 stroke-[1.5] text-[#C66C72]" />

            <span className="text-[7px] text-[#847671]">
              <strong className="font-semibold text-[#5E504C]">{questions.length}</strong> {questions.length === 1 ? "سؤال" : "أسئلة"}
            </span>
          </div>

          <span className="h-3 w-px bg-[#E8DEDA]" />

          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-[#6E9274]" />

            <span className="text-[7px] text-[#847671]">
              <strong className="font-semibold text-[#5E504C]">{answeredCount}</strong> تمت الإجابة
            </span>
          </div>

          <span className="h-3 w-px bg-[#E8DEDA]" />

          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 stroke-[1.5] text-[#9A7773]" />
            <span className="text-[7px] text-[#847671]">ردود المتجر</span>
          </div>
        </div>
      )}

      {/* =====================================================
          ASK FORM
      ===================================================== */}

      {showAskForm && (
        <div className="mt-4 overflow-hidden rounded-[14px] border border-[#E9DEDA] bg-[#FFFDFC]">
          {authChecking ? (
            <div className="flex min-h-[110px] items-center justify-center">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#E9D1CF] border-t-[#D4777D]" />
            </div>
          ) : !canAskQuestion ? (
            <div className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAECE9]">
                  <AlertCircle className="h-4 w-4 stroke-[1.5] text-[#C76970]" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-[#4A3D39]">{getSiteText(content, "qa_auth_required", "تسجيل الدخول مطلوب")}</p>

                  <p className="mt-1 text-[8px] leading-5 text-[#978983]">{getSiteText(content, "qa_auth_message", "سجل دخولك حتى تتمكن من طرح سؤال عن هذا المنتج.")}</p>
                </div>
              </div>

              <Link to="/auth" className="mt-3 flex h-[39px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#D4777D] text-[8px] font-semibold text-white md:w-auto md:px-5">
                <LogIn className="h-3.5 w-3.5" strokeWidth={1.6} />
                {getSiteText(content, "qa_go_to_login", "تسجيل الدخول")}
              </Link>
            </div>
          ) : (
            <div className="p-3.5 md:p-4">
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-[#493C38]">{getSiteText(content, "qa_ask_question", "ما الذي تريد معرفته؟")}</p>

                <p className="mt-1 text-[7px] leading-5 text-[#A0938E]">اكتب سؤالك بوضوح ليسهل على فريق فلامنجو الإجابة عليه.</p>
              </div>

              <div className="relative">
                <textarea value={newQuestion} onChange={(event) => setNewQuestion(event.target.value.slice(0, 350))} placeholder={getSiteText(content, "qa_placeholder", "مثال: هل المقاس يطابق المقاسات المعتادة؟")} rows={3} disabled={loading} className="w-full resize-none rounded-[11px] border border-[#E7DCD8] bg-white px-3 py-3 pb-7 text-[9px] leading-6 text-[#4C403C] outline-none placeholder:text-[#B0A29D] focus:border-[#D9AEAA] disabled:opacity-50" />

                <span className="pointer-events-none absolute bottom-2 left-2.5 text-[6px] text-[#B4A6A1]">{newQuestion.length}/350</span>
              </div>

              <div className="mt-2.5 flex items-end justify-between gap-3">
                <p className="max-w-[220px] text-[6px] leading-4 text-[#A89B96]">لا تكتب رقم الهاتف أو أي بيانات شخصية داخل السؤال.</p>

                <button type="button" onClick={handleAskQuestion} disabled={loading || newQuestion.trim().length < 5} className="flex h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-[9px] bg-[#D4777D] px-4 text-[8px] font-semibold text-white active:bg-[#C96B72] disabled:cursor-not-allowed disabled:opacity-40">
                  {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send className="h-3 w-3" strokeWidth={1.7} />}

                  {loading ? "جارٍ الإرسال" : getSiteText(content, "qa_send", "إرسال السؤال")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          LOADING
      ===================================================== */}

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-[68px] animate-pulse rounded-[10px] bg-[#F7F3F1]" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        /* ===================================================
            EMPTY
        =================================================== */

        <div className="mt-4 flex min-h-[150px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[#E5D9D5] bg-[#FFFCFB] px-5 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAECE9]">
            <MessageCircleQuestion className="h-4 w-4 stroke-[1.5] text-[#C66C72]" />
          </span>

          <p className="mt-3 text-[10px] font-semibold text-[#493D39]">{getSiteText(content, "qa_empty", "لا توجد أسئلة حتى الآن")}</p>

          <p className="mt-1 max-w-[270px] text-[7px] leading-5 text-[#9B8D88]">لديك استفسار عن المنتج؟ يمكنك أن تكون أول من يسأل.</p>

          {!showAskForm && (
            <button type="button" onClick={() => setShowAskForm(true)} className="mt-3 h-[34px] rounded-[9px] border border-[#D9AEAA] bg-white px-4 text-[8px] font-semibold text-[#A95B61]">
              اسأل أول سؤال
            </button>
          )}
        </div>
      ) : (
        <>
          {/* =================================================
              SEARCH
          ================================================= */}

          {questions.length >= 4 && (
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-[1.4] text-[#A99B96]" />

              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث في الأسئلة..." className="h-[39px] w-full rounded-[11px] border border-[#E8DEDA] bg-[#FCFAF9] pr-9 pl-8 text-[8px] text-[#514541] outline-none placeholder:text-[#AFA29D] focus:border-[#D9AEAA] focus:bg-white" />

              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute left-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-[#F2ECE9] text-[#948580]">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}

          {/* =================================================
              RESULTS
          ================================================= */}

          {searchQuery.trim() && <p className="mt-2 text-[7px] text-[#9C8E89]">{filteredQuestions.length > 0 ? `${filteredQuestions.length} نتيجة` : "لا توجد نتائج"}</p>}

          {/* =================================================
              NO SEARCH RESULT
          ================================================= */}

          {filteredQuestions.length === 0 ? (
            <div className="flex min-h-[130px] flex-col items-center justify-center text-center">
              <Search className="h-5 w-5 stroke-[1.4] text-[#C3B6B1]" />

              <p className="mt-2 text-[8px] font-medium text-[#756762]">لم نجد سؤالاً مطابقاً</p>

              <button type="button" onClick={() => { setSearchQuery(""); setShowAskForm(true); }} className="mt-2 text-[7px] font-semibold text-[#B86168]">
                امسح البحث واسأل سؤالك
              </button>
            </div>
          ) : (
            /* =================================================
                QUESTIONS
            ================================================= */

            <div className="mt-3 overflow-hidden rounded-[14px] border border-[#EAE0DC] bg-white">
              {displayedQuestions.map((question, index) => {
                const expanded = expandedId === question.id;
                const questionText = question.content_ar || question.content;
                const answerText = question.answer_ar || question.answer;
                const answered = Boolean(answerText);

                return (
                  <article key={question.id} className={index !== displayedQuestions.length - 1 ? "border-b border-[#F0E8E5]" : ""}>
                    {/* QUESTION */}

                    <button type="button" onClick={() => setExpandedId(expanded ? null : question.id)} className="flex w-full items-start gap-2.5 px-3 py-3.5 text-right active:bg-[#FFF9F7]">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${answered ? "bg-[#FAECE9] text-[#B86168]" : "bg-[#F5F2F0] text-[#8C7D78]"}`}>
                        س
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[9px] font-semibold leading-5 text-[#463A36] md:text-[10px]">{questionText}</p>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="max-w-[120px] truncate text-[6px] text-[#9D8E89]">
                            {getSiteText(content, "qa_by", "بواسطة")} {question.author}
                          </span>

                          {question.created_at && (
                            <>
                              <span className="h-[3px] w-[3px] rounded-full bg-[#D4C8C4]" />

                              <span className="flex items-center gap-1 text-[6px] text-[#A99B96]">
                                <Clock3 className="h-2.5 w-2.5" />
                                {formatDate(question.created_at)}
                              </span>
                            </>
                          )}

                          <span className={`flex items-center gap-1 text-[6px] font-medium ${answered ? "text-[#5E8564]" : "text-[#A17C4F]"}`}>
                            {answered ? (
                              <>
                                <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={1.8} />
                                تمت الإجابة
                              </>
                            ) : (
                              <>
                                <Clock3 className="h-2.5 w-2.5" strokeWidth={1.6} />
                                بانتظار الرد
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <ChevronDown className={`mt-1 h-3.5 w-3.5 shrink-0 stroke-[1.5] text-[#A49792] transition-transform duration-150 ${expanded ? "rotate-180 text-[#B86168]" : ""}`} />
                    </button>

                    {/* ANSWER */}

                    {expanded && (
                      <div className="px-3 pb-3.5 pr-[50px]">
                        {answered ? (
                          <div className="relative rounded-[11px] bg-[#FFF7F5] px-3 py-3">
                            <span className="absolute right-0 top-3 h-5 w-[2px] rounded-full bg-[#D4777D]" />

                            <div className="mb-2 flex items-center gap-1.5">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#D4777D]">
                                <Check className="h-2.5 w-2.5 stroke-[2] text-white" />
                              </span>

                              <span className="text-[8px] font-semibold text-[#A95B61]">Flamingo Park</span>

                              <span className="flex items-center gap-1 text-[6px] text-[#98716F]">
                                <ShieldCheck className="h-2.5 w-2.5" strokeWidth={1.6} />
                                رد المتجر
                              </span>
                            </div>

                            <p className="whitespace-pre-line text-[8px] leading-6 text-[#6E5E59] md:text-[9px]">{answerText}</p>

                            {question.helpful_count > 0 && <p className="mt-2 border-t border-[#EEDFDA] pt-2 text-[6px] text-[#A2928D]">وجد {question.helpful_count} من العملاء هذه الإجابة مفيدة</p>}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 rounded-[10px] bg-[#F8F5F3] px-3 py-2.5">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D49B59]" />

                            <p className="text-[7px] font-medium text-[#89766E]">{getSiteText(content, "qa_no_answer", "بانتظار رد فريق فلامنجو")}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* =================================================
              SHOW ALL
          ================================================= */}

          {filteredQuestions.length > 4 && (
            <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-2 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#E5DAD6] bg-white text-[8px] font-semibold text-[#A95B61] active:bg-[#FFF8F6]">
              {showAll ? "عرض أقل" : `عرض كل الأسئلة (${filteredQuestions.length})`}

              <ChevronDown className={`h-3 w-3 stroke-[1.6] transition-transform ${showAll ? "rotate-180" : ""}`} />
            </button>
          )}
        </>
      )}
    </section>
  );
};

export default ProductQA;