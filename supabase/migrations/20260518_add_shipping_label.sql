-- Armazena o ID do serviço ME escolhido (necessário para gerar etiqueta)
-- e a URL da etiqueta gerada pelo Melhor Envio
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS shipping_service_id   INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_label_url    TEXT,
  ADD COLUMN IF NOT EXISTS shipping_tracking_code TEXT;
