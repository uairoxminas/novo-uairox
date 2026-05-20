-- Multi-step marketing campaigns: step tracking + invite on response + inactivity opt-out

-- Step tracking on queue items
ALTER TABLE marketing_queue
  ADD COLUMN IF NOT EXISTS step integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS step2_sent_at timestamptz;

-- Step 2 config on campaigns
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS step2_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS step2_message text,
  ADD COLUMN IF NOT EXISTS step2_event_ids uuid[],
  ADD COLUMN IF NOT EXISTS response_timeout_days integer NOT NULL DEFAULT 5;

-- Index for inactivity checks (contacts awaiting response)
CREATE INDEX IF NOT EXISTS idx_mq_step1_inactivity
  ON marketing_queue (campaign_id, sent_at)
  WHERE step = 1 AND status = 'sent' AND responded_at IS NULL;
