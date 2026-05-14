-- =============================================
-- EVENT INVITE LINKS — Links especiais de convite
-- Permitem inscrição mesmo com inscrições encerradas/esgotadas
-- =============================================

CREATE TABLE IF NOT EXISTS public.event_invite_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    label TEXT DEFAULT 'Convite',
    max_uses INTEGER DEFAULT 1,          -- NULL = ilimitado, 1 = uso único
    current_uses INTEGER DEFAULT 0,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,              -- Validade opcional
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_invite_links ENABLE ROW LEVEL SECURITY;

-- Leitura pública (para a página de inscrição validar o token)
CREATE POLICY "invite_links_public_read" ON public.event_invite_links
    FOR SELECT USING (true);

-- Escrita pelo admin
CREATE POLICY "invite_links_auth_write" ON public.event_invite_links
    FOR ALL USING (true);
