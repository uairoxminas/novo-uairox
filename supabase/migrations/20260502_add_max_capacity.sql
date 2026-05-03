-- Add max_capacity to events table (global registration cap, independent of categories)
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN events.max_capacity IS 'Maximum total number of registrations allowed for this event. NULL = unlimited.';
