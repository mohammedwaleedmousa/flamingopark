-- Add about page content entries
INSERT INTO public.site_content (key, title, content, content_ar, description) VALUES
('about_hero_title', 'عنوان صفحة من نحن', 'Welcome to ERMgold', 'مرحباً بكم في إرم جولد', 'العنوان الرئيسي لصفحة من نحن'),
('about_hero_subtitle', 'العنوان الفرعي', 'Your trusted gold partner', 'شريكك الموثوق في الذهب', 'العنوان الفرعي'),
('about_hero_image', 'صورة الهيرو', 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800', 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800', 'صورة الخلفية الرئيسية'),
('about_section_1_title', 'عنوان القسم 1', 'Our Story', 'قصتنا', 'عنوان القسم الأول'),
('about_section_1_text', 'نص القسم 1', 'We started our journey with a vision to bring the finest gold products to our customers.', 'بدأنا رحلتنا برؤية لتقديم أفضل منتجات الذهب لعملائنا.', 'محتوى القسم الأول'),
('about_section_1_image', 'صورة القسم 1', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=600', 'صورة القسم الأول'),
('about_section_2_title', 'عنوان القسم 2', 'Quality Assurance', 'ضمان الجودة', 'عنوان القسم الثاني'),
('about_section_2_text', 'نص القسم 2', 'Every piece of gold is certified and tested for authenticity.', 'كل قطعة ذهب معتمدة ومختبرة للتأكد من أصالتها.', 'محتوى القسم الثاني'),
('about_section_2_image', 'صورة القسم 2', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600', 'صورة القسم الثاني'),
('about_section_3_title', 'عنوان القسم 3', 'Our Promise', 'وعدنا', 'عنوان القسم الثالث'),
('about_section_3_text', 'نص القسم 3', 'Customer satisfaction is our top priority.', 'رضا العملاء هو أولويتنا القصوى.', 'محتوى القسم الثالث'),
('about_section_3_image', 'صورة القسم 3', 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600', 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600', 'صورة القسم الثالث'),
('gold_quality_text', 'نص جودة الذهب', '100% Authentic gold', 'ذهب أصلي 100%', 'نص جودة الذهب في الإحصائيات'),
('experience_start_date', 'تاريخ بداية الخبرة', '2020-01-01', '2020-01-01', 'تاريخ بداية العمل لحساب سنوات الخبرة تلقائياً')
ON CONFLICT (key) DO NOTHING;