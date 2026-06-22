-- ============================================================
-- RFID — Corte de RSSI por evento (zona de leitura)
-- Só conta leituras com sinal >= rfid_rssi_min (quanto maior, mais perto o
-- atleta precisa estar). 0 = desligado (lê tudo). Ajustável na tela Race Day.
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rfid_rssi_min int NOT NULL DEFAULT 0;
