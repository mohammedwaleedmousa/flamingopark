-- Create offers table for managing offers page content
CREATE TABLE public.offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  title_ar text NOT NULL,
  subtitle text,
  subtitle_ar text,
  description text,
  description_ar text,
  image_url text,
  discount_code text,
  discount_percentage integer DEFAULT 0,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  countries text[] DEFAULT '{SA,YE}'::text[],
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Offers are viewable by everyone" 
ON public.offers 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage offers" 
ON public.offers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create offers_settings table for page-level settings
CREATE TABLE public.offers_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_title text DEFAULT 'عروض استثنائية',
  page_subtitle text DEFAULT 'اغتنم الفرصة واحصل على أفخم القطع الذهبية بأسعار لا تُقاوم',
  countdown_end_date timestamp with time zone,
  promo_banner_text text DEFAULT 'استخدم كود gold50 للحصول على خصم إضافي 10%',
  show_countdown boolean DEFAULT true,
  show_promo_banner boolean DEFAULT true,
  countries text[] DEFAULT '{SA,YE}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.offers_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Offers settings are viewable by everyone" 
ON public.offers_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage offers settings" 
ON public.offers_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.offers_settings (page_title, page_subtitle, countdown_end_date, promo_banner_text)
VALUES ('عروض استثنائية', 'اغتنم الفرصة واحصل على أفخم القطع الذهبية بأسعار لا تُقاوم', now() + interval '7 days', 'استخدم كود gold50 للحصول على خصم إضافي 10%');