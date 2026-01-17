-- Create table to track potential customer visits from beneficiary links
CREATE TABLE public.beneficiary_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  visitor_info TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_to_order BOOLEAN DEFAULT false,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.beneficiary_visits ENABLE ROW LEVEL SECURITY;

-- Anyone can create visits (when customer enters via link)
CREATE POLICY "Anyone can create visits"
ON public.beneficiary_visits
FOR INSERT
WITH CHECK (true);

-- Beneficiaries can view their own visits (we'll match by beneficiary_id in the app)
CREATE POLICY "Visits are viewable by everyone"
ON public.beneficiary_visits
FOR SELECT
USING (true);

-- Admins can manage visits
CREATE POLICY "Admins can manage visits"
ON public.beneficiary_visits
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_beneficiary_visits_beneficiary_id ON public.beneficiary_visits(beneficiary_id);
CREATE INDEX idx_beneficiary_visits_visited_at ON public.beneficiary_visits(visited_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.beneficiary_visits;