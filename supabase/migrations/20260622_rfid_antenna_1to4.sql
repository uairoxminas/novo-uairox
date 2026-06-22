-- ============================================================
-- RFID — permite antenas 1 a 4 (M-ID40 tem 4 portas)
-- ============================================================
ALTER TABLE public.rfid_antennas DROP CONSTRAINT IF EXISTS rfid_antennas_antenna_index_check;
ALTER TABLE public.rfid_antennas ADD CONSTRAINT rfid_antennas_antenna_index_check
  CHECK (antenna_index IN (1, 2, 3, 4));
