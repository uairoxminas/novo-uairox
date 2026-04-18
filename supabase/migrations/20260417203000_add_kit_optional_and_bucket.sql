-- Migration: Add is_optional to athlete_kits and ensure kits bucket exists

ALTER TABLE public.athlete_kits 
ADD COLUMN IF NOT EXISTS is_optional BOOLEAN DEFAULT true;

-- Make sure the bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kits', 'kits', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for kits bucket
CREATE POLICY "Public Access kits" ON storage.objects FOR SELECT USING (bucket_id = 'kits');
CREATE POLICY "Authenticated users can upload kits" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kits' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update kits" ON storage.objects FOR UPDATE USING (bucket_id = 'kits' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete kits" ON storage.objects FOR DELETE USING (bucket_id = 'kits' AND auth.role() = 'authenticated');
