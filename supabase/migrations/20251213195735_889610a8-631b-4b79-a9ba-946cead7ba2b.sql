-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload invoices
CREATE POLICY "Anyone can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoices');

-- Allow anyone to view invoices
CREATE POLICY "Anyone can view invoices"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');