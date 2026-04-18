-- Migration to add explicit weight/load to event_stages table

ALTER TABLE public.event_stages 
ADD COLUMN IF NOT EXISTS weight_load TEXT;
