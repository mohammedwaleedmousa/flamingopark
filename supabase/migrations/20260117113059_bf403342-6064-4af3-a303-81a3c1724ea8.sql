-- Add is_approved column to beneficiaries table for approval system
ALTER TABLE public.beneficiaries 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Update existing beneficiaries to be approved (assuming they were manually added)
UPDATE public.beneficiaries SET is_approved = true WHERE is_approved IS NULL;