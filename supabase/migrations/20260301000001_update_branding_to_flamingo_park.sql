-- Update all remaining ermgold references to Flamingo Park
UPDATE public.site_settings
SET value = '{"name": "Flamingo Park", "email": "info@flamingopark.com", "phone_sa": "+966123456789", "phone_ye": "+967782676054"}'
WHERE key = 'store_info';

UPDATE public.site_settings
SET value = '[{"bank": "الراجحي", "account": "SA1234567890123456789012", "name": "Flamingo Park"}]'
WHERE key = 'bank_accounts_sa';

UPDATE public.site_settings
SET value = '[{"bank": "بنك اليمن", "account": "YE1234567890123456", "name": "Flamingo Park"}]'
WHERE key = 'bank_accounts_ye';

-- Update site content with Flamingo Park branding
UPDATE public.site_content
SET content = 'Flamingo Park - Premium Gold Jewelry'
WHERE key = 'about_title' AND content = 'About ERMgold';

UPDATE public.site_content
SET content_ar = 'عن فلامينجو بارك'
WHERE key = 'about_title' AND content_ar = 'عن ارم قولد';

UPDATE public.site_content
SET content = 'Flamingo Park is your trusted destination for premium gold products and jewelry.',
    content_ar = 'فلامينجو بارك هي وجهتك الموثوقة للمنتجات الذهبية والمجوهرات الفاخرة.'
WHERE key = 'about_description' AND content LIKE '%ERMgold%';

UPDATE public.site_content
SET content = '© 2024 Flamingo Park. All rights reserved.',
    content_ar = '© 2024 فلامينجو بارك. جميع الحقوق محفوظة.'
WHERE key = 'footer_copyright' AND content LIKE '%ERMgold%';

UPDATE public.site_content
SET content = 'info@flamingopark.com'
WHERE key = 'contact_email' AND content = 'info@ermgold.com';

UPDATE public.site_content
SET content = 'Welcome to Flamingo Park',
    content_ar = 'مرحباً بكم في فلامينجو بارك'
WHERE key = 'about_hero_title' AND content LIKE '%ERMgold%';

-- Add whatsapp numbers if not already set
INSERT INTO public.site_settings (key, value) VALUES
  ('whatsapp_ye', '+967782676054'),
  ('whatsapp_sa', '+966123456789')
ON CONFLICT (key) DO NOTHING;
