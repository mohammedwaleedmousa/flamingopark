
-- Create homepage sections table
CREATE TABLE public.homepage_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  section_type TEXT NOT NULL DEFAULT 'products',
  filter_type TEXT DEFAULT 'featured',
  countries TEXT[] DEFAULT '{SA,YE}'::text[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  max_products INTEGER DEFAULT 8,
  show_view_all BOOLEAN DEFAULT true,
  view_all_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Sections are viewable by everyone" 
ON public.homepage_sections 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage sections" 
ON public.homepage_sections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_homepage_sections_updated_at
BEFORE UPDATE ON public.homepage_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections
INSERT INTO public.homepage_sections (title, title_ar, section_type, filter_type, sort_order, view_all_link) VALUES
('Featured Products', 'منتجات مميزة', 'products', 'featured', 1, '/products?filter=featured'),
('Best Sellers', 'الأكثر مبيعاً', 'products', 'best_seller', 2, '/products?filter=bestseller'),
('Special Offers', 'عروض خاصة', 'products', 'discounted', 3, '/offers');
