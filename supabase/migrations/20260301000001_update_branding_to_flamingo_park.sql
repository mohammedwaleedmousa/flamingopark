-- Store info
UPDATE public.site_settings
SET value = '{
  "name": "Flamingo Park",
  "email": "info@flamingopark.com",
  "phone_ye": "+967782676054"
}'
WHERE key = 'store_info';

-- Yemeni bank accounts only
UPDATE public.site_settings
SET value = '[
  {
    "bank": "بنك اليمن",
    "account": "YE1234567890123456",
    "name": "Flamingo Park"
  }
]'
WHERE key = 'bank_accounts_ye';

-- Remove Saudi bank accounts
DELETE FROM public.site_settings
WHERE key = 'bank_accounts_sa';

-- Update site content
UPDATE public.site_content
SET content = 'Flamingo Park'
WHERE key = 'about_title'
  AND content = 'About ERMgold';

UPDATE public.site_content
SET content_ar = 'عن فلامنجو بارك'
WHERE key = 'about_title'
  AND content_ar = 'عن ارم قولد';

UPDATE public.site_content
SET content = 'Flamingo Park is your destination for fashion, beauty, accessories, and premium lifestyle products.',
    content_ar = 'فلامنجو بارك وجهتك للأزياء، ومستحضرات التجميل، والإكسسوارات، ومنتجات أسلوب الحياة المميزة.'
WHERE key = 'about_description'
  AND content LIKE '%ERMgold%';

UPDATE public.site_content
SET content = '© 2026 Flamingo Park. All rights reserved.',
    content_ar = '© 2026 فلامنجو بارك. جميع الحقوق محفوظة.'
WHERE key = 'footer_copyright'
  AND content LIKE '%ERMgold%';

UPDATE public.site_content
SET content = 'info@flamingopark.com'
WHERE key = 'contact_email'
  AND content = 'info@ermgold.com';

UPDATE public.site_content
SET content = 'Welcome to Flamingo Park',
    content_ar = 'مرحباً بكم في فلامنجو بارك'
WHERE key = 'about_hero_title'
  AND content LIKE '%ERMgold%';

-- WhatsApp Yemen only
INSERT INTO public.site_settings (key, value)
VALUES ('whatsapp_ye', '"+967782676054"')
ON CONFLICT (key)
DO UPDATE SET value = EXCLUDED.value;

-- Remove Saudi WhatsApp
DELETE FROM public.site_settings
WHERE key = 'whatsapp_sa';