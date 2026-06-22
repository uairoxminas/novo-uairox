-- ============================================================
-- RFID — Heartbeat do bridge (notebook) para indicador ONLINE no painel
-- O bridge faz upsert aqui a cada ~20s. O painel mostra ONLINE se o
-- last_seen for recente.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.rfid_bridge_status (
  reader_id  text PRIMARY KEY,
  connected  boolean     NOT NULL DEFAULT false,
  ip         text,
  last_seen  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rfid_bridge_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfid_bridge_status_all" ON public.rfid_bridge_status;
CREATE POLICY "rfid_bridge_status_all" ON public.rfid_bridge_status
  FOR ALL USING (true) WITH CHECK (true);
