-- Artes promocionais do Kit do Promotor para download pelo Squad/Parceiros
CREATE TABLE IF NOT EXISTS public.squad_promo_arts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.squad_promo_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_arts_public_read" ON public.squad_promo_arts
  FOR SELECT USING (true);

CREATE POLICY "squad_arts_auth_manage" ON public.squad_promo_arts
  FOR ALL USING (auth.role() = 'authenticated');
