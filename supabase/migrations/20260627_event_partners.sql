-- Sócios do evento + percentual de cada um na divisão do lucro.
CREATE TABLE IF NOT EXISTS public.event_partners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  percent    NUMERIC NOT NULL DEFAULT 0,   -- 0–100
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_partners_event ON public.event_partners (event_id);

ALTER TABLE public.event_partners ENABLE ROW LEVEL SECURITY;
-- Painel admin roda como anon (senha do painel) → libera tudo.
DROP POLICY IF EXISTS event_partners_all ON public.event_partners;
CREATE POLICY event_partners_all ON public.event_partners FOR ALL USING (true) WITH CHECK (true);
