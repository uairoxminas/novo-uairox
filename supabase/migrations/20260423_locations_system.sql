-- Migration para adicionar colunas do novo formulário de parceiros
ALTER TABLE public.training_locations
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Permitir inserts públicos (para o formulário de cadastro)
-- A tabela training_locations deve ter RLS ativado
ALTER TABLE public.training_locations ENABLE ROW LEVEL SECURITY;

-- Política para leitura (quem for approved ou is_active)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Public Access for approved locations'
    ) THEN
        CREATE POLICY "Public Access for approved locations" ON public.training_locations
            FOR SELECT USING (is_active = true OR status = 'approved');
    END IF;
END
$$;

-- Política para Inserção (Qualquer pessoa pode inserir status='pending')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Public Insert for new locations'
    ) THEN
        CREATE POLICY "Public Insert for new locations" ON public.training_locations
            FOR INSERT WITH CHECK (true);
    END IF;
END
$$;

-- Atualizar tudo como approved para os já existentes e is_active=true
UPDATE public.training_locations SET status = 'approved' WHERE is_active = true;

-- Criar Bucket para as fotos dos parceiros (Logos e Fotos do Local)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training-locations', 'training-locations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DO $$
BEGIN
    -- Permitir que o admin (autenticado) gerencie
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_admin_all'
    ) THEN
        CREATE POLICY "training_locations_admin_all" ON storage.objects
            FOR ALL TO authenticated USING (bucket_id = 'training-locations');
    END IF;

    -- Permitir que qualquer um faça upload de fotos para se cadastrar
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_public_insert'
    ) THEN
        CREATE POLICY "training_locations_public_insert" ON storage.objects
            FOR INSERT TO public WITH CHECK (bucket_id = 'training-locations');
    END IF;

    -- Permitir leitura pública
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_public_select'
    ) THEN
        CREATE POLICY "training_locations_public_select" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'training-locations');
    END IF;
END
$$;
