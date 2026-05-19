-- ============================================================
-- UAIROX CHALLENGE — Assinaturas de Web Push Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id  UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  endpoint         TEXT NOT NULL,
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (registration_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_public_read"
  ON public.push_subscriptions FOR SELECT USING (true);

CREATE POLICY "push_subs_anon_write"
  ON public.push_subscriptions FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_push_subs_registration_id
  ON public.push_subscriptions(registration_id);
