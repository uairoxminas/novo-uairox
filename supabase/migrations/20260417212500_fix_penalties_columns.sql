-- Adequando tabelas táticas para operarem com registration_id invés de bib puro
ALTER TABLE public.race_penalties ADD COLUMN IF NOT EXISTS heat_id UUID REFERENCES public.heats(id) ON DELETE CASCADE;
ALTER TABLE public.race_penalties ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE;

ALTER TABLE public.race_splits ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE;
ALTER TABLE public.race_splits ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN DEFAULT false;
