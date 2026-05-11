-- Add email channel to campaigns
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS email_enabled   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_subject   text,
  ADD COLUMN IF NOT EXISTS email_template  jsonb;
-- email_template shape:
-- { image_url: string, title: string, body: string, cta_text: string, cta_url: string }

-- Add email sender config to marketing_config
ALTER TABLE marketing_config
  ADD COLUMN IF NOT EXISTS email_from      text,   -- e.g. "UAIROX <noreply@uairox.com.br>"
  ADD COLUMN IF NOT EXISTS resend_api_key  text;   -- fallback if not stored as secret
