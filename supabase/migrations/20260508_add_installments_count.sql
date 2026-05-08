ALTER TABLE public.price_batches
  ADD COLUMN IF NOT EXISTS installments_count INT DEFAULT NULL;
