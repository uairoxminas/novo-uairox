CREATE TABLE IF NOT EXISTS public.shirt_models (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id        UUID NOT NULL REFERENCES public.athlete_kits(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  photo_url     TEXT,
  size_chart_url TEXT,
  available_sizes TEXT[] DEFAULT '{}',
  order_index   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shirt_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shirt_models_public_read"  ON public.shirt_models FOR SELECT              USING (true);
CREATE POLICY "shirt_models_auth_write"   ON public.shirt_models FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS shirt_model_id UUID REFERENCES public.shirt_models(id);
