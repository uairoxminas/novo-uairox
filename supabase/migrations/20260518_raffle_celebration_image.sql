ALTER TABLE public.raffle_configs
  ADD COLUMN IF NOT EXISTS celebration_image_url TEXT;
