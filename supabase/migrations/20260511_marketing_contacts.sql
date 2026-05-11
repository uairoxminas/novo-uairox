-- Marketing contacts global base
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  phone       text NOT NULL,
  email       text,
  source      text DEFAULT 'manual',
  opt_out     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_contacts_phone_key UNIQUE (phone)
);

-- Global marketing config (single row)
CREATE TABLE IF NOT EXISTS marketing_config (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access; anon/authenticated have no access
CREATE POLICY "service_role_marketing_contacts" ON marketing_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_marketing_config" ON marketing_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for search
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_phone ON marketing_contacts (phone);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_opt_out ON marketing_contacts (opt_out);
