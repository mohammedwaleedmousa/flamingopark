-- Create table for COD allowed regions
CREATE TABLE public.cod_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  region_name text NOT NULL,
  region_name_ar text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(country, region_name)
);

-- Enable RLS
ALTER TABLE public.cod_regions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "COD regions are viewable by everyone"
ON public.cod_regions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage COD regions"
ON public.cod_regions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));