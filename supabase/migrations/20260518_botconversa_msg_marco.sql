-- Add msg_marco column to botconversa_config for squad/partner milestone WhatsApp messages
ALTER TABLE public.botconversa_config
  ADD COLUMN IF NOT EXISTS msg_marco TEXT;
