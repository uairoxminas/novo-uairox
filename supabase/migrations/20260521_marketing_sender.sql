-- Coluna sent_at para rastrear quando cada item foi enviado (usado no limite diário)
ALTER TABLE marketing_queue
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_mq_sent_today
  ON marketing_queue (campaign_id, sent_at)
  WHERE status = 'sent';
