-- Migration to add image_url to event_stages and create storage bucket

ALTER TABLE public.event_stages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create bucket for event stages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stages', 'stages', true)
ON CONFLICT (id) DO NOTHING;

-- Policies to allow public read and authenticated write
CREATE POLICY "Give Public Access to stages bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'stages');

CREATE POLICY "Allow Uploads in stages bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stages');

CREATE POLICY "Allow Updates in stages bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'stages');

CREATE POLICY "Allow Deletes in stages bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'stages');
