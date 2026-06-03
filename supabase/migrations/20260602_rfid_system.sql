-- ============================================================
-- RFID System — Phase 1: Database
-- Wristband inventory + assignment history + antenna config + read log
-- ============================================================


-- ============================================================
-- rfid_tags — physical inventory of wristbands (e.g. 120 units)
-- ============================================================
CREATE TABLE rfid_tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_epc    text UNIQUE NOT NULL,   -- chip's Electronic Product Code (sent by M-ID40)
  number     int  UNIQUE NOT NULL,   -- number printed on the physical wristband (1–120)
  notes      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rfid_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_tags_authenticated_select" ON rfid_tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rfid_tags_authenticated_all" ON rfid_tags
  FOR ALL USING (auth.uid() IS NOT NULL);


-- ============================================================
-- rfid_tag_assignments — who has which wristband (full history)
-- ============================================================
CREATE TABLE rfid_tag_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_epc         text        NOT NULL REFERENCES rfid_tags(tag_epc),
  registration_id uuid        NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  event_id        uuid        NOT NULL REFERENCES events(id)         ON DELETE CASCADE,
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  released_at     timestamptz,            -- NULL = wristband still with the athlete
  is_active       boolean     NOT NULL DEFAULT true,
  assigned_by     uuid,                   -- staff user id
  released_by     uuid                    -- staff user id
);

-- Only one active assignment per wristband at a time
CREATE UNIQUE INDEX unique_active_tag_epc
  ON rfid_tag_assignments (tag_epc)
  WHERE is_active = true;

-- Only one active wristband per registration per event at a time
CREATE UNIQUE INDEX unique_active_registration_event
  ON rfid_tag_assignments (registration_id, event_id)
  WHERE is_active = true;

CREATE INDEX idx_rfid_assignments_event
  ON rfid_tag_assignments (event_id, is_active);

ALTER TABLE rfid_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_assignments_authenticated_select" ON rfid_tag_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rfid_assignments_authenticated_all" ON rfid_tag_assignments
  FOR ALL USING (auth.uid() IS NOT NULL);


-- ============================================================
-- rfid_antennas — maps each antenna port to a checkpoint + entry type
-- ============================================================
CREATE TABLE rfid_antennas (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reader_id      text        NOT NULL,
  antenna_index  int         NOT NULL CHECK (antenna_index IN (1, 2)),
  checkpoint_id  uuid,                   -- references a race checkpoint (loose, no FK)
  entry_type     text        NOT NULL CHECK (entry_type IN ('start', 'lap', 'finish')),
  label          text,                   -- e.g. "Largada", "Chegada"
  is_active      boolean     NOT NULL DEFAULT true,
  debounce_ms    int         NOT NULL DEFAULT 5000,
  created_at     timestamptz DEFAULT now(),

  UNIQUE (event_id, reader_id, antenna_index)
);

ALTER TABLE rfid_antennas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_antennas_authenticated_select" ON rfid_antennas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rfid_antennas_authenticated_all" ON rfid_antennas
  FOR ALL USING (auth.uid() IS NOT NULL);


-- ============================================================
-- rfid_reads — raw read log for audit and debounce checks
-- ============================================================
CREATE TABLE rfid_reads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id       text        NOT NULL,
  antenna_index   int         NOT NULL,
  tag_epc         text        NOT NULL,
  rssi            int,
  read_at         timestamptz NOT NULL DEFAULT now(),
  event_id        uuid        REFERENCES events(id)        ON DELETE SET NULL,
  registration_id uuid        REFERENCES registrations(id) ON DELETE SET NULL,
  processed       boolean     NOT NULL DEFAULT false,
  skip_reason     text
);

CREATE INDEX idx_rfid_reads_debounce
  ON rfid_reads (tag_epc, antenna_index, read_at DESC);

CREATE INDEX idx_rfid_reads_event
  ON rfid_reads (event_id, read_at DESC);

CREATE INDEX idx_rfid_reads_unprocessed
  ON rfid_reads (event_id, processed) WHERE processed = false;

ALTER TABLE rfid_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_reads_authenticated_select" ON rfid_reads
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- service_role (edge function) bypasses RLS — no insert policy needed


-- ============================================================
-- release_rfid_tag — safely releases a wristband assignment
-- ============================================================
CREATE OR REPLACE FUNCTION public.release_rfid_tag(
  p_assignment_id uuid,
  p_released_by   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE rfid_tag_assignments
  SET
    is_active   = false,
    released_at = now(),
    released_by = p_released_by
  WHERE id = p_assignment_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found or already released: %', p_assignment_id;
  END IF;
END;
$$;
