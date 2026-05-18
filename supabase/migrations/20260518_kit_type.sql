ALTER TABLE public.athlete_kits
  ADD COLUMN IF NOT EXISTS kit_type TEXT DEFAULT 'included'
  CHECK (kit_type IN ('included', 'raffle', 'upgrade'));

-- Migrar dados existentes baseado no is_optional
UPDATE public.athlete_kits
  SET kit_type = CASE
    WHEN is_optional = false THEN 'included'
    ELSE 'upgrade'
  END
  WHERE kit_type IS NULL OR kit_type = 'included';
