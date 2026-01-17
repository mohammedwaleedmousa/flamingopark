-- Add country column to beneficiaries table
ALTER TABLE public.beneficiaries 
ADD COLUMN IF NOT EXISTS country text DEFAULT 'SA';

-- Update existing beneficiaries to SA (default)
UPDATE public.beneficiaries SET country = 'SA' WHERE country IS NULL;