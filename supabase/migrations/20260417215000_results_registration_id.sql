-- Adicionando a FK direta para a registration na tabela de Resultados Oficiais
ALTER TABLE public.race_results ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE;
