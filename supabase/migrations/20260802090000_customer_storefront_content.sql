-- Editable text for the customer storefront's store-information page.
-- The existing Admin Content page reads and updates these keys.
INSERT INTO public.site_content (key, title, content, content_ar, description)
VALUES
  ('store_info_hero_title', 'عنوان صفحة معلومات المتجر', 'A store that creates style\nwith a global language.', 'متجر يصنع الأناقة\nبلغة عالمية.', 'العنوان الرئيسي في صفحة معلومات المتجر'),
  ('store_info_hero_description', 'وصف صفحة معلومات المتجر', 'Flamingo Park is a destination for carefully selected fashion and accessories.', 'فلامنجو بارك وجهة للأزياء والإكسسوارات المنتقاة بعناية. نؤمن أن التفصيل الصغير هو ما يصنع الفرق، ولذلك نختار كل قطعة كما لو كانت لنا.', 'الوصف الرئيسي في صفحة معلومات المتجر'),
  ('store_info_pillar_1_title', 'عنوان ميزة المتجر 1', 'Global selection', 'انتقاء عالمي', 'عنوان الميزة الأولى'),
  ('store_info_pillar_1_desc', 'وصف ميزة المتجر 1', 'Selected pieces from trusted fashion houses and sources worldwide.', 'قطع مختارة من دور أزياء ومصادر موثوقة حول العالم.', 'وصف الميزة الأولى'),
  ('store_info_pillar_2_title', 'عنوان ميزة المتجر 2', 'Guaranteed authenticity', 'أصالة مضمونة', 'عنوان الميزة الثانية'),
  ('store_info_pillar_2_desc', 'وصف ميزة المتجر 2', 'Every product passes a quality check before reaching you.', 'كل منتج يمرّ بفحص جودة قبل أن يصل إليك.', 'وصف الميزة الثانية'),
  ('store_info_pillar_3_title', 'عنوان ميزة المتجر 3', 'International delivery', 'شحن دولي', 'عنوان الميزة الثالثة'),
  ('store_info_pillar_3_desc', 'وصف ميزة المتجر 3', 'Fast tracked delivery to the countries we serve.', 'توصيل سريع ومتتبَّع إلى أغلب الدول التي نخدمها.', 'وصف الميزة الثالثة'),
  ('store_info_phone_label', 'تسمية الهاتف', 'Phone', 'الهاتف', 'تسمية رقم الهاتف'),
  ('store_info_email_label', 'تسمية البريد الإلكتروني', 'Email', 'البريد الإلكتروني', 'تسمية البريد الإلكتروني'),
  ('store_info_hours_label', 'تسمية ساعات العمل', 'Working hours', 'ساعات العمل', 'تسمية ساعات العمل'),
  ('store_info_hours_value', 'قيمة ساعات العمل', 'Saturday - Thursday, 10:00 - 22:00', 'السبت – الخميس · 10:00 – 22:00', 'ساعات العمل الظاهرة للعميل'),
  ('store_info_shipping_label', 'تسمية الشحن', 'Shipping', 'الشحن', 'تسمية الشحن'),
  ('store_info_shipping_value', 'قيمة الشحن', 'International delivery service', 'خدمة توصيل دولية', 'وصف خدمة الشحن'),
  ('store_info_cta_title', 'عنوان دعوة التواصل', 'Need help choosing?', 'هل تحتاج مساعدة في الاختيار؟', 'عنوان قسم التواصل'),
  ('store_info_cta_description', 'وصف دعوة التواصل', 'Our customer service team is available to answer questions about sizes, availability, or delivery.', 'فريق خدمة العملاء متاح للإجابة على استفساراتك حول المقاسات، التوفر، أو الشحن.', 'وصف قسم التواصل'),
  ('store_info_cta_whatsapp', 'زر واتساب', 'Contact via WhatsApp', 'تواصل عبر واتساب', 'نص زر واتساب'),
  ('store_info_cta_products', 'زر المنتجات', 'Browse collection', 'تصفح المجموعة', 'نص زر الانتقال للمنتجات')
ON CONFLICT (key) DO UPDATE
SET title = EXCLUDED.title,
    content = EXCLUDED.content,
    content_ar = EXCLUDED.content_ar,
    description = EXCLUDED.description,
    updated_at = now();