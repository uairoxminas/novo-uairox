-- Mensagens editáveis por trigger em botconversa_config
ALTER TABLE public.botconversa_config
  ADD COLUMN IF NOT EXISTS msg_inscricao  TEXT,
  ADD COLUMN IF NOT EXISTS msg_confirmado TEXT,
  ADD COLUMN IF NOT EXISTS msg_cancelado  TEXT,
  ADD COLUMN IF NOT EXISTS msg_pix_2d    TEXT,
  ADD COLUMN IF NOT EXISTS msg_pix_0d    TEXT,
  ADD COLUMN IF NOT EXISTS msg_pix_1d    TEXT,
  ADD COLUMN IF NOT EXISTS msg_pix_5d    TEXT;
