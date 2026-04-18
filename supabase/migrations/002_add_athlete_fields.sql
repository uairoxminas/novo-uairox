-- ============================================================
-- UAIROX V2 - Add athlete profile fields to registrations
-- Run this SQL in the Supabase SQL Editor
-- Since we don't require login, we need athlete info directly on registration
-- ============================================================

-- Athlete fields (only essentials - no CPF or emergency contact)
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_email TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_phone TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_birth_date DATE;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_gender TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS athlete_shirt_size TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS team_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]';

-- Event-level config: admin controls if shirt size appears on registration
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS require_shirt_size BOOLEAN DEFAULT false;
