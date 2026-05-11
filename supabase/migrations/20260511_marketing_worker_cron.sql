-- Schedule marketing-worker to run every minute
SELECT cron.unschedule('marketing-worker-minutely') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'marketing-worker-minutely'
);

SELECT cron.schedule(
  'marketing-worker-minutely',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url        := 'https://dhetcnkvgtuatcchropm.supabase.co/functions/v1/marketing-worker',
      headers    := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs"}'::jsonb,
      body       := '{}'::jsonb
    ) AS request_id;
  $$
);
