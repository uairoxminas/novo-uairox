-- RACE DAY ENGINE MIGRATION
-- Estágio 1: Melhorias na tabela base de Eventos para Comportamento Dinâmico de Timing
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS target_passes_volume INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS debounce_seconds INTEGER DEFAULT 40;

-- 1. Controle de Baterias (Heats)
CREATE TABLE IF NOT EXISTS public.race_heats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scheduled_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Pontos Físicos de Controle (Mat/Checkpoints)
CREATE TABLE IF NOT EXISTS public.race_checkpoints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_finish_line BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Entradas de Punição do Painel Árbitro (Penalties Numpad)
CREATE TABLE IF NOT EXISTS public.race_penalties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    bib_number TEXT NOT NULL,
    penalty_seconds INTEGER DEFAULT 30,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. O Coração do Tempo (Anotações/Splits puros dos sensores/juizes)
CREATE TABLE IF NOT EXISTS public.race_splits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    checkpoint_id UUID NOT NULL REFERENCES public.race_checkpoints(id) ON DELETE CASCADE,
    heat_id UUID REFERENCES public.race_heats(id) ON DELETE CASCADE,
    bib_number TEXT NOT NULL,
    split_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_ignored BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Cofre de Resultados Final (Supervisionado pelo Head Judge)
CREATE TABLE IF NOT EXISTS public.race_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    heat_id UUID REFERENCES public.race_heats(id) ON DELETE CASCADE,
    bib_number TEXT NOT NULL,
    raw_time_ms BIGINT,
    total_penalties_seconds INTEGER DEFAULT 0,
    final_adjusted_time_ms BIGINT,
    total_passes_recorded INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending_head_judge' CHECK (status IN ('pending_head_judge', 'validated', 'dnf', 'disqualified')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adding basic RLS policies to the new tables (Allow public read for validated, auth for insert)
ALTER TABLE public.race_heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;

-- Exemplo RLS Polices genéricas pro DB Owner
CREATE POLICY "Enable all for authenticated users" ON public.race_heats FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.race_checkpoints FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.race_penalties FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.race_splits FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.race_results FOR ALL TO authenticated USING (true);

-- Allow public read for race_results if validated (Leaderboard future viewing)
CREATE POLICY "Enable public read for validated results" ON public.race_results FOR SELECT TO public USING (status = 'validated');
