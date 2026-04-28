-- Add slug column to events table for custom, short URLs
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events (slug);
