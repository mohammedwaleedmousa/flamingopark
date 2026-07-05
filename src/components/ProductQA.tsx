import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MessageCircle, ThumbsUp, Send } from 'lucide-react';
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
  const { user } = useStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [myHelpful, setMyHelpful] = useState<Set<string>>(new Set());

  const { data: questions = [], refetch } = useQuery({
    queryKey: ['product-questions', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_questions')
        .select('*')
        .eq('product_id', productId)
        .order('helpful_count', { ascending: false });
      return error ? [] : (data || []);
    },
  });

  const handleAskQuestion = useCallback(async () => {
    if (!newQuestion.trim()) {
      toast({
        title: getSiteText(content, 'qa_error_empty', 'الحقل مطلوب'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('product_questions').insert({
        product_id: productId,
        content: newQuestion,
        content_ar: newQuestion,
        author: user?.email || 'Guest',
        helpful_count: 0,
      });

      if (error) throw error;
      
      toast({
        title: getSiteText(content, 'qa_success', 'تم إرسال سؤالك بنجاح'),
      });
      
      setNewQuestion('');
      refetch();
    } catch (error) {
      toast({
        title: getSiteText(content, 'qa_error', 'حدث خطأ'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [newQuestion, productId, user, refetch, content]);

  const handleHelpful = useCallback(async (questionId: string) => {
    if (myHelpful.has(questionId)) return;
    
    try {
      const current = questions.find(q => q.id === questionId);
      if (!current) return;

      const { error } = await supabase
        .from('product_questions')
        .update({ helpful_count: current.helpful_count + 1 })
        .eq('id', questionId);

      if (error) throw error;
      
      setMyHelpful(prev => new Set([...prev, questionId]));
      refetch();
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  }, [myHelpful, questions, refetch]);

  return (
    <div className="space-y-6">
      {/* Ask Question Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border border-border p-6"
      >
        <h3 className="font-heading text-lg mb-4">
          {getSiteText(content, 'qa_ask_question', 'اسأل سؤالك')}
        </h3>
        <div className="flex gap-3">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder={getSiteText(content, 'qa_placeholder', 'ماذا تريد أن تعرف عن هذا المنتج؟')}
            className="flex-1 px-4 py-2 rounded-lg border border-border bg-background resize-none min-h-20"
          />
          <button
            onClick={handleAskQuestion}
            disabled={loading}
            className="btn-unified flex items-center gap-2 self-end"
          >
            <Send className="w-4 h-4" />
            {getSiteText(content, 'qa_send', 'أرسل')}
          </button>
        </div>
      </motion.div>

      {/* Questions List */}
      <div className="space-y-4">
        <h3 className="font-heading text-lg">
          {getSiteText(content, 'qa_title', 'الأسئلة الشائعة')} ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            {getSiteText(content, 'qa_empty', 'لا توجد أسئلة حالياً')}
          </p>
        ) : (
          questions.map((question) => (
            <motion.div
              key={question.id}
              layout
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === question.id ? null : question.id)}
                className="w-full px-6 py-4 flex items-start justify-between hover:bg-muted/50 transition"
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
                    className="border-t border-border px-6 py-4 bg-muted/30 space-y-4"
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
  );
};

export default ProductQA;
