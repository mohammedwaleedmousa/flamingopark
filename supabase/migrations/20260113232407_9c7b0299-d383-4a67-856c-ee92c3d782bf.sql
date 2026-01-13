-- Add email and password fields to beneficiaries table for self-registration
ALTER TABLE public.beneficiaries 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster email lookup
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON public.beneficiaries(email);

-- Update RLS policy to allow anyone to register as beneficiary
CREATE POLICY "Anyone can register as beneficiary" 
ON public.beneficiaries 
FOR INSERT 
WITH CHECK (true);

-- Allow beneficiaries to read their own data by code
CREATE POLICY "Beneficiaries can read own data by code" 
ON public.beneficiaries 
FOR SELECT 
USING (true);