-- Add event_type column to classify events as 'experience' or 'oficial'
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'oficial';

-- Add a check constraint for valid values
ALTER TABLE events ADD CONSTRAINT events_event_type_check 
  CHECK (event_type IN ('experience', 'oficial'));

COMMENT ON COLUMN events.event_type IS 'Classifies the event: experience (simulados) or oficial';
