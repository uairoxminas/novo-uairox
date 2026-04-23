-- Criação da Tabela de Parceiros (Locais de Treinamento)
CREATE TABLE IF NOT EXISTS public.training_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    category text DEFAULT 'Box',
    logo_url text,
    maps_url text,
    is_active boolean DEFAULT false,
    whatsapp text,
    instagram text,
    website text,
    photos text[] DEFAULT '{}',
    status text DEFAULT 'pending',
    is_featured boolean DEFAULT false
);

-- Ativar Segurança por Nível de Linha (RLS)
ALTER TABLE public.training_locations ENABLE ROW LEVEL SECURITY;

-- Política de Leitura Pública: Pode ver se está ativo OU se foi aprovado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Public Access for approved locations') THEN
        CREATE POLICY "Public Access for approved locations" ON public.training_locations
            FOR SELECT USING (is_active = true OR status = 'approved');
    END IF;
    
    -- Política de Inserção Pública (qualquer um pode preencher o form e enviar como pending)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Public Insert for new locations') THEN
        CREATE POLICY "Public Insert for new locations" ON public.training_locations
            FOR INSERT WITH CHECK (true);
    END IF;

    -- Política para o Admin editar tudo
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Admin can update') THEN
        CREATE POLICY "Admin can update" ON public.training_locations
            FOR UPDATE TO authenticated USING (true);
    END IF;

    -- Política para o Admin deletar
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'training_locations' AND policyname = 'Admin can delete') THEN
        CREATE POLICY "Admin can delete" ON public.training_locations
            FOR DELETE TO authenticated USING (true);
    END IF;
END
$$;

-- Criar Bucket para as fotos dos parceiros (Logos e Fotos do Local)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('training-locations', 'training-locations', true)
ON CONFLICT (id) DO NOTHING;

-- Configurar Políticas de Storage
DO $$
BEGIN
    -- Permitir que o admin gerencie
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_admin_all') THEN
        CREATE POLICY "training_locations_admin_all" ON storage.objects
            FOR ALL TO authenticated USING (bucket_id = 'training-locations');
    END IF;
    
    -- Permitir que qualquer um faça upload de fotos para se cadastrar
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_public_insert') THEN
        CREATE POLICY "training_locations_public_insert" ON storage.objects
            FOR INSERT TO public WITH CHECK (bucket_id = 'training-locations');
    END IF;
    
    -- Permitir leitura pública
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'training_locations_public_select') THEN
        CREATE POLICY "training_locations_public_select" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'training-locations');
    END IF;
END
$$;
