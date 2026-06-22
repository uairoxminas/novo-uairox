-- ============================================================
-- Resultados — motivo de desclassificação (DSQ) e nota do árbitro
-- ============================================================
ALTER TABLE public.race_results
  ADD COLUMN IF NOT EXISTS dq_reason text;
