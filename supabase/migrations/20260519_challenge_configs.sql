-- ============================================================
-- UAIROX CHALLENGE — Configuração por evento
-- ============================================================

CREATE TABLE IF NOT EXISTS public.challenge_configs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id    UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  goal        INTEGER NOT NULL DEFAULT 30,
  start_date  DATE,
  end_date    DATE,
  title       TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge_configs_public_read"
  ON public.challenge_configs FOR SELECT USING (true);

CREATE POLICY "challenge_configs_anon_write"
  ON public.challenge_configs FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_challenge_configs_event_id
  ON public.challenge_configs(event_id);
