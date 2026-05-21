-- Tracking: cliques e conversões por campanha

-- Tracking code per queue item (unique link per contact per campaign)
ALTER TABLE marketing_queue
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS tracking_event_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mq_tracking_code
  ON marketing_queue (tracking_code) WHERE tracking_code IS NOT NULL;

-- Click tracking table
CREATE TABLE IF NOT EXISTS marketing_clicks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code   text NOT NULL,
  campaign_id     uuid REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES marketing_contacts(id) ON DELETE SET NULL,
  event_id        uuid,
  phone           text,
  clicked_at      timestamptz NOT NULL DEFAULT now(),
  converted       boolean NOT NULL DEFAULT false,
  converted_at    timestamptz,
  registration_id uuid
);

ALTER TABLE marketing_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_marketing_clicks" ON marketing_clicks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_marketing_clicks_campaign  ON marketing_clicks (campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_code      ON marketing_clicks (tracking_code);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_phone     ON marketing_clicks (phone);
CREATE INDEX IF NOT EXISTS idx_marketing_clicks_event     ON marketing_clicks (event_id, converted);
