CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to waitlist" ON public.event_waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read to waitlist" ON public.event_waitlist FOR SELECT USING (true);
