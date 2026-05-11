-- Log de disparos de webhook BotConversa
CREATE TABLE IF NOT EXISTS public.botconversa_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id        UUID REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  trigger_type    TEXT NOT NULL,
  -- 'inscricao' | 'confirmado' | 'cancelado'
  -- 'pix_lembrete_2d' | 'pix_lembrete_venc' | 'pix_atraso_1d' | 'pix_cancelamento_5d'
  -- 'broadcast'
  webhook_url     TEXT,
  payload         JSONB,
  status          TEXT DEFAULT 'sent',  -- 'sent' | 'failed'
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS botconversa_logs_event_id_idx     ON public.botconversa_logs(event_id);
CREATE INDEX IF NOT EXISTS botconversa_logs_registration_idx  ON public.botconversa_logs(registration_id);
CREATE INDEX IF NOT EXISTS botconversa_logs_created_at_idx    ON public.botconversa_logs(created_at DESC);

ALTER TABLE public.botconversa_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_botconversa_logs" ON public.botconversa_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_botconversa_logs" ON public.botconversa_logs
  FOR INSERT TO anon WITH CHECK (true);
