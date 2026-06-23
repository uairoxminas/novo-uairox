-- Fila de mensagens de premiação (envio com intervalo, robusto a fechar a aba)
CREATE TABLE IF NOT EXISTS public.premiacao_queue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category_id  UUID,
  telefone     TEXT NOT NULL,
  nome         TEXT,
  mensagem     TEXT NOT NULL,
  webhook_url  TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | sending | sent | failed
  attempts     INT  NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premiacao_queue_pending
  ON public.premiacao_queue (status, scheduled_at);

ALTER TABLE public.premiacao_queue ENABLE ROW LEVEL SECURITY;

-- O painel admin roda como ANON (senha do painel, não auth Supabase) → libera tudo.
DROP POLICY IF EXISTS premiacao_queue_all ON public.premiacao_queue;
CREATE POLICY premiacao_queue_all ON public.premiacao_queue FOR ALL USING (true) WITH CHECK (true);

-- ── Cron: chama o worker a cada minuto ───────────────────────────────────────
SELECT cron.unschedule('premiacao-sender-min') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'premiacao-sender-min'
);

SELECT cron.schedule(
  'premiacao-sender-min',
  '* * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/premiacao-sender',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
