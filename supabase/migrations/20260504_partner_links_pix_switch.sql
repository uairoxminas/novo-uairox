-- =============================================
-- PARTNER VIEW LINKS — Link de visualização read-only para parceiros
-- PIX SWITCH — Troca automática de chave PIX por nº de inscrições confirmadas
-- =============================================

-- 1. Partner View Links (Token UUID único por evento)
CREATE TABLE IF NOT EXISTS public.event_partner_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    label TEXT DEFAULT 'Parceiro',
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_partner_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner_links_public_read" ON public.event_partner_links
    FOR SELECT USING (true);

CREATE POLICY "partner_links_auth_write" ON public.event_partner_links
    FOR ALL USING (true);

-- 2. PIX Switch — Campos no evento para troca automática de chave PIX
ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS pix_key_secondary TEXT,
    ADD COLUMN IF NOT EXISTS pix_switch_at INTEGER;

-- pix_key_secondary: chave PIX do parceiro (usa quando confirmados >= pix_switch_at)
-- pix_switch_at: número de inscrições confirmadas para acionar a troca
