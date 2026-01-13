-- Create beneficiaries table
CREATE TABLE public.beneficiaries (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    commission_percentage NUMERIC NOT NULL DEFAULT 10,
    discount_percentage NUMERIC NOT NULL DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- Policies for beneficiaries
CREATE POLICY "Admins can manage beneficiaries"
ON public.beneficiaries
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Beneficiaries are viewable by everyone"
ON public.beneficiaries
FOR SELECT
USING (true);

-- Add beneficiary_id and beneficiary_code to orders table
ALTER TABLE public.orders 
ADD COLUMN beneficiary_id UUID REFERENCES public.beneficiaries(id),
ADD COLUMN beneficiary_code TEXT,
ADD COLUMN beneficiary_commission NUMERIC DEFAULT 0;

-- Create trigger for updated_at
CREATE TRIGGER update_beneficiaries_updated_at
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();