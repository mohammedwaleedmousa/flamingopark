-- Add product_questions table for Q&A feature
CREATE TABLE IF NOT EXISTS public.product_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_ar text NOT NULL,
  answer text,
  answer_ar text,
  author text NOT NULL,
  helpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;

-- Public can view all questions
CREATE POLICY "Anyone can view product questions" ON public.product_questions
  FOR SELECT USING (true);

-- Authenticated users can insert questions
CREATE POLICY "Authenticated users can ask questions" ON public.product_questions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update helpful count
CREATE POLICY "Anyone can update helpful count" ON public.product_questions
  FOR UPDATE USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_questions_product_id ON public.product_questions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_questions_helpful ON public.product_questions(helpful_count DESC);
CREATE INDEX IF NOT EXISTS idx_product_questions_created ON public.product_questions(created_at DESC);

-- Add site content for Q&A page
INSERT INTO public.site_content (key, title, content, content_ar, description)
VALUES
  ('product_qa_ask_question', 'Ask Question', 'Ask a Question', 'اسأل سؤالك', 'Q&A section - ask question heading'),
  ('product_qa_placeholder', 'Question placeholder', 'What would you like to know about this product?', 'ماذا تريد أن تعرف عن هذا المنتج؟', 'Q&A - input placeholder'),
  ('product_qa_send', 'Send button', 'Send', 'أرسل', 'Q&A - send button'),
  ('product_qa_title', 'Q&A title', 'Frequently Asked Questions', 'الأسئلة الشائعة', 'Q&A section title'),
  ('product_qa_empty', 'No questions', 'No questions yet', 'لا توجد أسئلة حالياً', 'Q&A empty state'),
  ('product_qa_by', 'Asked by', 'By', 'بواسطة', 'Q&A - asked by text'),
  ('product_qa_answer', 'Answer label', 'Answer', 'الإجابة', 'Q&A - answer label'),
  ('product_qa_no_answer', 'No answer yet', 'Not answered yet', 'لم يتم الإجابة عليه بعد', 'Q&A - no answer state'),
  ('product_qa_helpful', 'Helpful', 'Helpful', 'مفيد', 'Q&A - helpful button'),
  ('product_qa_error_empty', 'Empty question error', 'Question cannot be empty', 'السؤال مطلوب', 'Q&A - empty question error'),
  ('product_qa_success', 'Success message', 'Question submitted successfully', 'تم إرسال سؤالك بنجاح', 'Q&A - success toast'),
  ('product_qa_error', 'Error message', 'Error submitting question', 'حدث خطأ', 'Q&A - error toast')
ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  content_ar = EXCLUDED.content_ar,
  description = EXCLUDED.description;

-- Add comparison page content
INSERT INTO public.site_content (key, title, content, content_ar, description)
VALUES
  ('comparison_page_title', 'Compare Products', 'Compare Products', 'مقارنة المنتجات', 'Comparison page title'),
  ('comparison_page_subtitle', 'Compare subtitle', 'Compare between {count} products', 'قارن بين {count} منتجات', 'Comparison page subtitle'),
  ('comparison_page_empty', 'No products', 'No products selected for comparison', 'لم تختر أي منتجات للمقارنة', 'Comparison empty state'),
  ('comparison_specs_label', 'Specifications', 'Specifications', 'المواصفات', 'Specifications column header'),
  ('comparison_add_to_cart', 'Add to cart', 'Add to Cart', 'أضف للسلة', 'Add to cart button')
ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  content_ar = EXCLUDED.content_ar,
  description = EXCLUDED.description;

-- Add navbar search content
INSERT INTO public.site_content (key, title, content, content_ar, description)
VALUES
  ('search_navbar_search_placeholder', 'Search placeholder', 'Search for products...', 'ابحث عن منتجات...', 'Navbar search placeholder'),
  ('search_navbar_suggestions', 'Suggestions', 'Suggestions', 'الاقتراحات', 'Search suggestions header'),
  ('search_navbar_history', 'Search history', 'Recent Searches', 'البحث السابق', 'Search history header'),
  ('search_navbar_trending', 'Trending', 'Trending Now', 'رائج الآن', 'Trending products header')
ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  content_ar = EXCLUDED.content_ar,
  description = EXCLUDED.description;
