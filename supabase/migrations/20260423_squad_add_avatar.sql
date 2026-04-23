-- Add avatar_url to squad_applications table
ALTER TABLE public.squad_applications ADD COLUMN IF NOT EXISTS avatar_url TEXT;
