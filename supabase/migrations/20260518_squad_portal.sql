-- Portal token para acesso ao painel pessoal de cada squad/parceiro
ALTER TABLE public.squad_members
  ADD COLUMN IF NOT EXISTS portal_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS email        TEXT;

-- Gera token para membros que já existem sem token
UPDATE public.squad_members SET portal_token = gen_random_uuid() WHERE portal_token IS NULL;

ALTER TABLE public.training_locations
  ADD COLUMN IF NOT EXISTS portal_token UUID DEFAULT gen_random_uuid();

UPDATE public.training_locations SET portal_token = gen_random_uuid() WHERE portal_token IS NULL;

-- Índices para lookup rápido por token
CREATE UNIQUE INDEX IF NOT EXISTS idx_squad_members_portal_token    ON public.squad_members (portal_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_training_locations_portal_token ON public.training_locations (portal_token);
