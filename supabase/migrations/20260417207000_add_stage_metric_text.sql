-- Migration to add metric_text to event_stages table

ALTER TABLE public.event_stages 
ADD COLUMN IF NOT EXISTS metric_text TEXT;
