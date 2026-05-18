-- Vincula cada arte a um evento específico
ALTER TABLE public.squad_promo_arts
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_squad_promo_arts_event_id ON public.squad_promo_arts(event_id);
