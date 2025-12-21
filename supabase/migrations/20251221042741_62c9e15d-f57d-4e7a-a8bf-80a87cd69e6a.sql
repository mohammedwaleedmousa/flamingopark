-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'percentage' CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  countries TEXT[] DEFAULT '{SA,YE}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Coupons are viewable by everyone (needed for checkout validation)
CREATE POLICY "Coupons are viewable by everyone"
ON public.coupons
FOR SELECT
USING (true);

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));