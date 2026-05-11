-- Marketing campaigns and queue
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  trigger_name    text NOT NULL DEFAULT 'marketing',
  base_message    text,
  variants        text[],            -- up to 10 approved message variants
  daily_limit     integer NOT NULL DEFAULT 30,
  auto_continue   boolean NOT NULL DEFAULT true,
  status          text NOT NULL DEFAULT 'draft', -- draft | active | paused | completed
  total_contacts  integer NOT NULL DEFAULT 0,
  sent_today      integer NOT NULL DEFAULT 0,
  sent_total      integer NOT NULL DEFAULT 0,
  last_sent_date  date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Per-contact send queue
CREATE TABLE IF NOT EXISTS marketing_queue (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  contact_id       uuid REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  phone            text NOT NULL,
  name             text,
  email            text,
  variant_index    integer NOT NULL DEFAULT 0,  -- which variant to send
  status           text NOT NULL DEFAULT 'pending', -- pending | sent | failed | skipped
  send_after       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_marketing_campaigns" ON marketing_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_marketing_queue" ON marketing_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketing_queue_campaign ON marketing_queue (campaign_id, status, send_after);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_pending ON marketing_queue (status, send_after) WHERE status = 'pending';
