-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('squad-avatars', 'squad-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public Access to squad avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads in squad avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates in squad avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes in squad avatars" ON storage.objects;

-- 3. Create policies for the bucket
-- Anyone can read the avatars (since it's public)
CREATE POLICY "Public Access to squad avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'squad-avatars');

-- Anyone can upload to the bucket (required for the application form to work without login)
CREATE POLICY "Allow Uploads in squad avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'squad-avatars');

-- Anyone can update their uploads (optional, but good for retries)
CREATE POLICY "Allow Updates in squad avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'squad-avatars');

-- Anyone can delete their uploads (optional)
CREATE POLICY "Allow Deletes in squad avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'squad-avatars');
