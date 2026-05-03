-- Adicionar campos de preço por forma de pagamento nos lotes
ALTER TABLE price_batches 
  ADD COLUMN IF NOT EXISTS price_card numeric(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_installments numeric(10,2) DEFAULT NULL;

-- NOTA: 
-- price = preço base (PIX à vista)
-- price_card = preço para cartão (se NULL, usa price)
-- price_installments = preço para PIX parcelado (se NULL, usa price)
