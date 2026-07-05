-- Create site_content table for managing all text content
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  content_ar TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Content is viewable by everyone" 
ON public.site_content 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage content" 
ON public.site_content 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default content entries
INSERT INTO public.site_content (key, title, content, content_ar, description) VALUES
('about_title', 'عنوان صفحة من نحن', 'About ERMgold', 'عن ارم قولد', 'العنوان الرئيسي لصفحة من نحن'),
('about_description', 'وصف صفحة من نحن', 'ERMgold is your trusted destination for premium gold products and jewelry.', 'ارم قولد هي وجهتك الموثوقة للمنتجات الذهبية والمجوهرات الفاخرة.', 'الوصف الرئيسي لصفحة من نحن'),
('about_mission', 'مهمتنا', 'Our mission is to provide the finest quality gold products with exceptional customer service.', 'مهمتنا هي تقديم أجود المنتجات الذهبية مع خدمة عملاء استثنائية.', 'نص المهمة'),
('about_vision', 'رؤيتنا', 'To be the leading destination for gold enthusiasts across the region.', 'أن نكون الوجهة الرائدة لعشاق الذهب في المنطقة.', 'نص الرؤية'),
('footer_description', 'وصف الفوتر', 'Your trusted destination for premium gold products and jewelry.', 'وجهتك الموثوقة للمنتجات الذهبية والمجوهرات الفاخرة.', 'النص الموجود أسفل الشعار في الفوتر'),
('footer_copyright', 'حقوق النشر', '© 2024 ERMgold. All rights reserved.', '© 2024 ارم قولد. جميع الحقوق محفوظة.', 'نص حقوق النشر'),
('contact_email', 'البريد الإلكتروني', 'info@ermgold.com', 'info@ermgold.com', 'البريد الإلكتروني للتواصل'),
('contact_phone_sa', 'هاتف السعودية', '+966 XX XXX XXXX', '+966 XX XXX XXXX', 'رقم الهاتف للسعودية'),
('contact_phone_ye', 'هاتف اليمن', '+967 XX XXX XXXX', '+967 XX XXX XXXX', 'رقم الهاتف لليمن'),
('contact_address_sa', 'عنوان السعودية', 'Riyadh, Saudi Arabia', 'الرياض، المملكة العربية السعودية', 'عنوان المتجر في السعودية'),
('contact_address_ye', 'عنوان اليمن', 'Sanaa, Yemen', 'صنعاء، اليمن', 'عنوان المتجر في اليمن');