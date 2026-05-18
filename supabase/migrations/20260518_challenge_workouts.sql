-- ============================================================
-- UAIROX CHALLENGE — Sistema de treinos tipo GymRats
-- Fase 1: tabelas base
-- ============================================================

-- Bucket de fotos de treino
INSERT INTO storage.buckets (id, name, public)
VALUES ('workouts', 'workouts', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública das fotos
CREATE POLICY "workouts_bucket_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'workouts');

-- Upload liberado (auth customizada, não Supabase Auth)
CREATE POLICY "workouts_bucket_anon_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workouts');

CREATE POLICY "workouts_bucket_anon_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'workouts');

-- ── Treinos registrados pelos atletas ──────────────────────
CREATE TABLE IF NOT EXISTS public.challenge_workouts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  athlete_name    TEXT,
  athlete_phone   TEXT,
  photo_url       TEXT,
  description     TEXT NOT NULL,
  workout_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'approved'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workouts_public_read"
  ON public.challenge_workouts FOR SELECT USING (true);

CREATE POLICY "workouts_anon_write"
  ON public.challenge_workouts FOR ALL USING (true) WITH CHECK (true);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_workouts_event_id        ON public.challenge_workouts(event_id);
CREATE INDEX IF NOT EXISTS idx_workouts_registration_id ON public.challenge_workouts(registration_id);
CREATE INDEX IF NOT EXISTS idx_workouts_created_at      ON public.challenge_workouts(created_at DESC);

-- ── Reações nos treinos ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workout_reactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id      UUID NOT NULL REFERENCES public.challenge_workouts(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  reactor_name    TEXT,
  emoji           TEXT NOT NULL DEFAULT '👊'
                  CHECK (emoji IN ('👊', '🔥', '❤️', '💪', '⚡')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (workout_id, registration_id)
);

ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_public_read"
  ON public.workout_reactions FOR SELECT USING (true);

CREATE POLICY "reactions_anon_write"
  ON public.workout_reactions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_reactions_workout_id ON public.workout_reactions(workout_id);

-- ── View: leaderboard por evento ───────────────────────────
CREATE OR REPLACE VIEW public.challenge_leaderboard AS
SELECT
  cw.event_id,
  cw.registration_id,
  cw.athlete_name,
  COUNT(*) FILTER (WHERE cw.status = 'approved') AS workout_count,
  MAX(cw.created_at)                              AS last_workout_at
FROM public.challenge_workouts cw
GROUP BY cw.event_id, cw.registration_id, cw.athlete_name;
