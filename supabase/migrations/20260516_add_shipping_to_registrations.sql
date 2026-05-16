ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS shipping_address        JSONB,
  ADD COLUMN IF NOT EXISTS shipping_service_name   TEXT,
  ADD COLUMN IF NOT EXISTS shipping_freight_amount DECIMAL(8,2);
