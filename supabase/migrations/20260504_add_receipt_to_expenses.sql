-- Add receipt_url to event_expenses
ALTER TABLE public.event_expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
