-- Add feature content entries for About page
INSERT INTO public.site_content (key, title, content, content_ar, description) VALUES
('about_feature_1_title', 'عنوان الميزة 1', 'Quality Guarantee', 'ضمان الجودة', 'عنوان الميزة الأولى'),
('about_feature_1_desc', 'وصف الميزة 1', 'All our products are 100% guaranteed', 'جميع منتجاتنا مضمونة 100%', 'وصف الميزة الأولى'),
('about_feature_2_title', 'عنوان الميزة 2', 'Free Shipping', 'شحن مجاني', 'عنوان الميزة الثانية'),
('about_feature_2_desc', 'وصف الميزة 2', 'For orders over 500 SAR', 'للطلبات فوق 500 ريال', 'وصف الميزة الثانية'),
('about_feature_3_title', 'عنوان الميزة 3', '24/7 Support', 'دعم 24/7', 'عنوان الميزة الثالثة'),
('about_feature_3_desc', 'وصف الميزة 3', 'We are always here to help you', 'نحن هنا لمساعدتك دائماً', 'وصف الميزة الثالثة')
ON CONFLICT (key) DO NOTHING;