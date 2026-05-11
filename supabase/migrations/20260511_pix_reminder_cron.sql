-- Enable pg_net extension (required to make HTTP requests from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Schedule pix-reminder-cron to run daily at 09:00 BRT (12:00 UTC)
-- Remove existing job first to allow re-running this migration safely
SELECT cron.unschedule('pix-reminder-cron-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pix-reminder-cron-daily'
);

SELECT cron.schedule(
  'pix-reminder-cron-daily',
  '0 12 * * *',
  $$
  SELECT
    net.http_post(
      url        := 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/pix-reminder-cron',
      headers    := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs"}'::jsonb,
      body       := '{}'::jsonb
    ) AS request_id;
  $$
);
