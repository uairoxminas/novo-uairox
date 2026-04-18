-- Fix RLS Policies for Storage Uploads on 'kits' bucket

-- 1. Garante que o bucket 'kits' existe e é público para leitura
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kits', 'kits', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Limpa políticas antigas que podem estar bloqueando o upload
DROP POLICY IF EXISTS "Public Access kits" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload kits" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update kits" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete kits" ON storage.objects;

-- 3. Cria rotas livres e seguras garantindo que a dashboard consiga colocar arquivos lá!
CREATE POLICY "Give Public Access to kits bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'kits');

CREATE POLICY "Allow Uploads in kits bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'kits');

CREATE POLICY "Allow Updates in kits bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'kits');

CREATE POLICY "Allow Deletes in kits bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'kits');
